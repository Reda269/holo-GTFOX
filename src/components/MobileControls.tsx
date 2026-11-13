import React, { useState } from 'react';
import { ArrowUp, ChevronLeft, ChevronRight, Hand, HeartHandshake, Sword } from 'lucide-react';
import { useLayoutMode } from './TassiliFrame.tsx';

interface MobileControlsProps {
  onHoldKey: (code: 'KeyA' | 'KeyD' | 'KeyW', active: boolean) => void;
  onJumpTap: () => void;
  onAttack: () => void;
  onInteract: () => void;
  onHeal: () => void;
  canHeal: boolean;
  canInteract: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onHoldKey,
  onJumpTap,
  onAttack,
  onInteract,
  onHeal,
  canHeal,
  canInteract,
}) => {
  const { isCompactLandscape } = useLayoutMode();
  const [leftHeld, setLeftHeld] = useState(false);
  const [rightHeld, setRightHeld] = useState(false);
  const [jumpHeld, setJumpHeld] = useState(false);

  return (
    <div
      dir="ltr"
      className={`pointer-events-none absolute inset-x-0 z-25 flex items-end justify-between select-none touch-none ${
        isCompactLandscape ? 'bottom-2 px-3 pb-0.5' : 'bottom-14 sm:bottom-16 px-3 sm:px-6 pb-2'
      }`}
    >
      {/* Left Thumb Zone: Tactical D-Pad (Left / Right) */}
      <div
        className={`pointer-events-auto flex items-center rounded-2xl backdrop-blur-sm border border-[#3d342a]/80 shadow-[0_8px_24px_rgba(0,0,0,0.65)] ${
          isCompactLandscape ? 'gap-1.5 p-1.5 bg-[#080b12]/55' : 'gap-2.5 p-2 bg-[#080b12]/65'
        }`}
      >
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            setLeftHeld(true);
            onHoldKey('KeyA', true);
          }}
          onPointerUp={() => {
            setLeftHeld(false);
            onHoldKey('KeyA', false);
          }}
          onPointerCancel={() => {
            setLeftHeld(false);
            onHoldKey('KeyA', false);
          }}
          onPointerLeave={() => {
            if (leftHeld) {
              setLeftHeld(false);
              onHoldKey('KeyA', false);
            }
          }}
          aria-label="تحرك لليسار"
          className={`rounded-xl flex flex-col items-center justify-center transition-transform active:scale-95 border-2 cursor-pointer touch-none ${
            isCompactLandscape ? 'w-[52px] h-[52px]' : 'w-14 h-14 sm:w-16 sm:h-16'
          } ${
            leftHeld
              ? 'bg-[#212b3d]/95 border-[#e5a93c] text-[#ffe6a3] shadow-[0_0_16px_rgba(229,169,60,0.45)]'
              : 'bg-[#111622]/85 border-[#3f4659] text-[#dcd2be]'
          }`}
        >
          <ChevronLeft className={isCompactLandscape ? 'w-6 h-6' : 'w-7 h-7'} />
          <span className="text-[10px] font-bold leading-none">يسار</span>
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            setRightHeld(true);
            onHoldKey('KeyD', true);
          }}
          onPointerUp={() => {
            setRightHeld(false);
            onHoldKey('KeyD', false);
          }}
          onPointerCancel={() => {
            setRightHeld(false);
            onHoldKey('KeyD', false);
          }}
          onPointerLeave={() => {
            if (rightHeld) {
              setRightHeld(false);
              onHoldKey('KeyD', false);
            }
          }}
          aria-label="تحرك لليمين"
          className={`rounded-xl flex flex-col items-center justify-center transition-transform active:scale-95 border-2 cursor-pointer touch-none ${
            isCompactLandscape ? 'w-[52px] h-[52px]' : 'w-14 h-14 sm:w-16 sm:h-16'
          } ${
            rightHeld
              ? 'bg-[#212b3d]/95 border-[#e5a93c] text-[#ffe6a3] shadow-[0_0_16px_rgba(229,169,60,0.45)]'
              : 'bg-[#111622]/85 border-[#3f4659] text-[#dcd2be]'
          }`}
        >
          <ChevronRight className={isCompactLandscape ? 'w-6 h-6' : 'w-7 h-7'} />
          <span className="text-[10px] font-bold leading-none">يمين</span>
        </button>
      </div>

      {/* Right Thumb Zone: Ergonomic Action Cluster (Heal, Interact, Attack, Jump) */}
      <div
        className={`pointer-events-auto relative flex items-end rounded-2xl backdrop-blur-sm border border-[#3d342a]/80 shadow-[0_8px_24px_rgba(0,0,0,0.65)] ${
          isCompactLandscape ? 'gap-1.5 p-1.5 bg-[#080b12]/55' : 'gap-2.5 p-2 bg-[#080b12]/65'
        }`}
      >
        {/* Focus Heal */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onHeal();
          }}
          aria-label="شفاء بالروح"
          className={`rounded-full flex flex-col items-center justify-center transition-all active:scale-90 border-2 cursor-pointer touch-none ${
            isCompactLandscape ? 'w-11 h-11' : 'w-12 h-12 sm:w-13 sm:h-13'
          } ${
            canHeal
              ? 'bg-[#142c38]/95 border-[#60cde6] text-[#c9f3fc] shadow-[0_0_14px_rgba(96,205,230,0.4)]'
              : 'bg-[#10141f]/80 border-[#2d3342] text-[#6d7485]'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          <span className="text-[9px] font-bold leading-tight">شفاء</span>
        </button>

        {/* Interact (Pulses gold near lever/switch/plate) */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onInteract();
          }}
          aria-label="تفاعل"
          className={`rounded-full flex flex-col items-center justify-center transition-all active:scale-90 border-2 cursor-pointer touch-none ${
            isCompactLandscape ? 'w-12 h-12' : 'w-14 h-14'
          } ${
            canInteract
              ? 'bg-[#2e2313]/95 border-[#f0b24a] text-[#ffe9ad] shadow-[0_0_18px_rgba(240,178,74,0.55)] animate-pulse'
              : 'bg-[#121723]/88 border-[#42495c] text-[#d6cbb5]'
          }`}
        >
          <Hand className={isCompactLandscape ? 'w-4 h-4' : 'w-5 h-5'} />
          <span className="text-[9px] sm:text-[10px] font-bold leading-tight">تفاعل</span>
        </button>

        {/* Slash Attack */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onAttack();
          }}
          aria-label="هجوم بالخنجر"
          className={`rounded-full bg-[#14202b]/90 border-2 border-[#60cde6]/80 active:border-[#a5ecff] active:scale-90 text-[#d8f6fd] flex flex-col items-center justify-center shadow-[0_0_12px_rgba(96,205,230,0.22)] cursor-pointer touch-none ${
            isCompactLandscape ? 'w-12 h-12' : 'w-14 h-14 sm:w-15 sm:h-15'
          }`}
        >
          <Sword className={isCompactLandscape ? 'w-4 h-4' : 'w-5 h-5'} />
          <span className="text-[9px] sm:text-[10px] font-bold leading-tight">ضرب</span>
        </button>

        {/* Primary Jump Button */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            setJumpHeld(true);
            onJumpTap();
            onHoldKey('KeyW', true);
          }}
          onPointerUp={() => {
            setJumpHeld(false);
            onHoldKey('KeyW', false);
          }}
          onPointerCancel={() => {
            setJumpHeld(false);
            onHoldKey('KeyW', false);
          }}
          onPointerLeave={() => {
            if (jumpHeld) {
              setJumpHeld(false);
              onHoldKey('KeyW', false);
            }
          }}
          aria-label="قفز"
          className={`rounded-full flex flex-col items-center justify-center transition-transform active:scale-90 border-2 cursor-pointer touch-none ${
            isCompactLandscape ? 'w-14 h-14' : 'w-16 h-16 sm:w-[70px] sm:h-[70px]'
          } ${
            jumpHeld
              ? 'bg-[#362916]/95 border-[#ffd073] text-[#fff3cc] shadow-[0_0_20px_rgba(229,169,60,0.55)]'
              : 'bg-[#1c1a18]/90 border-[#e5a93c] text-[#ffe5a3] shadow-[0_0_14px_rgba(229,169,60,0.25)]'
          }`}
        >
          <ArrowUp className={isCompactLandscape ? 'w-5 h-5' : 'w-6 h-6'} />
          <span className="text-[10px] sm:text-[11px] font-extrabold leading-none">قفز</span>
        </button>
      </div>
    </div>
  );
};
