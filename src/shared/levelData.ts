export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpikeZone {
  x: number;
  y: number;
  w: number;
}

export interface TassiliMural {
  x: number;
  y: number;
  variant: 'hunters' | 'gazelle' | 'sundisk' | 'dancers';
}

export interface TorchProp {
  x: number;
  y: number;
  checkpointIndex?: number;
}

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 320;
export const VIEW_WIDTH = 480;
export const VIEW_HEIGHT = 270;

export const PLAYER_WIDTH = 14;
export const PLAYER_HEIGHT = 22;

export const GRAVITY = 820;
export const MOVE_SPEED = 128;
export const JUMP_VELOCITY = -312;

export const SPAWN_P1 = { x: 84, y: 228 };
export const SPAWN_P2 = { x: 126, y: 228 };

// Solid stone platforms and walls
export const STATIC_PLATFORMS: Rect[] = [
  // Left boundary wall
  { x: 0, y: 0, w: 24, h: 320 },
  // Chamber 1 Floor
  { x: 0, y: 250, w: 270, h: 70 },
  // Spike pit 1 bed
  { x: 270, y: 268, w: 60, h: 52 },
  // Chamber 1-2 Floor up to Spike pit 2
  { x: 330, y: 250, w: 590, h: 70 },
  // Chamber 2 Lever ledges
  { x: 500, y: 212, w: 72, h: 14 },
  { x: 586, y: 174, w: 84, h: 14 },
  { x: 486, y: 136, w: 92, h: 14 },
  // Gate 1 overhead stone arch (forces going underneath gate1)
  { x: 720, y: 0, w: 42, h: 174 },
  // Spike pit 2 bed
  { x: 920, y: 268, w: 60, h: 52 },
  // Chamber 3 Sanctuary Floor (Traditional Algerian Plate area)
  { x: 980, y: 250, w: 640, h: 70 },
  // Raised stone plinth for the traditional Algerian plate
  { x: 1138, y: 244, w: 66, h: 6 },
  // Chamber 4 West Switch Platforms
  { x: 1510, y: 212, w: 76, h: 14 },
  { x: 1410, y: 174, w: 90, h: 14 },
  // Spike pit 3 bed
  { x: 1620, y: 272, w: 240, h: 48 },
  // Stepping pillars across spike pit 3
  { x: 1652, y: 222, w: 60, h: 16 },
  { x: 1756, y: 222, w: 66, h: 16 },
  // Chamber 4 East Floor + Victory Vault Floor
  { x: 1860, y: 250, w: 540, h: 70 },
  // Chamber 4 East Switch Platforms
  { x: 1890, y: 212, w: 76, h: 14 },
  { x: 1986, y: 174, w: 90, h: 14 },
  // Secret Door overhead stone wall
  { x: 2120, y: 0, w: 40, h: 174 },
  // Far right boundary wall
  { x: 2376, y: 0, w: 24, h: 320 },
  // Natural cavern ceiling overhang segments
  { x: 0, y: 0, w: 2400, h: 22 },
];

export const GATE1_RECT: Rect = { x: 730, y: 174, w: 20, h: 76 };
export const SECRET_DOOR_RECT: Rect = { x: 2130, y: 174, w: 20, h: 76 };

export const SPIKE_ZONES: SpikeZone[] = [
  { x: 272, y: 260, w: 56 },
  { x: 922, y: 260, w: 56 },
  { x: 1624, y: 264, w: 232 },
];

export const INTERACTABLES = {
  lever1: { x: 526, y: 136, radius: 28 },
  counterweight1: { x: 825, y: 250, radius: 28 },
  plate: { x: 1171, y: 244, radius: 44 },
  switchLeft: { x: 1455, y: 174, radius: 26 },
  switchRight: { x: 2031, y: 174, radius: 26 },
  monolith: { x: 2280, y: 250, radius: 44 },
};

export const CHECKPOINTS: TorchProp[] = [
  { x: 105, y: 250, checkpointIndex: 0 },
  { x: 430, y: 250, checkpointIndex: 1 },
  { x: 1030, y: 250, checkpointIndex: 2 },
  { x: 1380, y: 250, checkpointIndex: 3 },
  { x: 1880, y: 250, checkpointIndex: 4 },
];

export const TASSILI_MURALS: TassiliMural[] = [
  { x: 170, y: 175, variant: 'hunters' },
  { x: 390, y: 180, variant: 'gazelle' },
  { x: 635, y: 115, variant: 'sundisk' },
  { x: 1095, y: 175, variant: 'dancers' },
  { x: 1245, y: 175, variant: 'gazelle' },
  { x: 1550, y: 130, variant: 'sundisk' },
  { x: 1960, y: 130, variant: 'hunters' },
  { x: 2255, y: 170, variant: 'sundisk' },
];

export const INITIAL_ENEMIES = [
  { id: 'wisp-1', x: 380, y: 234, vx: 38, minX: 350, maxX: 465, hp: 2, maxHp: 2 },
  { id: 'wisp-2', x: 1280, y: 234, vx: -42, minX: 1230, maxX: 1370, hp: 2, maxHp: 2 },
  { id: 'wisp-3', x: 1940, y: 234, vx: 40, minX: 1900, maxX: 2080, hp: 3, maxHp: 3 },
];
