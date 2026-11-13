import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  MessageSquare,
  Send,
  LogOut,
  Repeat,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Maximize2,
  RotateCw,
} from 'lucide-react';
import {
  ChatMessage,
  PlayerSlot,
  PlayerState,
  PuzzleState,
  QUICK_SIGNALS,
  QuickSignalType,
} from '../shared/protocol.ts';
import { requestLandscapeFullscreen, useLayoutMode } from './TassiliFrame.tsx';

interface GameHudProps {
  mode: 'solo' | 'online' | 'local';
  roomCode: string | null;
  localSlot: PlayerSlot;
  players: Record<PlayerSlot, PlayerState>;
  puzzles: PuzzleState;
  chat: ChatMessage[];
  muted: boolean;
  showTouchControls: boolean;
  onToggleTouchControls: () => void;
  onToggleMute: () => void;
  onSendSignal: (sig: QuickSignalType) => void;
  onSendChat: (text: string) => void;
  onSwitchLocalPlayer?: () => void;
  onLeaveToMenu: () => void;
  eventBanner: string | null;
}

const PlayerMeter: React.FC<{
  player: PlayerState;
  isActiveControl: boolean;
  align: 'right' | 'left';
  compact?: boolean;
}> = ({ player, isActiveControl, align, compact = false }) => {
  const accent = player.slot === 'p1' ? '#e5a93c' : '#60cde6';
  const soulPct = Math.max(0, Math.min(100, player.soul));

  return (
    <div
      className={`flex items-center bg-[#0a0d16]/88 border shadow-lg transition-colors ${
        compact ? 'gap-1.5 px-2 py-1' : 'gap-2.5 px-3 py-2'
      } ${
        isActiveControl ? 'border-[#e5a93c]/75' : 'border-[#2f3545]'
      } ${align === 'left' ? 'flex-row-reverse text-left' : 'flex-row text-right'}`}
    >
      {/* Soul Vessel Orb */}
      <div
        className={`relative rounded-full border-2 border-[#6e6456] bg-[#090c14] overflow-hidden shrink-0 flex items-center justify-center ${
          compact ? 'w-8 h-8' : 'w-10 h-10'
        }`}
        title={`الروح: ${Math.round(soulPct)}%`}
      >
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-200"
          style={{
            height: `${soulPct}%`,
            background:
              player.slot === 'p1'
                ? 'linear-gradient(to top, #286487, #60cde6)'
                : 'linear-gradient(to top, #1f5c73, #7de0f5)',
          }}
        />
        <span className={`relative z-10 font-bold text-[#f7f2e8] drop-shadow ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          الروح
        </span>
      </div>

      {/* Name, Hearts, Lives, Geo */}
      <div className={`flex flex-col ${compact ? 'gap-0.5 min-w-[96px]' : 'gap-1 min-w-[128px]'}`}>
        <div className={`flex items-center justify-between gap-1.5 ${align === 'left' ? 'flex-row-reverse' : ''}`}>
          <span className={`font-bold text-[#f4ead5] truncate ${compact ? 'text-[10px] max-w-[68px]' : 'text-xs max-w-[100px]'}`}>
            {player.name}
          </span>
          <span
            className={`font-semibold bg-[#131824] border border-[#2c3140] ${
              compact ? 'text-[9px] px-1 py-0' : 'text-[10px] px-1.5 py-0.5'
            }`}
            style={{ color: accent }}
          >
            {player.connected ? (isActiveControl ? 'تحكمك' : 'متصل') : 'بانتظار الرفيق'}
          </span>
        </div>

        {/* Pixel Hearts */}
        <div className={`flex items-center gap-0.5 sm:gap-1 ${align === 'left' ? 'flex-row-reverse' : ''}`}>
          {Array.from({ length: player.maxHp }).map((_, idx) => {
            const filled = idx < player.hp;
            return (
              <svg
                key={idx}
                className={`${compact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} shrink-0`}
                viewBox="0 0 10 9"
                fill="none"
              >
                <path
                  d="M1 2H2V1H4V2H5V3H5V2H6V1H8V2H9V5H8V6H7V7H6V8H4V7H3V6H2V5H1V2Z"
                  fill={filled ? '#d94848' : '#262936'}
                />
                {filled && <rect x="2" y="2" width="1" height="1" fill="#ff9e9e" />}
              </svg>
            );
          })}
        </div>

        {/* Lives & Geo */}
        <div
          className={`flex items-center text-[#c7b38b] font-mono-nums ${
            compact ? 'gap-1.5 text-[10px]' : 'gap-2.5 text-[11px]'
          } ${align === 'left' ? 'flex-row-reverse' : ''}`}
        >
          <span>أرواح: {player.lives}</span>
          <span className="text-[#565c6e]">·</span>
          <span className="text-[#f0b24a]">Geo: {player.geo}</span>
        </div>
      </div>
    </div>
  );
};

export const GameHud: React.FC<GameHudProps> = ({
  mode,
  roomCode,
  localSlot,
  players,
  puzzles,
  chat,
  muted,
  showTouchControls,
  onToggleTouchControls,
  onToggleMute,
  onSendSignal,
  onSendChat,
  onSwitchLocalPlayer,
  onLeaveToMenu,
  eventBanner,
}) => {
  const { isCompactLandscape, isMobileDevice, isPortraitMobile, toggleLandscapeMode } = useLayoutMode();
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(() => !isCompactLandscape && !isMobileDevice);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.length, chatOpen]);

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard?.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  // Current Quest Step (adapts to Solo vs Co-op)
  let questText =
    mode === 'solo'
      ? 'المرحلة ١: اسحب الرافعة العلوية [E] لفتح البوابة الحجرية والعبور'
      : 'المهمة ١: يسحب أحدكما الرافعة العلوية ليعبر الآخر ويثبّت ثقل الموازنة';

  if (puzzles.gate1LockedOpen && !puzzles.plateClaimed) {
    questText =
      mode === 'solo'
        ? 'تقدّم نحو الطبق الجزائري التقليدي في وسط الطريق لنيل البركة والشفاء'
        : 'تجمّعا معاً عند الطبق الجزائري التقليدي في وسط الطريق لنيل البركة';
  } else if (puzzles.gate1LockedOpen && !puzzles.secretDoorOpen) {
    questText =
      mode === 'solo'
        ? 'المرحلة ٢: فعّل المفتاح الغربي ثم المفتاح الشرقي لفتح الباب السري'
        : 'المهمة ٢: قفا معاً على المفتاحين المتقابلين واضغطا [E] في وقت واحد لفتح الباب السري';
  } else if (puzzles.secretDoorOpen && !puzzles.victoryTriggered) {
    questText =
      mode === 'solo'
        ? 'انفتح الباب السري! تقدّم نحو نصب طاسيلي الأعظم لإتمام الرحلة'
        : 'انفتح الباب السري! تقدّما معاً نحو نصب طاسيلي الأعظم لإتمام الرحلة';
  } else if (puzzles.victoryTriggered) {
    questText = 'اكتملت رحلة طاسيلي بنجاح!';
  }

  const centerBottomMode = isCompactLandscape || showTouchControls;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 flex flex-col justify-between ${
        isCompactLandscape ? 'p-1.5' : 'p-2.5 sm:p-3.5'
      }`}
    >
      {/* Top Row: P1 HUD | Center Objective + Room Code | P2 HUD */}
      <div
        className={`flex items-start justify-between ${
          isCompactLandscape ? 'flex-nowrap gap-1.5' : 'flex-wrap gap-2'
        }`}
      >
        <div className="pointer-events-auto shrink-0">
          <PlayerMeter
            player={players.p1}
            isActiveControl={localSlot === 'p1'}
            align="right"
            compact={isCompactLandscape}
          />
        </div>

        {/* Center Compact Objective & Room Code Bar */}
        <div
          className={`pointer-events-auto flex flex-col items-center mx-auto ${
            isCompactLandscape
              ? 'gap-1 min-w-0 flex-1 max-w-sm'
              : 'gap-1.5 order-last sm:order-none w-full sm:w-auto max-w-md'
          }`}
        >
          <div
            className={`flex items-center bg-[#0a0d16]/90 border border-[#3d352c] ${
              isCompactLandscape ? 'gap-1.5 px-2 py-1 text-[11px]' : 'gap-2 px-3 py-1.5 text-xs'
            }`}
          >
            {mode === 'online' && roomCode ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[#b8ab96] hidden sm:inline">رمز الغرفة:</span>
                <span
                  dir="ltr"
                  className={`font-mono-nums font-bold text-[#60cde6] tracking-wider ${
                    isCompactLandscape ? 'text-xs' : 'text-sm'
                  }`}
                >
                  {roomCode}
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="p-0.5 bg-[#141a26] border border-[#323848] hover:border-[#60cde6] text-[#e6dcc5] cursor-pointer"
                  title="نسخ رمز الغرفة"
                >
                  {copied ? <Check className="w-3 h-3 text-[#60cde6]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            ) : mode === 'solo' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[#e5a93c] font-semibold whitespace-nowrap">اللعب الفردي</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[#e5a93c] font-semibold whitespace-nowrap">
                  {isCompactLandscape ? 'محلي' : 'وضع محلي تعاوني'}
                </span>
                {onSwitchLocalPlayer && (
                  <button
                    type="button"
                    onClick={onSwitchLocalPlayer}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-[#151c29] border border-[#4a3f33] hover:border-[#e5a93c] text-[10px] text-[#f4ead5] cursor-pointer whitespace-nowrap"
                  >
                    <Repeat className="w-3 h-3 text-[#e5a93c]" />
                    <span>{isCompactLandscape ? 'تبديل' : 'تبديل [Tab]'}</span>
                  </button>
                )}
              </div>
            )}

            <span className="text-[#3e4352]">|</span>

            {isMobileDevice && (
              <>
                {isPortraitMobile && (
                  <button
                    type="button"
                    onClick={toggleLandscapeMode}
                    className="p-0.5 text-[#ffe5a3] hover:text-[#e5a93c] cursor-pointer"
                    title="تبديل التدوير الأفقي"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void requestLandscapeFullscreen()}
                  className="p-0.5 text-[#60cde6] hover:text-[#a8ecff] cursor-pointer"
                  title="ملء الشاشة الأفقي"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onToggleTouchControls}
              className={`p-0.5 cursor-pointer transition-colors ${
                showTouchControls ? 'text-[#60cde6]' : 'text-[#7c8291] hover:text-[#e5a93c]'
              }`}
              title={showTouchControls ? 'إخفاء أزرار الهاتف' : 'إظهار أزرار الهاتف'}
            >
              <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="p-0.5 text-[#d7cbb4] hover:text-[#e5a93c] cursor-pointer"
              title={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
            >
              {muted ? (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d44848]" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onLeaveToMenu}
              className="flex items-center gap-1 px-1.5 py-0.5 bg-[#1a1316] border border-[#4a2e32] hover:border-[#d44848] text-[10px] sm:text-[11px] text-[#e6c5c5] cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3 h-3" />
              <span>القائمة</span>
            </button>
          </div>

          <div
            className={`bg-[#090c14]/86 border border-[#2c3140] text-[#e6dcc5] text-center leading-snug ${
              isCompactLandscape
                ? 'px-2 py-0.5 text-[10px] max-w-full truncate'
                : 'px-3 py-1 text-[11px] sm:text-xs'
            }`}
            title={questText}
          >
            {questText}
          </div>

          {eventBanner && (
            <div
              className={`bg-[#181f2c]/95 border border-[#e5a93c] font-bold text-[#ffe5a3] shadow-lg text-center ${
                isCompactLandscape ? 'px-2.5 py-0.5 text-[11px]' : 'px-4 py-1.5 text-xs'
              }`}
            >
              {eventBanner}
            </div>
          )}
        </div>

        {mode !== 'solo' && (
          <div className="pointer-events-auto shrink-0">
            <PlayerMeter
              player={players.p2}
              isActiveControl={localSlot === 'p2'}
              align="left"
              compact={isCompactLandscape}
            />
          </div>
        )}
      </div>

      {/* Bottom Row: Co-op Quick Signals + Lightweight Corner/Centered Chat (hidden in solo mode) */}
      {mode !== 'solo' ? (
        <div
          className={
            centerBottomMode
              ? 'flex flex-col items-center justify-end gap-1.5 pointer-events-none'
              : 'flex flex-wrap items-end justify-between gap-2'
          }
        >
          {/* Floating Chat Drawer when open on mobile/touch mode */}
          {centerBottomMode && chatOpen && (
            <div className="pointer-events-auto w-64 bg-[#0a0d16]/95 border border-[#4d4234] shadow-2xl p-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#e5a93c] pb-1 border-b border-[#252a36]">
                <span>دردشة الرفيق</span>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  className="text-[#9e9482] hover:text-[#f4ead5] cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="max-h-20 overflow-y-auto space-y-1 text-[11px] pr-1">
                {chat.slice(-6).map((m) => (
                  <div key={m.id} className="leading-snug">
                    <span
                      className={`font-bold ml-1 ${
                        m.senderSlot === 'p1'
                          ? 'text-[#f0b24a]'
                          : m.senderSlot === 'p2'
                            ? 'text-[#60cde6]'
                            : 'text-[#9e9482]'
                      }`}
                    >
                      {m.senderName}:
                    </span>
                    <span className="text-[#e6dcc5]">{m.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleChatSubmit} className="flex gap-1">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="اكتب رسالة..."
                  maxLength={140}
                  className="flex-1 min-w-0 px-2 py-1 bg-[#07090f] border border-[#2f3545] focus:border-[#60cde6] outline-none text-[11px] text-[#f4ead5] placeholder:text-[#666c7c]"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-[#182330] border border-[#3d4c5c] hover:border-[#60cde6] text-[#60cde6] cursor-pointer"
                  aria-label="إرسال"
                >
                  <Send className="w-3 h-3" />
                </button>
              </form>
            </div>
          )}

          {/* Centered compact signals + chat toggle when mobile touch controls are active */}
          {centerBottomMode ? (
            <div className="pointer-events-auto flex items-center gap-1 bg-[#0a0d16]/82 border border-[#323644] p-1">
              {(['here', 'lever', 'sync', 'wait'] as QuickSignalType[]).map((sigKey) => (
                <button
                  key={sigKey}
                  type="button"
                  onClick={() => onSendSignal(sigKey)}
                  className="px-1.5 py-1 bg-[#141925] border border-[#383d4d] hover:border-[#e5a93c] text-[10px] font-semibold text-[#e6dcc5] cursor-pointer whitespace-nowrap"
                >
                  {QUICK_SIGNALS[sigKey].short}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setChatOpen((prev) => !prev)}
                className={`flex items-center gap-1 px-2 py-1 border text-[10px] font-bold cursor-pointer ${
                  chatOpen
                    ? 'bg-[#1f2938] border-[#e5a93c] text-[#ffe5a3]'
                    : 'bg-[#141925] border-[#383d4d] text-[#60cde6]'
                }`}
                title="دردشة الرفيق"
              >
                <MessageSquare className="w-3 h-3" />
                <span>دردشة</span>
              </button>
            </div>
          ) : (
            <>
              <div className="pointer-events-auto flex items-center gap-1.5 bg-[#0a0d16]/88 border border-[#323644] p-1.5">
                <span className="text-[11px] text-[#a89e8c] px-1.5 hidden sm:inline">إشارات:</span>
                {(['here', 'lever', 'sync', 'wait'] as QuickSignalType[]).map((sigKey, i) => (
                  <button
                    key={sigKey}
                    type="button"
                    onClick={() => onSendSignal(sigKey)}
                    className="px-2.5 py-1 bg-[#141925] border border-[#383d4d] hover:border-[#e5a93c] hover:text-[#ffe5a3] text-[11px] font-semibold text-[#e6dcc5] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span className="font-mono-nums text-[#60cde6] ml-1">{i + 1}</span>
                    {QUICK_SIGNALS[sigKey].short}
                  </button>
                ))}
              </div>

              <div className="pointer-events-auto w-60 sm:w-72 bg-[#0a0d16]/90 border border-[#343947] shadow-xl">
                <button
                  type="button"
                  onClick={() => setChatOpen(!chatOpen)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-[#e5a93c] border-b border-[#252a36] cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>دردشة الرفيق</span>
                  </span>
                  {chatOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>

                {chatOpen && (
                  <div className="p-2 flex flex-col gap-1.5">
                    <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] pr-1">
                      {chat.slice(-8).map((m) => (
                        <div key={m.id} className="leading-snug">
                          <span
                            className={`font-bold ml-1 ${
                              m.senderSlot === 'p1'
                                ? 'text-[#f0b24a]'
                                : m.senderSlot === 'p2'
                                  ? 'text-[#60cde6]'
                                  : 'text-[#9e9482]'
                            }`}
                          >
                            {m.senderName}:
                          </span>
                          <span className="text-[#e6dcc5]">{m.text}</span>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleChatSubmit} className="flex gap-1">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="اكتب رسالة سريعة..."
                        maxLength={140}
                        className="flex-1 min-w-0 px-2 py-1 bg-[#07090f] border border-[#2f3545] focus:border-[#60cde6] outline-none text-[11px] text-[#f4ead5] placeholder:text-[#666c7c]"
                      />
                      <button
                        type="submit"
                        className="px-2 py-1 bg-[#182330] border border-[#3d4c5c] hover:border-[#60cde6] text-[#60cde6] cursor-pointer"
                        aria-label="إرسال"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div />
      )}
    </div>
  );
};
