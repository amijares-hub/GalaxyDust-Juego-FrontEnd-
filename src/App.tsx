import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './components/AuthView';
import { Homepage } from './pages/Homepage';
import { RefreshCw } from 'lucide-react';
import { LandscapeGuard } from './components/ui/LandscapeGuard';

function AppContent() {
  const { user, screen, logout } = useAuth();
  const [initializing, setInitializing] = useState(true);

  // 🛡️ LOCK DE HIDRATACIÓN: Sostiene tu pantalla de carga original mientras el Kernel valida el token
  useEffect(() => {
    // Le damos un margen de cortesía de 650ms al handshake asíncrono de Supabase
    const timer = setTimeout(() => {
      setInitializing(false);
    }, 650);

    return () => clearTimeout(timer);
  }, [user, screen]);

  // 🔄 PANTALLA NATIVA DE CARGA RESTAURADA
  if (initializing) {
    return (
      <div className="w-screen h-screen bg-[#0C0D0E] flex flex-col items-center justify-center text-cyan-500 font-mono space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <div className="text-[10px] tracking-[0.3em] uppercase animate-pulse">
          Sincronizando Estado...
        </div>
      </div>
    );
  }

  // 🛰️ Si el piloto ya está autenticado y su pantalla asignada es la consola, abrimos compuertas
  if (user && screen === 'homepage') {
    return <Homepage user={user} onLogout={logout} />;
  }

  // 🔐 Para cualquier otra fase intermedia (Login, Registro, Segundo Factor OTP), mantenemos la terminal
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