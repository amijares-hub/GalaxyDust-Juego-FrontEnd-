import './i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 🛡️ Monitor de seguridad global para atrapar cualquier excepción no controlada en el cliente
if (typeof window !== 'undefined') {
  const renderFatalOverlay = (message: string, stack?: string) => {
    const rootEl = document.getElementById('root');
    if (!rootEl) return;
    rootEl.innerHTML = `
      <div style="position:fixed;inset:0;background-color:#0C0D0E;color:#22d3ee;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;padding:24px;box-sizing:border-box;text-align:center;z-index:9999999;">
        <div style="max-width:560px;width:100%;border:1px solid rgba(6,182,212,0.4);background:rgba(12,13,14,0.95);padding:32px 24px;box-shadow:0 0 40px rgba(6,182,212,0.15);">
          <h2 style="font-size:15px;letter-spacing:0.25em;text-transform:uppercase;color:#67e8f9;margin:0 0 16px 0;font-weight:bold;">
            [ ALERTA DE KERNEL — INTERRUPCIÓN CRÍTICA ]
          </h2>
          <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0 0 16px 0;">
            Se ha producido un error durante la carga de la interfaz. Si persiste, recarga la aplicación o descarga el instalador oficial.
          </p>
          <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#f87171;padding:12px;font-size:10px;text-align:left;overflow-x:auto;margin-bottom:20px;max-height:120px;word-break:break-all;">
            <strong>Error:</strong> ${message}
            ${stack ? `<br/><pre style="margin:4px 0 0 0;font-size:9px;opacity:0.8;">${stack}</pre>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button onclick="window.location.reload()" style="padding:12px;background:rgba(6,182,212,0.15);border:1px solid #06b6d4;color:#67e8f9;font-family:monospace;font-size:11px;letter-spacing:0.2em;font-weight:bold;cursor:pointer;text-transform:uppercase;">
              REINICIAR TERMINAL
            </button>
            <a href="https://github.com/amijares-hub/GalaxyDust-Juego-FrontEnd-/releases/latest" target="_blank" rel="noopener noreferrer" style="padding:12px;background:transparent;border:1px solid rgba(6,182,212,0.3);color:#94a3b8;font-family:monospace;font-size:11px;letter-spacing:0.15em;text-decoration:none;text-transform:uppercase;display:block;">
              DESCARGAR VERSIÓN OFICIAL
            </a>
          </div>
        </div>
      </div>
    `;
  };

  window.addEventListener('error', (event) => {
    console.error('[GALAXYDUST_GLOBAL_ERROR]:', event.error || event.message);
    // Solo mostramos overlay si el DOM de root está vacío o en negro
    const rootEl = document.getElementById('root');
    if (rootEl && (!rootEl.firstElementChild || rootEl.children.length === 0)) {
      renderFatalOverlay(event.message || 'Error desconocido al inicializar el script.', event.error?.stack);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[GALAXYDUST_UNHANDLED_REJECTION]:', event.reason);
    const rootEl = document.getElementById('root');
    if (rootEl && (!rootEl.firstElementChild || rootEl.children.length === 0)) {
      const msg = event.reason instanceof Error ? event.reason.message : String(event.reason);
      const stack = event.reason instanceof Error ? event.reason.stack : undefined;
      renderFatalOverlay(msg || 'Rechazo de promesa asíncrona no controlado.', stack);
    }
  });
}

// 🔒 Bloqueo obligatorio de orientación horizontal (Landscape)
if (typeof window !== 'undefined' && window.screen?.orientation && 'lock' in window.screen.orientation) {
  (window.screen.orientation as any).lock('landscape').catch(() => {});
}

// 🚀 Disparador absoluto del árbol del DOM en el nodo raíz
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
