import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './components/AuthView';
import { Homepage } from './pages/Homepage';
import { RefreshCw } from 'lucide-react';

import { GamePreloader } from './components/GamePreloader';
import { useUpdater } from './hooks/useUpdater';

function AppContent() {
  const { user, logout, isInitializing, screen, showNewPasswordModal } = useAuth();
  const [isPreloaderFinished, setIsPreloaderFinished] = useState(false);

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

  // Activar música ambiental cuando el usuario esté conectado, no tenga bloqueo de clave y termine el preloader
  useEffect(() => {
    if (user && !user.mustResetPassword && !showNewPasswordModal && screen !== 'reset_password' && isPreloaderFinished) {
      window.dispatchEvent(new CustomEvent('gd_play_bg_music'));
    }
  }, [user, user?.mustResetPassword, showNewPasswordModal, screen, isPreloaderFinished]);

  // Pantalla de carga mientras se verifica la sesión en memoria
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

  // 0. BLOQUEO OBLIGATORIO: RECUPERACIÓN DE CONTRASEÑA O BANDERA must_reset_password = true
  const isPasswordResetRequired = Boolean(screen === 'reset_password' || showNewPasswordModal || user?.mustResetPassword);

  if (isPasswordResetRequired) {
    return <AuthView />;
  }

  // 🌐 Detección global de URL de recuperación — failsafe independiente del estado del hook
  // Configura la detección de recuperación en el punto de entrada de la aplicación
  const isRecoveryUrl = typeof window !== 'undefined' && (
    window.location.hash.includes('type=recovery') ||
    window.location.hash.includes('access_token') ||
    window.location.search.includes('code=') ||
    window.location.search.includes('recovery=true')
  );

  if (isRecoveryUrl) {
    return <AuthView />;
  }

  // 1. USUARIO CONECTADO ("Recuérdame" / Sesión activa):
  if (user) {
    if (!isPreloaderFinished) {
      return <GamePreloader onComplete={() => setIsPreloaderFinished(true)} />;
    }

    return <Homepage user={user as any} onLogout={logout} />;
  }

  // 2. USUARIO NO CONECTADO:
  return <AuthView />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
