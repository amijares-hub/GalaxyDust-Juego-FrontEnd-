import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './components/AuthView';
import { Homepage } from './pages/Homepage';
import { RefreshCw } from 'lucide-react';
import { LandscapeGuard } from './components/ui/LandscapeGuard';

function AppContent() {
  const { user, logout } = useAuth();
  const [initializing, setInitializing] = useState(true);

  // 🛡️ Margen de sincronización al arrancar para que Supabase hidrate la sesión
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitializing(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [user]);

  // 🔄 Pantalla de carga mientras se valida el token de Supabase
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

  // 🚀 SI HAY USUARIO AUTENTICADO -> ENTRADA DIRECTA A LA HOMEPAGE
  if (user) {
    return <Homepage user={user} onLogout={logout} />;
  }

  // 🔐 Si no hay usuario -> Pantalla de Login / Registro
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