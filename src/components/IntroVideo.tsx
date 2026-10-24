import React, { useRef, useState } from 'react';
import { Volume2, VolumeX, SkipForward } from 'lucide-react';

interface IntroVideoProps {
  src: string;
  onEnded: () => void;
  canSkip?: boolean;
}

export const IntroVideo: React.FC<IntroVideoProps> = ({
  src,
  onEnded,
  canSkip = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleGlobalClick = () => {
    // Si el usuario hace tap en la pantalla por primera vez, desmutear
    if (videoRef.current && videoRef.current.muted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  return (
    <div
      onClick={handleGlobalClick}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden font-mono select-none"
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay
        playsInline
        muted // Requisito estricto para navegadores y WebViews de Android
        className="w-full h-full object-cover"
        onEnded={onEnded}
        onError={() => {
          console.warn('[IntroVideo] Error o fallo al reproducir video, ejecutando fallback.');
          onEnded();
        }}
      />

      {/* Controles Tácticos Flotantes */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <button
          onClick={toggleAudio}
          className="px-3 py-1.5 rounded-lg bg-black/75 border border-cyan-500/50 text-cyan-300 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md hover:bg-cyan-950 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-amber-400" />
              <span>ACTIVAR AUDIO</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>SILENCIAR</span>
            </>
          )}
        </button>

        {canSkip && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnded();
            }}
            className="px-3 py-1.5 rounded-lg bg-black/75 border border-zinc-700 text-zinc-400 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md hover:text-white hover:border-zinc-500 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>SALTAR</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default IntroVideo;
