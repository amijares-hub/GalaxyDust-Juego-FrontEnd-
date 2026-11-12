import React, { useState, useEffect } from 'react';
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

function buildApkUrl(version: string): string {
  const v = (version || '1.1.4').trim();
  return `https://github.com/amijares-hub/GalaxyDust-Juego-FrontEnd-/releases/download/v${v}/GalaxyDust_${v}.apk`;
}

function buildExeUrl(version: string): string {
  const v = (version || '1.1.4').trim();
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
  const displayVersion = latestVersion || '1.1.4';
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const isAndroid = isAndroidEnv();
  const isTauri = isTauriEnv();

  // ─── Handler Android ──────────────────────────────────────────────────────
  const handleAndroidUpdate = (): void => {
    const apkUrl = buildApkUrl(displayVersion);
    setStatus('redirecting');
    try {
      window.location.href = apkUrl;
    } catch (e) {
      console.error('[ForceUpdateModal/Android] Error:', e);
      window.open(apkUrl, '_blank');
    }
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
        setStatus('error');
        setErrorMsg('No se detectó un paquete OTA firmado para esta compilación. Descarga el instalador oficial manualmente.');
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

  const handleUpdate = (): void => {
    if (isAndroid) {
      handleAndroidUpdate();
    } else if (isTauri) {
      handleWindowsUpdate();
    } else {
      handleWebUpdate();
    }
  };

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

  const platformNote = (): string => {
    if (isAndroid) {
      return 'Se iniciará la descarga del nuevo APK directamente desde el juego.';
    } else if (isTauri) {
      return 'El sistema descargará e instalará el parche automáticamente.';
    }
    return 'La aplicación limpiará la caché y recargará el nuevo bundle.';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md">
      {/* Scanlines decorativos */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.08) 2px, rgba(0,255,255,0.08) 4px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative w-full max-w-md mx-4 border border-cyan-500/60 bg-[#0C0D0E] shadow-[0_0_60px_rgba(0,255,255,0.2)] overflow-hidden"
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
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest">
            <span className="text-red-400/80 uppercase">VERSIÓN TERMINAL:</span>
            <span className="text-red-300 font-bold">OBSOLETA</span>
            <span className="ml-auto text-cyan-500/50">[ ERR_VERSION_MISMATCH ]</span>
          </div>

          <p className="text-[11px] leading-relaxed font-mono text-cyan-100/70 tracking-wide">
            Tu terminal de mando se encuentra en una versión desactualizada.
            Se requiere sincronización obligatoria con el clúster central para continuar jugando.
          </p>

          {/* Barra de progreso OTA Windows */}
          {status === 'downloading' && (
            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[9px] text-cyan-500/60">
                <span>DESCARGANDO PARCHE</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-cyan-950 rounded-full overflow-hidden border border-cyan-500/30">
                <div
                  className="h-full bg-cyan-400 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Panel de error / fallback */}
          {status === 'error' && (
            <div className="space-y-2 p-3 border border-red-500/30 bg-red-500/10">
              <p className="font-mono text-[9px] text-red-300 tracking-wider leading-relaxed">
                ⚠ {errorMsg || 'No se pudo completar la actualización automática.'}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-cyan-500/30 text-[9px] font-mono tracking-widest uppercase">
            <div className="flex-1 h-px bg-cyan-500/20" />
            SINCRONIZACIÓN REQUERIDA
            <div className="flex-1 h-px bg-cyan-500/20" />
          </div>

          {/* Botón principal */}
          <button
            onClick={handleUpdate}
            disabled={isBusy}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 border font-mono text-[11px] tracking-[0.3em] uppercase font-bold transition-all duration-200
              ${isBusy
                ? 'border-cyan-500/30 bg-cyan-500/5 text-cyan-500/40 cursor-not-allowed'
                : 'border-cyan-500 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 hover:text-cyan-100 active:scale-[0.98] cursor-pointer shadow-[0_0_20px_rgba(0,255,255,0.15)]'
              }`}
          >
            {isBusy ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isAndroid ? (
              <Download className="w-4 h-4" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {buttonLabel()}
          </button>

          {/* Enlaces de descarga manual directa permanente */}
          <div className="pt-2 border-t border-cyan-500/20 flex flex-col gap-1.5 text-center">
            {isAndroid ? (
              <a
                href={buildApkUrl(displayVersion)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 font-mono text-[9px] text-cyan-400 hover:text-cyan-300 tracking-wider underline underline-offset-2"
              >
                <ExternalLink className="w-3 h-3" />
                DESCARGAR GalaxyDust_{displayVersion}.apk
              </a>
            ) : (
              <a
                href={buildExeUrl(displayVersion)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 font-mono text-[9px] text-cyan-400 hover:text-cyan-300 tracking-wider underline underline-offset-2"
              >
                <ExternalLink className="w-3 h-3" />
                DESCARGAR INSTALADOR WINDOWS (v{displayVersion})
              </a>
            )}
          </div>

          <p className="text-center text-[9px] font-mono text-cyan-500/40 tracking-wider">
            {platformNote()}
          </p>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      </motion.div>
    </div>
  );
};
