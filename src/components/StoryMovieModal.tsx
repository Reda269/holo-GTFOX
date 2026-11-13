import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { RotateCcw, ArrowRight, Film } from 'lucide-react';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../shared/levelData.ts';
import { soundFX } from '../game/audio.ts';
import { useLayoutMode } from './TassiliFrame.tsx';

interface StoryMovieModalProps {
  onClose: () => void;
}

const DURATION_MS = 20000;

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

const SUBTITLES: SubtitleCue[] = [
  {
    start: 0,
    end: 5500,
    text: 'كان رضا ونبيل متجهان إلى الثانوية...',
  },
  {
    start: 5500,
    end: 10500,
    text: 'وعندما وصلا قررا الجلوس...',
  },
  {
    start: 10500,
    end: 14500,
    text: 'وعندما جلس رضا...',
  },
  {
    start: 14500,
    end: 20000,
    text: 'قال له نبيل وبكل إحراج : سروالك مثقوب!',
  },
];

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawStudent(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: {
    shirt: string;
    pants: string;
    skin: string;
    hair: string;
    walkCycle: number;
    sitting: boolean;
    blush?: boolean;
    shocked?: boolean;
    ripped?: boolean;
    facing?: 1 | -1;
  }
) {
  const { shirt, pants, skin, hair, walkCycle, sitting, blush, shocked, ripped, facing = 1 } = options;
  const step = sitting ? 0 : Math.round(Math.sin(walkCycle) * 3);

  // Backpack
  px(ctx, x + (facing > 0 ? -4 : 11), y + (sitting ? 9 : 8), 5, 10, '#4d3b2b');
  px(ctx, x + (facing > 0 ? -3 : 11), y + (sitting ? 10 : 9), 3, 3, '#c98838');

  // Head & Hair
  px(ctx, x + 2, y, 8, 8, skin);
  px(ctx, x + 1, y - 2, 10, 3, hair);
  px(ctx, x + (facing > 0 ? 1 : 9), y, 2, 4, hair);

  // Eyes
  const eyeX = facing > 0 ? x + 7 : x + 3;
  px(ctx, eyeX, y + 3, 2, shocked ? 3 : 2, '#14151c');
  if (shocked) {
    px(ctx, eyeX, y + 3, 1, 1, '#ffffff');
  }
  if (blush) {
    px(ctx, x + 4, y + 5, 3, 2, '#e85d68');
  }

  // Torso (Jacket / Shirt)
  px(ctx, x + 1, y + 8, 10, 10, shirt);
  px(ctx, x + 4, y + 9, 4, 8, 'rgba(255,255,255,0.12)');

  if (sitting) {
    // Seated legs bent forward
    px(ctx, x + 2, y + 18, 10, 4, pants);
    px(ctx, x + 9, y + 19, 4, 6, pants);
    px(ctx, x + 9, y + 25, 5, 3, '#1f1d24');
    if (ripped) {
      // Comedic visible rip / hole in pants!
      px(ctx, x + 4, y + 19, 3, 3, '#e8d7c3');
      px(ctx, x + 3, y + 19, 1, 1, '#ffffff');
      px(ctx, x + 7, y + 20, 1, 1, '#ffffff');
    }
  } else {
    // Walking legs
    px(ctx, x + 2 + step, y + 18, 3, 8, pants);
    px(ctx, x + 7 - step, y + 18, 3, 8, pants);
    px(ctx, x + 2 + step, y + 26, 4, 2, '#1f1d24');
    px(ctx, x + 7 - step, y + 26, 4, 2, '#1f1d24');
  }
}

function drawMovieFrame(ctx: CanvasRenderingContext2D, elapsed: number, now: number) {
  ctx.imageSmoothingEnabled = false;

  // Dawn atmospheric sky (dark stylized pixel aesthetic)
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, '#101829');
  sky.addColorStop(0.55, '#25314a');
  sky.addColorStop(1, '#4c3e3a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // Morning sun & distant Tassili mesas
  px(ctx, 360, 46, 26, 26, '#e5a93c');
  px(ctx, 364, 50, 18, 18, '#ffd478');
  px(ctx, 0, 145, VIEW_WIDTH, 55, '#191d2b');
  px(ctx, 40, 118, 95, 30, '#161a26');
  px(ctx, 290, 124, 130, 26, '#141824');

  if (elapsed < 5500) {
    // SCENE 1: Walking toward the High School
    const t = elapsed / 5500;
    const scroll = t * 130;

    // Ground road & curb
    px(ctx, 0, 194, VIEW_WIDTH, 76, '#1c1f29');
    px(ctx, 0, 194, VIEW_WIDTH, 4, '#4b453c');

    // Moving palm trees & streetlights
    for (let i = 0; i < 4; i++) {
      const tx = Math.round(i * 150 - (scroll % 150) + 60);
      px(ctx, tx, 134, 5, 60, '#2a221c');
      px(ctx, tx - 10, 128, 25, 6, '#234232');
      px(ctx, tx - 6, 124, 17, 4, '#2e5943');
    }

    // Distant High School building appearing on the right
    const schoolX = Math.round(410 - t * 110);
    px(ctx, schoolX, 116, 130, 78, '#2d2926');
    px(ctx, schoolX - 6, 110, 142, 8, '#4d3c2e');
    // Gate arch
    px(ctx, schoolX + 18, 150, 34, 44, '#131620');
    // Signboard "الثانوية"
    px(ctx, schoolX + 12, 124, 56, 14, '#121723');
    ctx.strokeStyle = '#e5a93c';
    ctx.lineWidth = 1;
    ctx.strokeRect(schoolX + 12.5, 124.5, 55, 13);
    ctx.font = 'bold 9px Cairo, sans-serif';
    ctx.fillStyle = '#f5ebd6';
    ctx.textAlign = 'center';
    ctx.fillText('الثانوية', schoolX + 40, 134);

    // Reda & Nabil walking together
    const walkX = Math.round(95 + t * 140);
    drawStudent(ctx, walkX, 166, {
      shirt: '#d6cbb5',
      pants: '#2c3d59',
      skin: '#e8c4a0',
      hair: '#1a1715',
      walkCycle: elapsed * 0.012,
      sitting: false,
      facing: 1,
    });
    drawStudent(ctx, walkX - 24, 166, {
      shirt: '#396f8c',
      pants: '#262b38',
      skin: '#dfB892',
      hair: '#221a14',
      walkCycle: elapsed * 0.012 + 1.5,
      sitting: false,
      facing: 1,
    });
  } else if (elapsed < 14500) {
    // SCENE 2 & 3: Arriving at the courtyard bench & sitting down
    px(ctx, 0, 194, VIEW_WIDTH, 76, '#1c1f29');
    px(ctx, 0, 194, VIEW_WIDTH, 4, '#544c42');

    // High school courtyard facade behind them
    px(ctx, 70, 92, 340, 102, '#23242e');
    px(ctx, 64, 86, 352, 8, '#4a3d31');
    // Windows
    for (let wx = 95; wx <= 360; wx += 48) {
      px(ctx, wx, 114, 22, 26, '#121826');
      px(ctx, wx + 2, 116, 18, 22, '#2d4661');
    }
    // Signboard
    px(ctx, 198, 95, 84, 14, '#10141f');
    ctx.font = 'bold 9px Cairo, sans-serif';
    ctx.fillStyle = '#f0b24a';
    ctx.textAlign = 'center';
    ctx.fillText('ثانوية طاسيلي', 240, 105);

    // Stone & Wood Bench in Center
    px(ctx, 185, 174, 110, 6, '#6e4e32');
    px(ctx, 185, 162, 110, 5, '#593e27');
    px(ctx, 194, 180, 6, 14, '#2b2826');
    px(ctx, 280, 180, 6, 14, '#2b2826');

    const sitPhase = elapsed >= 10500;
    const ripBounce = sitPhase && elapsed < 11100 ? Math.sin((elapsed - 10500) * 0.04) * 2 : 0;

    // Nabil sitting on left side of bench
    const nabilSitting = elapsed >= 8200;
    drawStudent(ctx, 206, nabilSitting ? 156 : 166, {
      shirt: '#396f8c',
      pants: '#262b38',
      skin: '#dfb892',
      hair: '#221a14',
      walkCycle: 0,
      sitting: nabilSitting,
      shocked: sitPhase,
      facing: 1,
    });

    // Reda sitting on right side of bench -> pants rip at 10500ms!
    const redaSitting = sitPhase;
    drawStudent(ctx, 250, (redaSitting ? 156 : 166) + ripBounce, {
      shirt: '#d6cbb5',
      pants: '#2c3d59',
      skin: '#e8c4a0',
      hair: '#1a1715',
      walkCycle: 0,
      sitting: redaSitting,
      ripped: sitPhase,
      facing: -1,
    });

    if (sitPhase) {
      // Comedic "RIP!" comic pixel pop
      const popY = 140 - Math.min(10, (elapsed - 10500) * 0.01);
      ctx.font = 'bold 11px Cairo, sans-serif';
      ctx.fillStyle = '#f05a5a';
      ctx.textAlign = 'center';
      ctx.fillText('تـمـزّق!', 265, popY);

      // Nabil's exclamation mark
      ctx.fillStyle = '#ffe58f';
      ctx.fillText('!!', 212, 140);
    }
  } else {
    // SCENE 4 (14.5s - 20.0s): Dramatic Embarrassed Close-Up!
    px(ctx, 0, 0, VIEW_WIDTH, VIEW_HEIGHT, '#0d111b');

    // Dramatic anime/pixel speed lines in background
    ctx.strokeStyle = 'rgba(229, 169, 60, 0.16)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const ly = ((i * 23 + Math.floor(now * 0.05)) % VIEW_HEIGHT);
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(VIEW_WIDTH, ly);
      ctx.stroke();
    }

    // Large Close-up of Nabil (Left) looking super embarrassed
    const nx = 105;
    const ny = 82;
    px(ctx, nx, ny, 64, 64, '#dfb892'); // face
    px(ctx, nx - 6, ny - 14, 76, 22, '#221a14'); // hair
    px(ctx, nx + 12, ny + 24, 14, 12, '#ffffff'); // eye L
    px(ctx, nx + 42, ny + 24, 14, 12, '#ffffff'); // eye R
    px(ctx, nx + 18, ny + 28, 6, 6, '#14151c');
    px(ctx, nx + 46, ny + 28, 6, 6, '#14151c');
    // Heavy embarrassed blush lines
    px(ctx, nx + 8, ny + 40, 16, 6, '#e85d68');
    px(ctx, nx + 42, ny + 40, 16, 6, '#e85d68');
    // Awkward wavy mouth
    px(ctx, nx + 24, ny + 50, 16, 4, '#5e2c2c');
    // Shirt
    px(ctx, nx - 10, ny + 64, 84, 60, '#396f8c');
    // Animated sweat drops
    const dropOffset = Math.round((now * 0.03) % 14);
    px(ctx, nx + 56, ny + 10 + dropOffset, 5, 9, '#60cde6');
    px(ctx, nx + 57, ny + 12 + dropOffset, 2, 4, '#ffffff');

    // Large Close-up of Reda (Right) frozen in shock
    const rx = 310;
    const ry = 82;
    px(ctx, rx, ry, 64, 64, '#e8c4a0');
    px(ctx, rx - 6, ry - 14, 76, 22, '#1a1715');
    px(ctx, rx + 10, ry + 22, 16, 16, '#ffffff');
    px(ctx, rx + 38, ry + 22, 16, 16, '#ffffff');
    px(ctx, rx + 15, ry + 28, 5, 5, '#14151c');
    px(ctx, rx + 43, ry + 28, 5, 5, '#14151c');
    // Shocked open mouth
    px(ctx, rx + 26, ry + 48, 12, 9, '#421a1a');
    px(ctx, rx - 10, ry + 64, 84, 60, '#d6cbb5');

    // Speech bubble from Nabil
    px(ctx, 164, 52, 146, 30, '#0b0e17');
    ctx.strokeStyle = '#e5a93c';
    ctx.lineWidth = 2;
    ctx.strokeRect(164, 52, 146, 30);
    ctx.font = 'bold 12px Cairo, sans-serif';
    ctx.fillStyle = '#ffe6a3';
    ctx.textAlign = 'center';
    ctx.fillText('سروالك مثقوب!!', 237, 71);
  }
}

export const StoryMovieModal: React.FC<StoryMovieModalProps> = ({ onClose }) => {
  const { isCompactLandscape } = useLayoutMode();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const cuesPlayedRef = useRef<{ bell: boolean; rip: boolean; sting: boolean }>({
    bell: false,
    rip: false,
    sting: false,
  });

  const [elapsedMs, setElapsedMs] = useState(0);
  const [finished, setFinished] = useState(false);

  const restartMovie = () => {
    soundFX.menuClick();
    startTimeRef.current = performance.now();
    cuesPlayedRef.current = { bell: false, rip: false, sting: false };
    setElapsedMs(0);
    setFinished(false);
  };

  useEffect(() => {
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = Math.min(DURATION_MS, now - startTimeRef.current);
      setElapsedMs(elapsed);

      if (elapsed >= 5500 && !cuesPlayedRef.current.bell) {
        cuesPlayedRef.current.bell = true;
        soundFX.schoolBell();
      }
      if (elapsed >= 10500 && !cuesPlayedRef.current.rip) {
        cuesPlayedRef.current.rip = true;
        soundFX.fabricRip();
      }
      if (elapsed >= 14500 && !cuesPlayedRef.current.sting) {
        cuesPlayedRef.current.sting = true;
        soundFX.dramaticSting();
      }
      if (elapsed >= DURATION_MS) {
        setFinished(true);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawMovieFrame(ctx, elapsed, now);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const currentSubtitle =
    SUBTITLES.find((s) => elapsedMs >= s.start && elapsedMs < s.end)?.text ||
    SUBTITLES[SUBTITLES.length - 1].text;
  const secondsLeft = Math.max(0, Math.ceil((DURATION_MS - elapsedMs) / 1000));
  const progressPct = Math.min(100, (elapsedMs / DURATION_MS) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative w-full h-full bg-black flex flex-col justify-between overflow-hidden"
    >
      {/* Top Cinematic Black Letterbox Bar (المستطيل العلوي) */}
      <motion.div
        initial={{ y: -64 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`relative z-20 w-full bg-black border-b border-[#2c251d] flex items-center justify-between shrink-0 ${
          isCompactLandscape ? 'h-10 px-3' : 'h-16 sm:h-20 px-4 sm:px-6'
        }`}
      >
        <div
          className={`flex items-center gap-2 text-[#e5a93c] font-bold ${
            isCompactLandscape ? 'text-xs' : 'text-xs sm:text-sm'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>فيلم القصة القصيرة — رضا ونبيل</span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="font-mono-nums text-xs text-[#b5aa99]">
            {finished ? 'انتهى العرض (20s)' : `00:${String(secondsLeft).padStart(2, '0')}`}
          </span>
          <button
            type="button"
            onClick={() => {
              soundFX.menuClick();
              onClose();
            }}
            className={`flex items-center gap-1.5 bg-[#141824] border border-[#4a3f33] hover:border-[#e5a93c] text-xs font-bold text-[#f4ead5] cursor-pointer transition-colors ${
              isCompactLandscape ? 'px-2.5 py-1' : 'px-3 py-1.5'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للقائمة</span>
          </button>
        </div>
      </motion.div>

      {/* Center Pixel-Art Movie Screen */}
      <div className="relative flex-1 w-full bg-[#07090f] flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          className="pixel-canvas w-full h-full object-contain"
        />

        {/* Replay Overlay when 20s completes */}
        {finished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-black/55 flex items-center justify-center gap-3 p-4"
          >
            <button
              type="button"
              onClick={restartMovie}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a2232] border border-[#e5a93c] hover:bg-[#232f45] text-xs sm:text-sm font-bold text-[#ffe6a3] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة مشاهدة الفيلم</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.menuClick();
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#121621] border border-[#4b5163] hover:border-[#60cde6] text-xs sm:text-sm font-bold text-[#e6dcc5] cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>القائمة الرئيسية</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* Bottom Cinematic Black Letterbox Bar + Arabic Subtitle (المستطيل السفلي والترجمة بالعربية) */}
      <motion.div
        initial={{ y: 88 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`relative z-20 w-full bg-black border-t border-[#2c251d] flex flex-col items-center justify-center shrink-0 ${
          isCompactLandscape ? 'min-h-[54px] px-3 py-1.5 gap-1' : 'min-h-[84px] sm:min-h-[96px] px-4 py-3 gap-2'
        }`}
      >
        {/* Live Arabic Subtitle */}
        <p
          className={`font-bold text-[#fff6df] text-center leading-snug tracking-normal drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] ${
            isCompactLandscape ? 'text-sm' : 'text-base sm:text-xl'
          }`}
        >
          {currentSubtitle}
        </p>

        {/* Timeline Progress Bar */}
        <div className="w-full max-w-xl h-1.5 bg-[#1a1d26] overflow-hidden">
          <div
            className="h-full bg-[#e5a93c] transition-[width] duration-75"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};
