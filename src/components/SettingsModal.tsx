import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Volume2,
  VolumeX,
  BookOpen,
  Sliders
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { GalaxyFrame } from './CanView';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerNotification?: (text: string, e?: unknown) => void;
  onOpenTutorial?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  triggerNotification,
  onOpenTutorial
}) => {
  const { t, i18n } = useTranslation();
  const { isMuted, volume, toggleMute, setVolume, playSfx } = useAudioEngine();

  if (!isOpen) return null;

  const handleLanguageChange = (lang: string) => {
    playSfx(660);
    i18n.changeLanguage(lang);
    try {
      localStorage.setItem('i18nextLng', lang);
    } catch {}
    if (triggerNotification) {
      triggerNotification(`🌐 IDIOMA ACTUALIZADO: ${lang.toUpperCase()}`);
    }
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
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-white">
                    {t('settings.title', 'CONFIGURACIÓN DEL SISTEMA')}
                  </h2>
                </div>
                <button
                  onClick={() => { playSfx(440); onClose(); }}
                  className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-500/30 rounded-lg transition-colors cursor-pointer"
                  title="Cerrar Ajustes"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SECCIÓN 1: AUDIO Y SONIDO MAESTRO */}
              <div className="bg-[#05080c] border border-cyan-950 p-3.5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black tracking-wider uppercase text-cyan-300 block">
                      AUDIO MAESTRO & EFECTOS
                    </span>
                    <span className="text-[7.5px] text-zinc-500 uppercase">
                      Silencia o activa la totalidad de sonidos de la interfaz y combate
                    </span>
                  </div>

                  <button
                    onClick={() => { toggleMute(); }}
                    className={`px-3 py-1.5 rounded-lg border font-black text-[8.5px] tracking-wider uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                      isMuted
                        ? 'bg-red-950/80 border-red-500/80 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                        : 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    }`}
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="w-4 h-4 text-red-400" />
                        <span>[SILENCIADO]</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                        <span>[ACTIVADO]</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Deslizador de volumen */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[7.5px] text-zinc-400 uppercase">
                    <span>VOLUMEN GENERAL</span>
                    <span className="text-cyan-400 font-bold">{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    disabled={isMuted}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-30"
                  />
                </div>
              </div>

              {/* SECCIÓN 2: IDIOMA */}
              <div className="bg-[#05080c] border border-cyan-950 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black tracking-wider uppercase text-cyan-300 block">
                    IDIOMA TÁCTICO
                  </span>
                  <span className="text-[7.5px] text-zinc-500 uppercase">
                    Selección de localización de mandos
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleLanguageChange('es')}
                    className={`px-2.5 py-1 rounded text-[8px] font-black uppercase border transition-all cursor-pointer ${
                      i18n.language.startsWith('es')
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                        : 'bg-black border-cyan-950 text-zinc-500 hover:text-white'
                    }`}
                  >
                    ESPAÑOL
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`px-2.5 py-1 rounded text-[8px] font-black uppercase border transition-all cursor-pointer ${
                      i18n.language.startsWith('en')
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                        : 'bg-black border-cyan-950 text-zinc-500 hover:text-white'
                    }`}
                  >
                    ENGLISH
                  </button>
                </div>
              </div>

              {/* SECCIÓN 3: TUTORIAL Y REINICIO DE GUÍA */}
              {onOpenTutorial && (
                <div className="bg-[#05080c] border border-cyan-950 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black tracking-wider uppercase text-cyan-300 block">
                      TUTORIAL DEL JUGADOR
                    </span>
                    <span className="text-[7.5px] text-zinc-500 uppercase">
                      Reabrir la inducción táctica paso a paso
                    </span>
                  </div>
                  <button
                    onClick={() => { playSfx(660); onOpenTutorial(); }}
                    className="px-3 py-1 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-[8px] font-black uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>VER GUÍA</span>
                  </button>
                </div>
              )}

              {/* Pie de modal */}
              <div className="pt-2 border-t border-cyan-950 flex justify-end">
                <button
                  onClick={() => { playSfx(440); onClose(); }}
                  className="px-4 py-1.5 bg-black border border-zinc-800 text-zinc-400 hover:text-white text-[8.5px] font-bold uppercase rounded-lg transition-colors cursor-pointer"
                >
                  CERRAR [ESC]
                </button>
              </div>

            </div>
          </GalaxyFrame>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SettingsModal;