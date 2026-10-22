import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 🔒 Bloqueo obligatorio de orientación horizontal (Landscape)
if (typeof window !== 'undefined' && window.screen?.orientation && 'lock' in window.screen.orientation) {
  (window.screen.orientation as any).lock('landscape').catch(() => {});
}

// 🚀 Disparador absoluto del árbol del DOM en el nodo raíz
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);