import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, SkipForward, Play } from 'lucide-react';

interface IntroVideoProps {
  onEnded: () => void;
  onComplete?: () => void;
  onSkip?: () => void;
}

const VIDEO_SRC = "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Videos/introjinglefinal.mp4";

export const IntroVideo: React.FC<IntroVideoProps> = ({ onEnded, onComplete, onSkip }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);

  const handleFinish = useCallback(() => {
    if (onEnded) onEnded();
    if (onComplete) onComplete();
    if (onSkip) onSkip();
  }, [onEnded, onComplete, onSkip]);

  const startPlaying = async (withSound = true) => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = !withSound;
      setIsMuted(!withSound);
      await video.play();
      setNeedsUserInteraction(false);
    } catch {
      // Si el navegador bloqueó el autoplay con sonido, pedir la interacción inicial
      video.muted = true;
      setIsMuted(true);
      setNeedsUserInteraction(true);
      video.play().catch(() => {});
    }
  };

  useEffect(() => {
    startPlaying(true);
  }, []);

  const handleStartWithSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      startPlaying(true);
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black w-screen h-screen overflow-hidden select-none flex items-center justify-center"
      onClick={() => {
        if (needsUserInteraction) {
          startPlaying(true);
        }
      }}
    >
      {/* 🎬 VIDEO FULLSCREEN REAL (Cero barras negras, cinematográfico como un videojuego) */}
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        autoPlay
        playsInline
        onEnded={handleFinish}
        className="w-full h-full object-cover scale-[1.02]"
      />

      {/* Botón Silenciar / Activar Audio */}
      <button
        type="button"
        onClick={toggleSound}
        className="absolute top-4 left-4 z-30 px-3.5 py-2 bg-black/80 hover:bg-black border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 rounded-xl backdrop-blur-md transition-all cursor-pointer flex items-center gap-2 font-mono text-[9px] uppercase font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)]"
      >
        {isMuted ? (
          <>
            <VolumeX className="w-4 h-4 text-red-400" />
            <span>ACTIVAR AUDIO</span>
          </>
        ) : (
          <>
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>AUDIO ACTIVO</span>
          </>
        )}
      </button>

      {/* Botón Omitir */}
      <button
        type="button"
        onClick={handleFinish}
        className="absolute top-4 right-4 z-30 px-4 py-2 bg-black/80 hover:bg-black border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 hover:text-white font-mono text-xs uppercase tracking-widest rounded-xl backdrop-blur-md transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
      >
        <span>OMITIR</span>
        <SkipForward className="w-4 h-4 text-cyan-400" />
      </button>

      {/* Pantalla interactiva si el navegador detuvo el sonido inicial */}
      {needsUserInteraction && (
        <div 
          onClick={handleStartWithSound}
          className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center cursor-pointer font-mono"
        >
          <div className="bg-[#05080c]/90 border-2 border-cyan-400 px-6 py-4 rounded-2xl flex flex-col items-center gap-3 shadow-[0_0_40px_rgba(6,182,212,0.6)] hover:scale-105 transition-transform">
            <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-400 flex items-center justify-center animate-pulse">
              <Play className="w-6 h-6 fill-cyan-400 text-cyan-400 ml-0.5" />
            </div>
            <span className="text-white text-xs sm:text-sm font-black uppercase tracking-widest">
              INICIAR CINEMÁTICA
            </span>
            <span className="text-[8px] text-cyan-300 uppercase">
              Toca aquí para reproducir con sonido
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntroVideo;