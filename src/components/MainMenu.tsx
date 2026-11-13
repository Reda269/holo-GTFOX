import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Copy,
  Check,
  ArrowRight,
  Users,
  KeyRound,
  Settings,
  LogOut,
  Play,
  User,
  Film,
  Gamepad2,
  Maximize2,
  RotateCw,
} from 'lucide-react';
import { drawMainMenuScene, Particle } from '../game/pixelRenderer.ts';
import { soundFX } from '../game/audio.ts';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../shared/levelData.ts';
import { requestLandscapeFullscreen, useLayoutMode } from './TassiliFrame.tsx';

interface MainMenuProps {
  onStartSolo: () => void;
  onStartLocal: () => void;
  onCreateOnlineRoom: (playerName: string) => void;
  onJoinOnlineRoom: (code: string, playerName: string) => void;
  onOpenMovie: () => void;
  onExit: () => void;
  onlineBusy: boolean;
  onlineError: string | null;
  clearOnlineError: () => void;
  scanlines: boolean;
  setScanlines: (v: boolean) => void;
  touchMode: 'auto' | 'always' | 'off';
  setTouchMode: (m: 'auto' | 'always' | 'off') => void;
}

type MenuPanel = 'main' | 'coop' | 'settings';

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartSolo,
  onStartLocal,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onOpenMovie,
  onExit,
  onlineBusy,
  onlineError,
  clearOnlineError,
  scanlines,
  setScanlines,
  touchMode,
  setTouchMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const menuParticlesRef = useRef<Particle[]>([]);

  const { isCompactLandscape, isMobileDevice, isPortraitMobile, toggleLandscapeMode } = useLayoutMode();
  const [panel, setPanel] = useState<MenuPanel>('main');
  const [coopTab, setCoopTab] = useState<'choose' | 'join'>('choose');
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [muted, setMuted] = useState(soundFX.isMuted());
  const [musicVol, setMusicVol] = useState(soundFX.getVolumes().musicVolume);
  const [sfxVol, setSfxVol] = useState(soundFX.getVolumes().sfxVolume);
  const [copiedHint, setCopiedHint] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const spawnMenuSparks = (color: string, count = 14) => {
    const cx = VIEW_WIDTH / 2 + (Math.random() - 0.5) * 90;
    const cy = VIEW_HEIGHT / 2 + (Math.random() - 0.5) * 60;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 20 + Math.random() * 65;
      menuParticlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 15,
        life: 0.5 + Math.random() * 0.45,
        maxLife: 0.95,
        color,
        size: Math.random() > 0.45 ? 2 : 1,
      });
    }
  };

  useEffect(() => {
    let rafId = 0;
    let last = performance.now();
    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      menuParticlesRef.current = menuParticlesRef.current.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 40 * dt;
        p.life -= dt;
        return p.life > 0;
      });

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawMainMenuScene(ctx, now, menuParticlesRef.current);
        }
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const wakeAudio = () => {
    soundFX.startAmbientMusic();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundFX.setMuted(next);
    if (!next) {
      soundFX.startAmbientMusic();
      soundFX.menuClick();
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    wakeAudio();
    soundFX.menuClick();
    if (isMobileDevice) void requestLandscapeFullscreen();
    spawnMenuSparks('#60cde6', 18);
    if (!joinCode.trim()) return;
    onJoinOnlineRoom(joinCode.trim().toUpperCase(), playerName.trim());
  };

  const handleCreateClick = () => {
    wakeAudio();
    soundFX.menuClick();
    if (isMobileDevice) void requestLandscapeFullscreen();
    spawnMenuSparks('#e5a93c', 18);
    onCreateOnlineRoom(playerName.trim());
  };

  const menuItems = [
    {
      label: 'اللعب الفردي',
      sub: 'بدون تعاون لاعب آخر',
      icon: User,
      accent: '#e5a93c',
      onClick: () => {
        if (isMobileDevice) void requestLandscapeFullscreen();
        spawnMenuSparks('#e5a93c', 18);
        onStartSolo();
      },
    },
    {
      label: 'لعبة جديدة (تعاوني محلي)',
      sub: 'لاعبان على نفس الجهاز',
      icon: Play,
      accent: '#f0b24a',
      onClick: () => {
        if (isMobileDevice) void requestLandscapeFullscreen();
        spawnMenuSparks('#f0b24a', 18);
        onStartLocal();
      },
    },
    {
      label: 'اللعب التعاوني أونلاين',
      sub: 'إنشاء غرفة أو انضمام برمز',
      icon: Users,
      accent: '#60cde6',
      onClick: () => {
        spawnMenuSparks('#60cde6', 18);
        clearOnlineError();
        setPanel('coop');
        setCoopTab('choose');
      },
    },
    {
      label: 'مشاهدة الفيلم (20 ثانية)',
      sub: 'قصة رضا ونبيل قبل الثانوية',
      icon: Film,
      accent: '#e88b5a',
      onClick: () => {
        if (isMobileDevice) void requestLandscapeFullscreen();
        spawnMenuSparks('#e88b5a', 20);
        onOpenMovie();
      },
    },
    {
      label: 'الإعدادات',
      sub: 'الصوت، أزرار الهاتف، الشاشة',
      icon: Settings,
      accent: '#c7b38b',
      onClick: () => {
        spawnMenuSparks('#c7b38b', 14);
        setPanel('settings');
      },
    },
    {
      label: 'الخروج',
      sub: 'استراحة في أعماق الكهف',
      icon: LogOut,
      accent: '#d44848',
      onClick: () => {
        onExit();
      },
    },
  ];

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-between overflow-y-auto ${
        isCompactLandscape ? 'py-2 px-3' : 'py-4 sm:py-7 px-4'
      }`}
      onClick={wakeAudio}
    >
      {/* Live Pixel Art Cave Canvas Background */}
      <canvas
        ref={canvasRef}
        width={VIEW_WIDTH}
        height={VIEW_HEIGHT}
        className="pixel-canvas absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Top Audio, Landscape & Quick Touch Status Bar */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between gap-2 shrink-0">
        <div className={`${isCompactLandscape ? 'text-[11px]' : 'text-xs'} text-[#c7baa3] tracking-wide font-semibold truncate`}>
          كهوف طاسيلي الأثرية · تجربة أندرويد وويب
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isMobileDevice && (
            <>
              {isPortraitMobile && (
                <button
                  type="button"
                  onClick={() => {
                    soundFX.menuClick();
                    toggleLandscapeMode();
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#ffe5a3] bg-[#0e131e]/85 border border-[#4a3e30] hover:border-[#e5a93c] transition-colors cursor-pointer"
                  title="تبديل التدوير الأفقي"
                >
                  <RotateCw className="w-3.5 h-3.5 text-[#e5a93c]" />
                  <span className="hidden sm:inline">أفقي</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  soundFX.menuClick();
                  void requestLandscapeFullscreen();
                }}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#60cde6] bg-[#0e131e]/85 border border-[#3d4252] hover:border-[#60cde6] transition-colors cursor-pointer"
                title="ملء الشاشة بالوضع الأفقي"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              soundFX.menuClick();
              setTouchMode(touchMode === 'auto' ? 'always' : touchMode === 'always' ? 'off' : 'auto');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#ede4d3] bg-[#0e131e]/85 border border-[#3d4252] hover:border-[#60cde6] transition-colors cursor-pointer"
            title="وضع أزرار الهاتف"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-[#60cde6]" />
            <span className="hidden sm:inline">
              أزرار الهاتف: {touchMode === 'auto' ? 'تلقائي' : touchMode === 'always' ? 'مفعل' : 'مخفي'}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#ede4d3] bg-[#0e131e]/85 border border-[#4a3e30] hover:border-[#e5a93c] transition-colors cursor-pointer"
            aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-[#d44848]" /> : <Volume2 className="w-4 h-4 text-[#e5a93c]" />}
            <span className="whitespace-nowrap">{muted ? 'صامت' : 'الصوت مفعل'}</span>
          </button>
        </div>
      </div>

      {/* Center Ornate Game Title & Interactive Animated Menu */}
      <div
        className={`relative z-10 w-full flex flex-col items-center my-auto ${
          isCompactLandscape ? 'max-w-2xl py-1' : 'max-w-lg py-3'
        }`}
      >
        {/* Title Crest with subtle breathing glow */}
        <motion.div
          initial={{ opacity: 0, y: -18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full flex flex-col items-center ${isCompactLandscape ? 'mb-2' : 'mb-5'}`}
        >
          <div
            className={`relative border border-[#5c4c38] bg-[#0b0e17]/90 shadow-[0_12px_40px_rgba(0,0,0,0.85)] text-center w-full overflow-hidden ${
              isCompactLandscape ? 'px-5 py-1.5 max-w-md' : 'px-8 py-3.5 max-w-md'
            }`}
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-[#e5a93c]"
            />
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}
              className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-[#60cde6]"
            />
            <h1
              className={`font-display font-extrabold text-[#f4ead5] tracking-normal leading-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] ${
                isCompactLandscape ? 'text-2xl' : 'text-3xl sm:text-5xl'
              }`}
            >
              ما خفي أعظم
            </h1>
            <p className={`${isCompactLandscape ? 'mt-0.5 text-[11px]' : 'mt-1 text-xs sm:text-sm'} text-[#c7b38b] font-semibold`}>
              مغامرة بكسل آرت في أعماق كهوف طاسيلي
            </p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Main Interactive Menu (2-column grid in horizontal mobile, vertical stack on desktop) */}
          {panel === 'main' && (
            <motion.nav
              key="main-nav"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className={
                isCompactLandscape
                  ? 'w-full max-w-2xl grid grid-cols-2 gap-2'
                  : 'w-full max-w-sm flex flex-col gap-2.5'
              }
              aria-label="القائمة الرئيسية"
            >
              {menuItems.map((item, idx) => {
                const Icon = item.icon;
                const isHovered = hoveredIdx === idx;
                return (
                  <motion.button
                    key={item.label}
                    type="button"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ scale: 1.02, x: -3 }}
                    whileTap={{ scale: 0.96 }}
                    onMouseEnter={() => {
                      setHoveredIdx(idx);
                      soundFX.menuHover();
                      spawnMenuSparks(item.accent, 6);
                    }}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => {
                      wakeAudio();
                      soundFX.menuClick();
                      item.onClick();
                    }}
                    className={`group relative w-full bg-[#111622]/92 border border-[#3e362e] hover:border-[#e5a93c] hover:bg-[#192133] text-[#f5ebd6] transition-colors flex items-center justify-between gap-2.5 cursor-pointer overflow-hidden shadow-lg ${
                      isCompactLandscape ? 'py-1.5 px-3 min-h-[46px]' : 'py-2.5 px-4'
                    }`}
                  >
                    {/* Animated shimmer highlight on hover */}
                    <span
                      className={`pointer-events-none absolute inset-y-0 right-0 w-1 transition-all duration-200 ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{ backgroundColor: item.accent }}
                    />

                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`bg-[#0b0e17] border border-[#2f3445] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                          isCompactLandscape ? 'w-7 h-7' : 'w-8 h-8'
                        }`}
                        style={{ borderColor: isHovered ? item.accent : undefined }}
                      >
                        <Icon className="w-4 h-4" style={{ color: item.accent }} />
                      </div>
                      <div className="text-right min-w-0">
                        <div
                          className={`font-bold leading-tight whitespace-nowrap truncate ${
                            isCompactLandscape ? 'text-xs' : 'text-sm sm:text-base'
                          }`}
                        >
                          {item.label}
                        </div>
                        <div className={`${isCompactLandscape ? 'text-[10px]' : 'text-[11px]'} text-[#9e9482] truncate`}>
                          {item.sub}
                        </div>
                      </div>
                    </div>

                    <motion.span
                      animate={{ x: isHovered ? -3 : 0, opacity: isHovered ? 1 : 0.35 }}
                      className="text-xs font-bold shrink-0"
                      style={{ color: item.accent }}
                    >
                      ◆
                    </motion.span>
                  </motion.button>
                );
              })}
            </motion.nav>
          )}

          {/* Online Co-op Panel */}
          {panel === 'coop' && (
            <motion.div
              key="coop-panel"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.22 }}
              className={`w-full bg-[#0e131e]/95 border border-[#4d4234] shadow-2xl ${
                isCompactLandscape ? 'max-w-xl p-3.5' : 'max-w-md p-5 sm:p-6'
              }`}
            >
              <div className={`flex items-center justify-between border-b border-[#2c2f3b] ${isCompactLandscape ? 'mb-2.5 pb-2' : 'mb-4 pb-3'}`}>
                <h2 className="text-lg font-bold text-[#f4ead5] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#60cde6]" />
                  <span>اللعب التعاوني أونلاين</span>
                </h2>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => {
                    soundFX.menuClick();
                    clearOnlineError();
                    setPanel('main');
                  }}
                  className="flex items-center gap-1.5 text-xs text-[#bfb29b] hover:text-[#f4ead5] px-2.5 py-1 border border-[#323645] hover:border-[#60cde6] transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>رجوع</span>
                </motion.button>
              </div>

              <div className="mb-4">
                <label htmlFor="explorer-name" className="block text-xs text-[#bfb29b] mb-1.5">
                  اسم المستكشف (اختياري)
                </label>
                <input
                  id="explorer-name"
                  type="text"
                  maxLength={18}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="مثال: سيف أو طارق"
                  className="w-full px-3 py-2 bg-[#080b12] border border-[#363a47] focus:border-[#e5a93c] outline-none text-sm text-[#f4ead5] placeholder:text-[#666c7c]"
                />
              </div>

              {onlineError && (
                <div className="mb-4 p-3 bg-[#2a1418] border border-[#a8383b] text-xs text-[#f8c8c8]">
                  {onlineError}
                </div>
              )}

              {coopTab === 'choose' ? (
                <div className="flex flex-col gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    disabled={onlineBusy}
                    onClick={handleCreateClick}
                    className="w-full py-3.5 px-4 bg-[#172130] border border-[#e5a93c]/70 hover:border-[#e5a93c] hover:bg-[#1e2a3d] text-[#f7edd9] font-bold text-base transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2.5">
                      <KeyRound className="w-4 h-4 text-[#e5a93c]" />
                      <span>إنشاء غرفة (Create Room)</span>
                    </span>
                    <span className="text-xs text-[#e5a93c]">توليد رمز ودعوة صديق</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    disabled={onlineBusy}
                    onClick={() => {
                      soundFX.menuClick();
                      clearOnlineError();
                      setCoopTab('join');
                    }}
                    className="w-full py-3.5 px-4 bg-[#131a26] border border-[#60cde6]/60 hover:border-[#60cde6] hover:bg-[#192434] text-[#f7edd9] font-bold text-base transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-[#60cde6]" />
                      <span>انضمام برمز (Join with Code)</span>
                    </span>
                    <span className="text-xs text-[#60cde6]">أدخل رمز صديقك</span>
                  </motion.button>
                </div>
              ) : (
                <form onSubmit={handleJoinSubmit} className="flex flex-col gap-3">
                  <div>
                    <label htmlFor="room-code-input" className="block text-xs text-[#c7b38b] mb-1.5">
                      أدخل كود الغرفة للانضمام الفوري لصديقك
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="room-code-input"
                        type="text"
                        value={joinCode}
                        onChange={(e) => {
                          clearOnlineError();
                          setJoinCode(e.target.value.toUpperCase());
                        }}
                        placeholder="مثال: TSL492"
                        dir="ltr"
                        maxLength={10}
                        autoFocus
                        className="flex-1 px-3.5 py-2.5 bg-[#080b12] border border-[#4c5468] focus:border-[#60cde6] outline-none text-base font-mono-nums tracking-widest text-center text-[#f4ead5] uppercase"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.readText?.().then((txt) => {
                            if (txt) {
                              setJoinCode(txt.trim().toUpperCase().slice(0, 10));
                              setCopiedHint(true);
                              setTimeout(() => setCopiedHint(false), 1200);
                            }
                          }).catch(() => {});
                        }}
                        className="px-3 py-2 bg-[#141a26] border border-[#3b4152] hover:border-[#60cde6] text-xs text-[#c4ccd9] cursor-pointer"
                        title="لصق الرمز"
                      >
                        {copiedHint ? <Check className="w-4 h-4 text-[#60cde6]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      type="submit"
                      disabled={onlineBusy || !joinCode.trim()}
                      className="flex-1 py-2.5 px-4 bg-[#1c2f3b] border border-[#60cde6] hover:bg-[#233b4a] text-[#eef8fc] font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {onlineBusy ? 'جاري الاتصال...' : 'دخول الغرفة الآن'}
                    </motion.button>
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.menuClick();
                        setCoopTab('choose');
                      }}
                      className="px-4 py-2.5 bg-[#121621] border border-[#3a3e4c] hover:border-[#e5a93c] text-sm text-[#c7b9a5] cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* Settings Panel */}
          {panel === 'settings' && (
            <motion.div
              key="settings-panel"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.22 }}
              className={`w-full bg-[#0e131e]/95 border border-[#4d4234] shadow-2xl ${
                isCompactLandscape ? 'max-w-xl p-3.5' : 'max-w-md p-5 sm:p-6'
              }`}
            >
              <div className={`flex items-center justify-between border-b border-[#2c2f3b] ${isCompactLandscape ? 'mb-2.5 pb-2' : 'mb-4 pb-3'}`}>
                <h2 className="text-base sm:text-lg font-bold text-[#f4ead5] flex items-center gap-2">
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-[#e5a93c]" />
                  <span>الإعدادات والتحكم</span>
                </h2>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => {
                    soundFX.menuClick();
                    setPanel('main');
                  }}
                  className="flex items-center gap-1.5 text-xs text-[#bfb29b] hover:text-[#f4ead5] px-2.5 py-1 border border-[#323645] hover:border-[#e5a93c] transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>رجوع</span>
                </motion.button>
              </div>

              <div className={isCompactLandscape ? 'space-y-2.5 text-xs' : 'space-y-4 text-sm'}>
                <div>
                  <div className="flex justify-between text-xs text-[#c7b38b] mb-1">
                    <span>موسيقى الكهف</span>
                    <span className="font-mono-nums">{Math.round(musicVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={musicVol}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMusicVol(v);
                      soundFX.setMusicVolume(v);
                    }}
                    className="w-full accent-[#e5a93c]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#c7b38b] mb-1">
                    <span>المؤثرات الصوتية</span>
                    <span className="font-mono-nums">{Math.round(sfxVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={sfxVol}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setSfxVol(v);
                      soundFX.setSfxVolume(v);
                    }}
                    className="w-full accent-[#60cde6]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#262b38]">
                  <span className="text-xs text-[#ddd2be]">أزرار التحكم باللمس للهاتف</span>
                  <div className="flex gap-1">
                    {(['auto', 'always', 'off'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          soundFX.menuClick();
                          setTouchMode(m);
                        }}
                        className={`px-2.5 py-1 text-xs font-semibold border cursor-pointer ${
                          touchMode === m
                            ? 'bg-[#1c2b35] border-[#60cde6] text-[#eef8fc]'
                            : 'bg-[#141822] border-[#3a3f4d] text-[#9aa1b2]'
                        }`}
                      >
                        {m === 'auto' ? 'تلقائي' : m === 'always' ? 'مفعل' : 'مخفي'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#262b38]">
                  <span className="text-xs text-[#ddd2be]">خطوط الشاشة الكلاسيكية (Scanlines)</span>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.menuClick();
                      setScanlines(!scanlines);
                    }}
                    className={`px-3 py-1 text-xs font-semibold border transition-colors cursor-pointer ${
                      scanlines
                        ? 'bg-[#1c2b35] border-[#60cde6] text-[#eef8fc]'
                        : 'bg-[#141822] border-[#3a3f4d] text-[#9aa1b2]'
                    }`}
                  >
                    {scanlines ? 'مفعل' : 'معطل'}
                  </button>
                </div>

                <div className="pt-3 border-t border-[#262b38] text-xs text-[#b7ae9c] space-y-1.5">
                  <div className="font-bold text-[#e5a93c]">مفاتيح اللعب:</div>
                  <div className="flex justify-between">
                    <span>الحركة والقفز:</span>
                    <span className="font-mono-nums text-[#ede4d3]">A / D + W أو الأسهم</span>
                  </div>
                  <div className="flex justify-between">
                    <span>التفاعل (رافعة / مفتاح / طبق):</span>
                    <span className="font-mono-nums text-[#ede4d3]">E</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ضربة الخنجر / شفاء بالروح:</span>
                    <span className="font-mono-nums text-[#ede4d3]">F للضرب · Q للشفاء</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom subtle hint */}
      <div className={`relative z-10 text-[#a39987] text-center shrink-0 ${isCompactLandscape ? 'text-[10px]' : 'text-xs'}`}>
        اختر «اللعب الفردي» لمغامرة بدون رفيق أو «اللعب التعاوني أونلاين» مع صديقك
      </div>
    </div>
  );
};
