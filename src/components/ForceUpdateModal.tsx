import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ForceUpdateModalProps {
  latestVersion: string;
}

const handleForceUpdate = async (): Promise<void> => {
  try {
    // 1. Limpiar todos los caches del navegador (CacheStorage)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
    // 2. Desregistrar Service Workers activos para que descargue el nuevo bundle
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    // 3. Limpiar almacenamiento local temporal
    localStorage.removeItem('app_cached_version');
  } catch (err) {
    console.warn('[ForceUpdateModal] Aviso al limpiar cache:', err);
  }
  // 4. Forzar recarga con bypass de cache (timestamp query)
  window.location.replace(window.location.origin + '/?update=' + Date.now());
};

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({ latestVersion }) => {
  const displayVersion = latestVersion || '1.0.5';

  return (
    // Backdrop bloqueante — z-[9999] garantiza que esté sobre TODO el juego
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
        {/* Borde superior de alerta */}
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
          {/* Línea de versión actual */}
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

          {/* Separador decorativo */}
          <div className="flex items-center gap-2 text-cyan-500/30 text-[9px] font-mono tracking-widest uppercase">
            <div className="flex-1 h-px bg-cyan-500/20" />
            SINCRONIZACIÓN REQUERIDA
            <div className="flex-1 h-px bg-cyan-500/20" />
          </div>

          {/* Botón de actualización */}
          <motion.button
            onClick={handleForceUpdate}
            whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(0,255,255,0.35)' }}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-cyan-500 bg-cyan-500/10 text-cyan-300 font-mono text-[11px] tracking-[0.3em] uppercase font-bold transition-colors duration-200 hover:bg-cyan-500/20 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            <RefreshCw className="w-4 h-4" />
            ACTUALIZAR EL JUEGO AHORA
          </motion.button>

          {/* Nota técnica */}
          <p className="text-center text-[9px] font-mono text-cyan-500/30 tracking-wider">
            La aplicación limpiará la caché y recargará el nuevo bundle.
          </p>
        </div>

        {/* Borde inferior de alerta */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      </motion.div>
    </div>
  );
};

