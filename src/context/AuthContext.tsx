import React, { createContext, useContext, useMemo } from 'react';
import { useSasoriAuth, UseSasoriAuthReturn } from '../hooks/useSasoriAuth';

const AuthContext = createContext<UseSasoriAuthReturn | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useSasoriAuth();

  const value = useMemo(() => auth, [
    auth.screen,
    auth.state,
    auth.user,
    auth.isInitializing,
    auth.errorMessage,
    auth.successMessage,
    auth.setScreen,
    auth.submitLogin,
    auth.submitRegister,
    auth.verifyTwoFA,
    auth.logout
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): UseSasoriAuthReturn => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      "🚨 [GALAXYDUST KERNEL]: `useAuth` debe ser utilizado estrictamente dentro de un contenedor <AuthProvider />. " +
      "Verifique la inicialización de la jerarquía en `src/App.tsx`."
    );
  }
  return context;
};