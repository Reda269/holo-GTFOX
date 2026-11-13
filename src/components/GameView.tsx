import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, Home, Trophy } from 'lucide-react';
import {
  CHECKPOINTS,
  GATE1_RECT,
  GRAVITY,
  INITIAL_ENEMIES,
  INTERACTABLES,
  JUMP_VELOCITY,
  MOVE_SPEED,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  Rect,
  SECRET_DOOR_RECT,
  SPAWN_P1,
  SPAWN_P2,
  SPIKE_ZONES,
  STATIC_PLATFORMS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../shared/levelData.ts';
import {
  ActiveSignal,
  ChatMessage,
  ClientWsMessage,
  EnemyState,
  PlayerSlot,
  PlayerState,
  QUICK_SIGNALS,
  QuickSignalType,
  RoomSnapshot,
  ServerWsMessage,
} from '../shared/protocol.ts';
import {
  CameraShake,
  clampWorldCamera,
  drawGameWorld,
  Particle,
} from '../game/pixelRenderer.ts';
import { soundFX } from '../game/audio.ts';
import { GameHud } from './GameHud.tsx';
import { MobileControls } from './MobileControls.tsx';
import { useLayoutMode } from './TassiliFrame.tsx';

interface GameViewProps {
  mode: 'solo' | 'online' | 'local';
  initialSnapshot: RoomSnapshot | null;
  initialSlot: PlayerSlot;
  wsRef: React.MutableRefObject<WebSocket | null>;
  touchMode: 'auto' | 'always' | 'off';
  onCycleTouchMode: () => void;
  onLeaveToMenu: () => void;
}

function createLocalSnapshot(isSolo = false): RoomSnapshot {
  const now = Date.now();
  return {
    code: isSolo ? 'SOLO' : 'LOCAL',
    players: {
      p1: {
        slot: 'p1',
        name: 'المستكشف سيف',
        x: SPAWN_P1.x,
        y: SPAWN_P1.y,
        vx: 0,
        vy: 0,
        facing: 1,
        onGround: true,
        anim: 'idle',
        hp: 5,
        maxHp: 5,
        soul: 45,
        lives: 3,
        geo: 0,
        invulnUntil: 0,
        attackUntil: 0,
        connected: true,
      },
      p2: {
        slot: 'p2',
        name: 'المستكشف طارق',
        x: SPAWN_P2.x,
        y: SPAWN_P2.y,
        vx: 0,
        vy: 0,
        facing: 1,
        onGround: true,
        anim: 'idle',
        hp: 5,
        maxHp: 5,
        soul: 45,
        lives: 3,
        geo: 0,
        invulnUntil: 0,
        attackUntil: 0,
        connected: !isSolo,
      },
    },
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
    enemies: INITIAL_ENEMIES.map((e) => ({ ...e, alive: true, respawnAt: 0 })),
    chat: [
      {
        id: 'local-init',
        senderSlot: 'system',
        senderName: 'أصداء طاسيلي',
        text: isSolo
          ? 'وضع اللعب الفردي: افتح البوابات واستكشف أسرار طاسيلي بمفردك.'
          : 'وضع محلي: تحكم بسيف عبر WASD وبطارق عبر الأسهم، أو بدّل بـ Tab.',
        timestamp: now,
      },
    ],
    signals: [],
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getNearestCheckpoint(x: number): { x: number; y: number } {
  let best = CHECKPOINTS[0];
  for (const cp of CHECKPOINTS) {
    if (cp.x <= x + 30) best = cp;
  }
  return { x: best.x, y: best.y - PLAYER_HEIGHT - 2 };
}

export const GameView: React.FC<GameViewProps> = ({
  mode,
  initialSnapshot,
  initialSlot,
  wsRef,
  touchMode,
  onCycleTouchMode,
  onLeaveToMenu,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<RoomSnapshot>(
    initialSnapshot ? structuredClone(initialSnapshot) : createLocalSnapshot(mode === 'solo')
  );
  const localSlotRef = useRef<PlayerSlot>(initialSlot);
  const keysRef = useRef<Set<string>>(new Set());
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<CameraShake>({ intensity: 0, until: 0 });
  const cameraRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastNetSyncRef = useRef<number>(0);
  const lastSwitchStandRef = useRef<number>(0);
  const bannerTimerRef = useRef<number | null>(null);

  const { isMobileDevice, isCompactLandscape } = useLayoutMode();
  const [localSlot, setLocalSlot] = useState<PlayerSlot>(initialSlot);
  const [hudState, setHudState] = useState<RoomSnapshot>(() => worldRef.current);
  const [muted, setMuted] = useState<boolean>(soundFX.isMuted());
  const [eventBanner, setEventBanner] = useState<string | null>(null);
  const [nearInteract, setNearInteract] = useState<boolean>(false);

  const showTouchControls =
    touchMode === 'always' ? true : touchMode === 'off' ? false : isMobileDevice;

  const showBanner = useCallback((msg: string) => {
    setEventBanner(msg);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => setEventBanner(null), 3800);
  }, []);

  const spawnBurst = useCallback((x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 25 + Math.random() * 65;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        color,
        size: Math.random() > 0.4 ? 2 : 1,
      });
    }
  }, []);

  const sendWs = useCallback(
    (payload: ClientWsMessage) => {
      const ws = wsRef.current;
      if (mode === 'online' && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    },
    [mode, wsRef]
  );

  // Listen to WebSocket events in Online Mode
  useEffect(() => {
    if (mode !== 'online') return;
    const ws = wsRef.current;
    if (!ws) return;

    const onMessage = (ev: MessageEvent) => {
      let msg: ServerWsMessage;
      try {
        msg = JSON.parse(ev.data) as ServerWsMessage;
      } catch {
        return;
      }

      if (msg.type === 'room:state') {
        const mySlot = localSlotRef.current;
        const myCurrent = worldRef.current.players[mySlot];
        const prevSnap = worldRef.current;
        worldRef.current = {
          ...msg.snapshot,
          players: {
            ...msg.snapshot.players,
            // Preserve smooth local player movement unless damaged/teleported/reset
            [mySlot]: {
              ...msg.snapshot.players[mySlot],
              x:
                msg.snapshot.puzzles.startedAt !== prevSnap.puzzles.startedAt ||
                msg.snapshot.players[mySlot].invulnUntil > prevSnap.players[mySlot].invulnUntil
                  ? msg.snapshot.players[mySlot].x
                  : myCurrent.x,
              y:
                msg.snapshot.puzzles.startedAt !== prevSnap.puzzles.startedAt ||
                msg.snapshot.players[mySlot].invulnUntil > prevSnap.players[mySlot].invulnUntil
                  ? msg.snapshot.players[mySlot].y
                  : myCurrent.y,
              vx: myCurrent.vx,
              vy: myCurrent.vy,
              facing: myCurrent.facing,
              onGround: myCurrent.onGround,
              anim: myCurrent.anim,
            },
          },
        };
        setHudState({ ...worldRef.current });
      } else if (msg.type === 'player:moved') {
        const target = worldRef.current.players[msg.slot];
        if (target && msg.slot !== localSlotRef.current) {
          target.x = msg.x;
          target.y = msg.y;
          target.vx = msg.vx;
          target.vy = msg.vy;
          target.facing = msg.facing;
          target.onGround = msg.onGround;
          target.anim = msg.anim;
        }
      } else if (msg.type === 'signal:received') {
        worldRef.current.signals = [
          ...worldRef.current.signals.filter((s) => s.slot !== msg.signal.slot),
          msg.signal,
        ];
        soundFX.signalPing();
      } else if (msg.type === 'chat:received') {
        worldRef.current.chat = [...worldRef.current.chat.slice(-29), msg.message];
        setHudState({ ...worldRef.current });
      } else if (msg.type === 'puzzle:event') {
        if (msg.event === 'gate1_temp') {
          soundFX.lever();
          shakeRef.current = { intensity: 2.5, until: performance.now() + 260 };
          showBanner('تم رفع البوابة الحجرية مؤقتاً! ليعبر رفيقك الآن ويثبت ثقل الموازنة.');
        } else if (msg.event === 'gate1_locked') {
          soundFX.doorOpen();
          shakeRef.current = { intensity: 4, until: performance.now() + 420 };
          spawnBurst(INTERACTABLES.counterweight1.x, INTERACTABLES.counterweight1.y - 10, '#60cde6', 14);
          showBanner('تم تثبيت ثقل الموازنة — البوابة مفتوحة للعبور الدائم (+50 Geo)');
        } else if (msg.event === 'secret_open') {
          soundFX.doorOpen();
          shakeRef.current = { intensity: 5, until: performance.now() + 550 };
          spawnBurst(SECRET_DOOR_RECT.x + 10, SECRET_DOOR_RECT.y + 35, '#f0b24a', 18);
          showBanner('تزامن رائع! انفتح الباب السري إلى قدس طاسيلي (+100 Geo)');
        } else if (msg.event === 'plate_need_partner') {
          soundFX.menuHover();
          showBanner('تجمّعا معاً حول الطبق الجزائري التقليدي لنيل البركة الجماعية!');
        } else if (msg.event === 'plate_blessing') {
          soundFX.plateBlessing();
          spawnBurst(INTERACTABLES.plate.x, INTERACTABLES.plate.y - 8, '#f0b24a', 20);
          showBanner('بركة تمر طاسيلي! استعدتما كامل الصحة والروح (+1 أرواح · +150 Geo)');
        } else if (msg.event === 'victory') {
          soundFX.plateBlessing();
          spawnBurst(INTERACTABLES.monolith.x, INTERACTABLES.monolith.y - 30, '#ffe89e', 26);
        }
      }
    };

    ws.addEventListener('message', onMessage);
    return () => ws.removeEventListener('message', onMessage);
  }, [mode, wsRef, showBanner, spawnBurst]);

  const triggerSignal = useCallback(
    (signalType: QuickSignalType) => {
      const now = Date.now();
      const slot = localSlotRef.current;
      const sig: ActiveSignal = {
        id: `sig-${now}`,
        slot,
        type: signalType,
        label: QUICK_SIGNALS[signalType].short,
        expiresAt: now + 3200,
      };
      worldRef.current.signals = [
        ...worldRef.current.signals.filter((s) => s.slot !== slot && s.expiresAt > now),
        sig,
      ];
      soundFX.signalPing();
      sendWs({ type: 'signal:send', signalType });
    },
    [sendWs]
  );

  const sendChat = useCallback(
    (text: string) => {
      if (mode === 'online') {
        sendWs({ type: 'chat:send', text });
      } else {
        const slot = localSlotRef.current;
        const msg: ChatMessage = {
          id: `loc-${Date.now()}`,
          senderSlot: slot,
          senderName: worldRef.current.players[slot].name,
          text,
          timestamp: Date.now(),
        };
        worldRef.current.chat = [...worldRef.current.chat.slice(-29), msg];
        setHudState({ ...worldRef.current });
      }
    },
    [mode, sendWs]
  );

  const switchLocalPlayer = useCallback(() => {
    if (mode !== 'local') return;
    const next: PlayerSlot = localSlotRef.current === 'p1' ? 'p2' : 'p1';
    localSlotRef.current = next;
    setLocalSlot(next);
    soundFX.menuHover();
  }, [mode]);

  const handleInteractionForSlot = useCallback(
    (slot: PlayerSlot) => {
      const snap = worldRef.current;
      const pl = snap.players[slot];
      const now = Date.now();
      const px = pl.x + PLAYER_WIDTH / 2;
      const py = pl.y + PLAYER_HEIGHT / 2;

      const dist = (tx: number, ty: number) => Math.hypot(px - tx, py - ty);

      if (dist(INTERACTABLES.lever1.x, INTERACTABLES.lever1.y - 8) <= INTERACTABLES.lever1.radius + 10) {
        if (mode === 'online') {
          sendWs({ type: 'puzzle:interact', target: 'lever1' });
        } else if (mode === 'solo' && !snap.puzzles.gate1LockedOpen) {
          snap.puzzles.gate1LockedOpen = true;
          snap.players.p1.geo += 50;
          soundFX.doorOpen();
          shakeRef.current = { intensity: 3.5, until: performance.now() + 360 };
          spawnBurst(INTERACTABLES.lever1.x, INTERACTABLES.lever1.y - 8, '#f0b24a', 14);
          showBanner('تم سحب الرافعة وفتح البوابة الحجرية نهائياً (+50 Geo)');
          setHudState({ ...snap });
        } else if (!snap.puzzles.gate1LockedOpen) {
          snap.puzzles.leverPulledUntil = now + 9000;
          soundFX.lever();
          shakeRef.current = { intensity: 2.5, until: performance.now() + 260 };
          showBanner('تم سحب الرافعة! حرك رفيقك عبر البوابة وثبت ثقل الموازنة.');
        }
        return;
      }

      if (dist(INTERACTABLES.counterweight1.x, INTERACTABLES.counterweight1.y - 8) <= INTERACTABLES.counterweight1.radius + 10) {
        if (mode === 'online') {
          sendWs({ type: 'puzzle:interact', target: 'counterweight1' });
        } else if (!snap.puzzles.gate1LockedOpen && (snap.puzzles.leverPulledUntil > now || pl.x > 740)) {
          snap.puzzles.gate1LockedOpen = true;
          snap.players.p1.geo += 50;
          snap.players.p2.geo += 50;
          soundFX.doorOpen();
          spawnBurst(INTERACTABLES.counterweight1.x, INTERACTABLES.counterweight1.y - 10, '#60cde6', 14);
          showBanner('تم تثبيت ثقل الموازنة — البوابة مفتوحة للعبور الدائم!');
          setHudState({ ...snap });
        }
        return;
      }

      if (dist(INTERACTABLES.plate.x, INTERACTABLES.plate.y - 8) <= INTERACTABLES.plate.radius) {
        if (snap.puzzles.plateClaimed) return;
        if (mode === 'online') {
          sendWs({ type: 'puzzle:interact', target: 'plate' });
        } else if (mode === 'solo') {
          snap.puzzles.plateClaimed = true;
          snap.players.p1.hp = snap.players.p1.maxHp;
          snap.players.p1.soul = 100;
          snap.players.p1.lives += 1;
          snap.players.p1.geo += 150;
          soundFX.plateBlessing();
          spawnBurst(INTERACTABLES.plate.x, INTERACTABLES.plate.y - 8, '#f0b24a', 20);
          showBanner('بركة تمر طاسيلي! استعدت كامل الصحة والروح (+1 أرواح · +150 Geo)');
          setHudState({ ...snap });
        } else {
          const d1 = Math.hypot(snap.players.p1.x + 7 - INTERACTABLES.plate.x, snap.players.p1.y + 18 - INTERACTABLES.plate.y);
          const d2 = Math.hypot(snap.players.p2.x + 7 - INTERACTABLES.plate.x, snap.players.p2.y + 18 - INTERACTABLES.plate.y);
          if (d1 < 62 && d2 < 62) {
            snap.puzzles.plateClaimed = true;
            (['p1', 'p2'] as PlayerSlot[]).forEach((s) => {
              snap.players[s].hp = snap.players[s].maxHp;
              snap.players[s].soul = 100;
              snap.players[s].lives += 1;
              snap.players[s].geo += 150;
            });
            soundFX.plateBlessing();
            spawnBurst(INTERACTABLES.plate.x, INTERACTABLES.plate.y - 8, '#f0b24a', 20);
            showBanner('بركة تمر طاسيلي! استعدتما كامل الصحة والروح (+1 أرواح · +150 Geo)');
            setHudState({ ...snap });
          } else {
            soundFX.menuHover();
            showBanner('أحضِر كلا المستكشفين إلى الطبق الجزائري التقليدي لتشاركه معاً!');
          }
        }
        return;
      }

      if (dist(INTERACTABLES.switchLeft.x, INTERACTABLES.switchLeft.y - 8) <= INTERACTABLES.switchLeft.radius + 10) {
        soundFX.switchPulse();
        if (mode === 'online') {
          sendWs({ type: 'puzzle:interact', target: 'switchLeft' });
        } else {
          snap.puzzles.switchLeftActiveUntil = now + (mode === 'solo' ? 3600000 : 2600);
          if (!snap.puzzles.secretDoorOpen && snap.puzzles.switchRightActiveUntil > now) {
            snap.puzzles.secretDoorOpen = true;
            snap.players.p1.geo += 100;
            if (mode !== 'solo') snap.players.p2.geo += 100;
            soundFX.doorOpen();
            showBanner(
              mode === 'solo'
                ? 'تم تفعيل المفتاحين وانفتح الباب السري (+100 Geo)'
                : 'تزامن رائع! انفتح الباب السري (+100 Geo)'
            );
            setHudState({ ...snap });
          } else if (mode === 'solo' && !snap.puzzles.secretDoorOpen) {
            showBanner('تم تفعيل المفتاح الغربي! اتجه الآن للمفتاح الشرقي لفتح الباب السري.');
          }
        }
        return;
      }

      if (dist(INTERACTABLES.switchRight.x, INTERACTABLES.switchRight.y - 8) <= INTERACTABLES.switchRight.radius + 10) {
        soundFX.switchPulse();
        if (mode === 'online') {
          sendWs({ type: 'puzzle:interact', target: 'switchRight' });
        } else {
          snap.puzzles.switchRightActiveUntil = now + (mode === 'solo' ? 3600000 : 2600);
          if (!snap.puzzles.secretDoorOpen && snap.puzzles.switchLeftActiveUntil > now) {
            snap.puzzles.secretDoorOpen = true;
            snap.players.p1.geo += 100;
            if (mode !== 'solo') snap.players.p2.geo += 100;
            soundFX.doorOpen();
            showBanner(
              mode === 'solo'
                ? 'تم تفعيل المفتاحين وانفتح الباب السري (+100 Geo)'
                : 'تزامن رائع! انفتح الباب السري (+100 Geo)'
            );
            setHudState({ ...snap });
          } else if (mode === 'solo' && !snap.puzzles.secretDoorOpen) {
            showBanner('تم تفعيل المفتاح الشرقي! اتجه الآن للمفتاح الغربي لفتح الباب السري.');
          }
        }
        return;
      }

      if (
        snap.puzzles.secretDoorOpen &&
        dist(INTERACTABLES.monolith.x, INTERACTABLES.monolith.y - 20) <= INTERACTABLES.monolith.radius + 20
      ) {
        if (mode === 'online') {
          sendWs({ type: 'puzzle:interact', target: 'monolith' });
        } else if (mode === 'solo') {
          snap.puzzles.victoryTriggered = true;
          snap.puzzles.completedAt = now;
          soundFX.plateBlessing();
          setHudState({ ...snap });
        } else {
          const d1 = Math.hypot(snap.players.p1.x - INTERACTABLES.monolith.x, snap.players.p1.y - INTERACTABLES.monolith.y);
          const d2 = Math.hypot(snap.players.p2.x - INTERACTABLES.monolith.x, snap.players.p2.y - INTERACTABLES.monolith.y);
          if (d1 < 90 && d2 < 90) {
            snap.puzzles.victoryTriggered = true;
            snap.puzzles.completedAt = now;
            soundFX.plateBlessing();
            setHudState({ ...snap });
          } else {
            showBanner('انتظر رفيقك أمام نصب طاسيلي لإتمام المغامرة معاً!');
          }
        }
      }
    },
    [mode, sendWs, showBanner, spawnBurst]
  );

  const handleAttackForSlot = useCallback(
    (slot: PlayerSlot) => {
      const snap = worldRef.current;
      const pl = snap.players[slot];
      const now = Date.now();
      if (now < pl.attackUntil + 120) return;
      pl.attackUntil = now + 180;
      soundFX.attack();

      const slashRect: Rect = {
        x: pl.facing > 0 ? pl.x + PLAYER_WIDTH : pl.x - 18,
        y: pl.y + 2,
        w: 18,
        h: 18,
      };

      for (const enemy of snap.enemies) {
        if (!enemy.alive) continue;
        const eRect: Rect = { x: enemy.x - 7, y: enemy.y - 12, w: 14, h: 14 };
        if (rectsOverlap(slashRect, eRect)) {
          spawnBurst(enemy.x, enemy.y - 6, '#60cde6', 8);
          if (mode === 'online') {
            sendWs({ type: 'enemy:hit', enemyId: enemy.id, knockDir: pl.facing });
          } else {
            enemy.hp -= 1;
            pl.soul = Math.min(100, pl.soul + 18);
            if (enemy.hp <= 0) {
              enemy.alive = false;
              enemy.respawnAt = now + 14000;
              pl.geo += 25;
            }
            setHudState({ ...snap });
          }
        }
      }
    },
    [mode, sendWs, spawnBurst]
  );

  const handleHealForSlot = useCallback(
    (slot: PlayerSlot) => {
      const snap = worldRef.current;
      const pl = snap.players[slot];
      if (pl.hp >= pl.maxHp || pl.soul < 33) return;
      soundFX.heal();
      spawnBurst(pl.x + 7, pl.y + 10, '#7de0f5', 12);
      if (mode === 'online') {
        sendWs({ type: 'player:heal' });
      } else {
        pl.soul -= 33;
        pl.hp = Math.min(pl.maxHp, pl.hp + 1);
        setHudState({ ...snap });
      }
    },
    [mode, sendWs, spawnBurst]
  );

  // Keyboard Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const code = e.code;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(code)) {
        e.preventDefault();
      }

      if (code === 'Tab' && mode === 'local') {
        switchLocalPlayer();
        return;
      }

      if (!e.repeat) {
        if (code === 'KeyE') handleInteractionForSlot(localSlotRef.current);
        if (code === 'Enter' || code === 'Slash') {
          if (mode === 'local') handleInteractionForSlot('p2');
        }
        if (code === 'KeyF' || code === 'KeyJ') handleAttackForSlot(localSlotRef.current);
        if (code === 'KeyQ' || code === 'KeyH') handleHealForSlot(localSlotRef.current);

        if (code === 'Digit1') triggerSignal('here');
        if (code === 'Digit2') triggerSignal('lever');
        if (code === 'Digit3') triggerSignal('sync');
        if (code === 'Digit4') triggerSignal('wait');
      }

      keysRef.current.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [mode, switchLocalPlayer, handleInteractionForSlot, handleAttackForSlot, handleHealForSlot, triggerSignal]);

  // Main 60fps Simulation & Pixel Render Loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncTimer = 0;

    const stepPlayerPhysics = (
      pl: PlayerState,
      moveLeft: boolean,
      moveRight: boolean,
      jumpPressed: boolean,
      dt: number,
      solids: Rect[],
      nowMs: number,
      isControlled: boolean
    ) => {
      if (!pl.connected) return;

      if (isControlled) {
        let dir = 0;
        if (moveLeft) dir -= 1;
        if (moveRight) dir += 1;
        pl.vx = dir * MOVE_SPEED;
        if (dir !== 0) pl.facing = dir > 0 ? 1 : -1;

        if (jumpPressed && pl.onGround) {
          pl.vy = JUMP_VELOCITY;
          pl.onGround = false;
          soundFX.jump();
          spawnBurst(pl.x + 7, pl.y + PLAYER_HEIGHT, '#6b645c', 5);
        }
      }

      // Gravity
      pl.vy = Math.min(480, pl.vy + GRAVITY * dt);

      // Horizontal Move + Collision
      pl.x += pl.vx * dt;
      pl.x = Math.max(24, Math.min(WORLD_WIDTH - 24 - PLAYER_WIDTH, pl.x));
      for (const s of solids) {
        if (rectsOverlap({ x: pl.x, y: pl.y, w: PLAYER_WIDTH, h: PLAYER_HEIGHT }, s)) {
          if (pl.vx > 0) pl.x = s.x - PLAYER_WIDTH;
          else if (pl.vx < 0) pl.x = s.x + s.w;
          pl.vx = 0;
        }
      }

      // Vertical Move + Collision
      pl.y += pl.vy * dt;
      pl.onGround = false;
      for (const s of solids) {
        if (rectsOverlap({ x: pl.x, y: pl.y, w: PLAYER_WIDTH, h: PLAYER_HEIGHT }, s)) {
          if (pl.vy > 0) {
            pl.y = s.y - PLAYER_HEIGHT;
            pl.vy = 0;
            pl.onGround = true;
          } else if (pl.vy < 0) {
            pl.y = s.y + s.h;
            pl.vy = 0;
          }
        }
      }

      // Clamp bottom safety
      if (pl.y > WORLD_HEIGHT - PLAYER_HEIGHT) {
        pl.y = WORLD_HEIGHT - PLAYER_HEIGHT;
        pl.vy = 0;
        pl.onGround = true;
      }

      // Anim state
      if (nowMs < pl.attackUntil) pl.anim = 'attack';
      else if (!pl.onGround) pl.anim = pl.vy < 0 ? 'jump' : 'fall';
      else if (Math.abs(pl.vx) > 4) pl.anim = 'run';
      else pl.anim = 'idle';
    };

    const tick = (perfNow: number) => {
      const dt = Math.min(0.04, (perfNow - lastTime) / 1000);
      lastTime = perfNow;
      const now = Date.now();
      const snap = worldRef.current;

      // Dynamic solid blockers
      const solids: Rect[] = [...STATIC_PLATFORMS];
      const gate1Open = snap.puzzles.gate1LockedOpen || snap.puzzles.leverPulledUntil > now;
      if (!gate1Open) solids.push(GATE1_RECT);
      if (!snap.puzzles.secretDoorOpen) solids.push(SECRET_DOOR_RECT);

      const keys = keysRef.current;
      const activeSlot = localSlotRef.current;

      if (mode === 'online' || mode === 'solo') {
        const left = keys.has('KeyA') || keys.has('ArrowLeft');
        const right = keys.has('KeyD') || keys.has('ArrowRight');
        const jump = keys.has('KeyW') || keys.has('ArrowUp') || keys.has('Space');
        stepPlayerPhysics(snap.players[activeSlot], left, right, jump, dt, solids, now, true);
      } else {
        // Local mode: WASD (+Space for activeSlot) controls activeSlot, and Arrows always drive P2 when activeSlot is P1!
        const p1Left = activeSlot === 'p1' ? keys.has('KeyA') : false;
        const p1Right = activeSlot === 'p1' ? keys.has('KeyD') : false;
        const p1Jump = activeSlot === 'p1' ? keys.has('KeyW') || keys.has('Space') : false;
        stepPlayerPhysics(snap.players.p1, p1Left, p1Right, p1Jump, dt, solids, now, true);

        const p2Left = activeSlot === 'p2' ? keys.has('KeyA') || keys.has('ArrowLeft') : keys.has('ArrowLeft');
        const p2Right = activeSlot === 'p2' ? keys.has('KeyD') || keys.has('ArrowRight') : keys.has('ArrowRight');
        const p2Jump =
          activeSlot === 'p2'
            ? keys.has('KeyW') || keys.has('ArrowUp') || keys.has('Space')
            : keys.has('ArrowUp');
        stepPlayerPhysics(snap.players.p2, p2Left, p2Right, p2Jump, dt, solids, now, true);
      }

      // Update patrolling enemies
      for (const enemy of snap.enemies) {
        if (!enemy.alive) {
          if (mode !== 'online' && enemy.respawnAt > 0 && now >= enemy.respawnAt) {
            enemy.alive = true;
            enemy.hp = enemy.maxHp;
            enemy.respawnAt = 0;
          }
          continue;
        }
        enemy.x += enemy.vx * dt;
        if (enemy.x <= enemy.minX) {
          enemy.x = enemy.minX;
          enemy.vx = Math.abs(enemy.vx);
        } else if (enemy.x >= enemy.maxX) {
          enemy.x = enemy.maxX;
          enemy.vx = -Math.abs(enemy.vx);
        }
      }

      // Check Spikes, Enemy Damage, & Twin Switch Pressure Standing
      const checkPlayerHazards = (slot: PlayerSlot) => {
        const pl = snap.players[slot];
        if (!pl.connected) return;
        const pRect: Rect = { x: pl.x + 2, y: pl.y + 2, w: PLAYER_WIDTH - 4, h: PLAYER_HEIGHT - 2 };

        let damaged = false;
        for (const sp of SPIKE_ZONES) {
          if (rectsOverlap(pRect, { x: sp.x, y: sp.y, w: sp.w, h: 10 })) {
            damaged = true;
            break;
          }
        }
        if (!damaged) {
          for (const enemy of snap.enemies) {
            if (!enemy.alive) continue;
            if (rectsOverlap(pRect, { x: enemy.x - 6, y: enemy.y - 10, w: 12, h: 12 })) {
              damaged = true;
              break;
            }
          }
        }

        if (damaged && now >= pl.invulnUntil) {
          soundFX.hurt();
          shakeRef.current = { intensity: 4, until: perfNow + 250 };
          spawnBurst(pl.x + 7, pl.y + 10, '#d94848', 10);
          const cp = getNearestCheckpoint(pl.x);
          if (mode === 'online') {
            pl.invulnUntil = now + 1100;
            pl.vy = -190;
            sendWs({ type: 'player:damage', amount: 1, respawnX: cp.x, respawnY: cp.y });
          } else {
            pl.invulnUntil = now + 1100;
            pl.hp = Math.max(0, pl.hp - 1);
            pl.vy = -190;
            if (pl.hp <= 0) {
              pl.lives = Math.max(0, pl.lives - 1);
              if (pl.lives <= 0) {
                pl.lives = 3;
                pl.geo = Math.max(0, pl.geo - 25);
              }
              pl.hp = pl.maxHp;
              pl.x = cp.x;
              pl.y = cp.y;
              pl.vx = 0;
              pl.vy = 0;
            }
            setHudState({ ...snap });
          }
        }

        // Standing directly on Left or Right Twin Switches
        const pxCenter = pl.x + PLAYER_WIDTH / 2;
        const pyBottom = pl.y + PLAYER_HEIGHT;
        const onLeft =
          Math.abs(pxCenter - INTERACTABLES.switchLeft.x) < 20 &&
          Math.abs(pyBottom - INTERACTABLES.switchLeft.y) < 12;
        const onRight =
          Math.abs(pxCenter - INTERACTABLES.switchRight.x) < 20 &&
          Math.abs(pyBottom - INTERACTABLES.switchRight.y) < 12;

        if (mode === 'local' || mode === 'solo') {
          const latchDuration = mode === 'solo' ? 3600000 : 400;
          if (onLeft) snap.puzzles.switchLeftActiveUntil = now + latchDuration;
          if (onRight) snap.puzzles.switchRightActiveUntil = now + latchDuration;
          if (
            !snap.puzzles.secretDoorOpen &&
            snap.puzzles.switchLeftActiveUntil > now &&
            snap.puzzles.switchRightActiveUntil > now
          ) {
            snap.puzzles.secretDoorOpen = true;
            snap.players.p1.geo += 100;
            if (mode !== 'solo') snap.players.p2.geo += 100;
            soundFX.doorOpen();
            shakeRef.current = { intensity: 5, until: perfNow + 520 };
            showBanner(
              mode === 'solo'
                ? 'تم تفعيل المفتاحين وانفتح الباب السري إلى قدس طاسيلي (+100 Geo)'
                : 'تزامن رائع! انفتح الباب السري إلى قدس طاسيلي (+100 Geo)'
            );
            setHudState({ ...snap });
          }
        } else if (slot === activeSlot && (onLeft || onRight) && perfNow - lastSwitchStandRef.current > 280) {
          lastSwitchStandRef.current = perfNow;
          sendWs({ type: 'puzzle:switchStand', side: onLeft ? 'left' : 'right' });
        }

        // Auto-trigger victory when reaching the Monolith after secret door opens
        if (
          mode !== 'online' &&
          snap.puzzles.secretDoorOpen &&
          !snap.puzzles.victoryTriggered
        ) {
          const d1 = Math.hypot(snap.players.p1.x - INTERACTABLES.monolith.x, snap.players.p1.y - INTERACTABLES.monolith.y);
          const d2 = Math.hypot(snap.players.p2.x - INTERACTABLES.monolith.x, snap.players.p2.y - INTERACTABLES.monolith.y);
          if ((mode === 'solo' && d1 < 52) || (mode === 'local' && d1 < 52 && d2 < 52)) {
            snap.puzzles.victoryTriggered = true;
            snap.puzzles.completedAt = now;
            soundFX.plateBlessing();
            setHudState({ ...snap });
          }
        }
      };

      if (mode === 'online') {
        checkPlayerHazards(activeSlot);
        if (perfNow - lastNetSyncRef.current > 34) {
          lastNetSyncRef.current = perfNow;
          const p = snap.players[activeSlot];
          sendWs({
            type: 'player:update',
            x: Math.round(p.x * 10) / 10,
            y: Math.round(p.y * 10) / 10,
            vx: Math.round(p.vx),
            vy: Math.round(p.vy),
            facing: p.facing,
            onGround: p.onGround,
            anim: p.anim,
          });
        }
      } else if (mode === 'solo') {
        checkPlayerHazards('p1');
      } else {
        checkPlayerHazards('p1');
        checkPlayerHazards('p2');
      }

      // Step particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 180 * dt;
        p.life -= dt;
        return p.life > 0;
      });

      // Smooth Camera tracking active controlled player
      const tracked = snap.players[activeSlot];
      const targetCam = clampWorldCamera(tracked.x + PLAYER_WIDTH / 2, tracked.y);
      cameraRef.current.x += (targetCam.x - cameraRef.current.x) * 0.14;
      cameraRef.current.y += (targetCam.y - cameraRef.current.y) * 0.14;

      // Context-sensitive Interaction Prompt
      let hint: string | null = null;
      const px = tracked.x + PLAYER_WIDTH / 2;
      const py = tracked.y + PLAYER_HEIGHT / 2;
      if (Math.hypot(px - INTERACTABLES.lever1.x, py - INTERACTABLES.lever1.y) < 34 && !snap.puzzles.gate1LockedOpen) {
        hint = mode === 'solo' ? 'اضغط [تفاعل / E] لفتح البوابة الحجرية' : 'اضغط [E] لسحب رافعة البوابة الحجرية';
      } else if (
        mode !== 'solo' &&
        Math.hypot(px - INTERACTABLES.counterweight1.x, py - INTERACTABLES.counterweight1.y) < 34 &&
        !snap.puzzles.gate1LockedOpen
      ) {
        hint = 'اضغط [E] لتثبيت ثقل الموازنة وفتح البوابة نهائياً';
      } else if (Math.hypot(px - INTERACTABLES.plate.x, py - INTERACTABLES.plate.y) < 48 && !snap.puzzles.plateClaimed) {
        hint =
          mode === 'solo'
            ? 'طبق جزائري تقليدي: اضغط [تفاعل / E] لنيل البركة'
            : 'طبق جزائري تقليدي: تجمّعا معاً واضغطا [E] لنيل البركة';
      } else if (Math.hypot(px - INTERACTABLES.switchLeft.x, py - INTERACTABLES.switchLeft.y) < 32 && !snap.puzzles.secretDoorOpen) {
        hint =
          mode === 'solo'
            ? 'المفتاح الغربي: اضغط [E] لتفعيل الرمز ثم اتجه للمفتاح الشرقي'
            : 'المفتاح الغربي: قفا على المفتاحين معاً واضغطا [E] في نفس اللحظة';
      } else if (Math.hypot(px - INTERACTABLES.switchRight.x, py - INTERACTABLES.switchRight.y) < 32 && !snap.puzzles.secretDoorOpen) {
        hint =
          mode === 'solo'
            ? 'المفتاح الشرقي: اضغط [E] لتفعيل الرمز وفتح الباب السري'
            : 'المفتاح الشرقي: قفا على المفتاحين معاً واضغطا [E] في نفس اللحظة';
      } else if (
        snap.puzzles.secretDoorOpen &&
        Math.hypot(px - INTERACTABLES.monolith.x, py - INTERACTABLES.monolith.y) < 55
      ) {
        hint =
          mode === 'solo'
            ? 'اضغط [E] عند نصب طاسيلي لإتمام الرحلة'
            : 'اجتمعا عند نصب طاسيلي واضغطا [E] لإتمام الرحلة';
      }

      // Render Frame
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawGameWorld(ctx, {
            players: snap.players,
            localSlot: activeSlot,
            puzzles: snap.puzzles,
            enemies: snap.enemies,
            signals: snap.signals,
            particles: particlesRef.current,
            cameraX: cameraRef.current.x,
            cameraY: cameraRef.current.y,
            shake: shakeRef.current,
            now,
            interactionHint: hint,
          });
        }
      }

      // Periodic HUD refresh for smooth Soul/Chat updates
      hudSyncTimer += dt;
      if (hudSyncTimer > 0.18) {
        hudSyncTimer = 0;
        setNearInteract(Boolean(hint));
        setHudState({ ...snap });
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mode, sendWs, showBanner, spawnBurst]);

  const handleRestart = () => {
    soundFX.menuClick();
    if (mode === 'online') {
      sendWs({ type: 'room:reset' });
    } else {
      worldRef.current = createLocalSnapshot(mode === 'solo');
      cameraRef.current = { x: 0, y: 0 };
      setHudState({ ...worldRef.current });
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundFX.setMuted(next);
  };

  const holdKey = (code: string, active: boolean) => {
    if (active) keysRef.current.add(code);
    else keysRef.current.delete(code);
  };

  const activePlayer = hudState.players[localSlot];

  return (
    <div className="relative w-full h-full bg-[#06070c] overflow-hidden">
      {/* Pixel Art Side-Scrolling Canvas */}
      <canvas
        ref={canvasRef}
        width={VIEW_WIDTH}
        height={VIEW_HEIGHT}
        className="pixel-canvas w-full h-full object-contain bg-[#06080e]"
      />

      {/* Gameplay HUD */}
      <GameHud
        mode={mode}
        roomCode={mode === 'online' ? hudState.code : null}
        localSlot={localSlot}
        players={hudState.players}
        puzzles={hudState.puzzles}
        chat={hudState.chat}
        muted={muted}
        showTouchControls={showTouchControls}
        onToggleTouchControls={onCycleTouchMode}
        onToggleMute={toggleMute}
        onSendSignal={triggerSignal}
        onSendChat={sendChat}
        onSwitchLocalPlayer={mode === 'local' ? switchLocalPlayer : undefined}
        onLeaveToMenu={onLeaveToMenu}
        eventBanner={eventBanner}
      />

      {/* Professional Mobile Touch Gamepad Controls */}
      {showTouchControls && !hudState.puzzles.victoryTriggered && (
        <MobileControls
          onHoldKey={(code, active) => holdKey(code, active)}
          onJumpTap={() => {}}
          onAttack={() => handleAttackForSlot(localSlot)}
          onInteract={() => handleInteractionForSlot(localSlot)}
          onHeal={() => handleHealForSlot(localSlot)}
          canHeal={activePlayer.soul >= 33 && activePlayer.hp < activePlayer.maxHp}
          canInteract={nearInteract}
        />
      )}

      {/* Victory Sanctuary Modal */}
      {hudState.puzzles.victoryTriggered && (
        <div className="absolute inset-0 z-30 bg-[#05070c]/82 flex items-center justify-center p-3">
          <div
            className={`w-full max-w-md bg-[#0e131e] border-2 border-[#e5a93c] text-center shadow-2xl ${
              isCompactLandscape ? 'p-4' : 'p-6'
            }`}
          >
            <div className={`flex justify-center ${isCompactLandscape ? 'mb-1.5' : 'mb-3'}`}>
              <div
                className={`bg-[#1a2232] border border-[#e5a93c] flex items-center justify-center ${
                  isCompactLandscape ? 'w-9 h-9' : 'w-12 h-12'
                }`}
              >
                <Trophy className={`${isCompactLandscape ? 'w-5 h-5' : 'w-6 h-6'} text-[#f0b24a]`} />
              </div>
            </div>
            <h2
              className={`font-display font-bold text-[#f4ead5] ${
                isCompactLandscape ? 'text-xl mb-1' : 'text-3xl mb-2'
              }`}
            >
              انكشف ما خفي أعظم!
            </h2>
            <p className={`text-[#c7b38b] leading-relaxed ${isCompactLandscape ? 'text-xs mb-3' : 'text-sm mb-5'}`}>
              {mode === 'solo'
                ? 'نجحت في فك رموز كهوف طاسيلي والوصول إلى أسرار الأجداد.'
                : 'تعاونكما في كهوف طاسيلي فتح البوابات المغلقة وأعاد إحياء أسرار الأجداد.'}
            </p>

            <div
              className={`grid grid-cols-2 bg-[#090c14] border border-[#2d3240] text-xs ${
                isCompactLandscape ? 'gap-2 mb-3 p-2' : 'gap-3 mb-5 p-3'
              }`}
            >
              <div className={mode === 'solo' ? 'col-span-2' : ''}>
                <div className="text-[#9e9482]">ثروة {hudState.players.p1.name}</div>
                <div className="font-mono-nums font-bold text-[#f0b24a] text-sm mt-0.5">
                  {hudState.players.p1.geo} Geo
                </div>
              </div>
              {mode !== 'solo' && (
                <div>
                  <div className="text-[#9e9482]">ثروة {hudState.players.p2.name}</div>
                  <div className="font-mono-nums font-bold text-[#60cde6] text-sm mt-0.5">
                    {hudState.players.p2.geo} Geo
                  </div>
                </div>
              )}
              <div className="col-span-2 pt-2 border-t border-[#232836] flex justify-between text-[#d7cbb4]">
                <span>بركة الطبق الجزائري:</span>
                <span className="font-bold text-[#e5a93c]">
                  {hudState.puzzles.plateClaimed ? 'تم النيل بنجاح' : 'لم يُجمع'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRestart}
                className="flex-1 py-2.5 px-4 bg-[#1a2536] border border-[#e5a93c] hover:bg-[#233247] text-sm font-bold text-[#f5ebd6] flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-[#e5a93c]" />
                <span>إعادة اللعب</span>
              </button>
              <button
                type="button"
                onClick={onLeaveToMenu}
                className="flex-1 py-2.5 px-4 bg-[#121621] border border-[#3a3f4d] hover:border-[#60cde6] text-sm font-semibold text-[#d7cbb4] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>القائمة الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
