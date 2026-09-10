import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './components/AuthView';
import { Homepage } from './pages/Homepage';
import { RefreshCw } from 'lucide-react';
import { LandscapeGuard } from './components/ui/LandscapeGuard';
import { GamePreloader } from './components/GamePreloader';

function AppContent() {
  const { user, logout, isInitializing } = useAuth();
  const [isPreloaderFinished, setIsPreloaderFinished] = useState(false);

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
    // Si el usuario se ha autenticado pero la precarga multimedia no ha terminado
    if (!isPreloaderFinished) {
      return <GamePreloader onComplete={() => setIsPreloaderFinished(true)} />;
    }

    return <Homepage user={user as any} onLogout={logout} />;
  }

  return <AuthView />;
}

export default function App() {
  return (
    <LandscapeGuard>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LandscapeGuard>
  );
}