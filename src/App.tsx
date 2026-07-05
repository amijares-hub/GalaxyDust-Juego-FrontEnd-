import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './components/AuthView';
import { Homepage } from './pages/Homepage';

import { RefreshCw } from 'lucide-react';

function AppContent() {
  const { user, loading, logout } = useAuth();
  
  if (loading) {
    return (
      <div className="w-screen h-screen bg-[#0C0D0E] flex flex-col items-center justify-center text-cyan-500 font-mono space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <div className="text-[10px] tracking-[0.3em] uppercase animate-pulse">Sincronizando Estado...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  // Adapt user object to UserProfile expected by Homepage
  const userProfile = {
    email: user.email || '',
    name: user.email?.split('@')[0].toUpperCase() || 'COMANDANTE',
    provider: (user.app_metadata.provider || 'password') as any,
    registrationDate: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    mfaEnabled: true,
    verified: true,
    avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${user.email}`,
    assignedToken: 'GD-SEC-' + user.id.slice(0, 8).toUpperCase(),
  };

  return (
    <>

      <Homepage user={userProfile} onLogout={logout} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
