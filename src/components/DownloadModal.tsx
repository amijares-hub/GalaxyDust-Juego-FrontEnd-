import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Laptop, Smartphone, ExternalLink, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GalaxyFrame } from './CanView';
import { APP_DOWNLOADS } from '../constants/downloads';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerNotification?: (text: string, e?: unknown) => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  triggerNotification
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleDownload = (platform: 'windows' | 'android', url: string, label: string) => {
    if (triggerNotification) {
      triggerNotification(`🚀 DESCARGANDO CLIENTE OFICIAL: ${label.toUpperCase()}`);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[10000] flex items-center justify-center p-3 sm:p-4 select-none font-mono">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg"
        >
          <GalaxyFrame className="w-full overflow-hidden text-left" innerPadding="p-4 sm:p-6">
            <div className="flex flex-col gap-4 text-white">

              {/* Encabezado */}
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-white">
                    CLIENTE OFICIAL GALAXYDUST
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-[8.5px] font-black rounded">
                    {APP_DOWNLOADS.version}
                  </span>
                  <button
                    onClick={onClose}
                    className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-500/30 rounded-lg transition-colors cursor-pointer"
                    title="Cerrar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Descripción */}
              <p className="text-[8.5px] text-zinc-400 uppercase leading-relaxed">
                Descarga el cliente nativo oficial para experimentar rendimiento óptimo, 60 FPS estables y cero latencia de navegador.
              </p>

              {/* OPCIÓN 1: WINDOWS */}
              <div className="bg-[#05080c] border border-cyan-950 hover:border-cyan-500/50 p-3.5 rounded-xl transition-all group">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-cyan-950/60 border border-cyan-500/40 rounded-lg text-cyan-400 group-hover:scale-105 transition-transform">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9.5px] font-black tracking-wider uppercase text-cyan-300">
                          {APP_DOWNLOADS.windows.label}
                        </span>
                        <span className="text-[7.5px] px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 rounded">
                          INSTALADOR
                        </span>
                      </div>
                      <span className="text-[7.5px] text-zinc-500 uppercase block mt-0.5">
                        {APP_DOWNLOADS.windows.description}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload('windows', APP_DOWNLOADS.windows.url, APP_DOWNLOADS.windows.label)}
                    className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer shrink-0 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>DESCARGAR</span>
                  </button>
                </div>
              </div>

              {/* OPCIÓN 2: ANDROID */}
              <div className="bg-[#05080c] border border-cyan-950 hover:border-cyan-500/50 p-3.5 rounded-xl transition-all group">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-cyan-950/60 border border-cyan-500/40 rounded-lg text-emerald-400 group-hover:scale-105 transition-transform">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9.5px] font-black tracking-wider uppercase text-cyan-300">
                          {APP_DOWNLOADS.android.label}
                        </span>
                        <span className="text-[7.5px] px-1.5 py-0.2 bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 rounded">
                          FIRMADO
                        </span>
                      </div>
                      <span className="text-[7.5px] text-zinc-500 uppercase block mt-0.5">
                        {APP_DOWNLOADS.android.description}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload('android', APP_DOWNLOADS.android.url, APP_DOWNLOADS.android.label)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer shrink-0 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>DESCARGAR</span>
                  </button>
                </div>
              </div>

              {/* Enlace al Release de GitHub */}
              <div className="pt-2 border-t border-cyan-950/60 flex items-center justify-between text-[8px] text-zinc-500">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verificado con firmas SHA-256 en GitHub</span>
                </div>
                <a
                  href={APP_DOWNLOADS.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <span>NOTAS DE LA VERSIÓN</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

            </div>
          </GalaxyFrame>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DownloadModal;
