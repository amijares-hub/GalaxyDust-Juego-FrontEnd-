import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './components/AuthView';
import { Homepage } from './pages/Homepage';
import { RefreshCw } from 'lucide-react';

import { GamePreloader } from './components/GamePreloader';
import { useUpdater } from './hooks/useUpdater';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useVersionCheck } from './hooks/useVersionCheck';
import { ForceUpdateModal } from './components/ForceUpdateModal';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  // 1. Motor de audio global
  useAudioEngine();

  // 2. Auto-updater silencioso en background (siempre activo en Tauri Desktop)
  useUpdater();

  const { user, logout, isInitializing, screen, showNewPasswordModal } = useAuth();

  // 3. Verificación de versión del cliente contra Supabase (app_system_config)
  const { showUpdateModal, latestVersion } = useVersionCheck();
  const [isPreloaderFinished, setIsPreloaderFinished] = useState(false);
  const [initTimeout, setInitTimeout] = useState(false);

  // TIMEOUT DE SEGURIDAD: Máximo 2 segundos en inicialización; si no responde, desbloquea la pantalla
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitTimeout(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // 0. PRIORIDAD MÁXIMA: Versión obsoleta — bloquear TODO el juego y mostrar modal
  if (showUpdateModal) {
    return (
      <ErrorBoundary>
        <ForceUpdateModal latestVersion={latestVersion} />
      </ErrorBoundary>
    );
  }

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

  // Activar música ambiental en pantalla de inicio / sesión activa
  useEffect(() => {
    if (!showNewPasswordModal && screen !== 'reset_password' && !isRecoveryMode) {
      window.dispatchEvent(new CustomEvent('gd_play_bg_music'));
    }
  }, [user, showNewPasswordModal, screen, isRecoveryMode, isPreloaderFinished]);

  // Si es recuperación de contraseña
  if (isRecoveryMode) {
    return <AuthView initialScreen="reset_password" />;
  }

  // Pantalla de carga mientras se sincroniza la sesión
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

  // Usuario conectado
  if (user) {
    if (!isPreloaderFinished) {
      return <GamePreloader onComplete={() => setIsPreloaderFinished(true)} />;
    }
    return <Homepage user={user as any} onLogout={logout} />;
  }

  // Usuario no conectado
  return <AuthView />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
