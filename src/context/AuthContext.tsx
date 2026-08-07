import React, { createContext, useContext } from 'react';
import { useSasoriAuth, UseSasoriAuthReturn } from '../hooks/useSasoriAuth';

// 🛰️ Creación del canal cuántico del contexto global de autenticación
const AuthContext = createContext<UseSasoriAuthReturn | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * 🌌 PROVEEDOR GLOBAL DE AUTENTICACIÓN (AuthPrvoder)
 * Distribuye de forma homogénea el estado del piloto hacia todas las vistas de la aplicación,
 * centralizando las llamadas en el motor maestro de `useSasoriAuth`.
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
 * Permite a cualquier componente hijo (vistas de inventario, naves, HUD) acceder 
 * instantáneamente a las credenciales del usuario y funciones de desconexión.
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