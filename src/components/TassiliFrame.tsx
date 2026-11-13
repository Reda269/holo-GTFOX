import React, { createContext, useContext, useEffect, useState } from 'react';
import { RotateCw, Maximize2 } from 'lucide-react';

interface LayoutModeContextValue {
  isMobileDevice: boolean;
  isPortraitMobile: boolean;
  rotateToLandscape: boolean;
  isCompactLandscape: boolean;
  toggleLandscapeMode: () => void;
}

const LayoutModeContext = createContext<LayoutModeContextValue>({
  isMobileDevice: false,
  isPortraitMobile: false,
  rotateToLandscape: false,
  isCompactLandscape: false,
  toggleLandscapeMode: () => {},
});

export function useLayoutMode(): LayoutModeContextValue {
  return useContext(LayoutModeContext);
}

interface TassiliFrameProps {
  children: React.ReactNode;
  scanlines?: boolean;
}

export async function requestLandscapeFullscreen(): Promise<void> {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // Fullscreen may be blocked outside direct gesture or in iframe
  }
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: 'landscape' | 'landscape-primary') => Promise<void>;
    };
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape');
    }
  } catch {
    // Orientation lock not supported on all devices; CSS landscape rotation handles fallback
  }
}

export const TassiliFrame: React.FC<TassiliFrameProps> = ({ children, scanlines = false }) => {
  const [viewport, setViewport] = useState<{
    isMobileDevice: boolean;
    isPortraitMobile: boolean;
    isCompactHeight: boolean;
  }>({
    isMobileDevice: false,
    isPortraitMobile: false,
    isCompactHeight: false,
  });
  const [manualLandscape, setManualLandscape] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => {
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const smallMin = Math.min(window.innerWidth, window.innerHeight) < 768;
      const isMobile = coarse || smallMin;
      const portrait = window.innerHeight > window.innerWidth;
      setViewport({
        isMobileDevice: isMobile,
        isPortraitMobile: isMobile && portrait,
        isCompactHeight: isMobile && window.innerHeight < 540,
      });
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  const rotateToLandscape =
    manualLandscape !== null ? manualLandscape && viewport.isPortraitMobile : viewport.isPortraitMobile;

  const isCompactLandscape = rotateToLandscape || viewport.isCompactHeight;

  const toggleLandscapeMode = () => {
    requestLandscapeFullscreen();
    setManualLandscape((prev) => !(prev !== null ? prev : viewport.isPortraitMobile));
  };

  return (
    <LayoutModeContext.Provider
      value={{
        isMobileDevice: viewport.isMobileDevice,
        isPortraitMobile: viewport.isPortraitMobile,
        rotateToLandscape,
        isCompactLandscape,
        toggleLandscapeMode,
      }}
    >
      <div className="relative w-screen h-dvh bg-[#06070c] overflow-hidden select-none">
        {/* Subtle outer subterranean ambient vignette */}
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(28, 34, 52, 0.28) 0%, rgba(5, 6, 10, 0.96) 80%)',
          }}
        />

        {/* Landscape-locked / auto-rotated wrapper for mobile portrait */}
        <div
          style={
            rotateToLandscape
              ? {
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  width: '100dvh',
                  height: '100dvw',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                  transformOrigin: 'center center',
                }
              : undefined
          }
          className={
            rotateToLandscape
              ? 'flex items-center justify-center p-1 overflow-hidden'
              : 'relative w-full h-full flex items-center justify-center p-1 sm:p-3 overflow-hidden'
          }
        >
          {/* Fullscreen authentic Tassili ornamental stone frame */}
          <div className="relative w-full h-full max-w-[1600px] max-h-[960px] bg-[#080a10] border-2 border-[#3b3329] tassili-frame overflow-hidden flex flex-col">
            {/* Corner Tassili carved geometric brackets */}
            <svg
              className={`pointer-events-none absolute top-1.5 right-1.5 text-[#c98838]/70 z-30 ${
                isCompactLandscape ? 'w-5 h-5' : 'w-6 h-6 sm:w-8 sm:h-8'
              }`}
              viewBox="0 0 32 32"
              fill="none"
            >
              <path d="M2 2H30V6H6V30H2V2Z" fill="currentColor" />
              <rect x="10" y="10" width="5" height="5" fill="#60cde6" fillOpacity="0.6" />
            </svg>
            <svg
              className={`pointer-events-none absolute top-1.5 left-1.5 text-[#c98838]/70 z-30 -scale-x-100 ${
                isCompactLandscape ? 'w-5 h-5' : 'w-6 h-6 sm:w-8 sm:h-8'
              }`}
              viewBox="0 0 32 32"
              fill="none"
            >
              <path d="M2 2H30V6H6V30H2V2Z" fill="currentColor" />
              <rect x="10" y="10" width="5" height="5" fill="#60cde6" fillOpacity="0.6" />
            </svg>
            <svg
              className={`pointer-events-none absolute bottom-1.5 right-1.5 text-[#c98838]/70 z-30 -scale-y-100 ${
                isCompactLandscape ? 'w-5 h-5' : 'w-6 h-6 sm:w-8 sm:h-8'
              }`}
              viewBox="0 0 32 32"
              fill="none"
            >
              <path d="M2 2H30V6H6V30H2V2Z" fill="currentColor" />
              <rect x="10" y="10" width="5" height="5" fill="#60cde6" fillOpacity="0.6" />
            </svg>
            <svg
              className={`pointer-events-none absolute bottom-1.5 left-1.5 text-[#c98838]/70 z-30 -scale-x-100 -scale-y-100 ${
                isCompactLandscape ? 'w-5 h-5' : 'w-6 h-6 sm:w-8 sm:h-8'
              }`}
              viewBox="0 0 32 32"
              fill="none"
            >
              <path d="M2 2H30V6H6V30H2V2Z" fill="currentColor" />
              <rect x="10" y="10" width="5" height="5" fill="#60cde6" fillOpacity="0.6" />
            </svg>

            {/* Re-enable landscape helper only if user manually turned off horizontal rotation in portrait */}
            {viewport.isPortraitMobile && !rotateToLandscape && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={toggleLandscapeMode}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#0a0d16]/90 border border-[#e5a93c]/70 text-[11px] font-bold text-[#ffe5a3] cursor-pointer shadow-lg"
                  title="تفعيل الوضع الأفقي"
                >
                  <RotateCw className="w-3.5 h-3.5 text-[#e5a93c]" />
                  <span>تفعيل الوضع الأفقي</span>
                </button>
                <button
                  type="button"
                  onClick={() => requestLandscapeFullscreen()}
                  className="flex items-center gap-1 px-2 py-1 bg-[#0a0d16]/90 border border-[#3d352c] text-[11px] text-[#60cde6] cursor-pointer"
                  title="ملء الشاشة"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Main viewport content */}
            <div className="relative flex-1 w-full h-full overflow-hidden">
              {children}
              {scanlines && <div className="scanlines-overlay absolute inset-0 z-20" />}
            </div>
          </div>
        </div>
      </div>
    </LayoutModeContext.Provider>
  );
};
