export type PlayerSlot = 'p1' | 'p2';

export type PlayerAnimState = 'idle' | 'run' | 'jump' | 'fall' | 'interact' | 'attack';

export type QuickSignalType = 'here' | 'lever' | 'sync' | 'wait';

export interface PlayerState {
  slot: PlayerSlot;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  anim: PlayerAnimState;
  hp: number;
  maxHp: number;
  soul: number; // 0..100
  lives: number;
  geo: number;
  invulnUntil: number;
  attackUntil: number;
  connected: boolean;
}

export interface PuzzleState {
  leverPulledUntil: number; // timestamp ms while gate1 is temporarily lifted
  gate1LockedOpen: boolean;
  switchLeftActiveUntil: number;
  switchRightActiveUntil: number;
  secretDoorOpen: boolean;
  plateClaimed: boolean;
  plateNearbyCount: number;
  victoryTriggered: boolean;
  startedAt: number;
  completedAt: number | null;
}

export interface EnemyState {
  id: string;
  x: number;
  y: number;
  vx: number;
  minX: number;
  maxX: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnAt: number;
}

export interface ChatMessage {
  id: string;
  senderSlot: PlayerSlot | 'system';
  senderName: string;
  text: string;
  timestamp: number;
}

export interface ActiveSignal {
  id: string;
  slot: PlayerSlot;
  type: QuickSignalType;
  label: string;
  expiresAt: number;
}

export interface RoomSnapshot {
  code: string;
  players: Record<PlayerSlot, PlayerState>;
  puzzles: PuzzleState;
  enemies: EnemyState[];
  chat: ChatMessage[];
  signals: ActiveSignal[];
}

// Client -> Server WebSocket messages
export type ClientWsMessage =
  | { type: 'room:create'; playerName?: string }
  | { type: 'room:join'; code: string; playerName?: string }
  | { type: 'room:reset' }
  | {
      type: 'player:update';
      x: number;
      y: number;
      vx: number;
      vy: number;
      facing: 1 | -1;
      onGround: boolean;
      anim: PlayerAnimState;
    }
  | { type: 'player:damage'; amount: number; respawnX: number; respawnY: number }
  | { type: 'player:heal' }
  | { type: 'player:gainSoul'; amount: number; geo: number }
  | { type: 'enemy:hit'; enemyId: string; knockDir: 1 | -1 }
  | { type: 'puzzle:interact'; target: 'lever1' | 'counterweight1' | 'switchLeft' | 'switchRight' | 'plate' | 'monolith' }
  | { type: 'puzzle:switchStand'; side: 'left' | 'right' }
  | { type: 'signal:send'; signalType: QuickSignalType }
  | { type: 'chat:send'; text: string };

// Server -> Client WebSocket messages
export type ServerWsMessage =
  | { type: 'room:joined'; code: string; slot: PlayerSlot; snapshot: RoomSnapshot }
  | { type: 'room:error'; message: string }
  | { type: 'room:state'; snapshot: RoomSnapshot }
  | {
      type: 'player:moved';
      slot: PlayerSlot;
      x: number;
      y: number;
      vx: number;
      vy: number;
      facing: 1 | -1;
      onGround: boolean;
      anim: PlayerAnimState;
    }
  | { type: 'signal:received'; signal: ActiveSignal }
  | { type: 'chat:received'; message: ChatMessage }
  | { type: 'puzzle:event'; event: 'gate1_temp' | 'gate1_locked' | 'secret_open' | 'plate_blessing' | 'plate_need_partner' | 'victory' };

export const QUICK_SIGNALS: Record<QuickSignalType, { label: string; short: string }> = {
  here: { label: 'تعال هنا!', short: 'هنا!' },
  lever: { label: 'اسحب الرافعة!', short: 'الرافعة' },
  sync: { label: 'تزامن الآن!', short: 'تزامن!' },
  wait: { label: 'انتظرني', short: 'انتظر' },
};
