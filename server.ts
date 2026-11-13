import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  INITIAL_ENEMIES,
  INTERACTABLES,
  SPAWN_P1,
  SPAWN_P2,
} from './src/shared/levelData.ts';
import {
  ActiveSignal,
  ChatMessage,
  ClientWsMessage,
  EnemyState,
  PlayerSlot,
  PlayerState,
  QUICK_SIGNALS,
  RoomSnapshot,
  ServerWsMessage,
} from './src/shared/protocol.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServerRoom {
  code: string;
  players: Record<PlayerSlot, PlayerState>;
  sockets: Record<PlayerSlot, WebSocket | null>;
  puzzles: RoomSnapshot['puzzles'];
  enemies: EnemyState[];
  chat: ChatMessage[];
  signals: ActiveSignal[];
  lastActivityAt: number;
}

const rooms = new Map<string, ServerRoom>();

function generateRoomCode(): string {
  const digits = '23456789';
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  do {
    const l1 = letters[Math.floor(Math.random() * letters.length)];
    const l2 = letters[Math.floor(Math.random() * letters.length)];
    const d1 = digits[Math.floor(Math.random() * digits.length)];
    const d2 = digits[Math.floor(Math.random() * digits.length)];
    const d3 = digits[Math.floor(Math.random() * digits.length)];
    code = `T${l1}${l2}${d1}${d2}${d3}`;
  } while (rooms.has(code));
  return code;
}

function createPlayerState(slot: PlayerSlot, name: string, connected: boolean): PlayerState {
  const spawn = slot === 'p1' ? SPAWN_P1 : SPAWN_P2;
  return {
    slot,
    name,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: true,
    anim: 'idle',
    hp: 5,
    maxHp: 5,
    soul: 40,
    lives: 3,
    geo: 0,
    invulnUntil: 0,
    attackUntil: 0,
    connected,
  };
}

function createInitialEnemies(): EnemyState[] {
  return INITIAL_ENEMIES.map((e) => ({
    ...e,
    alive: true,
    respawnAt: 0,
  }));
}

function createRoom(code: string, hostName?: string): ServerRoom {
  const now = Date.now();
  return {
    code,
    players: {
      p1: createPlayerState('p1', hostName?.trim() || 'المستكشف سيف', true),
      p2: createPlayerState('p2', 'المستكشف طارق', false),
    },
    sockets: { p1: null, p2: null },
    puzzles: {
      leverPulledUntil: 0,
      gate1LockedOpen: false,
      switchLeftActiveUntil: 0,
      switchRightActiveUntil: 0,
      secretDoorOpen: false,
      plateClaimed: false,
      plateNearbyCount: 0,
      victoryTriggered: false,
      startedAt: now,
      completedAt: null,
    },
    enemies: createInitialEnemies(),
    chat: [
      {
        id: `sys-${now}`,
        senderSlot: 'system',
        senderName: 'أصداء طاسيلي',
        text: 'تعاونا لفتح بوابات الكهف؛ لا طريق للعبور إلا معاً.',
        timestamp: now,
      },
    ],
    signals: [],
    lastActivityAt: now,
  };
}

function getSnapshot(room: ServerRoom): RoomSnapshot {
  const now = Date.now();
  room.signals = room.signals.filter((s) => s.expiresAt > now);
  return {
    code: room.code,
    players: room.players,
    puzzles: room.puzzles,
    enemies: room.enemies,
    chat: room.chat,
    signals: room.signals,
  };
}

function sendTo(ws: WebSocket | null, payload: ServerWsMessage): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(room: ServerRoom, payload: ServerWsMessage, excludeSlot?: PlayerSlot): void {
  (['p1', 'p2'] as PlayerSlot[]).forEach((slot) => {
    if (slot === excludeSlot) return;
    sendTo(room.sockets[slot], payload);
  });
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function updatePlateNearby(room: ServerRoom): void {
  const p1 = room.players.p1;
  const p2 = room.players.p2;
  let count = 0;
  if (p1.connected && distance(p1.x + 7, p1.y + 18, INTERACTABLES.plate.x, INTERACTABLES.plate.y) < 62) {
    count++;
  }
  if (p2.connected && distance(p2.x + 7, p2.y + 18, INTERACTABLES.plate.x, INTERACTABLES.plate.y) < 62) {
    count++;
  }
  room.puzzles.plateNearbyCount = count;
}

function checkSecretDoorUnlock(room: ServerRoom): boolean {
  const now = Date.now();
  if (
    !room.puzzles.secretDoorOpen &&
    room.puzzles.switchLeftActiveUntil > now &&
    room.puzzles.switchRightActiveUntil > now
  ) {
    room.puzzles.secretDoorOpen = true;
    room.players.p1.geo += 100;
    room.players.p2.geo += 100;
    broadcast(room, { type: 'puzzle:event', event: 'secret_open' });
    broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
    return true;
  }
  return false;
}

// Cleanup idle rooms periodically & tick patrolling enemies
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const anyConnected = room.players.p1.connected || room.players.p2.connected;
    if (!anyConnected && now - room.lastActivityAt > 15 * 60 * 1000) {
      rooms.delete(code);
      continue;
    }

    // Respawn defeated enemies after 14s
    let enemyChanged = false;
    for (const enemy of room.enemies) {
      if (!enemy.alive && enemy.respawnAt > 0 && now >= enemy.respawnAt) {
        enemy.alive = true;
        enemy.hp = enemy.maxHp;
        enemy.respawnAt = 0;
        enemyChanged = true;
      }
    }
    if (enemyChanged) {
      broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
    }
  }
}, 2000);

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let joinedRoomCode: string | null = null;
    let joinedSlot: PlayerSlot | null = null;

    ws.on('message', (raw) => {
      let msg: ClientWsMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientWsMessage;
      } catch {
        return;
      }

      const now = Date.now();

      if (msg.type === 'room:create') {
        const code = generateRoomCode();
        const room = createRoom(code, msg.playerName);
        room.sockets.p1 = ws;
        rooms.set(code, room);
        joinedRoomCode = code;
        joinedSlot = 'p1';
        sendTo(ws, {
          type: 'room:joined',
          code,
          slot: 'p1',
          snapshot: getSnapshot(room),
        });
        return;
      }

      if (msg.type === 'room:join') {
        const cleanCode = (msg.code || '').trim().toUpperCase();
        const room = rooms.get(cleanCode);
        if (!room) {
          sendTo(ws, {
            type: 'room:error',
            message: 'لم يتم العثور على غرفة بهذا الرمز. تأكد من الرمز وحاول مجدداً.',
          });
          return;
        }

        let targetSlot: PlayerSlot | null = null;
        if (!room.players.p2.connected) {
          targetSlot = 'p2';
        } else if (!room.players.p1.connected) {
          targetSlot = 'p1';
        }

        if (!targetSlot) {
          sendTo(ws, {
            type: 'room:error',
            message: 'هذه الغرفة مكتملة بالفعل (لاعبان متصلان حالياً).',
          });
          return;
        }

        room.sockets[targetSlot] = ws;
        room.players[targetSlot].connected = true;
        if (msg.playerName?.trim()) {
          room.players[targetSlot].name = msg.playerName.trim().slice(0, 18);
        }
        room.lastActivityAt = now;
        joinedRoomCode = cleanCode;
        joinedSlot = targetSlot;

        const joinNote: ChatMessage = {
          id: `join-${now}`,
          senderSlot: 'system',
          senderName: 'النظام',
          text: `انضم ${room.players[targetSlot].name} إلى الكهف!`,
          timestamp: now,
        };
        room.chat = [...room.chat.slice(-29), joinNote];

        const snapshot = getSnapshot(room);
        sendTo(ws, {
          type: 'room:joined',
          code: cleanCode,
          slot: targetSlot,
          snapshot,
        });
        broadcast(room, { type: 'room:state', snapshot }, targetSlot);
        broadcast(room, { type: 'chat:received', message: joinNote }, targetSlot);
        return;
      }

      if (!joinedRoomCode || !joinedSlot) return;
      const room = rooms.get(joinedRoomCode);
      if (!room) return;
      room.lastActivityAt = now;
      const player = room.players[joinedSlot];

      if (msg.type === 'room:reset') {
        const p1Connected = room.players.p1.connected;
        const p2Connected = room.players.p2.connected;
        const p1Name = room.players.p1.name;
        const p2Name = room.players.p2.name;
        room.players.p1 = createPlayerState('p1', p1Name, p1Connected);
        room.players.p2 = createPlayerState('p2', p2Name, p2Connected);
        room.puzzles = {
          leverPulledUntil: 0,
          gate1LockedOpen: false,
          switchLeftActiveUntil: 0,
          switchRightActiveUntil: 0,
          secretDoorOpen: false,
          plateClaimed: false,
          plateNearbyCount: 0,
          victoryTriggered: false,
          startedAt: now,
          completedAt: null,
        };
        room.enemies = createInitialEnemies();
        room.signals = [];
        const resetMsg: ChatMessage = {
          id: `rst-${now}`,
          senderSlot: 'system',
          senderName: 'أصداء طاسيلي',
          text: 'بدأت رحلة جديدة عبر كهوف طاسيلي.',
          timestamp: now,
        };
        room.chat = [...room.chat.slice(-29), resetMsg];
        broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
        return;
      }

      if (msg.type === 'player:update') {
        player.x = msg.x;
        player.y = msg.y;
        player.vx = msg.vx;
        player.vy = msg.vy;
        player.facing = msg.facing;
        player.onGround = msg.onGround;
        player.anim = msg.anim;
        updatePlateNearby(room);
        broadcast(
          room,
          {
            type: 'player:moved',
            slot: joinedSlot,
            x: msg.x,
            y: msg.y,
            vx: msg.vx,
            vy: msg.vy,
            facing: msg.facing,
            onGround: msg.onGround,
            anim: msg.anim,
          },
          joinedSlot
        );
        return;
      }

      if (msg.type === 'player:damage') {
        if (now < player.invulnUntil) return;
        player.invulnUntil = now + 1100;
        player.hp = Math.max(0, player.hp - msg.amount);
        if (player.hp <= 0) {
          player.lives = Math.max(0, player.lives - 1);
          if (player.lives <= 0) {
            player.lives = 3;
            player.geo = Math.max(0, player.geo - 25);
          }
          player.hp = player.maxHp;
          player.x = msg.respawnX;
          player.y = msg.respawnY;
          player.vx = 0;
          player.vy = 0;
        }
        broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
        return;
      }

      if (msg.type === 'player:heal') {
        if (player.hp < player.maxHp && player.soul >= 33) {
          player.soul -= 33;
          player.hp = Math.min(player.maxHp, player.hp + 1);
          broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
        }
        return;
      }

      if (msg.type === 'player:gainSoul') {
        player.soul = Math.min(100, player.soul + msg.amount);
        player.geo += msg.geo;
        broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
        return;
      }

      if (msg.type === 'enemy:hit') {
        const enemy = room.enemies.find((e) => e.id === msg.enemyId);
        if (enemy && enemy.alive) {
          enemy.hp -= 1;
          player.soul = Math.min(100, player.soul + 18);
          if (enemy.hp <= 0) {
            enemy.alive = false;
            enemy.respawnAt = now + 14000;
            player.geo += 25;
          }
          broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
        }
        return;
      }

      if (msg.type === 'puzzle:switchStand') {
        if (msg.side === 'left') {
          room.puzzles.switchLeftActiveUntil = now + 800;
        } else {
          room.puzzles.switchRightActiveUntil = now + 800;
        }
        checkSecretDoorUnlock(room);
        return;
      }

      if (msg.type === 'puzzle:interact') {
        if (msg.target === 'lever1') {
          if (!room.puzzles.gate1LockedOpen) {
            room.puzzles.leverPulledUntil = now + 9000;
            broadcast(room, { type: 'puzzle:event', event: 'gate1_temp' });
            broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
          }
          return;
        }

        if (msg.target === 'counterweight1') {
          if (!room.puzzles.gate1LockedOpen && (room.puzzles.leverPulledUntil > now || player.x > 740)) {
            room.puzzles.gate1LockedOpen = true;
            room.players.p1.geo += 50;
            room.players.p2.geo += 50;
            broadcast(room, { type: 'puzzle:event', event: 'gate1_locked' });
            broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
          }
          return;
        }

        if (msg.target === 'switchLeft') {
          room.puzzles.switchLeftActiveUntil = now + 2600;
          if (!checkSecretDoorUnlock(room)) {
            broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
          }
          return;
        }

        if (msg.target === 'switchRight') {
          room.puzzles.switchRightActiveUntil = now + 2600;
          if (!checkSecretDoorUnlock(room)) {
            broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
          }
          return;
        }

        if (msg.target === 'plate') {
          if (room.puzzles.plateClaimed) return;
          updatePlateNearby(room);
          const bothConnected = room.players.p1.connected && room.players.p2.connected;
          if (!bothConnected || room.puzzles.plateNearbyCount < 2) {
            broadcast(room, { type: 'puzzle:event', event: 'plate_need_partner' });
            broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
            return;
          }
          room.puzzles.plateClaimed = true;
          (['p1', 'p2'] as PlayerSlot[]).forEach((s) => {
            room.players[s].hp = room.players[s].maxHp;
            room.players[s].soul = 100;
            room.players[s].lives += 1;
            room.players[s].geo += 150;
          });
          broadcast(room, { type: 'puzzle:event', event: 'plate_blessing' });
          broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
          return;
        }

        if (msg.target === 'monolith') {
          if (!room.puzzles.secretDoorOpen || room.puzzles.victoryTriggered) return;
          const p1Near = distance(room.players.p1.x, room.players.p1.y, INTERACTABLES.monolith.x, INTERACTABLES.monolith.y) < 90;
          const p2Near = distance(room.players.p2.x, room.players.p2.y, INTERACTABLES.monolith.x, INTERACTABLES.monolith.y) < 90;
          if (p1Near && p2Near) {
            room.puzzles.victoryTriggered = true;
            room.puzzles.completedAt = now;
            broadcast(room, { type: 'puzzle:event', event: 'victory' });
            broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
          }
          return;
        }
      }

      if (msg.type === 'signal:send') {
        const sigDef = QUICK_SIGNALS[msg.signalType];
        if (!sigDef) return;
        const signal: ActiveSignal = {
          id: `sig-${now}-${Math.random().toString(36).slice(2, 6)}`,
          slot: joinedSlot,
          type: msg.signalType,
          label: sigDef.short,
          expiresAt: now + 3200,
        };
        room.signals = [...room.signals.filter((s) => s.expiresAt > now && s.slot !== joinedSlot), signal];
        broadcast(room, { type: 'signal:received', signal });
        return;
      }

      if (msg.type === 'chat:send') {
        const cleanText = (msg.text || '').trim().slice(0, 140);
        if (!cleanText) return;
        const chatMsg: ChatMessage = {
          id: `msg-${now}-${Math.random().toString(36).slice(2, 6)}`,
          senderSlot: joinedSlot,
          senderName: player.name,
          text: cleanText,
          timestamp: now,
        };
        room.chat = [...room.chat.slice(-29), chatMsg];
        broadcast(room, { type: 'chat:received', message: chatMsg });
      }
    });

    ws.on('close', () => {
      if (!joinedRoomCode || !joinedSlot) return;
      const room = rooms.get(joinedRoomCode);
      if (!room) return;
      if (room.sockets[joinedSlot] === ws) {
        room.sockets[joinedSlot] = null;
        room.players[joinedSlot].connected = false;
        room.lastActivityAt = Date.now();
        const leaveNote: ChatMessage = {
          id: `leave-${Date.now()}`,
          senderSlot: 'system',
          senderName: 'النظام',
          text: `غادر ${room.players[joinedSlot].name} الكهف مؤقتاً.`,
          timestamp: Date.now(),
        };
        room.chat = [...room.chat.slice(-29), leaveNote];
        broadcast(room, { type: 'room:state', snapshot: getSnapshot(room) });
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
