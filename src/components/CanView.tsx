import React, { useState } from 'react';
import { Cpu, ShieldCheck, Zap, Info, ChevronRight } from 'lucide-react';

export const CanView: React.FC = () => {
  const [canLevel] = useState(1);

  return (
    <div className="w-full max-w-7xl mx-auto bg-[#080b0e] border border-cyan-500/30 p-4 sm:p-6 rounded-2xl shadow-2xl font-mono text-left select-none space-y-4 backdrop-blur-md relative overflow-hidden">
      
      {/* HEADER DE LA C.A.N. MATRIX */}
      <div className="flex justify-between items-center border-b border-cyan-900/50 pb-3">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6 text-cyan-400 animate-pulse" />
          <div>
            <span className="text-[8.5px] font-mono text-cyan-400 tracking-widest block font-bold uppercase">
              COMMAND ACTION NODE
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-widest text-white uppercase">
              C.A.N. MATRIX
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-1 rounded text-[8px] font-bold text-cyan-300 uppercase">
          <Info className="w-3 h-3 text-cyan-400" />
          <span>SINCRO MATRIZ ACTIVA</span>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL EN GRILLA DE 12 COLUMNAS SIN SOLAPAMIENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch min-h-[320px]">
        
        {/* COLUMNA 1: LEVEL (3 columnas en pantallas grandes) */}
        <div className="lg:col-span-3 bg-black/60 border border-cyan-950 rounded-xl p-4 flex flex-col items-center justify-between text-center relative">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
            LEVEL
          </span>

          <div className="my-4 relative flex items-center justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-cyan-500/40 animate-spin-slow absolute inset-0" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-cyan-400 bg-cyan-950/40 flex items-center justify-center text-3xl font-black text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] relative z-10">
              {canLevel}
            </div>
          </div>

          <button className="w-full py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-110 border border-cyan-400 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg cursor-pointer transition-all">
            UPGRADE NODE
          </button>
        </div>

        {/* COLUMNA 2: ASSETS ACTIVADOS (5 columnas en pantallas grandes) */}
        <div className="lg:col-span-5 bg-black/60 border border-cyan-950 rounded-xl p-3 sm:p-4 flex flex-col justify-between">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block text-center mb-3">
            ASSETS ACTIVADOS
          </span>

          <div className="grid grid-cols-3 gap-2">
            {/* STRUCTURES */}
            <div className="bg-[#050910] border border-cyan-900/60 rounded-lg p-2.5 text-center flex flex-col justify-between items-center relative overflow-hidden group hover:border-cyan-500/80 transition-colors">
              <span className="absolute top-1 right-1 text-[7.5px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 rounded-full">
                10
              </span>
              <span className="text-[8px] sm:text-[9px] font-black text-zinc-300 uppercase mt-2">
                STRUCTURES
              </span>
              <Cpu className="w-5 h-5 text-cyan-400 my-2 group-hover:scale-110 transition-transform" />
              <div className="text-[7.5px] text-zinc-500 font-mono">
                <div>Activated: <span className="text-white font-bold">10</span></div>
                <div>Total: <span className="text-zinc-400">85</span></div>
              </div>
            </div>

            {/* TECHNOLOGIES */}
            <div className="bg-[#050910] border border-cyan-900/60 rounded-lg p-2.5 text-center flex flex-col justify-between items-center relative overflow-hidden group hover:border-cyan-500/80 transition-colors">
              <span className="absolute top-1 right-1 text-[7.5px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 rounded-full">
                5
              </span>
              <span className="text-[8px] sm:text-[9px] font-black text-zinc-300 uppercase mt-2 truncate max-w-full">
                TECHNOLOGIES
              </span>
              <Zap className="w-5 h-5 text-cyan-400 my-2 group-hover:scale-110 transition-transform" />
              <div className="text-[7.5px] text-zinc-500 font-mono">
                <div>Activated: <span className="text-white font-bold">5</span></div>
                <div>Total: <span className="text-zinc-400">95</span></div>
              </div>
            </div>

            {/* BADGES */}
            <div className="bg-[#050910] border border-cyan-900/60 rounded-lg p-2.5 text-center flex flex-col justify-between items-center relative overflow-hidden group hover:border-cyan-500/80 transition-colors">
              <span className="absolute top-1 right-1 text-[7.5px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 rounded-full">
                2
              </span>
              <span className="text-[8px] sm:text-[9px] font-black text-zinc-300 uppercase mt-2">
                BADGES
              </span>
              <ShieldCheck className="w-5 h-5 text-cyan-400 my-2 group-hover:scale-110 transition-transform" />
              <div className="text-[7.5px] text-zinc-500 font-mono">
                <div>Activated: <span className="text-white font-bold">2</span></div>
                <div>Total: <span className="text-zinc-400">132</span></div>
              </div>
            </div>
          </div>

          <div className="mt-3 p-2 bg-cyan-950/30 border border-cyan-900/40 rounded text-[7.5px] text-cyan-300/80 text-center">
            <span>• MAX BADGES SLOTS: 5 (DESBLOQUEA MÁS CON SKILLS DE ASSETS)</span>
          </div>
        </div>

        {/* COLUMNA 3: SKILLS (4 columnas en pantallas grandes con Scroll Seguro) */}
        <div className="lg:col-span-4 bg-black/60 border border-cyan-950 rounded-xl p-3 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-cyan-950">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
              SKILLS ACTIVAS
            </span>
            <span className="text-[7.5px] bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              PASIVAS
            </span>
          </div>

          <div className="space-y-2 text-[8px] sm:text-[8.5px] font-mono text-cyan-300 overflow-y-auto max-h-[200px] pr-1.5 custom-scrollbar text-left flex-1">
            <div className="p-1.5 bg-[#050910] border border-cyan-950 rounded flex items-start gap-1.5">
              <ChevronRight className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
              <span>0,05 Technology Creation Time Reduction</span>
            </div>
            <div className="p-1.5 bg-[#050910] border border-cyan-950 rounded flex items-start gap-1.5">
              <ChevronRight className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
              <span className="text-cyan-200 font-bold">2,5 Acquired Knowledge</span>
            </div>
            <div className="p-1.5 bg-[#050910] border border-cyan-950 rounded flex items-start gap-1.5">
              <ChevronRight className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
              <span>0,05 Improves research efficiency, reducing overall downtime</span>
            </div>
            <div className="p-1.5 bg-[#050910] border border-cyan-950 rounded flex items-start gap-1.5">
              <ChevronRight className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
              <span className="text-purple-300 font-bold">350 Crystal Production (Fixed)</span>
            </div>
            <div className="p-1.5 bg-[#050910] border border-cyan-950 rounded flex items-start gap-1.5">
              <ChevronRight className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
              <span>1,05 Mine Production Boost</span>
            </div>
            <div className="p-1.5 bg-[#050910] border border-cyan-950 rounded flex items-start gap-1.5">
              <ChevronRight className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
              <span>1,0 Ship Fabrication Time Reduction</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default CanView;