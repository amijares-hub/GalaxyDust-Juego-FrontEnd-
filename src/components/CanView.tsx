import React, { useState, useEffect } from 'react';
import { Info, Cpu, Layers, ShieldCheck, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CanStats {
  level: number;
  structures_active: number;
  structures_total: number;
  tech_active: number;
  tech_total: number;
  badges_active: number;
  badges_total: number;
}

export const CanView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<CanStats>({
    level: 1,
    structures_active: 10,
    structures_total: 85,
    tech_active: 5,
    tech_total: 95,
    badges_active: 2,
    badges_total: 132
  });

  // 📡 CONEXIÓN CANÓNICA A SUPABASE PARA LEER RANGOS OPERATIVOS DEL C.A.N
  useEffect(() => {
    const loadCanNetworkData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Consulta al perfil o tabla de automatización
      const { data } = await supabase
        .from('user_profiles')
        .select('can_level, metal, crystal') // Ajustable a tus columnas de C.A.N reales
        .eq('user_id', user.id)
        .single();
        
      if (data) {
        // Mapeo seguro si existen las columnas en tu base de datos actual
        setStats(prev => ({
          ...prev,
          level: data.can_level || 1
        }));
      }
    };
    loadCanNetworkData();
  }, []);

  const handleUpgradeLevel = async () => {
    setLoading(true);
    // Transacción de mejora de nodo central de automatización
    setTimeout(() => {
      setStats(prev => ({ ...prev, level: prev.level + 1 }));
      setLoading(false);
    }, 800);
  };

  // Matriz de modificadores activos recopilados de tus notas (Formato decimal con coma)
  const activeSkills = [
    "0,05 Technology Creation Time Reduction",
    "2,5 Acquired Knowledge",
    "0,05 Improves research efficiency, reducing the overall downtime",
    "350 Crystal Production (Fixed)",
    "1,05 Mine Production Boost",
    "1,0 Ship Fabrication Time Reduction"
  ];

  return (
    <div className="w-full h-full bg-black text-white font-sans flex flex-col justify-start items-start px-12 pt-6 select-none overflow-y-auto">
      
      {/* ─── TARJETA SUPERIOR: INVENTORY ─── */}
      <div className="mb-6 flex-shrink-0">
        <div className="w-[236px] h-[210px] border border-neutral-800 bg-neutral-950 rounded-[1px] relative overflow-hidden group flex flex-col justify-end p-4">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400" 
              alt="Inventory" 
              className="w-full h-full object-cover brightness-[0.35]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
          </div>
          <h2 className="relative z-10 text-[15px] font-bold tracking-widest text-white uppercase">
            INVENTORY
          </h2>
        </div>
      </div>

      {/* ─── MATRIZ CENTRAL C.A.N INTERACTIVA (3 COLUMNAS COMPLETA) ─── */}
      <div className="w-full border border-cyan-500/20 bg-black rounded-[2px] overflow-hidden flex flex-col">
        
        {/* FILA DE CABECERAS DE SECCIÓN */}
        <div className="w-full grid grid-cols-12 border-b border-neutral-900 text-center font-bold tracking-widest text-[13px] uppercase bg-neutral-950/20 h-10 items-center">
          <div className="col-span-3 border-r border-neutral-900 h-full flex items-center justify-center text-cyan-400">LEVEL</div>
          <div className="col-span-5 border-r border-neutral-900 h-full flex items-center justify-center text-cyan-400">ASSETS</div>
          <div className="col-span-4 h-full flex items-center justify-center text-cyan-400">SKILLS</div>
        </div>

        {/* FILA DE CONTENIDO INTERNO */}
        <div className="w-full grid grid-cols-12 min-h-[260px]">
          
          {/* COLUMNA 1: LEVEL ENGINE */}
          <div className="col-span-3 border-r border-neutral-900 p-5 flex flex-col justify-between items-center relative">
            {/* Icono de información superior */}
            <div className="absolute top-3 left-4 text-cyan-400/80 cursor-pointer hover:text-cyan-400">
              <Info className="w-4 h-4" />
            </div>

            {/* Escudo de Rango Central Clonado */}
            <div className="my-auto relative flex items-center justify-center">
              <div className="w-24 h-24 border-2 border-dashed border-cyan-500/30 rounded-full flex items-center justify-center p-2 animate-spin-slow">
                <div className="w-full h-full border border-cyan-400/50 rounded-full flex items-center justify-center"></div>
              </div>
              <div className="absolute font-sans font-black text-[32px] text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                {stats.level}
              </div>
            </div>

            {/* Botón Upgrade Canónico */}
            <button 
              onClick={handleUpgradeLevel}
              disabled={loading}
              className="w-full py-1 border border-cyan-500/50 hover:border-cyan-400 text-cyan-400 text-[11px] font-bold tracking-widest uppercase bg-black rounded-[1px] transition-colors cursor-pointer"
            >
              {loading ? "PROCESSING..." : "UPGRADE"}
            </button>
          </div>

          {/* COLUMNA 2: ASSETS COUNTERS (3 TARJETAS CON BADGES VERDES) */}
          <div className="col-span-5 border-r border-neutral-900 p-5 flex items-center justify-center gap-4">
            
            {/* SUB-CARD 1: STRUCTURES */}
            <div className="flex-1 h-[140px] border border-neutral-800 bg-neutral-950/60 rounded-[2px] p-3 flex flex-col justify-between items-center relative">
              <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black border border-green-500 text-[10px] font-bold font-mono flex items-center justify-center text-green-400 shadow-[0_0_6px_rgba(34,197,94,0.4)]">
                10
              </div>
              <span className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase mt-1">STRUCTURES</span>
              <Cpu className="w-6 h-6 text-cyan-500/60 stroke-[1.5]" />
              <div className="text-[10px] font-mono text-neutral-500 text-center leading-tight">
                <div>Activated: <span className="text-white font-sans">{stats.structures_active}</span></div>
                <div className="mt-0.5">Total: <span className="text-white font-sans">{stats.structures_total}</span></div>
              </div>
            </div>

            {/* SUB-CARD 2: TECHNOLOGIES */}
            <div className="flex-1 h-[140px] border border-neutral-800 bg-neutral-950/60 rounded-[2px] p-3 flex flex-col justify-between items-center relative">
              <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black border border-green-500 text-[10px] font-bold font-mono flex items-center justify-center text-green-400 shadow-[0_0_6px_rgba(34,197,94,0.4)]">
                5
              </div>
              <span className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase mt-1">TECHNOLOGIES</span>
              <Layers className="w-6 h-6 text-cyan-500/60 stroke-[1.5]" />
              <div className="text-[10px] font-mono text-neutral-500 text-center leading-tight">
                <div>Activated: <span className="text-white font-sans">{stats.tech_active}</span></div>
                <div className="mt-0.5">Total: <span className="text-white font-sans">{stats.tech_total}</span></div>
              </div>
            </div>

            {/* SUB-CARD 3: BADGES */}
            <div className="flex-1 h-[140px] border border-neutral-800 bg-neutral-950/60 rounded-[2px] p-3 flex flex-col justify-between items-center relative">
              <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black border border-green-500 text-[10px] font-bold font-mono flex items-center justify-center text-green-400 shadow-[0_0_6px_rgba(34,197,94,0.4)]">
                2
              </div>
              <span className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase mt-1">BADGES</span>
              <ShieldCheck className="w-6 h-6 text-cyan-500/60 stroke-[1.5]" />
              <div className="text-[10px] font-mono text-neutral-500 text-center leading-tight">
                <div>Activated: <span className="text-white font-sans">{stats.badges_active}</span></div>
                <div className="mt-0.5">Total: <span className="text-white font-sans">{stats.badges_total}</span></div>
              </div>
            </div>

          </div>

          {/* COLUMNA 3: SKILLS MODIFIERS LIST */}
          <div className="col-span-4 p-5 flex flex-col justify-start items-start gap-3 overflow-hidden">
            {/* Mini Tab Filter ALL */}
            <div className="px-3 py-0.5 border border-cyan-500/40 bg-cyan-950/20 text-cyan-400 text-[9px] font-black tracking-widest uppercase rounded-[1px]">
              ALL
            </div>

            {/* Listado de modificadores con scroll interno blindado */}
            <div className="flex-1 w-full flex flex-col gap-2 overflow-y-auto pr-1 text-[11px] font-mono font-bold text-cyan-400 tracking-wide leading-normal">
              {activeSkills.map((skill, index) => (
                <div key={index} className="hover:text-cyan-300 transition-colors py-0.5 border-b border-neutral-950">
                  {skill}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
