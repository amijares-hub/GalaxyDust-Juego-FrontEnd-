import React, { createContext, useContext } from 'react';
import { useSasoriAuth, UseSasoriAuthReturn } from '../hooks/useSasoriAuth';

// 🛰️ Contexto global de autenticación
const AuthContext = createContext<UseSasoriAuthReturn | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * 🌌 PROVEEDOR GLOBAL DE AUTENTICACIÓN (AuthProvider)
 * Distribuye homogéneamente el estado de sesión hacia todas las vistas
 * centralizando las llamadas en el motor de `useSasoriAuth`.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useSasoriAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 🛠️ HOOK CONSUMIDOR GLOBAL: `useAuth`
 * Permite a cualquier componente hijo acceder a las credenciales
 * del usuario y funciones de autenticación.
 */
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