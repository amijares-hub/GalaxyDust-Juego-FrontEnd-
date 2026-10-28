import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './components/AuthView';
import { Homepage } from './pages/Homepage';
import { RefreshCw } from 'lucide-react';

import { GamePreloader } from './components/GamePreloader';
import { useUpdater } from './hooks/useUpdater';
import { useAudioEngine } from './hooks/useAudioEngine';

function AppContent() {
  // Activa el motor de audio y registra los listeners de música de fondo (gd_play_bg_music)
  useAudioEngine();

  const { user, logout, isInitializing, screen, showNewPasswordModal } = useAuth();
  const [isPreloaderFinished, setIsPreloaderFinished] = useState(false);
  const [initTimeout, setInitTimeout] = useState(false);

  // Verifica actualizaciones al arrancar (solo en Tauri Desktop)
  useUpdater();

  // TIMEOUT DE SEGURIDAD: Máximo 2 segundos en inicialización; si no responde, desbloquea la pantalla
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitTimeout(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // 1. PRIORIDAD ABSOLUTA: SI ES RECUPERACIÓN DE CONTRASEÑA, RENDERIZAR AuthView DE INMEDIATO
  const isRecoveryMode = typeof window !== 'undefined' && (
    window.location.search.includes('code=') ||
    window.location.search.includes('recovery=true') ||
    window.location.hash.includes('type=recovery') ||
    window.location.hash.includes('access_token') ||
    screen === 'reset_password' ||
    showNewPasswordModal === true ||
    Boolean(user?.mustResetPassword)
  );

  // Forzar Giro y Pantalla Completa Automáticos (Zero Click)
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

  // Activar música ambiental cuando el usuario esté conectado y termine el preloader
  useEffect(() => {
    if (user && !user.mustResetPassword && !showNewPasswordModal && screen !== 'reset_password' && !isRecoveryMode && isPreloaderFinished) {
      window.dispatchEvent(new CustomEvent('gd_play_bg_music'));
    }
  }, [user, user?.mustResetPassword, showNewPasswordModal, screen, isRecoveryMode, isPreloaderFinished]);

  // 1. SI ES RECUPERACIÓN DE CONTRASEÑA: Renderizar AuthView de inmediato
  if (isRecoveryMode) {
    return <AuthView initialScreen="reset_password" />;
  }

  // 2. Pantalla de carga: solo mientras isInitializing sea true Y no haya saltado el timeout
  if (isInitializing && !initTimeout) {
    return (
      <div className="w-screen h-screen bg-[#0C0D0E] flex flex-col items-center justify-center text-cyan-500 font-mono space-y-4 select-none">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <div className="text-[10px] tracking-[0.3em] uppercase animate-pulse">
          Sincronizando Estado C.A.N...
        </div>
      </div>
    );
  }

  // 3. USUARIO CONECTADO:
  if (user) {
    if (!isPreloaderFinished) {
      return <GamePreloader onComplete={() => setIsPreloaderFinished(true)} />;
    }

    return <Homepage user={user as any} onLogout={logout} />;
  }

  // 4. USUARIO NO CONECTADO:
  return <AuthView />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}