import React, { useState, useEffect } from 'react';
import { RotateCw, Monitor } from 'lucide-react';

interface LandscapeGuardProps {
  children: React.ReactNode;
}

export const LandscapeGuard: React.FC<LandscapeGuardProps> = ({ children }) => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Detectar si el ancho es menor que el alto (Modo Retrato/Vertical)
      const portrait = window.innerHeight > window.innerWidth;
      const isMobileOrTablet = window.innerWidth <= 1024 || window.innerHeight <= 1024;
      
      setIsPortrait(portrait && isMobileOrTablet);
    };

    // Intentar bloquear la orientación si el navegador lo permite
    const tryLockLandscape = async () => {
      try {
        if (screen.orientation && 'lock' in screen.orientation) {
          // @ts-ignore
          await screen.orientation.lock('landscape');
        }
      } catch (e) {
        // En iOS Safari o sin pantalla completa, se usará la alerta visual
      }
    };

    checkOrientation();
    tryLockLandscape();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleFullscreenAndLock = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      if (screen.orientation && 'lock' in screen.orientation) {
        // @ts-ignore
        await screen.orientation.lock('landscape');
      }
    } catch (err) {
      console.warn("Bloqueo de orientación no soportado directamente:", err);
    }
  };

  return (
    <>
      {/* OVERLAY DE BLOQUEO OBLIGATORIO SI ESTÁ EN VERTICAL */}
      {isPortrait && (
        <div className="fixed inset-0 z-[99999] bg-[#030609] text-white flex flex-col items-center justify-center p-6 text-center font-mono select-none">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl border-2 border-cyan-500/40 bg-cyan-950/30 flex items-center justify-center animate-pulse">
              <RotateCw className="w-10 h-10 text-cyan-400 animate-spin-slow" />
            </div>
            <Monitor className="w-8 h-8 text-amber-400 absolute -bottom-2 -right-2 bg-black rounded-lg p-1 border border-amber-500/50" />
          </div>

          <h2 className="text-lg font-black tracking-widest text-cyan-300 uppercase mb-2">
            MODO HORIZONTAL OBLIGATORIO
          </h2>

          <p className="text-[11px] text-zinc-400 max-w-xs uppercase leading-relaxed mb-6">
            Para garantizar la telemetría táctica y visualización del Command Action Node (C.A.N.), debes girar tu dispositivo a posición horizontal.
          </p>

          <button
            onClick={handleFullscreenAndLock}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 border border-cyan-400 text-white text-[10px] font-black uppercase rounded-xl tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 transition-all"
          >
            ACTIVAR PANTALLA COMPLETA
          </button>
        </div>
      )}

      {/* CONTENIDO DEL JUEGO (RESCALADO A LANDSCAPE) */}
      <div className="w-full h-full min-h-screen overflow-hidden bg-black">
        {children}
      </div>
    </>
  );
};
