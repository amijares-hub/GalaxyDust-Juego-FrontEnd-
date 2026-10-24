import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Volume2, Music, VolumeX, Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAudioEngine, getAudioSettings, saveAudioSettings, AudioSettings } from '../hooks/useAudioEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerNotification?: (text: string) => void;
  onOpenTutorial?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, triggerNotification, onOpenTutorial }) => {
  const { t, i18n } = useTranslation();
  const { playSfx } = useAudioEngine();
  const [audio, setAudio] = useState<AudioSettings>({ master: 80, bgm: 50, sfx: 80 });

  useEffect(() => {
    if (isOpen) {
      setAudio(getAudioSettings());
    }
  }, [isOpen]);

  const handleAudioChange = (key: keyof AudioSettings, value: number) => {
    const updated = { ...audio, [key]: value };
    setAudio(updated);
    saveAudioSettings({ [key]: value });
  };

  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'es';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-3 select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-[#05080c] border border-cyan-500/50 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden font-mono text-white relative hud-panel hud-corners"
          >
            {/* Holographic scanner line */}
            <div className="absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none" />

            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-900/50 bg-[#070c12]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                  <Settings className="w-4 h-4 animate-spin-slow" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-black tracking-widest text-white uppercase">
                    {t('settings.title')}
                  </h2>
                  <span className="text-[8px] text-cyan-400/80 tracking-wider uppercase block">
                    GALAXY DUST TAC-SYS // V1.0.0
                  </span>
                </div>
              </div>

              <button
                onClick={() => { playSfx(660); onClose(); }}
                className="w-7 h-7 rounded-lg bg-black/60 border border-cyan-900/60 hover:border-cyan-400 hover:text-cyan-300 text-zinc-400 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* BODY */}
            <div className="p-4 space-y-4 max-h-[calc(100dvh-120px)] overflow-y-auto custom-scrollbar">

              {/* 1. SELECCIÓN DE IDIOMA */}
              <div className="p-3 bg-[#080d14] border border-cyan-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t('settings.language')}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9px] text-zinc-400 uppercase font-mono">
                    {currentLang === 'es' ? 'ESPAÑOL (MILITAR/NEUTRO)' : 'ENGLISH (AAA SCI-FI)'}
                  </span>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        i18n.changeLanguage('es');
                        try { localStorage.setItem('gd_preferred_language', 'es'); } catch {}
                        playSfx(880);
                        if (triggerNotification) triggerNotification('IDIOMA ACTUALIZADO: ESPAÑOL');
                      }}
                      className={`px-3 py-1.5 text-xs font-black rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                        currentLang === 'es'
                          ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(34,211,238,0.6)] font-black'
                          : 'bg-black/60 text-zinc-400 border border-cyan-900/60 hover:border-cyan-500/60 hover:text-cyan-300'
                      }`}
                    >
                      {currentLang === 'es' && <Check className="w-3 h-3 stroke-[3]" />}
                      ESPAÑOL
                    </button>

                    <button
                      onClick={() => {
                        i18n.changeLanguage('en');
                        try { localStorage.setItem('gd_preferred_language', 'en'); } catch {}
                        playSfx(880);
                        if (triggerNotification) triggerNotification('LANGUAGE UPDATED: ENGLISH');
                      }}
                      className={`px-3 py-1.5 text-xs font-black rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                        currentLang === 'en'
                          ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(34,211,238,0.6)] font-black'
                          : 'bg-black/60 text-zinc-400 border border-cyan-900/60 hover:border-cyan-500/60 hover:text-cyan-300'
                      }`}
                    >
                      {currentLang === 'en' && <Check className="w-3 h-3 stroke-[3]" />}
                      ENGLISH
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. CONTROLADORES DE AUDIO */}
              <div className="p-3 bg-[#080d14] border border-cyan-500/30 rounded-xl space-y-3.5">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{t('settings.audio')}</span>
                </div>

                {/* VOLUMEN GENERAL (MASTER) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-zinc-300 uppercase tracking-wide flex items-center gap-1.5">
                      {audio.master === 0 ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-cyan-400" />}
                      {t('settings.master_vol')}
                    </span>
                    <span className="text-cyan-400 font-mono font-black">{audio.master}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={audio.master}
                    onChange={(e) => handleAudioChange('master', Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-black/80 rounded-lg cursor-pointer"
                  />
                </div>

                {/* MÚSICA / BGM (AMBIENTE ESTELAR) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-zinc-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Music className="w-3 h-3 text-purple-400" />
                      {t('settings.bgm_vol')}
                    </span>
                    <span className="text-purple-400 font-mono font-black">{audio.bgm}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={audio.bgm}
                    onChange={(e) => handleAudioChange('bgm', Number(e.target.value))}
                    className="w-full accent-purple-400 h-1.5 bg-black/80 rounded-lg cursor-pointer"
                  />
                </div>

                {/* EFECTOS DE SONIDO / SFX */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-zinc-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Volume2 className="w-3 h-3 text-amber-400" />
                      {t('settings.sfx_vol')}
                    </span>
                    <span className="text-amber-400 font-mono font-black">{audio.sfx}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={audio.sfx}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      handleAudioChange('sfx', val);
                    }}
                    onMouseUp={() => playSfx(880)}
                    onTouchEnd={() => playSfx(880)}
                    className="w-full accent-amber-400 h-1.5 bg-black/80 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* 3. INSTRUCCIÓN TÁCTICA (TUTORIAL) */}
              <div className="p-3 bg-[#080d14] border border-cyan-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-cyan-300 font-bold uppercase block">
                    {t('settings.tutorial_title', 'INSTRUCCIÓN TÁCTICA (TUTORIAL)')}
                  </span>
                  <span className="text-[8px] text-zinc-500 uppercase">
                    {t('settings.tutorial_subtitle', 'REPASA LOS PROTOCOLOS DE MANDO Y SISTEMAS DEL JUEGO')}
                  </span>
                </div>
                <button
                  onClick={() => {
                    playSfx(880);
                    onClose();
                    if (onOpenTutorial) onOpenTutorial();
                  }}
                  className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-400 text-cyan-200 text-[9px] font-bold uppercase rounded shadow cursor-pointer transition-colors"
                >
                  [ 🚀 INICIAR TUTORIAL ]
                </button>
              </div>

            </div>

            {/* FOOTER */}
            <div className="px-4 py-2.5 bg-[#030609] border-t border-cyan-900/50 flex justify-end">
              <button
                onClick={() => { playSfx(660); onClose(); }}
                className="px-5 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-110 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md cursor-pointer transition-all active:scale-95"
              >
                {t('settings.close')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
