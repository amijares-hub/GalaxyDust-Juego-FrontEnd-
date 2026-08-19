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
import { supabase } from "../lib/supabase";

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
  id: string | number;
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
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [allianceName, setAllianceName] = useState<string>("VANGUARDIA GALÁCTICA");

  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // ─── CARGA REAL DE DATOS DE LA ALIANZA Y MIEMBROS DESDE SUPABASE ───
  const fetchAllianceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Obtener membresía del usuario
      const { data: memberRecord } = await supabase
        .from('alliance_members')
        .select('alliance_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      let targetAllianceId = memberRecord?.alliance_id;

      if (targetAllianceId) {
        const { data: alliance } = await supabase
          .from('alliances')
          .select('*')
          .eq('id', targetAllianceId)
          .single();

        if (alliance) {
          setAllianceName(alliance.name || "VANGUARDIA GALÁCTICA");
          setAllianceTechLevel(alliance.level || 1);
        }

        // Cargar miembros reales
        const { data: teamData } = await supabase
          .from('alliance_members')
          .select(`
            id, role, user_id,
            user_profiles:user_id (id, username, level, power_score, avatar_url)
          `)
          .eq('alliance_id', targetAllianceId);

        if (teamData && teamData.length > 0) {
          const mappedMembers: Member[] = teamData.map((m: any) => {
            const p = m.user_profiles || {};
            return {
              id: p.id || m.id,
              name: p.username || 'Comandante',
              role: m.role === 'LEADER' ? 'Comandante' : m.role === 'OFFICER' ? 'Oficial' : 'Piloto',
              level: p.level || 1,
              power: p.power_score || 0,
              status: 'online',
              avatar: p.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150"
            };
          });
          setMembers(mappedMembers);
        }
      } else {
        // Carga de contingencia de perfiles si el usuario no pertenece a un gremio
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('*')
          .limit(5);

        if (profiles) {
          setMembers(profiles.map((p: any, idx: number) => ({
            id: p.id,
            name: p.username || `Piloto_${idx + 1}`,
            role: idx === 0 ? "Comandante" : "Piloto",
            level: p.level || 1,
            power: p.power_score || 1000,
            status: "online",
            avatar: p.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150"
          })));
        }
      }

      // Cargar Chat de Alianza
      const { data: chatData } = await supabase
        .from('alliance_chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(30);

      if (chatData) {
        setLogs(chatData.map((c: any) => ({
          id: c.id,
          author: c.author_name || 'SYSTEM',
          message: c.message,
          type: (c.message_type as any) || 'chat',
          time: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
      }

    } catch (err) {
      console.error("Error al cargar datos de la alianza:", err);
    }
  };

  useEffect(() => {
    fetchAllianceData();
  }, []);

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

  // 🛡️ DONACIÓN TECNOLÓGICA SECURE (RPC)
  const handleDonateTech = async (e: React.MouseEvent) => {
    if (playerGems < 50) {
      triggerNotification("⚠️ CRISTALES INSUFICIENTES (REQUERIDO: 50💎)", e);
      playSfxTone("click");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 🛡️ LLAMADA ZERO-TRUST AL SERVIDOR
      const { data, error } = await supabase.rpc('donate_alliance_tech_secure', {
        p_user_id: user.id
      });

      if (error) throw error;

      // Actualizar estado React usando datos validados por el servidor
      setPlayerGems(data.new_crystals);
      setPlayerPower(data.new_power);

      setTechProgress(prev => {
        const next = prev + 15;
        if (next >= 100) {
          setAllianceTechLevel(l => l + 1);
          triggerNotification(`🚀 ¡NÚCLEO SUBIÓ DE NIVEL! BONO +5,000 POW APLICADO`, e);
          playSfxTone("success");
          return next - 100;
        }
        triggerNotification("🔋 APORTE TECNOLÓGICO REGISTRADO (+15% PROGRESO | +5,000 POW)", e);
        playSfxTone("success");
        return next;
      });

      fetchAllianceData();
    } catch (err: any) {
      console.error("Error durante donación:", err);
      triggerNotification(`⛔ ERROR EN DONACIÓN: ${err.message}`, e);
    }
  };

  // 🛡️ CHAT SECURE (RPC)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('send_alliance_chat_secure', {
        p_user_id: user.id,
        p_message: chatInput.trim()
      });

      if (error) throw error;

      setChatInput("");
      playSfxTone("msg");
      fetchAllianceData();
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    }
  };

  return (
    <div className="w-full flex flex-col items-center select-none py-1 relative">
      <div className="absolute top-0 right-0 z-20">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={onBack}
          className="text-[8.5px] font-mono tracking-widest border border-white/10 hover:border-[#E53E3E]/40 text-white/75 hover:text-[#E53E3E] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
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
        
        {/* COLUMNA IZQUIERDA: INFORMACIÓN Y MIEMBROS DE LA ALIANZA */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          <div className="bg-[#0b0c10]/80 border border-indigo-500/20 p-5 rounded-2xl backdrop-blur-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between shadow-[0_0_30px_rgba(99,102,241,0.05)]">
            <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none" />
            
            <div className="flex items-center gap-4 z-10 w-full sm:w-auto">
              <div className="w-16 h-16 rounded-xl bg-black border border-indigo-500/40 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Shield className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-widest text-white uppercase font-sans">
                  {allianceName}
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

            <div className="mt-4 sm:mt-0 flex flex-col items-center sm:items-end w-full sm:w-auto z-10">
              <span className="text-[8px] font-mono tracking-widest text-white/50 uppercase mb-1.5">
                PROGRESO TECNOLÓGICO (+15%)
              </span>
              <div className="w-full sm:w-40 h-2 bg-black/60 border border-white/10 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 to-cyan-400 transition-all duration-500" 
                  style={{ width: `${techProgress}%` }} 
                />
              </div>
              <button 
                onClick={handleDonateTech}
                className="flex items-center gap-1.5 bg-[#E53E3E]/10 hover:bg-[#E53E3E]/20 border border-[#E53E3E]/40 text-[#E53E3E] hover:text-white px-3 py-1.5 rounded transition-all text-[9px] font-mono font-bold tracking-widest cursor-pointer active:scale-95"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                DONAR (50💎)
              </button>
            </div>
          </div>

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
                    <div className="flex flex-col text-left">
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
                    <button className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/5 cursor-pointer">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: CHAT Y LOGS DE TERMINAL */}
        <div className="lg:col-span-4 flex flex-col bg-[#050608]/90 border border-[#E53E3E]/20 rounded-2xl backdrop-blur-md overflow-hidden min-h-[400px] shadow-[0_0_20px_rgba(229,62,62,0.05)] relative">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#E53E3E]/5 rounded-full blur-[40px] pointer-events-none" />

          <div className="px-4 py-3 border-b border-[#E53E3E]/20 bg-[#E53E3E]/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-[#E53E3E] animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest font-black text-white/80 uppercase">
                COM-LINK CIFRADO
              </span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none flex flex-col font-mono text-[9.5px]">
            {logs.length === 0 ? (
              <span className="text-zinc-600 italic text-[9px] text-center my-auto">Sin transmisiones recientes.</span>
            ) : (
              logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-2 rounded-lg border ${
                    log.type === 'system' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200' :
                    log.type === 'combat' ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' :
                    'bg-white/5 border-white/10 text-neutral-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1 opacity-60 text-[7.5px] uppercase tracking-wider">
                    <span className={`font-black ${log.author === 'SYSTEM' ? 'text-indigo-400' : 'text-cyan-400'}`}>
                      {log.author}
                    </span>
                    <span>{log.time}</span>
                  </div>
                  <div className="leading-relaxed">
                    {log.message}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-[#E53E3E]/20 bg-black/40 relative z-10">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <div className="relative flex-1">
                <MessageSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Transmitir mensaje..." 
                  className="w-full bg-[#121315] border border-white/10 rounded-lg py-2 pl-8 pr-3 text-[10px] font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#E53E3E]/50 transition-colors uppercase"
                />
              </div>
              <button 
                type="submit"
                disabled={!chatInput.trim()}
                className="bg-[#E53E3E] hover:bg-red-500 disabled:opacity-50 disabled:bg-neutral-800 text-white p-2 rounded-lg transition-colors border border-transparent disabled:border-white/10 cursor-pointer"
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