import React, { useEffect, useState } from 'react';
import { RefreshCw, Shield, Terminal, Zap } from 'lucide-react';
import { preloadGameDataAndAssets } from '../lib/gameCache';

interface GamePreloaderProps {
  onComplete: () => void;
}

export const GamePreloader: React.FC<GamePreloaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("INICIALIZANDO SUBSISTEMAS...");

  useEffect(() => {
    let isMounted = true;

    preloadGameDataAndAssets((pct, status) => {
      if (isMounted) {
        setProgress(pct);
        setStatusMessage(status);
      }
    }).then(() => {
      setTimeout(() => {
        if (isMounted) onComplete();
      }, 400); // Pequeño margen estético para completar la animación al 100%
    });

    return () => {
      isMounted = false;
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[999] bg-[#05070a] flex flex-col items-center justify-center p-6 font-mono select-none text-white overflow-hidden">
      {/* Fondo con cuadricula táctica */}
      <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

      <div className="w-full max-w-md bg-[#080b0e] border border-cyan-500/40 p-6 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] relative z-10 flex flex-col items-center text-center gap-5">
        
        {/* Ícono central animado */}
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <Shield className="w-7 h-7 text-cyan-400 absolute animate-pulse" />
        </div>

        {/* Títulos */}
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-black tracking-[0.25em] text-white uppercase drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            GALAXY DUST C.A.N.
          </h2>
          <span className="text-[8px] text-cyan-400/80 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
            <Terminal className="w-3 h-3 text-amber-400" /> CUALIFICANDO NODO TÁCTICO
          </span>
        </div>

        {/* Barra de Progreso */}
        <div className="w-full space-y-2">
          <div className="flex justify-between items-center text-[9px] font-bold">
            <span className="text-zinc-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> PROGRESO
            </span>
            <span className="text-amber-400 font-black">{progress}%</span>
          </div>

          <div className="w-full h-2 bg-black rounded-full overflow-hidden p-0.5 border border-cyan-500/30">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 via-teal-500 to-amber-400 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status Feed */}
        <div className="bg-[#020406] border border-cyan-950 p-2.5 rounded-lg w-full text-left">
          <span className="text-[7.5px] text-cyan-300/90 font-mono block leading-tight truncate">
            &gt; {statusMessage}
          </span>
        </div>

      </div>
    </div>
  );
};

export default GamePreloader;