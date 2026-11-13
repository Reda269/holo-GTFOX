import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, ArrowRight } from 'lucide-react';
import { TassiliFrame } from './components/TassiliFrame.tsx';
import { MainMenu } from './components/MainMenu.tsx';
import { GameView } from './components/GameView.tsx';
import { StoryMovieModal } from './components/StoryMovieModal.tsx';
import { soundFX } from './game/audio.ts';
import { PlayerSlot, RoomSnapshot, ServerWsMessage } from './shared/protocol.ts';

type ScreenState = 'menu' | 'playing_solo' | 'playing_local' | 'playing_online' | 'movie' | 'exited';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('menu');
  const [scanlines, setScanlines] = useState<boolean>(false);
  const [touchMode, setTouchMode] = useState<'auto' | 'always' | 'off'>('auto');
  const [onlineBusy, setOnlineBusy] = useState<boolean>(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [joinedSnapshot, setJoinedSnapshot] = useState<RoomSnapshot | null>(null);
  const [joinedSlot, setJoinedSlot] = useState<PlayerSlot>('p1');

  const wsRef = useRef<WebSocket | null>(null);

  const closeSocket = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => closeSocket();
  }, [closeSocket]);

  const connectAndSend = useCallback(
    (initialPayload: object) => {
      closeSocket();
      setOnlineBusy(true);
      setOnlineError(null);

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;

      const timeout = window.setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          setOnlineBusy(false);
          setOnlineError('تعذر الاتصال بخادم الغرف. حاول مرة أخرى.');
          closeSocket();
        }
      }, 6500);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.send(JSON.stringify(initialPayload));
      };

      const handleHandshake = (ev: MessageEvent) => {
        let msg: ServerWsMessage;
        try {
          msg = JSON.parse(ev.data) as ServerWsMessage;
        } catch {
          return;
        }

        if (msg.type === 'room:joined') {
          ws.removeEventListener('message', handleHandshake);
          setOnlineBusy(false);
          setJoinedSnapshot(msg.snapshot);
          setJoinedSlot(msg.slot);
          setScreen('playing_online');
        } else if (msg.type === 'room:error') {
          ws.removeEventListener('message', handleHandshake);
          setOnlineBusy(false);
          setOnlineError(msg.message);
          closeSocket();
        }
      };

      ws.addEventListener('message', handleHandshake);

      ws.onerror = () => {
        clearTimeout(timeout);
        setOnlineBusy(false);
        setOnlineError('حدث خطأ في الاتصال بالخادم.');
      };
    },
    [closeSocket]
  );

  const handleStartSolo = () => {
    closeSocket();
    setOnlineError(null);
    setJoinedSnapshot(null);
    setJoinedSlot('p1');
    setScreen('playing_solo');
  };

  const handleStartLocal = () => {
    closeSocket();
    setOnlineError(null);
    setJoinedSnapshot(null);
    setJoinedSlot('p1');
    setScreen('playing_local');
  };

  const handleCreateRoom = (playerName: string) => {
    connectAndSend({ type: 'room:create', playerName });
  };

  const handleJoinRoom = (code: string, playerName: string) => {
    connectAndSend({ type: 'room:join', code, playerName });
  };

  const handleLeaveToMenu = () => {
    soundFX.menuClick();
    closeSocket();
    setJoinedSnapshot(null);
    setScreen('menu');
  };

  const handleExit = () => {
    closeSocket();
    soundFX.stopAmbientMusic();
    setScreen('exited');
  };

  const cycleTouchMode = () => {
    soundFX.menuClick();
    setTouchMode((prev) => (prev === 'auto' ? 'always' : prev === 'always' ? 'off' : 'auto'));
  };

  return (
    <TassiliFrame scanlines={scanlines}>
      {screen === 'menu' && (
        <MainMenu
          onStartSolo={handleStartSolo}
          onStartLocal={handleStartLocal}
          onCreateOnlineRoom={handleCreateRoom}
          onJoinOnlineRoom={handleJoinRoom}
          onOpenMovie={() => setScreen('movie')}
          onExit={handleExit}
          onlineBusy={onlineBusy}
          onlineError={onlineError}
          clearOnlineError={() => setOnlineError(null)}
          scanlines={scanlines}
          setScanlines={setScanlines}
          touchMode={touchMode}
          setTouchMode={setTouchMode}
        />
      )}

      {screen === 'movie' && (
        <StoryMovieModal onClose={() => setScreen('menu')} />
      )}

      {screen === 'playing_solo' && (
        <GameView
          mode="solo"
          initialSnapshot={null}
          initialSlot="p1"
          wsRef={wsRef}
          touchMode={touchMode}
          onCycleTouchMode={cycleTouchMode}
          onLeaveToMenu={handleLeaveToMenu}
        />
      )}

      {screen === 'playing_local' && (
        <GameView
          mode="local"
          initialSnapshot={null}
          initialSlot="p1"
          wsRef={wsRef}
          touchMode={touchMode}
          onCycleTouchMode={cycleTouchMode}
          onLeaveToMenu={handleLeaveToMenu}
        />
      )}

      {screen === 'playing_online' && joinedSnapshot && (
        <GameView
          mode="online"
          initialSnapshot={joinedSnapshot}
          initialSlot={joinedSlot}
          wsRef={wsRef}
          touchMode={touchMode}
          onCycleTouchMode={cycleTouchMode}
          onLeaveToMenu={handleLeaveToMenu}
        />
      )}

      {screen === 'exited' && (
        <div className="w-full h-full bg-[#07090f] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-[#131824] border border-[#4a3e30] flex items-center justify-center mb-5 animate-float-slow">
            <Flame className="w-8 h-8 text-[#e5a93c]" />
          </div>
          <h2 className="font-display text-3xl font-bold text-[#f4ead5] mb-2">
            استراحة عند موقد طاسيلي
          </h2>
          <p className="text-sm text-[#b5aa99] max-w-md mb-6 leading-relaxed">
            تبقى أسرار الكهوف في انتظار عودتك أنت ورفيقك متى شئتما.
          </p>
          <button
            type="button"
            onClick={() => {
              soundFX.startAmbientMusic();
              soundFX.menuClick();
              setScreen('menu');
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#161d2b] border border-[#e5a93c] hover:bg-[#1f293d] text-sm font-bold text-[#f5ebd6] cursor-pointer transition-colors"
          >
            <ArrowRight className="w-4 h-4 text-[#e5a93c]" />
            <span>العودة إلى القائمة الرئيسية</span>
          </button>
        </div>
      )}
    </TassiliFrame>
  );
}
