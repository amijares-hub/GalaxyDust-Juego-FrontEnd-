import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LandscapeGuardProps {
  children: React.ReactNode;
}

export const LandscapeGuard: React.FC<LandscapeGuardProps> = ({ children }) => {
  const { t } = useTranslation();
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(orientation: portrait)').matches || window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const checkOrientation = () => {
      const mediaMatch = window.matchMedia('(orientation: portrait)').matches;
      const dimensionMatch = window.innerHeight > window.innerWidth;
      setIsPortrait(mediaMatch || dimensionMatch);
    };

    checkOrientation();

    const mediaQuery = window.matchMedia('(orientation: portrait)');
    
    // Escucha cambios en matchMedia
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', checkOrientation);
    } else {
      mediaQuery.addListener(checkOrientation);
    }

    // Escucha eventos clásicos de redimensionado y giro
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', checkOrientation);
      } else {
        mediaQuery.removeListener(checkOrientation);
      }
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      if (screen.orientation && 'lock' in screen.orientation) {
        // @ts-ignore
        await screen.orientation.lock('landscape');
      }
    } catch {
      // Ignorar fallos de fullscreen si el navegador no los permite
    }
  };

  return (
    <>
      {/* OVERLAY DE ROTACIÓN OBLIGATORIA EN MODO PORTRAIT */}
      {isPortrait && (
        <div className="fixed inset-0 z-[999999] bg-[#05080c] flex flex-col items-center justify-center p-6 text-center select-none font-mono">
          <div className="relative mb-6 flex items-center justify-center">
            {/* Anillo de pulso neón cian */}
            <div className="absolute w-28 h-28 rounded-full border border-cyan-500/30 animate-ping pointer-events-none" />
            
            {/* Contenedor del icono sci-fi */}
            <div className="relative w-24 h-24 rounded-2xl border border-cyan-500/50 bg-[#080e18] shadow-[0_0_35px_rgba(6,182,212,0.4)] flex items-center justify-center">
              <Smartphone className="w-12 h-12 text-cyan-400 animate-bounce" />
              <div className="absolute -bottom-2 -right-2 bg-[#05080c] border border-cyan-400/80 rounded-full p-1.5 shadow-[0_0_15px_rgba(6,182,212,0.6)]">
                <RotateCw className="w-5 h-5 text-cyan-300 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>
          </div>

          <h1 className="text-sm sm:text-base md:text-lg font-black tracking-widest text-cyan-400 uppercase mb-2 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
            {t('system.rotation_required')}
          </h1>

          <p className="text-xs text-zinc-400 max-w-sm uppercase leading-relaxed tracking-wider mb-6">
            {t('system.rotation_hint')}
          </p>

          <button
            onClick={handleFullscreen}
            className="px-5 py-2.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/60 hover:border-cyan-400 text-cyan-300 hover:text-white text-[10px] font-black uppercase rounded-lg tracking-widest shadow-[0_0_18px_rgba(6,182,212,0.3)] active:scale-95 transition-all cursor-pointer"
          >
            CALIBRAR PANTALLA COMPLETA
          </button>
        </div>
      )}

      {/* CONTENIDO DE LA APLICACIÓN */}
      <div className="w-full h-full min-h-screen overflow-hidden bg-black">
        {children}
      </div>
    </>
  );
};
