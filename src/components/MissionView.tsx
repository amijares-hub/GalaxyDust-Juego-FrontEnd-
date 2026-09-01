import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, CheckCircle2, Clock } from 'lucide-react';

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

export const MissionView: React.FC<MissionViewProps> = ({
  triggerNotification,
  onBack
}) => {
  const [activeMissionType, setActiveMissionType] = useState<MissionType>('DAILY');

  const [missions, setMissions] = useState<Mission[]>([
    { id: 'M-D1', type: 'DAILY', title: 'EXPEDICIÓN DE MINERÍA', description: 'Completar 3 expediciones de minería con éxito', progress: 3, maxProgress: 3, reward: '+50 CRISTALES', claimed: false },
    { id: 'M-D2', type: 'DAILY', title: 'SINCRO DE C.A.N.', description: 'Escanear 1 cluster galáctico en el mapa estelar', progress: 1, maxProgress: 1, reward: '+100 GD COINS', claimed: true },
    { id: 'M-D3', type: 'DAILY', title: 'COMERCIO INGAME', description: 'Realizar 1 compra o venta en el Marketplace', progress: 0, maxProgress: 1, reward: '+10 PHANTOM COINS', claimed: false }
  ]);

  const handleClaimMission = (missionId: string) => {
    const targetMission = missions.find(m => m.id === missionId);
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, claimed: true } : m));
    
    if (triggerNotification && targetMission) {
      triggerNotification(`🎉 RECOMPENSA RECLAMADA: ${targetMission.reward}`);
    }
  };

  return (
    <motion.div
      key="sector-mission-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full bg-[#080b0e] border border-cyan-500/30 p-6 sm:p-8 rounded-2xl font-mono text-left space-y-6 backdrop-blur-md shadow-2xl relative overflow-hidden text-white"
    >
      <div className="flex justify-between items-center border-b border-cyan-900/50 pb-4">
        <div className="flex items-center gap-3">
          <Target className="w-7 h-7 text-cyan-400 animate-pulse" />
          <div>
            <span className="text-[9px] font-mono text-cyan-400 tracking-widest block font-bold uppercase">
              SISTEMA DE PROGRESIVIDAD Y RECOMPENSAS
            </span>
            <h2 className="text-lg font-black tracking-widest text-white uppercase">
              MISSION CENTER
            </h2>
          </div>
        </div>
        <span className="text-[9px] text-zinc-400 bg-cyan-950 px-3 py-1 rounded border border-cyan-800/40 uppercase font-bold">
          SINCRO EN TIEMPO REAL
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none border-b border-cyan-950 pb-3 text-[9px] uppercase font-bold tracking-wider">
        {(['DAILY', 'WEEKLY', 'MONTHLY', 'EVENT', 'LIMITED', 'FLEET', 'CLAN'] as MissionType[]).map((type) => (
          <button
            key={type}
            onClick={() => setActiveMissionType(type)}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
              activeMissionType === type
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-black/40 text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
        {missions.filter(m => m.type === activeMissionType).length === 0 ? (
          <div className="col-span-2 p-12 text-center text-zinc-600 text-[10px] uppercase tracking-widest">
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
                      className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-[8.5px] font-black uppercase rounded shadow-[0_0_10px_rgba(16,185,129,0.4)] cursor-pointer transition-all animate-pulse"
                    >
                      RECLAMAR RECOMPENSA
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
      </div>
    </motion.div>
  );
};

export default MissionView;
