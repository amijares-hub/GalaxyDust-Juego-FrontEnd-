import React, { useState } from 'react';
import { Eye, Shield } from 'lucide-react';
import { ExpeditionsView } from '../components/ExpeditionsView';
import { CanView } from '../components/CanView';

interface UserProfile {
  name: string;
  email: string;
}

interface HomepageProps {
  user: UserProfile;
  onLogout: () => void;
}

export const Homepage: React.FC<HomepageProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<"MAIN" | "C.A.N" | "EXPEDITION" | "SETTINGS">("EXPEDITION");

  return (
    <div className="w-screen h-screen bg-black text-white font-sans flex flex-col justify-start items-center select-none overflow-hidden">
      
      {/* ─── NAVBAR SUPERIOR CLONADO EXACTO ─── */}
      <div className="w-full h-16 border-b border-neutral-900 px-8 flex justify-between items-center z-50 bg-black">
        
        {/* MENÚ IZQUIERDO */}
        <div className="flex items-center gap-8 text-[13px] font-medium tracking-widest text-neutral-400">
          <button 
            onClick={() => setActiveTab("MAIN")} 
            className={`cursor-pointer transition-colors ${activeTab === "MAIN" ? "text-white font-semibold" : "hover:text-white"}`}
          >
            MAIN
          </button>
          <button 
            onClick={() => setActiveTab("C.A.N")} 
            className={`cursor-pointer transition-colors ${activeTab === "C.A.N" ? "text-white font-semibold" : "hover:text-white"}`}
          >
            C.A.N
          </button>
          <button 
            onClick={() => setActiveTab("EXPEDITION")} 
            className={`cursor-pointer transition-colors ${activeTab === "EXPEDITION" ? "text-white font-semibold" : "hover:text-white"}`}
          >
            EXPEDITION
          </button>
          <button 
            onClick={() => setActiveTab("SETTINGS")} 
            className={`cursor-pointer transition-colors ${activeTab === "SETTINGS" ? "text-white font-semibold" : "hover:text-white"}`}
          >
            SETTINGS
          </button>
        </div>

        {/* CONTADORES Y PERFIL DERECHO */}
        <div className="flex items-center gap-6">
          
          {/* INDICADOR DE LICENCIA / CONTADOR 1 */}
          <div className="flex items-center gap-1 text-[12px] font-bold text-cyan-400">
            <div className="w-5 h-5 rounded-full border border-cyan-400/60 flex items-center justify-center text-[10px] bg-cyan-950/20">
              1
            </div>
            <span className="text-neutral-500 text-[9px] font-mono ml-0.5">&lt;</span>
          </div>

          {/* MONEDA ORO 1K */}
          <div className="flex items-center gap-2 text-[12px] font-bold tracking-wide">
            <div className="w-5 h-5 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 border border-amber-400/30 flex items-center justify-center text-[8px] text-black font-black">
              GD
            </div>
            <span>1K</span>
          </div>

          {/* MONEDA CRÉDITO 156K */}
          <div className="flex items-center gap-2 text-[12px] font-bold tracking-wide">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-slate-600 via-indigo-950 to-slate-400 border border-slate-500/30 flex items-center justify-center">
              <Shield className="w-2.5 h-2.5 text-slate-300 fill-slate-300/20" />
            </div>
            <span>156K</span>
          </div>

          {/* PERFIL AVATAR MECHA */}
          <div className="flex items-center gap-3 pl-2 border-l border-neutral-800">
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-cyan-400 text-[12px] font-bold tracking-wider uppercase">AMPERSAND</span>
              <span className="text-neutral-500 text-[9px] font-medium tracking-widest uppercase">NO ALLIANCE</span>
            </div>
            <div className="w-10 h-10 rounded-full border border-neutral-700 overflow-hidden bg-neutral-900 shadow-md">
              <img 
                src="https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Ampersand&backgroundColor=0ea5e9" 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

        </div>
      </div>

      {/* ─── ÁREA DE CONTENIDO PRINCIPAL ─── */}
      {activeTab === "MAIN" && (
        <div className="w-full flex-1 max-w-[1400px] px-12 pt-6 flex flex-col justify-start items-start gap-4">
          
          {/* BOTÓN SECUNDARIO EXPEDITIONS IN FLIGHT */}
          <div className="w-full flex justify-end">
            <button className="flex items-center gap-2 px-3 py-1 border border-cyan-500/40 hover:border-cyan-400 transition-colors text-cyan-400 text-[10px] font-bold tracking-widest uppercase rounded-[2px] bg-black cursor-pointer">
              <Eye className="w-3 h-3" /> EXPEDITIONS IN FLIGHT
            </button>
          </div>

          {/* RETÍCULA DE LAS 2 TARJETAS EXACTAS */}
          <div className="flex items-start gap-6 mt-2">
            
            {/* CARD 1: EXPEDITION */}
            <div 
              onClick={() => setActiveTab("EXPEDITION")}
              className="w-[320px] h-[380px] border border-neutral-800 bg-neutral-950 rounded-[2px] relative overflow-hidden group flex flex-col justify-between p-5 cursor-pointer hover:border-neutral-700 transition-colors"
            >
              <div className="absolute inset-0 z-0">
                <img 
                  src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop" 
                  alt="Expedition space" 
                  className="w-full h-full object-cover brightness-[0.35] group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              </div>

              <h2 className="relative z-10 text-[18px] font-bold tracking-widest text-white uppercase">
                EXPEDITION
              </h2>
              <p className="relative z-10 text-[11px] text-neutral-400 leading-relaxed tracking-wide">
                Venture into the unknown, explore, farm, and dominate the galaxy.
              </p>
            </div>

            {/* CARD 2: ALLIANCE */}
            <div className="w-[320px] h-[380px] border border-neutral-800 bg-neutral-950 rounded-[2px] relative overflow-hidden group flex flex-col justify-between p-5">
              <div className="absolute inset-0 z-0">
                <img 
                  src="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=600&auto=format&fit=crop" 
                  alt="Alliance council" 
                  className="w-full h-full object-cover brightness-[0.35]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              </div>

              <h2 className="relative z-10 text-[18px] font-bold tracking-widest text-white uppercase">
                ALLIANCE
              </h2>
              <p className="relative z-10 text-[11px] text-neutral-400 leading-relaxed tracking-wide">
                Coordinate your power. Expand your dominion.
              </p>
            </div>

          </div>
        </div>
      )}

      {activeTab === "EXPEDITION" && (
        <div className="w-full flex-1 max-w-[1400px] flex flex-col justify-start items-start overflow-hidden">
          <ExpeditionsView />
        </div>
      )}

      {activeTab === "C.A.N" && (
        <div className="w-full flex-1 max-w-[1400px] flex flex-col justify-start items-start overflow-hidden">
          <CanView />
        </div>
      )}

    </div>
  );
};
