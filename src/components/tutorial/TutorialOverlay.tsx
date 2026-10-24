import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronLeft, Check, Sparkles, X } from 'lucide-react';

interface TutorialStep {
  id: string;
  titleKey: string;
  descKey: string;
  icon: string;
  targetSection?: string;
}

export const TutorialOverlay: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps: TutorialStep[] = [
    { id: 'hub', titleKey: 'tutorial.step1_title', descKey: 'tutorial.step1_desc', icon: '🌌' },
    { id: 'can', titleKey: 'tutorial.step2_title', descKey: 'tutorial.step2_desc', icon: '⚡' },
    { id: 'fleet', titleKey: 'tutorial.step3_title', descKey: 'tutorial.step3_desc', icon: '🚀' },
    { id: 'expedition', titleKey: 'tutorial.step4_title', descKey: 'tutorial.step4_desc', icon: '🗺️' },
    { id: 'market', titleKey: 'tutorial.step5_title', descKey: 'tutorial.step5_desc', icon: '💎' },
  ];

  const handleFinish = () => {
    try {
      localStorage.setItem('gd_tutorial_completed', 'true');
    } catch {}
    onClose();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 select-none font-mono">
      <div className="relative w-full max-w-lg hud-panel hud-corners border border-cyan-400 p-5 rounded-xl shadow-[0_0_40px_rgba(6,182,212,0.3)] text-white flex flex-col justify-between max-h-[85dvh] bg-[#05080c]/95">
        
        {/* Holographic scanning line */}
        <div className="absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-center border-b border-cyan-900/60 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-cyan-300 uppercase">
              {t('tutorial.header', 'INSTRUCCIÓN TÁCTICA // PASO')} {currentStep + 1} / {steps.length}
            </span>
          </div>
          <button
            onClick={handleFinish}
            className="text-zinc-500 hover:text-white p-1 text-xs cursor-pointer transition-colors"
          >
            [OMITIR]
          </button>
        </div>

        {/* Contenido del Paso */}
        <div className="flex flex-col items-center text-center my-4 gap-3 px-2">
          <div className="w-16 h-16 rounded-full bg-cyan-950/60 border border-cyan-400/80 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            {step.icon}
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider mt-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
            {t(step.titleKey)}
          </h3>
          <p className="text-[10px] sm:text-[11px] text-zinc-300 leading-relaxed uppercase max-w-sm bg-black/40 p-3 rounded-lg border border-cyan-950">
            {t(step.descKey)}
          </p>
        </div>

        {/* Barra de Progreso de Puntos */}
        <div className="flex justify-center gap-1.5 my-2">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep ? 'w-6 bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'w-2 bg-cyan-950 border border-cyan-900'
              }`}
            />
          ))}
        </div>

        {/* Botones de Navegación */}
        <div className="flex justify-between items-center border-t border-cyan-900/60 pt-3 mt-2">
          <button
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(p => p - 1)}
            className="px-3.5 py-1.5 text-[9px] font-bold uppercase rounded border border-cyan-900 bg-black/60 text-cyan-400 disabled:opacity-20 cursor-pointer hover:border-cyan-500 transition-colors"
          >
            <ChevronLeft className="w-3 h-3 inline mr-1" />
            {t('system.back', 'ANTERIOR')}
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(p => p + 1)}
              className="px-4 py-1.5 text-[9px] font-bold uppercase rounded bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer transition-all active:scale-95"
            >
              {t('system.next', 'SIGUIENTE')}
              <ChevronRight className="w-3 h-3 inline ml-1" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-4 py-1.5 text-[9px] font-bold uppercase rounded bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)] cursor-pointer transition-all active:scale-95"
            >
              {t('system.finish', 'FINALIZAR INSTRUCCIÓN')}
              <Check className="w-3 h-3 inline ml-1" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default TutorialOverlay;
