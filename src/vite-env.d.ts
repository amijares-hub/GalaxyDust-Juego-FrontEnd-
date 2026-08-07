/// <reference types="vite/client" />

// 🛡️ CORRECCIÓN: Se reemplazó el 'return' inválido por exportaciones por defecto de TypeScript
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const content: string;
  export default content;
}