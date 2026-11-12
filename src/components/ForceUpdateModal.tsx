import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Download, ExternalLink } from 'lucide-react';

interface ForceUpdateModalProps {
  /** Versión objetivo obtenida dinámicamente desde app_system_config.current_latest_version */
  latestVersion: string;
}

// ─── Helpers de entorno ───────────────────────────────────────────────────────

const isTauriEnv = (): boolean =>
  typeof window !== 'undefined' && '__TAURI__' in window;

const isAndroidEnv = (): boolean =>
  isTauriEnv() &&
  typeof navigator !== 'undefined' &&
  /android/i.test(navigator.userAgent);

// ─── Construcción dinámica de URLs (NUNCA hardcodeadas) ──────────────────────
// Cuando se lance v1.1.5, v1.2.0, etc., Supabase actualiza current_latest_version
// y estas URLs se generan automáticamente sin tocar el código.

function buildApkUrl(version: string): string {
  const v = version.trim();
  return `https://github.com/amijares-hub/GalaxyDust-Juego-FrontEnd-/releases/download/v${v}/GalaxyDust_${v}.apk`;
}

function buildExeUrl(version: string): string {
  const v = version.trim();
  return `https://github.com/amijares-hub/GalaxyDust-Juego-FrontEnd-/releases/download/v${v}/GalaxyDust_${v}_x64-setup.exe`;
}

// ─── Tipos de estado ──────────────────────────────────────────────────────────

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'installing'
  | 'relaunching'
  | 'redirecting'
  | 'error';

// ─── Componente principal ─────────────────────────────────────────────────────

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({ latestVersion }) => {
  const displayVersion = latestVersion || '—';
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const isAndroid = isAndroidEnv();
  const isTauri = isTauriEnv();

  // ─── Handler Android ──────────────────────────────────────────────────────
  // El WebView de Android intercepta la navegación a una URL de APK y la entrega
  // al Download Manager del sistema → el usuario instala sin salir del juego.
  const handleAndroidUpdate = (): void => {
    const apkUrl = buildApkUrl(displayVersion);
    setStatus('redirecting');
    try {
      // Navegar al APK: Android WebView delega al Download Manager del SO
      window.location.href = apkUrl;
    } catch (e) {
      console.error('[ForceUpdateModal/Android] Error:', e);
      // Fallback: intentar abrir como nueva pestaña (algunos WebViews lo manejan)
      window.open(apkUrl, '_blank');
    }
    // Después de un breve delay, resetear estado por si el usuario vuelve
    setTimeout(() => setStatus('idle'), 3000);
  };

  // ─── Handler Windows (OTA nativo Tauri) ───────────────────────────────────
  const handleWindowsUpdate = async (): Promise<void> => {
    setStatus('checking');
    setProgress(0);
    setErrorMsg('');

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const { relaunch } = await import('@tauri-apps/plugin-process');

      const update = await check();

      if (update?.available) {
        setStatus('downloading');

        let downloaded = 0;
        let total = 0;

        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              total = event.data.contentLength ?? 0;
              break;
            case 'Progress':
              downloaded += event.data.chunkLength ?? 0;
              if (total > 0) {
                setProgress(Math.round((downloaded / total) * 100));
              }
              break;
            case 'Finished':
              setProgress(100);
              setStatus('installing');
              break;
          }
        });

        setStatus('relaunching');
        await relaunch();
      } else {
        // Sin paquete OTA disponible → ofrecer descarga manual
        setStatus('error');
        setErrorMsg('No se encontró paquete OTA disponible. Usa el enlace manual de abajo.');
      }
    } catch (e: unknown) {
      console.error('[ForceUpdateModal/Windows] Error en update:', e);
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  // ─── Handler Web (navegador estándar) ────────────────────────────────────
  const handleWebUpdate = async (): Promise<void> => {
    try {
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }
    } catch {}
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
    } catch {}
    try { localStorage.removeItem('app_cached_version'); } catch {}
    window.location.replace(window.location.origin + '/?update=' + Date.now());
  };

  // ─── Despacho principal ───────────────────────────────────────────────────
  const handleUpdate = (): void => {
    if (isAndroid) {
      handleAndroidUpdate();
    } else if (isTauri) {
      handleWindowsUpdate();
    } else {
      handleWebUpdate();
    }
  };

  // ─── Texto dinámico del botón ─────────────────────────────────────────────
  const buttonLabel = (): string => {
    switch (status) {
      case 'checking':    return 'VERIFICANDO ACTUALIZACIÓN...';
      case 'downloading': return `DESCARGANDO... ${progress}%`;
      case 'installing':  return 'INSTALANDO PARCHE...';
      case 'relaunching': return 'RELANZANDO TERMINAL...';
      case 'redirecting': return 'INICIANDO DESCARGA...';
      default:            return 'ACTUALIZAR EL JUEGO AHORA';
    }
  };

  const isBusy = status !== 'idle' && status !== 'error';

  // ─── Nota técnica por plataforma ─────────────────────────────────────────
  const platformNote = (): string => {
    if (isAndroid) {
      return 'Se iniciará la descarga del nuevo APK directamente desde el juego.';
    } else if (isTauri) {
      return 'El sistema descargará e instalará el parche automáticamente.';
    }
    return 'La aplicación limpiará la caché y recargará el nuevo bundle.';
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm">
      {/* Scanlines decorativos */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.08) 2px, rgba(0,255,255,0.08) 4px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md mx-4 border border-cyan-500/60 bg-[#0C0D0E] shadow-[0_0_60px_rgba(0,255,255,0.18)] overflow-hidden"
      >
        {/* Borde superior */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

        {/* Cabecera */}
        <div className="px-6 pt-6 pb-4 border-b border-cyan-500/20 flex items-center gap-3">
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <AlertTriangle className="w-6 h-6 text-cyan-400 flex-shrink-0" />
          </motion.div>
          <div>
            <p className="text-[9px] tracking-[0.4em] uppercase text-cyan-500/60 font-mono">
              ALERTA DEL SISTEMA — CLÚSTER CENTRAL
            </p>
            <h2 className="text-sm tracking-[0.25em] uppercase font-mono font-bold text-cyan-300 mt-0.5">
              NUEVA ACTUALIZACIÓN DE FLOTA
              <span className="text-cyan-500/70 ml-2">(v{displayVersion})</span>
            </h2>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 space-y-4">
          {/* Estado de versión */}
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest">
            <span className="text-red-400/80 uppercase">VERSIÓN TERMINAL:</span>
            <span className="text-red-300 font-bold">OBSOLETA</span>
            <span className="ml-auto text-cyan-500/50">[ ERR_VERSION_MISMATCH ]</span>
          </div>

          {/* Mensaje principal */}
          <p className="text-[11px] leading-relaxed font-mono text-cyan-100/70 tracking-wide">
            Tu terminal de mando se encuentra en una versión obsoleta.
            Se requiere sincronización obligatoria con el clúster central
            para continuar.
          </p>

          {/* Barra de progreso — solo visible en Windows durante descarga OTA */}
          {status === 'downloading' && (
            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[9px] text-cyan-500/60">
                <span>DESCARGANDO PARCHE</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1 w-full bg-cyan-500/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-cyan-400 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Panel de error + enlace de descarga manual como fallback */}
          {status === 'error' && (
            <div className="space-y-2 p-3 border border-red-500/30 bg-red-500/5">
              <p className="font-mono text-[9px] text-red-400 tracking-wider leading-relaxed">
                ⚠ {errorMsg || 'Error en la descarga automática.'}
              </p>
              {/* Enlace manual Windows */}
              {isTauri && !isAndroid && (
                <a
                  href={buildExeUrl(displayVersion)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-mono text-[9px] text-cyan-400/80 hover:text-cyan-300 tracking-wider underline underline-offset-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  DESCARGA MANUAL DEL INSTALADOR v{displayVersion}
                </a>
              )}
            </div>
          )}

          {/* Separador decorativo */}
          <div className="flex items-center gap-2 text-cyan-500/30 text-[9px] font-mono tracking-widest uppercase">
            <div className="flex-1 h-px bg-cyan-500/20" />
            SINCRONIZACIÓN REQUERIDA
            <div className="flex-1 h-px bg-cyan-500/20" />
          </div>

          {/* Botón principal */}
          <motion.button
            onClick={handleUpdate}
            disabled={isBusy}
            whileHover={!isBusy ? { scale: 1.02, boxShadow: '0 0 32px rgba(0,255,255,0.35)' } : {}}
            whileTap={!isBusy ? { scale: 0.97 } : {}}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 border font-mono text-[11px] tracking-[0.3em] uppercase font-bold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50
              ${isBusy
                ? 'border-cyan-500/30 bg-cyan-500/5 text-cyan-500/40 cursor-not-allowed'
                : 'border-cyan-500 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-100 cursor-pointer'
              }`}
          >
            {isBusy
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <RefreshCw className="w-4 h-4" />
                </motion.div>
              : isAndroid
                ? <Download className="w-4 h-4" />
                : <RefreshCw className="w-4 h-4" />
            }
            {buttonLabel()}
          </motion.button>

          {/* Nota técnica por plataforma */}
          <p className="text-center text-[9px] font-mono text-cyan-500/30 tracking-wider">
            {platformNote()}
          </p>

          {/* En Android: mostrar URL del APK como referencia visual */}
          {isAndroid && (
            <p className="text-center text-[9px] font-mono text-cyan-500/20 tracking-wider break-all leading-relaxed">
              {buildApkUrl(displayVersion)}
            </p>
          )}
        </div>

        {/* Borde inferior */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      </motion.div>
    </div>
  );
};
