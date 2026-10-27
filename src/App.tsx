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
  const [hasCompletedIntro, setHasCompletedIntro] = useState<boolean>(false);

  // 🔄 Verifica actualizaciones (Tauri Desktop)
  useUpdater();

  // 🚀 Forzar Giro y Pantalla Completa Automáticos
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

  // 🎵 Activar música de fondo tan pronto se entra a Login o al juego
  useEffect(() => {
    if (hasCompletedIntro || user) {
      window.dispatchEvent(new CustomEvent('gd_play_bg_music'));
    }
  }, [hasCompletedIntro, user]);

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

  // 1. USUARIO YA CONECTADO ("Recuérdame"):
  // Pasa directo a la precarga y al juego sin mostrar la intro
  if (user) {
    if (!isPreloaderFinished) {
      return <GamePreloader onComplete={() => setIsPreloaderFinished(true)} />;
    }

    return <Homepage user={user as any} onLogout={logout} />;
  }

  // 2. USUARIO NO CONECTADO:
  // Se reproduce la cinemática a pantalla completa antes de mostrar el login
  if (!hasCompletedIntro) {
    return (
      <IntroVideo
        onEnded={() => setHasCompletedIntro(true)}
        onComplete={() => setHasCompletedIntro(true)}
        onSkip={() => setHasCompletedIntro(true)}
      />
    );
  }

  // 3. Pantalla de Autenticación / Registro
  return <AuthView />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}