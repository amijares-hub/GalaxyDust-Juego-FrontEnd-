import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, Clock, Lock, Sparkles, ChevronLeft } from 'lucide-react';
import { GalaxyFrame } from './CanView';
import { useAudioEngine } from '../hooks/useAudioEngine';

export type MissionType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'EVENT' | 'LIMITED' | 'FLEET' | 'CLAN';

export interface Mission {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  progress: number;
  maxProgress: number;
  reward: string;
  claimed: boolean;
}

interface MissionViewProps {
  triggerNotification?: (text: string, e?: any) => void;
  onBack?: () => void;
}

const LOCKED_MISSION_TYPES: Set<MissionType> = new Set(['WEEKLY', 'MONTHLY', 'EVENT', 'LIMITED', 'FLEET', 'CLAN']);

export const MissionView: React.FC<MissionViewProps> = ({
  triggerNotification,
  onBack
}) => {
  const { playSfx } = useAudioEngine();
  const [activeMissionType, setActiveMissionType] = useState<MissionType>('DAILY');

  const [missions, setMissions] = useState<Mission[]>([
    { id: 'M-D1', type: 'DAILY', title: 'EXPEDICIÓN DE MINERÍA', description: 'Completar 3 expediciones de minería con éxito', progress: 3, maxProgress: 3, reward: '+50 CRISTALES', claimed: false },
    { id: 'M-D2', type: 'DAILY', title: 'SINCRO DE C.A.N.', description: 'Escanear 1 cluster galáctico en el mapa estelar', progress: 1, maxProgress: 1, reward: '+100 GD COINS', claimed: true },
    { id: 'M-D3', type: 'DAILY', title: 'COMERCIO INGAME', description: 'Realizar 1 compra o venta en el Marketplace', progress: 0, maxProgress: 1, reward: '+10 PHANTOM COINS', claimed: false }
  ]);

  const handleClaimMission = (missionId: string) => {
    playSfx(1200);
    const targetMission = missions.find(m => m.id === missionId);
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, claimed: true } : m));
    
    if (triggerNotification && targetMission) {
      triggerNotification(`🎉 RECOMPENSA RECLAMADA: ${targetMission.reward}`);
    }
  };

  const handleSelectTab = (type: MissionType) => {
    if (LOCKED_MISSION_TYPES.has(type)) {
      playSfx(300);
      if (triggerNotification) {
        triggerNotification(`🔒 CATEGORÍA [${type}] EN DESARROLLO - COMING SOON`);
      }
      return;
    }
    playSfx(660);
    setActiveMissionType(type);
  };

  const isCurrentTabLocked = LOCKED_MISSION_TYPES.has(activeMissionType);

  return (
    <GalaxyFrame className="w-full max-w-7xl mx-auto my-2 font-mono text-left space-y-6 backdrop-blur-md relative overflow-hidden text-white" innerPadding="p-5 sm:p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-cyan-900/50 pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={() => { playSfx(440); onBack(); }}
              className="p-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-lg cursor-pointer transition-all active:scale-95 mr-1"
              title="Volver"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <Target className="w-7 h-7 text-cyan-400 animate-pulse shrink-0" />
          <div>
            <span className="text-[9px] font-mono text-cyan-400 tracking-widest block font-bold uppercase">
              SISTEMA DE PROGRESIVIDAD Y RECOMPENSAS
            </span>
            <h2 className="text-lg font-black tracking-widest text-white uppercase">
              MISSION CENTER
            </h2>
          </div>
        </div>
        <span className="text-[9px] text-zinc-400 bg-cyan-950 px-3 py-1 rounded border border-cyan-800/40 uppercase font-bold hidden sm:inline-block">
          SINCRO EN TIEMPO REAL
        </span>
      </div>

      {/* PESTAÑAS DE CATEGORÍA DE MISIÓN */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar border-b border-cyan-950 pb-3 text-[9px] uppercase font-bold tracking-wider">
        {(['DAILY', 'WEEKLY', 'MONTHLY', 'EVENT', 'LIMITED', 'FLEET', 'CLAN'] as MissionType[]).map((type) => {
          const isLocked = LOCKED_MISSION_TYPES.has(type);
          const isActive = activeMissionType === type;

          return (
            <button
              key={type}
              onClick={() => handleSelectTab(type)}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 border flex items-center gap-1.5 ${
                isActive
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80 font-black shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : isLocked
                  ? 'bg-black/30 text-zinc-600 border-zinc-900/80 hover:border-zinc-800'
                  : 'bg-black/40 text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
            >
              {isLocked && <Lock className="w-3 h-3 text-amber-500/80 shrink-0" />}
              <span>{type}</span>
              {isLocked && <span className="text-[7px] text-amber-400/90 font-mono font-bold">[SOON]</span>}
            </button>
          );
        })}
      </div>

      {/* LISTA DE MISIONES / OVERLAY LOCK PARA CATEGORÍAS EN DESARROLLO */}
      <div className="relative min-h-[320px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {isCurrentTabLocked ? (
            <motion.div
              key="locked-mission-overlay"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full py-16 px-6 bg-black/70 border border-cyan-950/80 rounded-2xl text-center space-y-3 flex flex-col items-center justify-center backdrop-blur-sm shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-500/60 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <Lock className="w-6 h-6 text-amber-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="px-3 py-0.5 bg-amber-500/20 border border-amber-400/80 text-amber-300 rounded-full font-mono text-[8.5px] font-black uppercase tracking-widest inline-block mb-1 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                  🔒 MÓDULO EN DESARROLLO
                </span>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                  MISIONES DE CATEGORÍA [{activeMissionType}]
                </h3>
                <p className="text-[9px] text-zinc-400 font-sans normal-case max-w-md mx-auto pt-1 leading-relaxed">
                  Los objetivos semanales, eventos especiales y directivas de clan se habilitarán en la próxima sincronización del firmware C.A.N.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="active-missions-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar w-full"
            >
              {missions.filter(m => m.type === activeMissionType).length === 0 ? (
                <div className="col-span-2 p-12 text-center text-zinc-600 text-[10px] uppercase tracking-widest bg-black/40 border border-cyan-950 rounded-xl">
                  NO HAY MISIONES DISPONIBLES EN ESTA CATEGORÍA
                </div>
              ) : (
                missions.filter(m => m.type === activeMissionType).map((mission) => {
                  const isComplete = mission.progress >= mission.maxProgress;
                  const pct = Math.min(100, Math.floor((mission.progress / mission.maxProgress) * 100));

                  return (
                    <div key={mission.id} className="p-4 bg-black/60 border border-cyan-950 hover:border-cyan-800 rounded-xl flex flex-col justify-between gap-3 relative transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col text-left">
                          <span className="text-[11px] font-bold text-white uppercase tracking-wider">{mission.title}</span>
                          <span className="text-[9px] text-zinc-400 mt-0.5 normal-case">{mission.description}</span>
                        </div>
                        <span className="text-[8.5px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 shrink-0">{mission.reward}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[8px] text-zinc-500">
                          <span>PROGRESO</span>
                          <span className="text-cyan-400 font-bold">{mission.progress} / {mission.maxProgress} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-cyan-950">
                          <div className="h-full bg-cyan-400 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-end mt-1">
                        {mission.claimed ? (
                          <span className="text-[8.5px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> RECLAMADO
                          </span>
                        ) : isComplete ? (
                          <button
                            onClick={() => handleClaimMission(mission.id)}
                            className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-[8.5px] font-black uppercase rounded shadow-[0_0_10px_rgba(16,185,129,0.4)] cursor-pointer transition-all animate-pulse flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>RECLAMAR RECOMPENSA</span>
                          </button>
                        ) : (
                          <span className="text-[8px] text-zinc-500 uppercase font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" /> EN PROGRESO
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GalaxyFrame>
  );
};

export default MissionView;