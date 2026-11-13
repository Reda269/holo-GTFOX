import {
  CHECKPOINTS,
  GATE1_RECT,
  INTERACTABLES,
  SECRET_DOOR_RECT,
  SPIKE_ZONES,
  STATIC_PLATFORMS,
  TASSILI_MURALS,
  TassiliMural,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WORLD_WIDTH,
} from '../shared/levelData.ts';
import {
  ActiveSignal,
  EnemyState,
  PlayerSlot,
  PlayerState,
  PuzzleState,
} from '../shared/protocol.ts';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface CameraShake {
  intensity: number;
  until: number;
}

export interface RenderContextData {
  players: Record<PlayerSlot, PlayerState>;
  localSlot: PlayerSlot;
  puzzles: PuzzleState;
  enemies: EnemyState[];
  signals: ActiveSignal[];
  particles: Particle[];
  cameraX: number;
  cameraY: number;
  shake: CameraShake;
  now: number;
  interactionHint: string | null;
}

const PALETTE = {
  bgDeep: '#07090f',
  bgMid: '#0e131e',
  pillarFar: '#121825',
  pillarNear: '#192130',
  stoneTop: '#3e3934',
  stoneMid: '#242936',
  stoneDark: '#141822',
  stoneEdge: '#595046',
  ochre: '#c98838',
  amber: '#f0b24a',
  soulCyan: '#60cde6',
  crimson: '#d44848',
};

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawTassiliMural(ctx: CanvasRenderingContext2D, mural: TassiliMural, camX: number, camY: number, glow = false) {
  const x = Math.round(mural.x - camX * 0.85);
  const y = Math.round(mural.y - camY * 0.85);
  if (x < -80 || x > VIEW_WIDTH + 80) return;

  const col = glow ? 'rgba(240, 178, 74, 0.55)' : 'rgba(182, 128, 74, 0.34)';
  const dim = 'rgba(120, 84, 52, 0.24)';
  ctx.fillStyle = col;

  if (mural.variant === 'hunters') {
    // Stylized Tassili archer & spearman rock painting
    // Archer body
    px(ctx, x, y, 2, 8, col);
    px(ctx, x - 1, y - 3, 4, 3, col); // head
    px(ctx, x - 3, y + 8, 2, 5, col); // leg L
    px(ctx, x + 2, y + 8, 2, 5, col); // leg R
    px(ctx, x + 2, y + 1, 5, 1, col); // bow arm
    px(ctx, x + 6, y - 3, 1, 9, col); // bow
    px(ctx, x + 7, y + 1, 4, 1, col); // arrow
    // Second figure with spear
    px(ctx, x + 18, y + 2, 2, 7, dim);
    px(ctx, x + 17, y - 1, 4, 3, dim);
    px(ctx, x + 15, y - 4, 10, 1, dim);
    px(ctx, x + 16, y + 9, 2, 4, dim);
    px(ctx, x + 20, y + 9, 2, 4, dim);
  } else if (mural.variant === 'gazelle') {
    // Tassili desert gazelle rock art
    px(ctx, x, y + 4, 11, 4, col); // torso
    px(ctx, x + 10, y - 1, 2, 6, col); // neck
    px(ctx, x + 11, y - 3, 4, 2, col); // head
    px(ctx, x + 9, y - 7, 1, 5, col); // horn 1
    px(ctx, x + 11, y - 8, 1, 5, col); // horn 2
    px(ctx, x + 1, y + 8, 1, 6, col);
    px(ctx, x + 4, y + 8, 1, 6, col);
    px(ctx, x + 8, y + 8, 1, 6, col);
    px(ctx, x + 10, y + 8, 1, 6, col);
  } else if (mural.variant === 'sundisk') {
    // Sacred Tassili sun spiral & concentric glyphs
    px(ctx, x + 4, y - 4, 8, 1, col);
    px(ctx, x + 4, y + 11, 8, 1, col);
    px(ctx, x, y, 1, 8, col);
    px(ctx, x + 15, y, 1, 8, col);
    px(ctx, x + 5, y + 1, 6, 6, dim);
    px(ctx, x + 7, y + 3, 2, 2, col);
    // Rays
    px(ctx, x + 7, y - 8, 2, 3, col);
    px(ctx, x + 7, y + 13, 2, 3, col);
    px(ctx, x - 4, y + 3, 3, 2, col);
    px(ctx, x + 17, y + 3, 3, 2, col);
  } else {
    // Ceremonial dancers
    for (let i = 0; i < 3; i++) {
      const dx = x + i * 11;
      px(ctx, dx + 1, y, 2, 7, col);
      px(ctx, dx, y - 3, 4, 3, col);
      px(ctx, dx - 2, y - 1, 2, 2, col);
      px(ctx, dx + 3, y - 1, 2, 2, col);
      px(ctx, dx, y + 7, 1, 5, col);
      px(ctx, dx + 3, y + 7, 1, 5, col);
    }
  }
}

function drawParallaxBackground(ctx: CanvasRenderingContext2D, camX: number, camY: number, now: number) {
  // Deep cave void gradient
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  grad.addColorStop(0, '#05070c');
  grad.addColorStop(0.6, '#0c111c');
  grad.addColorStop(1, '#121622');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // Far ancient stone pillars & archways (parallax 0.35)
  const farOffset = -(camX * 0.35) % 160;
  for (let gx = farOffset - 160; gx < VIEW_WIDTH + 160; gx += 160) {
    px(ctx, gx + 20, 18, 26, VIEW_HEIGHT - 18, '#0c1019');
    px(ctx, gx + 16, 18, 34, 14, '#111622');
    // Arch silhouette
    px(ctx, gx + 46, 28, 94, 10, '#0b0f18');
    px(ctx, gx + 62, 38, 62, 8, '#0a0d15');
    // Distant hanging stalactites
    px(ctx, gx + 88, 20, 6, 36, '#0d121d');
    px(ctx, gx + 90, 56, 2, 16, '#0d121d');
    px(ctx, gx + 125, 20, 8, 24, '#0d121d');
  }

  // Midground carved ruins (parallax 0.65)
  const midOffset = -(camX * 0.65) % 240;
  for (let mx = midOffset - 240; mx < VIEW_WIDTH + 240; mx += 240) {
    px(ctx, mx + 95, 26, 48, 230, '#101522');
    px(ctx, mx + 91, 44, 56, 6, '#171f30');
    px(ctx, mx + 91, 210, 56, 8, '#171f30');
    // Faint geometric Amazigh diamond carving on pillar
    px(ctx, mx + 117, 105, 4, 4, 'rgba(201,136,56,0.16)');
    px(ctx, mx + 115, 109, 8, 4, 'rgba(201,136,56,0.16)');
    px(ctx, mx + 117, 113, 4, 4, 'rgba(201,136,56,0.16)');
  }

  // Volumetric subterranean light shafts piercing cave ceiling
  for (let i = 0; i < 4; i++) {
    const shaftX = ((i * 155 - camX * 0.45) % (VIEW_WIDTH + 160) + (VIEW_WIDTH + 160)) % (VIEW_WIDTH + 160) - 80;
    const pulse = 0.045 + 0.02 * Math.sin(now * 0.0012 + i * 1.9);
    const beamGrad = ctx.createLinearGradient(shaftX, 0, shaftX + 36, VIEW_HEIGHT);
    beamGrad.addColorStop(0, `rgba(110, 198, 224, ${pulse * 1.4})`);
    beamGrad.addColorStop(0.65, `rgba(240, 178, 74, ${pulse * 0.7})`);
    beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(shaftX, 0);
    ctx.lineTo(shaftX + 26, 0);
    ctx.lineTo(shaftX + 74, VIEW_HEIGHT);
    ctx.lineTo(shaftX + 22, VIEW_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  // Tassili historical rock art murals (subtle warm glow pulse)
  for (const mural of TASSILI_MURALS) {
    drawTassiliMural(ctx, mural, camX, camY, Math.sin(now * 0.002 + mural.x) > 0.35);
  }

  // Drifting subterranean mist layers near cavern floor
  for (let m = 0; m < 5; m++) {
    const mx = ((m * 130 + now * 0.009 * (m % 2 === 0 ? 1 : -0.7) - camX * 0.5) % (VIEW_WIDTH + 140) + (VIEW_WIDTH + 140)) % (VIEW_WIDTH + 140) - 70;
    const my = VIEW_HEIGHT - 36 + Math.sin(now * 0.0014 + m) * 4;
    ctx.fillStyle = m % 2 === 0 ? 'rgba(96, 205, 230, 0.045)' : 'rgba(201, 136, 56, 0.04)';
    ctx.fillRect(Math.round(mx), Math.round(my), 86, 12);
    ctx.fillRect(Math.round(mx + 14), Math.round(my - 4), 52, 4);
  }

  // Rich ambient drifting spores & glowing fireflies
  for (let i = 0; i < 38; i++) {
    const sx = ((i * 61 + now * 0.015 * (i % 2 === 0 ? 1 : 0.65) - camX * 0.42) % VIEW_WIDTH + VIEW_WIDTH) % VIEW_WIDTH;
    const sy = ((i * 37 + Math.sin(now * 0.0014 + i) * 16) % (VIEW_HEIGHT - 38)) + 18;
    const alpha = 0.25 + 0.28 * Math.sin(now * 0.0028 + i * 1.7);
    ctx.fillStyle = i % 3 === 0 ? `rgba(96,205,230,${alpha})` : `rgba(245,190,82,${alpha})`;
    const sz = i % 5 === 0 ? 2 : 1;
    ctx.fillRect(Math.round(sx), Math.round(sy), sz, sz);
  }
}

function drawStoneBlock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  px(ctx, x, y, w, h, PALETTE.stoneDark);
  px(ctx, x, y, w, Math.min(5, h), PALETTE.stoneTop);
  px(ctx, x, y, w, 1, PALETTE.stoneEdge);
  // Subtle brick lines
  ctx.fillStyle = PALETTE.stoneMid;
  for (let bx = x + 4; bx < x + w - 4; bx += 18) {
    ctx.fillRect(bx, y + 6, 12, Math.min(4, Math.max(0, h - 8)));
  }
  // Vertical edge highlights
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
}

function drawCheckpointTorch(ctx: CanvasRenderingContext2D, x: number, y: number, camX: number, camY: number, now: number, active: boolean) {
  const sx = Math.round(x - camX);
  const sy = Math.round(y - camY);
  if (sx < -40 || sx > VIEW_WIDTH + 40) return;

  // Stone brazier stand
  px(ctx, sx - 5, sy - 10, 10, 10, '#2c2927');
  px(ctx, sx - 7, sy - 13, 14, 4, '#443c35');
  px(ctx, sx - 4, sy - 2, 8, 2, '#1d1b1a');

  // Flickering flame
  const flicker = Math.sin(now * 0.015 + x) > 0 ? 1 : 0;
  const glowR = active ? 46 + flicker * 4 : 32 + flicker * 3;
  const rad = ctx.createRadialGradient(sx, sy - 18, 2, sx, sy - 18, glowR);
  rad.addColorStop(0, active ? 'rgba(245, 190, 80, 0.32)' : 'rgba(220, 140, 55, 0.2)');
  rad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rad;
  ctx.fillRect(sx - glowR, sy - 18 - glowR, glowR * 2, glowR * 2);

  px(ctx, sx - 3, sy - 18 - flicker, 6, 5 + flicker, '#e06b24');
  px(ctx, sx - 2, sy - 20 - flicker, 4, 4, '#f5bc42');
  px(ctx, sx - 1, sy - 18, 2, 2, '#fff3c4');

  // Rising torch embers
  for (let e = 0; e < 3; e++) {
    const life = ((now * 0.025 + e * 11 + x) % 24);
    const ex = sx + Math.round(Math.sin(now * 0.008 + e * 2.3) * 4);
    const ey = sy - 20 - Math.round(life);
    ctx.fillStyle = life < 12 ? 'rgba(255, 224, 130, 0.85)' : 'rgba(235, 110, 45, 0.45)';
    ctx.fillRect(ex, ey, 1, 1);
  }
}

function drawTraditionalPlate(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  puzzles: PuzzleState,
  now: number
) {
  const sx = Math.round(INTERACTABLES.plate.x - camX);
  const sy = Math.round(INTERACTABLES.plate.y - camY);
  if (sx < -60 || sx > VIEW_WIDTH + 60) return;

  // Warm ceremonial aura above the Algerian plate
  const auraR = puzzles.plateClaimed ? 36 : 52 + Math.sin(now * 0.005) * 5;
  const grad = ctx.createRadialGradient(sx, sy - 8, 2, sx, sy - 8, auraR);
  grad.addColorStop(0, puzzles.plateClaimed ? 'rgba(96,205,230,0.22)' : 'rgba(240,178,74,0.34)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(sx - auraR, sy - 8 - auraR, auraR * 2, auraR * 2);

  // Ornate Algerian ceramic & brass platter (Tmar / Traditional Dates Dish)
  // Platter foot & rim
  px(ctx, sx - 9, sy - 2, 18, 2, '#8d6529');
  px(ctx, sx - 14, sy - 5, 28, 3, '#d9a441');
  px(ctx, sx - 12, sy - 4, 24, 2, '#f2cc72');
  // Decorative geometric trim
  px(ctx, sx - 10, sy - 4, 2, 1, '#9b2e2e');
  px(ctx, sx - 4, sy - 4, 2, 1, '#9b2e2e');
  px(ctx, sx + 2, sy - 4, 2, 1, '#9b2e2e');
  px(ctx, sx + 8, sy - 4, 2, 1, '#9b2e2e');

  if (!puzzles.plateClaimed) {
    // Mound of glossy Deglet Nour dates (تمر)
    px(ctx, sx - 10, sy - 8, 20, 3, '#5a2d14');
    px(ctx, sx - 8, sy - 11, 16, 3, '#733a1a');
    px(ctx, sx - 5, sy - 13, 10, 2, '#8b4922');
    // Glossy highlights on dates
    px(ctx, sx - 6, sy - 10, 2, 1, '#c97d42');
    px(ctx, sx - 1, sy - 12, 2, 1, '#d48d52');
    px(ctx, sx + 4, sy - 9, 2, 1, '#c97d42');

    // Floating sparkle above the plate
    const bob = Math.round(Math.sin(now * 0.006) * 2);
    px(ctx, sx - 1, sy - 20 + bob, 2, 2, '#ffe89e');
  } else {
    // Claimed peaceful glow orb
    px(ctx, sx - 3, sy - 9, 6, 3, '#60cde6');
  }
}

function drawPuzzleProps(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  puzzles: PuzzleState,
  now: number
) {
  // 1. Lever 1 (Upper Left Ledge)
  {
    const lx = Math.round(INTERACTABLES.lever1.x - camX);
    const ly = Math.round(INTERACTABLES.lever1.y - camY);
    const active = puzzles.gate1LockedOpen || puzzles.leverPulledUntil > now;
    px(ctx, lx - 7, ly - 5, 14, 5, '#3b3630');
    px(ctx, lx - 5, ly - 7, 10, 2, '#574e44');
    // Lever arm tilted left (off) or right (pulled)
    if (active) {
      px(ctx, lx + 1, ly - 15, 2, 9, '#d9a441');
      px(ctx, lx + 2, ly - 17, 4, 4, '#f5c85b');
    } else {
      px(ctx, lx - 3, ly - 15, 2, 9, '#947e5c');
      px(ctx, lx - 5, ly - 17, 4, 4, '#c74c4c');
    }
    // Countdown bar when temporarily pulled
    if (!puzzles.gate1LockedOpen && puzzles.leverPulledUntil > now) {
      const pct = Math.max(0, Math.min(1, (puzzles.leverPulledUntil - now) / 9000));
      px(ctx, lx - 14, ly - 24, 28, 4, '#0b0e16');
      px(ctx, lx - 13, ly - 23, Math.round(26 * pct), 2, '#f0b24a');
    }
  }

  // 2. Gate 1 (Heavy Stone Portcullis)
  {
    const gateOpen = puzzles.gate1LockedOpen || puzzles.leverPulledUntil > now;
    const gx = Math.round(GATE1_RECT.x - camX);
    const offset = gateOpen ? -56 : 0;
    const gy = Math.round(GATE1_RECT.y - camY + offset);
    px(ctx, gx, gy, GATE1_RECT.w, GATE1_RECT.h, '#2b2826');
    px(ctx, gx + 2, gy + 2, GATE1_RECT.w - 4, GATE1_RECT.h - 4, '#1b1d24');
    // Carved vertical bars & rune lock
    for (let y = gy + 8; y < gy + GATE1_RECT.h - 6; y += 14) {
      px(ctx, gx + 4, y, GATE1_RECT.w - 8, 2, gateOpen ? '#e5a93c' : '#574b41');
    }
    px(ctx, gx + 7, gy + 32, 6, 8, puzzles.gate1LockedOpen ? '#60cde6' : '#c95444');
  }

  // 3. Counterweight 1 (Far side of Gate 1)
  {
    const cx = Math.round(INTERACTABLES.counterweight1.x - camX);
    const cy = Math.round(INTERACTABLES.counterweight1.y - camY);
    px(ctx, cx - 8, cy - 12, 16, 12, '#2d313d');
    px(ctx, cx - 10, cy - 14, 20, 3, '#4a433c');
    px(
      ctx,
      cx - 3,
      cy - 9,
      6,
      6,
      puzzles.gate1LockedOpen ? '#60cde6' : '#d96b43'
    );
  }

  // 4. Twin Simultaneous Switches (Chamber 4)
  const leftOn = puzzles.secretDoorOpen || puzzles.switchLeftActiveUntil > now;
  const rightOn = puzzles.secretDoorOpen || puzzles.switchRightActiveUntil > now;

  const drawSwitch = (wx: number, wy: number, on: boolean) => {
    const sx = Math.round(wx - camX);
    const sy = Math.round(wy - camY);
    // Stone rune altar
    px(ctx, sx - 12, sy - 4, 24, 4, '#36333a');
    px(ctx, sx - 8, sy - 7, 16, 3, on ? '#60cde6' : '#4f4640');
    // Standing glyph stone behind it
    px(ctx, sx - 5, sy - 24, 10, 17, '#222633');
    px(ctx, sx - 2, sy - 20, 4, 9, on ? '#f0b24a' : '#524942');
    if (on) {
      const r = 24 + Math.sin(now * 0.01) * 3;
      const g = ctx.createRadialGradient(sx, sy - 14, 1, sx, sy - 14, r);
      g.addColorStop(0, 'rgba(96,205,230,0.4)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - r, sy - 14 - r, r * 2, r * 2);
    }
  };

  drawSwitch(INTERACTABLES.switchLeft.x, INTERACTABLES.switchLeft.y, leftOn);
  drawSwitch(INTERACTABLES.switchRight.x, INTERACTABLES.switchRight.y, rightOn);

  // Harmonic beams connecting active switches to the Secret Door
  const doorTopX = Math.round(SECRET_DOOR_RECT.x + 10 - camX);
  const doorTopY = Math.round(SECRET_DOOR_RECT.y + 30 - camY);
  if (leftOn && !puzzles.secretDoorOpen) {
    ctx.strokeStyle = 'rgba(96, 205, 230, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(INTERACTABLES.switchLeft.x - camX, INTERACTABLES.switchLeft.y - 16 - camY);
    ctx.lineTo(doorTopX, doorTopY);
    ctx.stroke();
  }
  if (rightOn && !puzzles.secretDoorOpen) {
    ctx.strokeStyle = 'rgba(240, 178, 74, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(INTERACTABLES.switchRight.x - camX, INTERACTABLES.switchRight.y - 16 - camY);
    ctx.lineTo(doorTopX, doorTopY);
    ctx.stroke();
  }

  // 5. Secret Door
  {
    const dx = Math.round(SECRET_DOOR_RECT.x - camX);
    const dy = Math.round(SECRET_DOOR_RECT.y - camY + (puzzles.secretDoorOpen ? -64 : 0));
    px(ctx, dx, dy, SECRET_DOOR_RECT.w, SECRET_DOOR_RECT.h, '#29222b');
    px(ctx, dx + 2, dy + 2, SECRET_DOOR_RECT.w - 4, SECRET_DOOR_RECT.h - 4, '#16131c');
    // Dual lock emblems on the Secret Door
    px(ctx, dx + 5, dy + 24, 4, 6, leftOn ? '#60cde6' : '#574a5e');
    px(ctx, dx + 11, dy + 24, 4, 6, rightOn ? '#f0b24a' : '#574a5e');
    px(ctx, dx + 6, dy + 42, 8, 8, puzzles.secretDoorOpen ? '#ffe89e' : '#3a3140');
  }

  // 6. Victory Monolith (Sanctuary Relic)
  {
    const mx = Math.round(INTERACTABLES.monolith.x - camX);
    const my = Math.round(INTERACTABLES.monolith.y - camY);
    if (mx > -60 && mx < VIEW_WIDTH + 60) {
      const pulse = 0.25 + 0.12 * Math.sin(now * 0.004);
      const g = ctx.createRadialGradient(mx, my - 28, 3, mx, my - 28, 60);
      g.addColorStop(0, `rgba(240, 178, 74, ${pulse})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(mx - 60, my - 88, 120, 120);

      px(ctx, mx - 14, my - 6, 28, 6, '#3c342c');
      px(ctx, mx - 10, my - 52, 20, 46, '#232734');
      px(ctx, mx - 8, my - 56, 16, 4, '#363b4d');
      // Glowing Tassili relic inscription
      px(ctx, mx - 4, my - 42, 8, 2, '#f0b24a');
      px(ctx, mx - 6, my - 36, 12, 2, '#60cde6');
      px(ctx, mx - 3, my - 30, 6, 8, '#f0b24a');
      px(ctx, mx - 5, my - 18, 10, 2, '#f0b24a');
    }
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: EnemyState, camX: number, camY: number, now: number) {
  if (!enemy.alive) return;
  const ex = Math.round(enemy.x - camX);
  const ey = Math.round(enemy.y - camY + Math.sin(now * 0.007 + enemy.x) * 2);
  if (ex < -30 || ex > VIEW_WIDTH + 30) return;

  // Hollow-Knight-inspired Void Shadow Beetle
  px(ctx, ex - 7, ey - 10, 14, 9, '#12131c');
  px(ctx, ex - 5, ey - 12, 10, 2, '#222436');
  // Curved horns
  px(ctx, ex - 6, ey - 14, 2, 3, '#393d54');
  px(ctx, ex + 4, ey - 14, 2, 3, '#393d54');
  // Glowing void eyes
  const dir = enemy.vx >= 0 ? 1 : -1;
  px(ctx, ex + (dir > 0 ? 2 : -4), ey - 7, 2, 2, '#e65a5a');
  px(ctx, ex + (dir > 0 ? -1 : -1), ey - 7, 2, 2, '#e65a5a');
  // Scuttling legs
  const step = Math.floor(now / 120) % 2;
  px(ctx, ex - 5 + step, ey - 1, 2, 3, '#1a1c28');
  px(ctx, ex + 3 - step, ey - 1, 2, 3, '#1a1c28');
}

function drawExplorer(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  camX: number,
  camY: number,
  now: number,
  isLocal: boolean
) {
  if (!player.connected) return;
  // Invulnerability blink
  if (now < player.invulnUntil && Math.floor(now / 80) % 2 === 0) return;

  const x = Math.round(player.x - camX);
  const y = Math.round(player.y - camY);
  if (x < -40 || x > VIEW_WIDTH + 40) return;

  const isP1 = player.slot === 'p1';
  const burnousOuter = isP1 ? '#e6dcc5' : '#4a443e';
  const burnousShade = isP1 ? '#b7aa91' : '#2d2926';
  const shemaghMain = isP1 ? '#a83434' : '#327294';
  const shemaghTrim = isP1 ? '#e8c476' : '#96d8ec';
  const lanternCol = isP1 ? '#f5bd4c' : '#65d5ee';
  const lanternGlow = isP1 ? 'rgba(245, 189, 76, 0.28)' : 'rgba(101, 213, 238, 0.28)';

  // Warm/Cyan lantern light pool around the character
  const lx = x + (player.facing > 0 ? 14 : -2);
  const ly = y + 10;
  const rad = ctx.createRadialGradient(lx, ly, 2, lx, ly, 58);
  rad.addColorStop(0, lanternGlow);
  rad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rad;
  ctx.fillRect(lx - 58, ly - 58, 116, 116);

  const runTick = player.anim === 'run' ? Math.floor(now / 110) % 2 : 0;
  const breath = player.anim === 'idle' && Math.sin(now * 0.005 + (isP1 ? 0 : 2)) > 0.3 ? 1 : 0;

  // Boots / feet
  px(ctx, x + 3 - runTick, y + 18, 3, 4, '#1b1817');
  px(ctx, x + 8 + runTick, y + 18, 3, 4, '#1b1817');

  // Traditional flowing Burnous cloak
  px(ctx, x + 1, y + 7 + breath, 12, 12 - breath, burnousOuter);
  px(ctx, x + (player.facing > 0 ? 1 : 9), y + 8 + breath, 4, 11 - breath, burnousShade);
  // Flowing hem when running or jumping
  if (player.anim === 'run' || !player.onGround) {
    px(ctx, x + (player.facing > 0 ? -2 : 12), y + 14, 4, 4, burnousShade);
  }

  // Head & Face shadow (Hollow Knight dark visage contrast)
  px(ctx, x + 3, y + 1 + breath, 8, 7, '#191412');
  // Glowing eyes facing direction
  const eyeX = player.facing > 0 ? x + 8 : x + 4;
  px(ctx, eyeX, y + 4 + breath, 2, 2, '#f7f2e8');

  // Traditional Shemagh & Agal headband
  px(ctx, x + 2, y + breath, 10, 3, shemaghMain);
  px(ctx, x + 3, y - 1 + breath, 8, 1, shemaghTrim);
  // Flowing shemagh tail
  px(ctx, x + (player.facing > 0 ? 1 : 10), y + 2 + breath, 3, 5, shemaghMain);

  // Extended arm & glowing lantern
  const handX = player.facing > 0 ? x + 12 : x - 2;
  const handY = y + 10 + breath;
  px(ctx, handX, handY, 3, 2, burnousShade);
  px(ctx, handX + (player.facing > 0 ? 1 : -1), handY + 2, 3, 4, lanternCol);
  px(ctx, handX + (player.facing > 0 ? 2 : 0), handY + 3, 1, 2, '#ffffff');

  // Motion aura trail when running fast or jumping
  if (!player.onGround || Math.abs(player.vx) > 60) {
    ctx.fillStyle = isP1 ? 'rgba(245, 189, 76, 0.2)' : 'rgba(101, 213, 238, 0.22)';
    const trailX = x - Math.sign(player.vx || player.facing) * 6;
    ctx.fillRect(trailX + 3, y + 6, 8, 12);
  }

  // Curved desert dagger slash effect with spark arc
  if (now < player.attackUntil) {
    const slashX = player.facing > 0 ? x + 14 : x - 18;
    ctx.fillStyle = isP1 ? 'rgba(255, 232, 168, 0.92)' : 'rgba(130, 232, 255, 0.92)';
    ctx.fillRect(slashX, y + 3, 16, 2);
    ctx.fillRect(slashX + (player.facing > 0 ? 4 : -2), y + 5, 14, 3);
    ctx.fillRect(slashX + (player.facing > 0 ? 2 : 0), y + 8, 12, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(slashX + (player.facing > 0 ? 11 : 1), y + 6, 4, 2);
  }

  // Subtle player marker dot above local player
  if (isLocal) {
    px(ctx, x + 6, y - 6, 2, 2, lanternCol);
  }
}

function drawSignalBubbles(
  ctx: CanvasRenderingContext2D,
  players: Record<PlayerSlot, PlayerState>,
  signals: ActiveSignal[],
  camX: number,
  camY: number,
  now: number
) {
  for (const sig of signals) {
    if (sig.expiresAt <= now) continue;
    const pl = players[sig.slot];
    if (!pl || !pl.connected) continue;
    const sx = Math.round(pl.x + 7 - camX);
    const sy = Math.round(pl.y - 16 - camY + Math.sin(now * 0.01) * 1.5);

    ctx.font = 'bold 9px Cairo, sans-serif';
    const textW = Math.max(28, ctx.measureText(sig.label).width + 10);
    const bx = Math.round(sx - textW / 2);
    const by = sy - 14;

    ctx.fillStyle = '#0e131e';
    ctx.fillRect(bx, by, textW, 14);
    ctx.strokeStyle = sig.slot === 'p1' ? '#f0b24a' : '#60cde6';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, textW - 1, 13);

    ctx.fillStyle = '#f6eedc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sig.label, sx, by + 7.5);
  }
}

export function drawGameWorld(ctx: CanvasRenderingContext2D, data: RenderContextData): void {
  const { players, localSlot, puzzles, enemies, signals, particles, now, interactionHint, shake } = data;
  let camX = data.cameraX;
  let camY = data.cameraY;

  if (now < shake.until) {
    camX += (Math.random() - 0.5) * shake.intensity;
    camY += (Math.random() - 0.5) * shake.intensity;
  }

  ctx.imageSmoothingEnabled = false;
  drawParallaxBackground(ctx, camX, camY, now);

  // Checkpoint torches
  const localX = players[localSlot].x;
  for (const cp of CHECKPOINTS) {
    drawCheckpointTorch(ctx, cp.x, cp.y, camX, camY, now, Math.abs(localX - cp.x) < 120);
  }

  // Static stone platforms
  for (const plat of STATIC_PLATFORMS) {
    const sx = Math.round(plat.x - camX);
    const sy = Math.round(plat.y - camY);
    if (sx + plat.w < -10 || sx > VIEW_WIDTH + 10) continue;
    drawStoneBlock(ctx, sx, sy, plat.w, plat.h);
  }

  // Spikes
  for (const sp of SPIKE_ZONES) {
    const sx = Math.round(sp.x - camX);
    const sy = Math.round(sp.y - camY);
    if (sx + sp.w < -10 || sx > VIEW_WIDTH + 10) continue;
    for (let x = sx; x < sx + sp.w; x += 6) {
      px(ctx, x, sy + 4, 6, 5, '#4b5060');
      px(ctx, x + 1, sy + 1, 4, 3, '#72798f');
      px(ctx, x + 2, sy - 1, 2, 2, '#aeb6cc');
    }
  }

  // Puzzle mechanisms & Traditional Algerian Plate
  drawPuzzleProps(ctx, camX, camY, puzzles, now);
  drawTraditionalPlate(ctx, camX, camY, puzzles, now);

  // Enemies
  for (const enemy of enemies) {
    drawEnemy(ctx, enemy, camX, camY, now);
  }

  // Players (draw partner first, local on top)
  const partnerSlot: PlayerSlot = localSlot === 'p1' ? 'p2' : 'p1';
  drawExplorer(ctx, players[partnerSlot], camX, camY, now, false);
  drawExplorer(ctx, players[localSlot], camX, camY, now, true);

  // Particles
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    px(ctx, p.x - camX, p.y - camY, p.size, p.size, p.color);
  }
  ctx.globalAlpha = 1;

  // Quick Co-op Visual Signal Bubbles
  drawSignalBubbles(ctx, players, signals, camX, camY, now);

  // World vignette for Hollow Knight cave mood
  const vig = ctx.createRadialGradient(
    VIEW_WIDTH / 2,
    VIEW_HEIGHT / 2,
    VIEW_HEIGHT * 0.38,
    VIEW_WIDTH / 2,
    VIEW_HEIGHT / 2,
    VIEW_WIDTH * 0.72
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(4,5,9,0.62)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // In-world floating interaction prompt near bottom center
  if (interactionHint) {
    ctx.font = 'bold 10px Cairo, sans-serif';
    const w = Math.min(VIEW_WIDTH - 24, ctx.measureText(interactionHint).width + 18);
    const bx = Math.round((VIEW_WIDTH - w) / 2);
    const by = VIEW_HEIGHT - 26;
    ctx.fillStyle = 'rgba(10, 13, 22, 0.88)';
    ctx.fillRect(bx, by, w, 18);
    ctx.strokeStyle = 'rgba(229, 169, 60, 0.65)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, 17);
    ctx.fillStyle = '#f5ebd6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(interactionHint, VIEW_WIDTH / 2, by + 9.5);
  }
}

export function drawMainMenuScene(
  ctx: CanvasRenderingContext2D,
  now: number,
  menuParticles: Particle[] = []
): void {
  ctx.imageSmoothingEnabled = false;
  const camX = 30 + Math.sin(now * 0.00025) * 18;
  drawParallaxBackground(ctx, camX, 0, now);

  // Ancient Tassili ruin bridge in foreground
  drawStoneBlock(ctx, 0, 224, VIEW_WIDTH, 46);
  // Broken ancient columns framing the menu
  drawStoneBlock(ctx, 22, 22, 28, 202);
  drawStoneBlock(ctx, 430, 22, 28, 202);
  drawStoneBlock(ctx, 0, 0, VIEW_WIDTH, 22);

  // Warm braziers on either side of the bridge
  drawCheckpointTorch(ctx, 74, 224, 0, 0, now, true);
  drawCheckpointTorch(ctx, 406, 224, 0, 0, now, true);

  // Both explorers standing peacefully at the cave entrance
  const p1Mock: PlayerState = {
    slot: 'p1',
    name: 'سيف',
    x: 112,
    y: 202,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: true,
    anim: 'idle',
    hp: 5,
    maxHp: 5,
    soul: 50,
    lives: 3,
    geo: 0,
    invulnUntil: 0,
    attackUntil: 0,
    connected: true,
  };
  const p2Mock: PlayerState = {
    ...p1Mock,
    slot: 'p2',
    name: 'طارق',
    x: 352,
    facing: -1,
  };
  drawExplorer(ctx, p1Mock, 0, 0, now, false);
  drawExplorer(ctx, p2Mock, 0, 0, now, false);

  // Small decorative Traditional Plate resting near campfire on bridge
  const sx = 148;
  const sy = 224;
  px(ctx, sx - 10, sy - 4, 20, 3, '#d9a441');
  px(ctx, sx - 7, sy - 7, 14, 3, '#6e3718');
  px(ctx, sx - 4, sy - 9, 8, 2, '#8b4922');

  // Interactive Menu Sparks & Magic Dust
  for (const p of menuParticles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    px(ctx, p.x, p.y, p.size, p.size, p.color);
  }
  ctx.globalAlpha = 1;

  // Deep atmospheric vignette so central menu typography has crystal-clear contrast
  const vig = ctx.createRadialGradient(
    VIEW_WIDTH / 2,
    VIEW_HEIGHT / 2,
    40,
    VIEW_WIDTH / 2,
    VIEW_HEIGHT / 2,
    VIEW_WIDTH * 0.65
  );
  vig.addColorStop(0, 'rgba(6, 8, 14, 0.34)');
  vig.addColorStop(1, 'rgba(4, 6, 10, 0.78)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}

export function clampWorldCamera(targetX: number, targetY: number): { x: number; y: number } {
  const cx = Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, targetX - VIEW_WIDTH / 2));
  const cy = Math.max(0, Math.min(320 - VIEW_HEIGHT, targetY - VIEW_HEIGHT * 0.62));
  return { x: cx, y: cy };
}
