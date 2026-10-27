import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './components/AuthView';
import { Homepage } from './pages/Homepage';
import { RefreshCw } from 'lucide-react';

import { GamePreloader } from './components/GamePreloader';
import { IntroVideo } from './components/IntroVideo';
import { useUpdater } from './hooks/useUpdater';

function AppContent() {
  const { user, logout, isInitializing } = useAuth();
  const [isPreloaderFinished, setIsPreloaderFinished] = useState(false);
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean>(() => {
    return !!sessionStorage.getItem('gd_intro_seen');
  });

  // 🔄 Verifica actualizaciones al arrancar (solo en Tauri Desktop)
  useUpdater();

  // 🚀 Forzar Giro y Pantalla Completa Automáticos (Zero Click)
  useEffect(() => {
    if (window.screen?.orientation && 'lock' in window.screen.orientation) {
      (window.screen.orientation as any).lock('landscape').catch(() => {});
    }

    const autoLockFullscreen = () => {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => {
          (window.screen?.orientation as any)?.lock?.('landscape').catch(() => {});
        }).catch(() => {});
      } else if (window.screen?.orientation && 'lock' in window.screen.orientation) {
        (window.screen.orientation as any).lock('landscape').catch(() => {});
      }
    };

    window.addEventListener('click', autoLockFullscreen, { once: true });
    window.addEventListener('touchstart', autoLockFullscreen, { once: true });

    return () => {
      window.removeEventListener('click', autoLockFullscreen);
      window.removeEventListener('touchstart', autoLockFullscreen);
    };
  }, []);

  // Si el intro ya fue visto en esta sesión (por ejemplo tras un F5), activar la música en el primer clic
  useEffect(() => {
    if (user && isPreloaderFinished && hasSeenIntro) {
      window.dispatchEvent(new CustomEvent('gd_play_bg_music'));
    }
  }, [user, isPreloaderFinished, hasSeenIntro]);

  if (isInitializing) {
    return (
      <div className="w-screen h-screen bg-[#0C0D0E] flex flex-col items-center justify-center text-cyan-500 font-mono space-y-4 select-none">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <div className="text-[10px] tracking-[0.3em] uppercase animate-pulse">
          Sincronizando Estado C.A.N...
        </div>
      </div>
    );
  }

  if (user) {
    // 1. Precarga multimedia
    if (!isPreloaderFinished) {
      return <GamePreloader onComplete={() => setIsPreloaderFinished(true)} />;
    }

    // 2. Cinemática Intro oficial con trigger a la música de fondo
    if (!hasSeenIntro) {
      return (
        <IntroVideo
          onEnded={() => {
            sessionStorage.setItem('gd_intro_seen', 'true');
            setHasSeenIntro(true);
          }}
        />
      );
    }

    // 3. Homepage oficial del juego
    return <Homepage user={user as any} onLogout={logout} />;
  }

  return <AuthView />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}