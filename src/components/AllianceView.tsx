import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RotateCcw, 
  Users, 
  ShieldAlert, 
  Wifi, 
  Zap, 
  Crosshair, 
  ChevronRight,
  UserCheck,
  Send,
  MessageSquare,
  Shield,
  Activity,
  ArrowUpCircle,
  Gem,
  Award
} from "lucide-react";
import { Button } from "./ui/joly-button";

interface Member {
  id: string;
  name: string;
  role: "Comandante" | "Oficial" | "Piloto";
  level: number;
  power: number;
  status: "online" | "offline";
  avatar: string;
}

interface LogEntry {
  id: number;
  author: string;
  message: string;
  type: "chat" | "system" | "combat";
  time: string;
}

interface AllianceViewProps {
  playerGems: number;
  setPlayerGems: React.Dispatch<React.SetStateAction<number>>;
  playerPower: number;
  setPlayerPower: React.Dispatch<React.SetStateAction<number>>;
  onBack: () => void;
  triggerNotification: (text: string, e?: any) => void;
}

export const AllianceView: React.FC<AllianceViewProps> = ({
  playerGems,
  setPlayerGems,
  playerPower,
  setPlayerPower,
  onBack,
  triggerNotification
}) => {
  const [allianceTechLevel, setAllianceTechLevel] = useState(4);
  const [techProgress, setTechProgress] = useState(45);
  const [chatInput, setChatInput] = useState("");

  const [members, setMembers] = useState<Member[]>([
    {
      id: "m1",
      name: "DarthVader_99",
      role: "Comandante",
      level: 85,
      power: 4500000,
      status: "online",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop"
    },
    {
      id: "m2",
      name: "StarKillerBase",
      role: "Oficial",
      level: 82,
      power: 3200000,
      status: "online",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop"
    },
    {
      id: "m3",
      name: "RogueOne_Lead",
      role: "Oficial",
      level: 79,
      power: 2850000,
      status: "offline",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop"
    },
    {
      id: "m4",
      name: "EchoPilot",
      role: "Piloto",
      level: 45,
      power: 850000,
      status: "online",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=150&auto=format&fit=crop"
    },
    {
      id: "m5",
      name: "NovaSeeker",
      role: "Piloto",
      level: 30,
      power: 420000,
      status: "offline",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop"
    }
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 1, author: "SYSTEM", message: "Red criptográfica asegurada. Enlace Q-12 establecido.", type: "system", time: "08:00" },
    { id: 2, author: "DarthVader_99", message: "Pilotos, prepárense para la incursión de gremio a las 18:00.", type: "chat", time: "08:15" },
    { id: 3, author: "SYSTEM", message: "StarKillerBase ha donado 50K Madera al núcleo.", type: "system", time: "09:30" },
    { id: 4, author: "SYSTEM", message: "Incursión del Sector Alpha completada con éxito.", type: "combat", time: "10:45" },
    { id: 5, author: "EchoPilot", message: "Recibido, comandante. Mis interceptores están listos.", type: "chat", time: "11:00" },
  ]);

  const playSfxTone = (type: "click" | "success" | "msg") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      } else if (type === "msg") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (err) {}
  };

  const handleDonateTech = (e: React.MouseEvent) => {
    if (playerGems < 50) {
      triggerNotification("⚠️ CRISTALES INSUFICIENTES (REQUERIDO: 50💎)", e);
      playSfxTone("click");
      return;
    }
    setPlayerGems(prev => prev - 50);
    setTechProgress(prev => {
      const next = prev + 15;
      if (next >= 100) {
        setAllianceTechLevel(l => l + 1);
        triggerNotification(`🚀 ¡NIVEL DE TECNOLOGÍA DE ALIANZA AUMENTADO!`, e);
        playSfxTone("success");
        setPlayerPower(p => p + 5000); // Alliance bonus
        
        // Push system log
        setLogs(prevLogs => [...prevLogs, {
          id: Date.now(),
          author: "SYSTEM",
          message: `Nivel del Núcleo incrementado a ${allianceTechLevel + 1}`,
          type: "system",
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }]);
        
        return next - 100;
      }
      triggerNotification("🔋 APORTE TECNOLÓGICO REGISTRADO", e);
      playSfxTone("success");
      return next;
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setLogs(prev => [...prev, {
      id: Date.now(),
      author: "Tú",
      message: chatInput.trim(),
      type: "chat",
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }]);
    setChatInput("");
    playSfxTone("msg");
  };

  return (
    <div className="w-full flex flex-col items-center select-none py-1 relative">
      <div className="absolute top-0 right-0 z-20">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={onBack}
          className="text-[8.5px] font-mono tracking-widest border border-white/10 hover:border-[#E53E3E]/40 text-white/75 hover:text-[#E53E3E] px-3 py-1.5 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          REGRESAR A BASE
        </Button>
      </div>

      <div className="text-center mb-4">
        <h2 className="text-sm font-mono tracking-[0.25em] text-[#E53E3E] font-black uppercase flex items-center justify-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          RED DE ALIANZA // VANGUARDIA
        </h2>
        <p className="text-[9.5px] font-mono tracking-widest text-[#A0A2A5]/70 uppercase mt-1">
          Canal criptográfico seguro conectado al sector exterior
        </p>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 mt-2 max-w-6xl mx-auto">
        
        {/* LEFT COLUMN: ALLIANCE INFO AND MEMBERS */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Alliance Header Stats Card */}
          <div className="bg-[#0b0c10]/80 border border-indigo-500/20 p-5 rounded-2xl backdrop-blur-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between shadow-[0_0_30px_rgba(99,102,241,0.05)]">
            <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none" />
            
            <div className="flex items-center gap-4 z-10 w-full sm:w-auto">
              <div className="w-16 h-16 rounded-xl bg-black border border-indigo-500/40 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Shield className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-widest text-white uppercase font-sans">
                  VANGUARDIA GALÁCTICA
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-[9px] font-mono text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-500/20">
                    <Users className="w-3 h-3" />
                    <span>MIEMBROS: {members.length}/50</span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-500/20">
                    <Activity className="w-3 h-3" />
                    <span>NIVEL DEL NÚCLEO: {allianceTechLevel}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tech Contribution section */}
            <div className="mt-4 sm:mt-0 flex flex-col items-center sm:items-end w-full sm:w-auto z-10">
              <span className="text-[8px] font-mono tracking-widest text-white/50 uppercase mb-1.5">
                PROGRESO TECNOLÓGICO
              </span>
              <div className="w-full sm:w-40 h-2 bg-black/60 border border-white/10 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 to-cyan-400 transition-all duration-500" 
                  style={{ width: `${techProgress}%` }} 
                />
              </div>
              <button 
                onClick={handleDonateTech}
                className="flex items-center gap-1.5 bg-[#E53E3E]/10 hover:bg-[#E53E3E]/20 border border-[#E53E3E]/40 text-[#E53E3E] hover:text-white px-3 py-1.5 rounded transition-all text-[9px] font-mono font-bold tracking-widest"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                DONAR (50💎)
              </button>
            </div>
          </div>

          {/* Members List */}
          <div className="bg-[#08090b]/80 border border-white/5 p-4 rounded-2xl backdrop-blur-md flex-1 overflow-hidden flex flex-col min-h-[350px]">
            <h4 className="text-[10px] font-mono tracking-[0.2em] text-white/50 uppercase border-b border-white/5 pb-2 mb-3 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5" />
              REGISTRO DE PERSONAL ACTIVO
            </h4>
            
            <div className="flex-1 overflow-y-auto scrollbar-none space-y-2 pr-1">
              {members.map(member => (
                <div 
                  key={member.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#08090b] ${member.status === 'online' ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white font-sans">{member.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded border ${
                          member.role === 'Comandante' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          member.role === 'Oficial' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                          'bg-white/5 text-white/40 border-white/10'
                        }`}>
                          {member.role.toUpperCase()}
                        </span>
                        <span className="text-[9px] font-mono text-white/30">NIVEL {member.level}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 sm:mt-0 flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 sm:pl-4">
                    <div className="flex flex-col sm:items-end">
                      <span className="text-[7.5px] font-mono text-white/30 tracking-widest uppercase">Poder Táctico</span>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">{member.power.toLocaleString()}</span>
                    </div>
                    <button className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/5">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CHAT & LOGS TERMINAL */}
        <div className="lg:col-span-4 flex flex-col bg-[#050608]/90 border border-[#E53E3E]/20 rounded-2xl backdrop-blur-md overflow-hidden min-h-[400px] shadow-[0_0_20px_rgba(229,62,62,0.05)] relative">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#E53E3E]/5 rounded-full blur-[40px] pointer-events-none" />

          {/* Terminal Header */}
          <div className="px-4 py-3 border-b border-[#E53E3E]/20 bg-[#E53E3E]/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-[#E53E3E] animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest font-black text-white/80 uppercase">
                COM-LINK CIFRADO
              </span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>

          {/* Logs Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none flex flex-col font-mono text-[9.5px]">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className={`p-2 rounded-lg border ${
                  log.type === 'system' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200' :
                  log.type === 'combat' ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' :
                  'bg-white/5 border-white/10 text-neutral-300'
                }`}
              >
                <div className="flex justify-between items-start mb-1 opacity-60 text-[7.5px] uppercase tracking-wider">
                  <span className={`font-black ${log.author === 'SYSTEM' ? 'text-indigo-400' : log.author === 'Tú' ? 'text-[#E53E3E]' : 'text-cyan-400'}`}>
                    {log.author}
                  </span>
                  <span>{log.time}</span>
                </div>
                <div className="leading-relaxed">
                  {log.message}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input form */}
          <div className="p-3 border-t border-[#E53E3E]/20 bg-black/40 relative z-10">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <div className="relative flex-1">
                <MessageSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Transmitir mensaje..." 
                  className="w-full bg-[#121315] border border-white/10 rounded-lg py-2 pl-8 pr-3 text-[10px] font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#E53E3E]/50 transition-colors"
                />
              </div>
              <button 
                type="submit"
                disabled={!chatInput.trim()}
                className="bg-[#E53E3E] hover:bg-red-500 disabled:opacity-50 disabled:bg-neutral-800 text-white p-2 rounded-lg transition-colors border border-transparent disabled:border-white/10"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
