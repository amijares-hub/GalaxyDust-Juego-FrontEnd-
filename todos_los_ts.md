# GalaxyDust — Todos los archivos TypeScript (.ts / .tsx)

---

## src/App.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './components/AuthView';
import { Homepage } from './pages/Homepage';
import { RefreshCw } from 'lucide-react';

import { GamePreloader } from './components/GamePreloader';
import { useUpdater } from './hooks/useUpdater';

function AppContent() {
  const { user, logout, isInitializing } = useAuth();
  const [isPreloaderFinished, setIsPreloaderFinished] = useState(false);

  // 🔄 Verifica actualizaciones al arrancar (solo en Tauri Desktop)
  useUpdater();

  // 🚀 Forzar Giro y Pantalla Completa Automáticos (Zero Click)
  useEffect(() => {
    // Intento inmediato al inicializar
    if (window.screen?.orientation && 'lock' in window.screen.orientation) {
      (window.screen.orientation as any).lock('landscape').catch(() => {});
    }

    // Listener global pasivo en primer gesto del usuario
    const autoLockFullscreen = () => {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => {
          (window.screen?.orientation as any)?.lock?.('landscape').catch(() => {});
        }).catch(() => {});
      } else if (window.screen?.orientation && 'lock' in window.screen.orientation) {
        (window.screen.orientation as any).lock('landscape').catch(() => {});
      }
    };

    window.addEventListener('click', autoLockFullscreen, { once: true });
    window.addEventListener('touchstart', autoLockFullscreen, { once: true });

    return () => {
      window.removeEventListener('click', autoLockFullscreen);
      window.removeEventListener('touchstart', autoLockFullscreen);
    };
  }, []);

  if (isInitializing) {
    return (
      <div className="w-screen h-screen bg-[#0C0D0E] flex flex-col items-center justify-center text-cyan-500 font-mono space-y-4 select-none">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <div className="text-[10px] tracking-[0.3em] uppercase animate-pulse">
          Sincronizando Estado C.A.N...
        </div>
      </div>
    );
  }

  if (user) {
    // Si el usuario se ha autenticado pero la precarga multimedia no ha terminado
    if (!isPreloaderFinished) {
      return <GamePreloader onComplete={() => setIsPreloaderFinished(true)} />;
    }

    return <Homepage user={user as any} onLogout={logout} />;
  }

  return <AuthView />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
```

---

## src/components/AllianceView.tsx

```tsx
import React, { useState, useEffect } from "react";
import { 
  RotateCcw, 
  Users, 
  ShieldAlert, 
  Wifi, 
  ChevronRight,
  UserCheck,
  Send,
  MessageSquare,
  Shield,
  Activity,
  ArrowUpCircle
} from "lucide-react";
import { Button } from "./ui/joly-button";
import { supabase } from "../lib/supabase";
import { useAudioEngine } from "../hooks/useAudioEngine";
import { GalaxyFrame } from "./CanView";

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
  const { playSfx } = useAudioEngine();

  const [allianceTechLevel, setAllianceTechLevel] = useState(4);
  const [techProgress, setTechProgress] = useState(45);
  const [chatInput, setChatInput] = useState("");
  const [, setCurrentUserId] = useState<string>("");
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

      const targetAllianceId = memberRecord?.alliance_id;

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

  // 🛡️ DONACIÓN TECNOLÓGICA SECURE (RPC CON VALIDACIÓN SERVIDOR)
  const handleDonateTech = async (e: React.MouseEvent) => {
    if (playerGems < 50) {
      triggerNotification("⚠️ CRISTALES INSUFICIENTES (REQUERIDO: 50💎)", e);
      playSfx(300);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 🛡️ TRANSACCIÓN SERVIDOR ZERO-TRUST
      const { data, error } = await supabase.rpc('donate_alliance_tech_secure', {
        p_user_id: user.id
      });

      if (error) throw error;

      if (data && typeof data.new_crystals === 'number') {
        setPlayerGems(data.new_crystals);
      }
      if (data && typeof data.new_power === 'number') {
        setPlayerPower(data.new_power);
      }

      setTechProgress(prev => {
        const next = prev + 15;
        if (next >= 100) {
          setAllianceTechLevel(l => l + 1);
          triggerNotification(`🚀 ¡NÚCLEO SUBIÓ DE NIVEL! BONO +5,000 POW APLICADO`, e);
          playSfx(1200);
          return next - 100;
        }
        triggerNotification("🔋 APORTE TECNOLÓGICO REGISTRADO (+15% PROGRESO | +5,000 POW)", e);
        playSfx(880);
        return next;
      });

      fetchAllianceData();
    } catch (err: any) {
      console.error("Error durante donación:", err);
      playSfx(300);
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
      playSfx(660);
      fetchAllianceData();
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      playSfx(300);
    }
  };

  return (
    <GalaxyFrame className="w-full max-w-6xl mx-auto my-2 text-white font-mono select-none" innerPadding="p-5 sm:p-7">
      <div className="w-full flex flex-col items-center relative">
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

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 mt-2">
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="bg-[#0b0c10]/80 border border-indigo-500/20 p-5 rounded-2xl backdrop-blur-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between shadow-[0_0_30px_rgba(99,102,241,0.05)]">
              <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none" />
              
              <div className="flex items-center gap-4 z-10 w-full sm:w-auto">
                <div className="w-16 h-16 rounded-xl bg-black border border-indigo-500/40 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <Shield className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="text-left">
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
              <h4 className="text-[10px] font-mono tracking-[0.2em] text-white/50 uppercase border-b border-white/5 pb-2 mb-3 flex items-center gap-2 text-left">
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
                    className={`p-2 rounded-lg border text-left ${
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
    </GalaxyFrame>
  );
};
```

---

## src/components/AuthView.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle, RefreshCw, ShieldCheck, KeyRound, Calendar, CheckSquare, Square, MailCheck, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { GalaxyFrame } from './CanView';

export const AuthView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'es').startsWith('en') ? 'en' : 'es';

  const {
    screen,
    state,
    errorMessage,
    successMessage,
    setScreen,
    submitLogin,
    submitRegister,
    verifyTwoFA
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Campos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Estado del Pop-Up de Verificación de Correo
  const [isRegisteredSuccess, setIsRegisteredSuccess] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Captcha anti-bots
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [userCaptchaInput, setUserCaptchaInput] = useState('');

  const loading = state === 'authenticating' || state === 'registering' || state === 'verifying_2fa';

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    setUserCaptchaInput('');
  };

  useEffect(() => {
    generateCaptcha();
  }, [activeTab]);

  // Temporizador regresivo de 10 segundos tras registro exitoso
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRegisteredSuccess && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isRegisteredSuccess && countdown === 0) {
      handleReturnToLogin();
    }
    return () => clearInterval(timer);
  }, [isRegisteredSuccess, countdown]);

  // Expiración de "Recuérdame" (7 días)
  useEffect(() => {
    const checkRememberMeExpiration = async () => {
      const isRemembered = localStorage.getItem('gd_remember_me') === 'true';
      const expireTime = localStorage.getItem('gd_remember_expire');

      if (isRemembered && expireTime) {
        if (Date.now() > Number(expireTime)) {
          localStorage.removeItem('gd_remember_me');
          localStorage.removeItem('gd_remember_expire');
          await supabase.auth.signOut();
          setLocalError('Tu sesión de 7 días ha expirado. Inicia sesión de nuevo.');
        }
      } else {
        const sessionActive = sessionStorage.getItem('gd_active_session');
        if (!sessionActive) {
          await supabase.auth.signOut();
        }
      }
    };

    checkRememberMeExpiration();
  }, []);

  const handleReturnToLogin = () => {
    setIsRegisteredSuccess(false);
    setActiveTab('login');
    setScreen('login');
    setPassword('');
    setConfirmPassword('');
    setUserCaptchaInput('');
  };

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setScreen(tab);
    setLocalError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setLocalError("Todos los campos son obligatorios.");
      return;
    }

    if (activeTab === 'login') {
      if (rememberMe) {
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        localStorage.setItem('gd_remember_me', 'true');
        localStorage.setItem('gd_remember_expire', (Date.now() + sevenDaysMs).toString());
      } else {
        localStorage.removeItem('gd_remember_me');
        localStorage.removeItem('gd_remember_expire');
        sessionStorage.setItem('gd_active_session', 'true');
      }

      await submitLogin(cleanEmail, cleanPassword, rememberMe);
    } else {
      if (!confirmPassword || !birthDate) {
        setLocalError("Por favor completa la fecha de cumpleaños y la confirmación de clave.");
        return;
      }

      if (cleanPassword !== confirmPassword) {
        setLocalError("Las claves de seguridad no coinciden.");
        return;
      }

      if (cleanPassword.length < 6) {
        setLocalError("La clave de seguridad requiere un mínimo de 6 caracteres.");
        return;
      }

      if (parseInt(userCaptchaInput, 10) !== captchaNum1 + captchaNum2) {
        setLocalError("Resultado de Captcha incorrecto.");
        generateCaptcha();
        return;
      }

      try {
        await submitRegister(cleanEmail, cleanPassword, {
          birth_date: birthDate,
          name: cleanEmail.split('@')[0]
        } as any);

        if (!errorMessage) {
          setIsRegisteredSuccess(true);
          setCountdown(10);
        }
      } catch (err: any) {
        setLocalError(err.message || "Error al completar el registro.");
      }
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (otpCode.length !== 6) {
      setLocalError("El token de seguridad debe constar de 6 dígitos.");
      return;
    }
    await verifyTwoFA(otpCode);
  };

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-[#0C0D0E] flex flex-col justify-start sm:justify-center items-center font-sans select-none text-white">

      {/* ─── FONDO ESPACIAL ─── */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none z-0 transition-opacity duration-700"
        style={{
          backgroundImage: `url('https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20(Ambientes%20)/23.jpg')`,
        }}
      />

      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none z-0">
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#1C1E22] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-[#111214] rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-md max-h-[calc(100dvh-0.5rem)] overflow-y-auto flex flex-col justify-center my-auto px-2 sm:px-4 py-2 sm:py-0">

        {/* ─── LOGO Y TÍTULO ─── */}
        <div className="flex flex-col items-center mb-1 sm:mb-3">
          <img
            src="https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Logo/1.png"
            alt="GalaxyDust Logo"
            className="h-6 sm:h-10 w-auto mb-0.5 sm:mb-1 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]"
          />
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-base font-black uppercase tracking-[0.3em] text-white">GALAXYDUST</h1>
            <div className="flex items-center border border-cyan-500/40 bg-black/70 rounded px-1 py-0.5 text-[7px] sm:text-[8px] font-mono font-bold tracking-wider">
              <button
                type="button"
                onClick={() => {
                  i18n.changeLanguage('es');
                  try { localStorage.setItem('gd_preferred_language', 'es'); } catch {}
                }}
                className={`px-1 py-0.2 rounded transition-all cursor-pointer ${
                  currentLang === 'es'
                    ? 'bg-cyan-500/30 text-cyan-300 font-black shadow-[0_0_6px_rgba(34,211,238,0.5)]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                ES
              </button>
              <span className="text-cyan-500/40 px-0.5 select-none">|</span>
              <button
                type="button"
                onClick={() => {
                  i18n.changeLanguage('en');
                  try { localStorage.setItem('gd_preferred_language', 'en'); } catch {}
                }}
                className={`px-1 py-0.2 rounded transition-all cursor-pointer ${
                  currentLang === 'en'
                    ? 'bg-cyan-500/30 text-cyan-300 font-black shadow-[0_0_6px_rgba(34,211,238,0.5)]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        <GalaxyFrame className="w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(86dvh-3.5rem)]" innerPadding="p-2.5 sm:p-4">
          <div className="overflow-y-auto pr-0.5">
          <AnimatePresence mode="wait">

            {/* ─── FASE 0: POP-UP DE VERIFICACIÓN DE CORREO ─── */}
            {isRegisteredSuccess ? (
              <motion.div
                key="register-success-popup"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center text-center gap-3 py-1"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                  <MailCheck className="w-6 h-6 text-cyan-400 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xs font-black tracking-[0.2em] uppercase text-white">
                    ¡CONFIRMA TU CORREO!
                  </h2>
                  <p className="text-[9px] text-zinc-400 font-mono leading-relaxed px-1">
                    Transmisión enviada a <strong className="text-cyan-300 font-bold">{email}</strong>. Revisa tu bandeja de entrada o SPAM para activar tu comandante.
                  </p>
                </div>

                <div className="w-full bg-[#1A1C20] border border-white/5 rounded-xl p-2 flex justify-between items-center text-[9px] font-mono">
                  <span className="text-zinc-400 uppercase">Redirigiendo en:</span>
                  <span className="text-cyan-400 font-black text-xs">{countdown}s</span>
                </div>

                <button
                  type="button"
                  onClick={handleReturnToLogin}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-[0.2em] text-[9.5px] rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>IR AL INICIO DE SESIÓN</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (screen === 'menu' || screen === 'login' || screen === 'register') && (
              /* ─── FASE 1: FORMULARIO DE ACCESO Y REGISTRO ─── */
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2 }}
              >
                {/* Selector de Pestañas */}
                <div className="flex w-full mb-3 sm:mb-4 relative">
                  <div className="flex-1 text-center">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleTabChange('login')}
                      className={`w-full pb-1.5 text-[9.5px] sm:text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${activeTab === 'login' ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'}`}
                    >
                      {t('auth.login_tab')}
                    </button>
                  </div>
                  <div className="flex-1 text-center">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleTabChange('register')}
                      className={`w-full pb-1.5 text-[9.5px] sm:text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${activeTab === 'register' ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'}`}
                    >
                      {t('auth.register_tab')}
                    </button>
                  </div>
                  <motion.div
                    className="absolute bottom-0 h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                    animate={{ left: activeTab === 'login' ? '0%' : '50%', width: '50%' }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                  <div className="absolute bottom-0 w-full h-[1px] bg-white/10 -z-10" />
                </div>

                <form onSubmit={handleFormSubmit} className="flex flex-col gap-2.5 text-left">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[8.5px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">{t('auth.email_label')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Mail className="w-3.5 h-3.5" /></span>
                      <input
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        disabled={loading}
                        className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50"
                        placeholder={t('auth.email_placeholder')}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <label className="text-[8.5px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">{t('auth.password_label')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Lock className="w-3.5 h-3.5" /></span>
                      <input
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        disabled={loading}
                        className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {/* CAMPOS ADICIONALES PARA REGISTRO */}
                  {activeTab === 'register' && (
                    <>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[8.5px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">Confirmar Clave</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Lock className="w-3.5 h-3.5" /></span>
                          <input
                            type="password" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            disabled={loading}
                            className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <label className="text-[8.5px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">Fecha de Cumpleaños</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Calendar className="w-3.5 h-3.5" /></span>
                          <input
                            type="date" 
                            value={birthDate} 
                            onChange={(e) => setBirthDate(e.target.value)} 
                            disabled={loading}
                            className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500/50 focus:bg-[#1C1E22] transition-all disabled:opacity-50 [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {/* CAPTCHA ANTI-BOT */}
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-[8.5px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium">Captcha Anti-Bot</label>
                          <button
                            type="button"
                            onClick={generateCaptcha}
                            className="text-[7.5px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> REGENERAR
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-[#1A1C20] border border-white/10 px-2.5 py-1.5 rounded-xl text-cyan-400 font-mono font-black text-xs shrink-0 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-cyan-400" />
                            <span>{captchaNum1} + {captchaNum2} = ?</span>
                          </div>
                          <input
                            type="number"
                            value={userCaptchaInput}
                            onChange={(e) => setUserCaptchaInput(e.target.value)}
                            disabled={loading}
                            placeholder="RESPUESTA"
                            className="w-full bg-[#1A1C20] border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* OPCIÓN RECUÉRDAME (SOLO EN LOGIN) */}
                  {activeTab === 'login' && (
                    <div className="flex items-center justify-between pt-0.5">
                      <button
                        type="button"
                        onClick={() => setRememberMe(!rememberMe)}
                        className="flex items-center gap-1.5 text-[9px] text-white/50 hover:text-cyan-300 transition-colors cursor-pointer"
                      >
                        {rememberMe ? (
                          <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-white/20" />
                        )}
                        <span>{t('auth.remember_me')}</span>
                      </button>
                    </div>
                  )}

                  {(localError || errorMessage) && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-2 rounded-lg mt-0.5">
                      <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                      <span className="text-[9px] font-mono text-red-400 uppercase leading-tight tracking-wider">{localError || errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      <span className="text-[9px] font-mono text-emerald-400 uppercase leading-tight tracking-wider">{successMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit" 
                    disabled={loading}
                    className="mt-1 w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-[0.15em] text-xs rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : (activeTab === 'login' ? t('auth.submit_login') : t('auth.submit_register'))}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ─── FASE 2: VERIFICACIÓN MULTI-FACTOR (MFA) ─── */}
            {screen === 'two_factor' && (
              <motion.div
                key="mfa-form"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4 text-center"
              >
                <div className="flex flex-col items-center gap-2 mb-2">
                  <KeyRound className="w-8 h-8 text-cyan-400 animate-pulse" />
                  <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-white">REQUISITO MULTI-FACTOR</h3>
                  <p className="text-[10px] text-neutral-400 font-mono leading-relaxed px-2">INGRESE EL CÓDIGO OTP REQUERIDO POR EL KERNEL DE SEGURIDAD PARA VALIDAR LA SESIÓN.</p>
                </div>

                <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
                  <input
                    type="text" 
                    maxLength={6} 
                    value={otpCode} 
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                    disabled={loading}
                    className="w-full bg-[#1A1C20] border border-white/10 rounded-xl py-3.5 text-center text-xl font-mono font-black tracking-[0.5em] text-cyan-400 focus:border-cyan-500 outline-none transition-all disabled:opacity-50"
                    placeholder="000000"
                  />

                  {(localError || errorMessage) && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">{localError || errorMessage}</span>
                    </div>
                  )}

                  <div className="flex gap-2.5 mt-2">
                    <button
                      type="button" 
                      onClick={() => setScreen('login')}
                      className="flex-1 py-3 border border-white/10 text-neutral-400 hover:text-white text-[9px] font-mono font-bold tracking-widest uppercase rounded-xl transition-all cursor-pointer"
                    >
                      ABORTAR
                    </button>
                    <button
                      type="submit" 
                      disabled={loading}
                      className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-[9px] font-bold tracking-widest uppercase rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="w-3 h-3 animate-spin mx-auto" /> : "VERIFICAR"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
          </div>
        </GalaxyFrame>

      </div>
    </div>
  );
};
```

---

## src/components/CanAssetsModal.tsx

```tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GalaxyFrame } from './CanView';

export interface CanAssetItem {
  id: string;
  seed_id: string;
  name: string;
  type: 'Estructuras' | 'Tecnologias' | 'Insignias';
  description?: string;
  effect_bonus?: number;
  image_url?: string;
  is_equipped: boolean;
  level?: number;
}

interface CanAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'Estructuras' | 'Tecnologias' | 'Insignias' | null;
  assets: CanAssetItem[];
  userId: string;
  onRefresh: () => void;
  triggerNotification?: (msg: string) => void;
}

export const CanAssetsModal: React.FC<CanAssetsModalProps> = ({
  isOpen,
  onClose,
  category,
  assets,
  userId,
  onRefresh,
  triggerNotification
}) => {
  const { t } = useTranslation();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!isOpen || !category) return null;

  const targetTableMap = {
    Estructuras: ['user_structures'],
    Tecnologias: ['user_technologies'],
    Insignias: ['user_badges_unlocked', 'user_badges']
  };

  const handleToggleEquip = async (asset: CanAssetItem) => {
    setLoadingId(asset.id);
    const nextState = !asset.is_equipped;
    const tablesToUpdate = targetTableMap[asset.type] || [];

    try {
      let updateExecuted = false;

      for (const tableName of tablesToUpdate) {
        const { error } = await supabase
          .from(tableName)
          .update({ is_equipped: nextState, is_active: nextState })
          .eq('id', asset.id)
          .eq('user_id', userId);

        if (!error) {
          updateExecuted = true;
        }
      }

      if (!updateExecuted) {
        const targetTable = tablesToUpdate[0];
        await supabase.rpc('toggle_can_asset_equip_secure', {
          p_user_id: userId,
          p_table_name: targetTable,
          p_asset_id: String(asset.id),
          p_equip_status: nextState
        });
      }

      if (triggerNotification) {
        triggerNotification(
          nextState
            ? `✅ ${asset.name.toUpperCase()} ACTIVADO / EQUIPADO`
            : `⏸️ ${asset.name.toUpperCase()} DESACTIVADO`
        );
      }
      await onRefresh();
    } catch (err: any) {
      console.error('Error al cambiar equipamiento:', err);
      if (triggerNotification) triggerNotification(`⛔ ERROR: ${err.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const filteredAssets = assets
    .filter((a) => a.type === category)
    .sort((a, b) => (a.is_equipped === b.is_equipped ? 0 : a.is_equipped ? -1 : 1));

  const activeCount = filteredAssets.filter((a) => a.is_equipped).length;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[150] flex items-center justify-center p-2 sm:p-4 font-mono select-none text-white overflow-hidden">
      <GalaxyFrame className="w-full max-w-xl sm:max-w-2xl lg:max-w-3xl my-auto max-h-[88dvh] flex flex-col overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.25)]" innerPadding="p-0">
        
        {/* CABECERA */}
        <div className="bg-[#05070a] border-b border-cyan-950 p-3 sm:p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-pulse shrink-0" />
            <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest truncate">
              {t('can.assets_modal.manage_title', { category: category.toUpperCase(), active: activeCount, total: filteredAssets.length })}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-cyan-950/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* LISTADO DE ACTIVOS */}
        <div className="p-2 sm:p-4 flex-1 min-h-0 overflow-x-hidden overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 custom-scrollbar">
          {filteredAssets.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-500 text-xs uppercase tracking-widest">
              {t('can.assets_modal.empty', { category: category.toUpperCase() })}
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const isLoading = loadingId === asset.id;
              return (
                <div
                  key={asset.id}
                  className={`p-2.5 sm:p-3 rounded-xl border flex justify-between items-center gap-2 sm:gap-3 transition-all ${
                    asset.is_equipped
                      ? 'bg-emerald-950/30 border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'bg-[#040609] border-cyan-950/80 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-black border border-cyan-950 overflow-hidden shrink-0 flex items-center justify-center relative">
                      <img
                        src={asset.image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=150'}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                      {asset.is_equipped && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col text-left overflow-hidden">
                      <span className="text-[9px] sm:text-[10px] font-black text-white uppercase truncate">
                        {asset.name} {asset.level ? `(${t('can.assets_modal.level')} ${asset.level})` : ''}
                      </span>
                      <span className="text-[7.5px] sm:text-[8px] text-cyan-400 font-mono">
                        {t('can.assets_modal.effect')}: +{asset.effect_bonus || 0}%
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleEquip(asset)}
                    disabled={isLoading}
                    className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border shrink-0 ${
                      asset.is_equipped
                        ? 'bg-red-950/80 text-red-300 border-red-800 hover:bg-red-900'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                    }`}
                  >
                    {isLoading ? '...' : asset.is_equipped ? t('can.assets_modal.unequip') : t('can.assets_modal.equip')}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* PIE DEL MODAL */}
        <div className="bg-[#05070a] border-t border-cyan-950 p-2.5 sm:p-3 flex justify-between items-center text-[7.5px] sm:text-[8.5px] text-zinc-400 shrink-0">
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{t('can.assets_modal.instant_notice')}</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 sm:px-4 sm:py-1.5 bg-cyan-950 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-bold uppercase rounded-lg cursor-pointer shrink-0 ml-2"
          >
            {t('can.assets_modal.close')}
          </button>
        </div>

      </GalaxyFrame>
    </div>
  );
};

export default CanAssetsModal;
```

---

## src/components/CanView.tsx

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart2, Globe, AlertTriangle, RefreshCw, X, Sparkles, ChevronRight, ChevronLeft, Shield, Info, BatteryCharging
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { CanAssetsModal, CanAssetItem } from './CanAssetsModal';
import { miningService, CANProductionReport } from '../services/miningService';
import {
  SciFiCraftingIcon, SciFiSpeedIcon, SciFiWeaponIcon, SciFiNodeIcon, SciFiAtomIcon, SciFiLaserIcon, SciFiTimerIcon
} from './SciFiIcons';

interface CanViewProps {
  triggerNotification?: (text: string, e?: any) => void;
}

interface ActiveSkillItem {
  id: string;
  source: 'CAN' | 'STRUCTURE' | 'TECH' | 'BADGE';
  assetName: string;
  assetImageUrl?: string;
  level?: number;
  rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  effectTitle: string;
  effectDescription: string;
}

interface DiscoveredStar {
  id: string;
  star_id: string;
  star_name: string;
  cluster: string;
  discovery_order: number;
  reward_details?: {
    gd_coin?: number;
    dark_matter?: number;
    title?: string;
  };
  discovered_at: string;
}

export const GalaxyFrame: React.FC<{ children: React.ReactNode; className?: string; innerPadding?: string }> = ({
  children,
  className = "",
  innerPadding = "p-3 sm:p-4"
}) => {
  return (
    <div className={`relative hud-panel hud-corners hud-chamfer-sm transition-all duration-300 ${className}`}>
      <div className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none z-10" />
      <div className={`relative z-20 h-full w-full ${innerPadding}`}>
        {children}
      </div>
    </div>
  );
};

const SKILLS_PER_PAGE = 5;

export const CanView: React.FC<CanViewProps> = ({ triggerNotification }) => {
  const { t } = useTranslation();
  const { playSfx } = useAudioEngine();

  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [canLevel, setCanLevel] = useState<number>(1);
  const [galacticPower, setGalacticPower] = useState<number>(0);
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);
  const [, setLoading] = useState<boolean>(true);

  // Modales
  const [activeModalCategory, setActiveModalCategory] = useState<'Estructuras' | 'Tecnologias' | 'Insignias' | null>(null);
  const [showAmiModal, setShowAmiModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showSkillsModal, setShowSkillsModal] = useState<boolean>(false);
  const [skillsModalFilter, setSkillsModalFilter] = useState<'ALL' | 'CAN' | 'STRUCTURE' | 'TECH' | 'BADGE'>('ALL');
  const [skillsPage, setSkillsPage] = useState<number>(1);

  const [hoveredAsset, setHoveredAsset] = useState<CanAssetItem | null>(null);
  const [activeFlightsCount, setActiveFlightsCount] = useState<number>(0);
  const [canAssetsList, setCanAssetsList] = useState<CanAssetItem[]>([]);
  const [totalDiscoveredStars, setTotalDiscoveredStars] = useState<number>(0);
  const [activeSkills, setActiveSkills] = useState<ActiveSkillItem[]>([]);
  const [discoveredStars, setDiscoveredStars] = useState<DiscoveredStar[]>([]);

  const [canMetrics, setCanMetrics] = useState<CANProductionReport>({
    energyProduced: 0,
    energyRequired: 0,
    energyEfficiency: 1.0,
    hourlyProduction: { metal: 0, crystal: 0, deuterium: 0, dark_matter: 0 },
    storageLimits: { metal: 10000, crystal: 5000, deuterium: 2500, dark_matter: 100 }
  });

  const getSkillIcon = (source: string, desc: string = '') => {
    const lower = desc.toLowerCase();
    if (lower.includes('escudo') || lower.includes('defensa') || lower.includes('shield')) {
      return <Shield className="w-3.5 h-3.5 text-cyan-300 filter drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] shrink-0" />;
    }
    if (lower.includes('ataque') || lower.includes('arma') || lower.includes('daño')) {
      return <SciFiWeaponIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (lower.includes('velocidad') || lower.includes('flota') || lower.includes('tránsito')) {
      return <SciFiSpeedIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
    if (lower.includes('extracción') || lower.includes('minado') || lower.includes('metal') || lower.includes('cristal')) {
      return <SciFiCraftingIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
    }
    if (lower.includes('láser') || lower.includes('energía')) {
      return <SciFiLaserIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    }
    if (lower.includes('tiempo')) {
      return <SciFiTimerIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
    }

    switch (source) {
      case 'CAN': return <SciFiNodeIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case 'STRUCTURE': return <SciFiCraftingIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'TECH': return <SciFiAtomIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'BADGE': return <SciFiLaserIcon className="w-3.5 h-3.5 text-cyan-300 shrink-0" />;
      default: return <SciFiNodeIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    }
  };

  const parseSkillsFromSeed = (seed: any, defaultType: string, defaultBonus: number): string[] => {
    if (!seed) return [`Efecto pasivo de ${defaultType} (+${defaultBonus}%)`];

    if (seed.skills) {
      if (Array.isArray(seed.skills) && seed.skills.length > 0) return seed.skills.map(String);
      if (typeof seed.skills === 'object' && seed.skills !== null) {
        const entries = Object.entries(seed.skills);
        if (entries.length > 0) return entries.map(([k, v]) => `${k.toUpperCase().replace(/_/g, ' ')}: +${v}`);
      }
      if (typeof seed.skills === 'string' && seed.skills.trim() !== '') {
        try {
          const parsed = JSON.parse(seed.skills);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(String);
          if (typeof parsed === 'object' && parsed !== null) {
            return Object.entries(parsed).map(([k, v]) => `${k.toUpperCase().replace(/_/g, ' ')}: +${v}`);
          }
        } catch {
          return [seed.skills];
        }
      }
    }

    const bonus = seed.power_score_base || seed.mining_bonus || seed.effect || defaultBonus;
    const desc = seed.description || `Efecto táctico activo en red`;
    return [`${desc} (+${bonus}%)`];
  };

  const fetchCanData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);
      const calculatedMetrics = await miningService.calculateUserCANMetrics(user.id);
      setCanMetrics(calculatedMetrics);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const lvl = profile?.level || profile?.can_level || 1;
      setCanLevel(lvl);

      const { count: flights } = await supabase
        .from('active_expeditions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'LAUNCHED');

      setActiveFlightsCount(flights || 0);

      const unifiedAssets: CanAssetItem[] = [];

      const { data: strFallback } = await supabase.from('user_structures').select('*').eq('user_id', user.id);
      const { data: seedStr } = await supabase.from('seed_structures').select('*');
      const seedMap = new Map((seedStr || []).map((s: any) => [String(s.id), s]));
      const rawStructures = (strFallback || []).map((row: any) => ({
        ...row,
        seed_structures: seedMap.get(String(row.structure_id || row.building_id))
      }));

      rawStructures.forEach((s: any) => {
        const seed = s.seed_structures;
        unifiedAssets.push({
          id: String(s.id),
          seed_id: String(s.structure_id || seed?.id || s.id),
          name: seed?.structure_name || seed?.name || `Estructura #${s.id}`,
          type: 'Estructuras',
          description: seed?.description || '',
          effect_bonus: seed?.power_score_base || 10,
          image_url: seed?.image_url,
          is_equipped: s.is_equipped === true,
          level: s.current_level || 1
        });
      });

      const { data: techFallback } = await supabase.from('user_technologies').select('*').eq('user_id', user.id);
      const { data: seedTech } = await supabase.from('seed_technologies').select('*');
      const seedTechMap = new Map((seedTech || []).map((s: any) => [String(s.id), s]));
      const rawTech = (techFallback || []).map((row: any) => ({
        ...row,
        seed_technologies: seedTechMap.get(String(row.technology_id))
      }));

      rawTech.forEach((t: any) => {
        const seed = t.seed_technologies;
        unifiedAssets.push({
          id: String(t.id),
          seed_id: String(t.technology_id || seed?.id || t.id),
          name: seed?.technology_name || seed?.name || `Tecnología #${t.id}`,
          type: 'Tecnologias',
          description: seed?.description || '',
          effect_bonus: seed?.power_score_base || 15,
          image_url: seed?.image_url,
          is_equipped: t.is_equipped === true
        });
      });

      let rawBadges: any[] = [];
      const { data: bUnlockedData, error: bUnlockedErr } = await supabase
        .from('user_badges_unlocked')
        .select('*, seed_badges(*)')
        .eq('user_id', user.id);

      if (!bUnlockedErr && bUnlockedData && bUnlockedData.length > 0) {
        rawBadges = bUnlockedData;
      } else {
        const { data: bData, error: bErr } = await supabase
          .from('user_badges')
          .select('*, seed_badges(*)')
          .eq('user_id', user.id);

        if (!bErr && bData && bData.length > 0) {
          rawBadges = bData;
        } else {
          const { data: bFallback } = await supabase.from('user_badges_unlocked').select('*').eq('user_id', user.id);
          const { data: seedB } = await supabase.from('seed_badges').select('*');
          const seedMap = new Map((seedB || []).map((s: any) => [String(s.id), s]));
          rawBadges = (bFallback || []).map((row: any) => ({
            ...row,
            seed_badges: seedMap.get(String(row.badge_id))
          }));
        }
      }

      rawBadges.forEach((b: any) => {
        const seed = b.seed_badges;
        unifiedAssets.push({
          id: String(b.id),
          seed_id: String(b.badge_id || seed?.id || b.id),
          name: seed?.name || `Insignia #${b.badge_id}`,
          type: 'Insignias',
          description: seed?.description || '',
          effect_bonus: seed?.mining_bonus || 20,
          image_url: seed?.image_url,
          is_equipped: b.is_equipped === true
        });
      });

      setCanAssetsList(unifiedAssets);

      let calculatedPower = lvl * 1000;
      unifiedAssets.filter(a => a.is_equipped).forEach(a => {
        calculatedPower += Number(a.effect_bonus || 150) * 10;
      });
      if (profile?.power_score && profile.power_score > calculatedPower) {
        calculatedPower = profile.power_score;
      }
      setGalacticPower(calculatedPower);

      const { count: starsCount } = await supabase
        .from('user_discovered_stars')
        .select('star_id', { count: 'exact', head: true })
        .eq('discoverer_id', user.id);

      setTotalDiscoveredStars(starsCount || 0);

      const { data: starsData } = await supabase
        .from('user_discovered_stars')
        .select('*')
        .eq('discoverer_id', user.id)
        .order('created_at', { ascending: false });

      if (starsData && starsData.length > 0) {
        setDiscoveredStars(starsData.map((s: any) => ({
          id: s.id,
          star_id: s.star_id || s.id,
          star_name: s.star_name || 'SISTEMA SOLAR',
          cluster: s.cluster || 'INARA',
          discovery_order: Number(s.discovery_order || 1),
          reward_details: s.reward_details || {},
          discovered_at: new Date(s.created_at || Date.now()).toLocaleDateString()
        })));
      } else {
        setDiscoveredStars([]);
      }

      const skillsToParse: ActiveSkillItem[] = [
        { id: 'sk-can-1', source: 'CAN', assetName: 'C.A.N. MATRIX LEVEL', effectTitle: 'Producción Global', effectDescription: `+${lvl * 5}% Producción Diaria de Recursos` },
        { id: 'sk-can-2', source: 'CAN', assetName: 'C.A.N. MATRIX LEVEL', effectTitle: 'Slots Tácticos Adicionales', effectDescription: `+${lvl * 2} Espacios de Almacenamiento Táctico` }
      ];

      rawStructures.filter((s: any) => s.is_equipped === true).forEach((item: any) => {
        const seed = item.seed_structures || {};
        const parsed = parseSkillsFromSeed(seed, 'Estructura', 10);
        parsed.forEach((skText, idx) => {
          skillsToParse.push({
            id: `sk-str-${item.id}-${idx}`,
            source: 'STRUCTURE',
            assetName: seed.structure_name || seed.name || `Estructura #${item.id}`,
            assetImageUrl: seed.image_url,
            rarity: 'EPIC',
            level: item.current_level || 1,
            effectTitle: seed.structure_name || 'Estructura Activa',
            effectDescription: skText
          });
        });
      });

      rawTech.filter((t: any) => t.is_equipped === true).forEach((item: any) => {
        const seed = item.seed_technologies || {};
        const parsed = parseSkillsFromSeed(seed, 'Tecnología', 15);
        parsed.forEach((skText, idx) => {
          skillsToParse.push({
            id: `sk-tech-${item.id}-${idx}`,
            source: 'TECH',
            assetName: seed.technology_name || seed.name || `Tecnología #${item.id}`,
            assetImageUrl: seed.image_url,
            rarity: seed.rarity || 'RARE',
            effectTitle: seed.technology_name || 'Tecnología Activa',
            effectDescription: skText
          });
        });
      });

      rawBadges.filter((b: any) => b.is_equipped === true).forEach((item: any) => {
        const seed = item.seed_badges || {};
        const parsed = parseSkillsFromSeed(seed, 'Insignia', 20);
        parsed.forEach((skText, idx) => {
          skillsToParse.push({
            id: `sk-bdg-${item.id}-${idx}`,
            source: 'BADGE',
            assetName: seed.name || `Insignia #${item.badge_id || item.id}`,
            assetImageUrl: seed.image_url,
            rarity: 'LEGENDARY',
            effectTitle: seed.name || 'Insignia Activa',
            effectDescription: skText
          });
        });
      });

      setActiveSkills(skillsToParse);

    } catch (err) {
      console.error("Error al cargar C.A.N.:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanData();
  }, []);

  const handleUpgradeCan = async () => {
    if (isUpgrading) return;
    setIsUpgrading(true);
    playSfx(880);

    try {
      const { data, error } = await supabase.rpc('upgrade_can_node_secure');
      if (error) throw error;

      playSfx(1200);
      setCanLevel(data.new_level);
      setGalacticPower(data.new_power);

      if (triggerNotification) {
        triggerNotification(`⚡ NODO C.A.N. ELEVADO A NIVEL ${data.new_level} CON ÉXITO`);
      }
      fetchCanData();
    } catch (err: any) {
      console.error("Error al subir nivel C.A.N.:", err);
      playSfx(300);
      if (triggerNotification) triggerNotification(`⛔ ERROR AL ELEVAR NODO: ${err.message}`);
    } finally {
      setIsUpgrading(false);
    }
  };

  const equippedStructures = useMemo(() => canAssetsList.filter(a => a.type === 'Estructuras' && a.is_equipped), [canAssetsList]);
  const equippedTech = useMemo(() => canAssetsList.filter(a => a.type === 'Tecnologias' && a.is_equipped), [canAssetsList]);
  const equippedBadges = useMemo(() => canAssetsList.filter(a => a.type === 'Insignias' && a.is_equipped), [canAssetsList]);

  const filteredSkillsForModal = useMemo(() => {
    if (skillsModalFilter === 'ALL') return activeSkills;
    return activeSkills.filter(s => s.source === skillsModalFilter);
  }, [activeSkills, skillsModalFilter]);

  const totalSkillsPages = useMemo(() => {
    return Math.ceil(filteredSkillsForModal.length / SKILLS_PER_PAGE) || 1;
  }, [filteredSkillsForModal]);

  const currentSkillsPage = useMemo(() => {
    return Math.min(Math.max(1, skillsPage), totalSkillsPages);
  }, [skillsPage, totalSkillsPages]);

  const paginatedSkillsForModal = useMemo(() => {
    const start = (currentSkillsPage - 1) * SKILLS_PER_PAGE;
    return filteredSkillsForModal.slice(start, start + SKILLS_PER_PAGE);
  }, [filteredSkillsForModal, currentSkillsPage]);

  const handleFilterChange = (tabId: 'ALL' | 'CAN' | 'STRUCTURE' | 'TECH' | 'BADGE') => {
    playSfx(660);
    setSkillsModalFilter(tabId);
    setSkillsPage(1);
  };

  // RENDERIZADOR DE GALERÍA DE ASSETS ACTIVOS
  const renderAssetGallery = (title: string, assets: CanAssetItem[], borderColor: string, textColor: string, bgHeader: string) => (
    <div className={`bg-[#03060a] border ${borderColor} rounded-lg flex flex-col shrink-0 min-h-[100px] overflow-hidden`}>
      <div className={`text-[7px] sm:text-[8px] font-black ${textColor} uppercase tracking-wider ${bgHeader} border-b ${borderColor} px-2 py-1.5 flex items-center justify-between shrink-0`}>
        <span>{title}</span>
        <span className="text-white font-bold bg-black/60 px-1.5 py-0.5 rounded-sm shadow-inner border border-white/10">ACTIVOS: {assets.length}</span>
      </div>
      
      {assets.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[7.5px] text-zinc-600 font-bold uppercase p-2 text-center">
          {t('can.no_assets_equipped', 'SIN ACTIVOS EQUIPADOS')}
        </div>
      ) : (
        <div className="flex-1 flex gap-2 overflow-x-auto custom-scrollbar p-2 items-center">
          {assets.map(asset => (
            <div
              key={asset.id}
              onMouseEnter={() => setHoveredAsset(asset)}
              onMouseLeave={() => setHoveredAsset(null)}
              className={`w-[65px] sm:w-[75px] shrink-0 bg-[#05080c] border ${borderColor.replace('30', '50')} rounded-md overflow-hidden flex flex-col group hover:scale-[1.03] transition-transform cursor-crosshair shadow-md`}
            >
              <div className="h-[45px] sm:h-[55px] w-full relative flex items-center justify-center bg-gradient-to-b from-[#0a111c] to-[#020306]">
                <img
                  src={asset.image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=150'}
                  alt={asset.name}
                  className="max-w-full max-h-full object-contain p-1 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                />
                {asset.level && (
                  <div className="absolute top-0.5 right-0.5 text-[5px] sm:text-[6px] font-black bg-black/90 text-white px-0.5 rounded-sm border border-cyan-900 shadow">
                    LVL {asset.level}
                  </div>
                )}
              </div>
              <div className={`p-1 border-t ${borderColor.replace('30', '50')} bg-[#020408] flex flex-col items-center justify-center h-[30px]`}>
                <div className="text-[5.5px] sm:text-[6px] font-bold text-white truncate w-full text-center uppercase leading-tight">{asset.name}</div>
                <div className={`text-[5.5px] sm:text-[6.5px] font-black ${textColor} text-center mt-0.5 leading-none bg-black/50 px-1 py-0.5 rounded border border-white/5 shadow-inner`}>
                  +{asset.effect_bonus}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <GalaxyFrame
      className="w-full max-w-7xl mx-auto h-full max-h-full font-mono text-left select-none backdrop-blur-md relative overflow-hidden text-white flex flex-col min-h-0"
      innerPadding="p-2 sm:p-3 h-full flex flex-col min-h-0 overflow-hidden"
    >
      <div className="flex-1 min-h-0 flex flex-col gap-2">
        
        {/* HEADER C.A.N. (shrink-0) */}
        <div className="shrink-0 flex justify-between items-center border-b border-cyan-900/50 pb-1.5 gap-2 relative z-20">
          <div className="flex items-center gap-2">
            <div>
              <span className="text-[7.5px] sm:text-[8px] font-mono text-cyan-400 tracking-widest block font-bold uppercase leading-none">
                {t('can.command_action_node')}
              </span>
              <h2 className="text-xs sm:text-sm font-black tracking-widest text-white uppercase mt-0.5 leading-none">
                {t('can.can_station')}
              </h2>
            </div>
          </div>
        </div>

        {activeFlightsCount > 0 && (
          <div className="shrink-0 p-1.5 bg-red-950/40 border border-red-500/60 rounded-lg flex items-center justify-between gap-2 text-red-300 text-[7.5px] sm:text-[8px] relative z-20">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse shrink-0" />
              <span className="font-bold uppercase tracking-wider truncate">
                {t('can.flight_restriction', { count: activeFlightsCount })}
              </span>
            </div>
            <span className="text-[7px] bg-red-900/80 px-1.5 py-0.5 rounded font-black border border-red-600 uppercase shrink-0">
              {t('can.locked')}
            </span>
          </div>
        )}

        {/* ESTRUCTURA PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 flex-1 min-h-0 items-stretch relative z-20">
          
          {/* COLUMNA 1: NIVEL CAN */}
          <GalaxyFrame className="lg:col-span-3 flex flex-col h-full" innerPadding="p-3 flex flex-col justify-between h-full">
            <div className="flex flex-col items-center justify-between text-center gap-1.5 h-full">
              <span className="text-[8.5px] sm:text-[9px] text-cyan-400 font-bold uppercase tracking-wider">
                {t('can.level')}
              </span>

              <div className="my-auto relative flex items-center justify-center py-1">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-cyan-500/40 animate-spin-slow absolute inset-0" />
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-cyan-400 bg-cyan-950/40 flex items-center justify-center text-xl sm:text-2xl font-black text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] relative z-10">
                  {canLevel}
                </div>
              </div>

              <div className="p-1.5 bg-purple-950/40 border border-purple-800 text-purple-200 text-center w-full rounded-lg mb-1">
                <div className="text-[7px] text-zinc-400 uppercase">{t('can.galactic_power')}</div>
                <div className="text-xs sm:text-sm font-black text-white">
                  {galacticPower.toLocaleString()} <span className="text-[9px] font-bold text-purple-300">POW</span>
                </div>
              </div>

              <button
                onClick={handleUpgradeCan}
                disabled={isUpgrading}
                className="w-full py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-110 border border-cyan-400 text-white text-[8px] sm:text-[8.5px] font-black uppercase tracking-widest rounded-lg shadow-lg cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isUpgrading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : t('can.upgrade_node')}
              </button>
            </div>
          </GalaxyFrame>

          {/* COLUMNA 2: ASSETS ACTIVADOS & GALERÍA */}
          <div className="lg:col-span-5 flex flex-col gap-2 h-full min-h-0">
            
            {/* 1. Botones de Categorías */}
            <GalaxyFrame className="w-full shrink-0" innerPadding="p-2 sm:p-2.5">
              <span className="text-[8px] sm:text-[8.5px] text-cyan-400 font-bold uppercase tracking-wider block text-center mb-1.5 border-b border-cyan-950 pb-0.5">
                {t('can.activated_assets')}
              </span>

              <div className="grid grid-cols-3 gap-1.5 items-center">
                <button
                  onClick={() => { playSfx(660); setActiveModalCategory('Estructuras'); }}
                  className="bg-[#050910] border border-cyan-900 hover:border-cyan-400 transition-all rounded-lg p-1.5 text-center flex flex-col items-center justify-center cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-md"
                >
                  <span className="text-xs sm:text-sm font-black text-white group-hover:text-cyan-300 transition-colors leading-none">
                    {equippedStructures.length}
                  </span>
                  <span className="text-[7px] font-bold text-zinc-400 group-hover:text-cyan-400 uppercase mt-0.5">
                    STRUCTURES
                  </span>
                </button>

                <button
                  onClick={() => { playSfx(660); setActiveModalCategory('Tecnologias'); }}
                  className="bg-[#050910] border border-cyan-900 hover:border-cyan-400 transition-all rounded-lg p-1.5 text-center flex flex-col items-center justify-center cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-md"
                >
                  <span className="text-xs sm:text-sm font-black text-white group-hover:text-cyan-300 transition-colors leading-none">
                    {equippedTech.length}
                  </span>
                  <span className="text-[7px] font-bold text-zinc-400 group-hover:text-cyan-400 uppercase mt-0.5">
                    TECH
                  </span>
                </button>

                <button
                  onClick={() => { playSfx(660); setActiveModalCategory('Insignias'); }}
                  className="bg-[#050910] border border-cyan-900 hover:border-cyan-400 transition-all rounded-lg p-1.5 text-center flex flex-col items-center justify-center cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-md"
                >
                  <span className="text-xs sm:text-sm font-black text-cyan-300 group-hover:text-white transition-colors leading-none">
                    {equippedBadges.length} / 5
                  </span>
                  <span className="text-[7px] font-bold text-zinc-400 group-hover:text-cyan-400 uppercase mt-0.5">
                    BADGES
                  </span>
                </button>
              </div>
            </GalaxyFrame>

            {/* 2. Galerías de Hardware Táctico Equipado */}
            <GalaxyFrame className="flex-1 min-h-0 overflow-hidden flex flex-col" innerPadding="p-2 sm:p-2.5 flex flex-col justify-between h-full min-h-0">
              <div className="flex flex-col justify-between h-full min-h-0 gap-1.5">
                <div className="shrink-0 flex justify-center items-center pb-1 border-b border-cyan-950">
                  <span className="text-[8px] sm:text-[8.5px] text-cyan-400 font-bold uppercase tracking-wider text-center">
                    {t('can.equipped_hardware_title', 'HARDWARE TÁCTICO EQUIPADO')}
                  </span>
                </div>

                {/* Grid Vertical Scrollable de Galerías */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
                  {renderAssetGallery(t('can.structures', 'ESTRUCTURAS'), equippedStructures, 'border-amber-500/30', 'text-amber-400', 'bg-amber-950/40')}
                  {renderAssetGallery(t('can.tech', 'TECNOLOGÍAS'), equippedTech, 'border-purple-500/30', 'text-purple-400', 'bg-purple-950/40')}
                  {renderAssetGallery(t('can.badges', 'INSIGNIAS'), equippedBadges, 'border-emerald-500/30', 'text-emerald-400', 'bg-emerald-950/40')}
                </div>

                {/* Ticker HUD Interactivo */}
                <div className="shrink-0 bg-[#020408] border border-cyan-950 p-1.5 rounded-lg flex items-center gap-1.5 text-[7px] sm:text-[7.5px] font-mono">
                  <Info className="w-3 h-3 text-cyan-400 shrink-0" />
                  {hoveredAsset ? (
                    <span className="text-cyan-200 font-bold uppercase truncate">
                      <strong className="text-white">{hoveredAsset.name}:</strong> {hoveredAsset.description || `Módulo activo con bonificación táctica de +${hoveredAsset.effect_bonus}%`}
                    </span>
                  ) : (
                    <span className="text-zinc-500 uppercase truncate">
                      {t('can.hover_hardware_hint', 'SELECCIONA UN HARDWARE PARA VER DETALLES')}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => { playSfx(660); setSkillsPage(1); setShowSkillsModal(true); }}
                  className="shrink-0 w-full py-1.5 bg-gradient-to-r from-cyan-950 to-cyan-900 hover:from-cyan-900 border border-cyan-500/60 text-cyan-200 text-[7.5px] sm:text-[8px] font-black uppercase tracking-widest rounded-lg cursor-pointer transition-colors shadow-inner flex items-center justify-center gap-1"
                >
                  {t('can.full_skills_btn', 'VER TODAS LAS HABILIDADES TÁCTICAS')}
                </button>
              </div>
            </GalaxyFrame>

          </div>

          {/* COLUMNA 3: A.M.I. & STATS */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-2 h-full min-h-0">
            
            <GalaxyFrame className="flex-1 min-h-0 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer group" innerPadding="p-3 flex flex-col items-center justify-center h-full">
              <div onClick={() => { playSfx(660); setShowAmiModal(true); }} className="w-full h-full flex flex-col items-center justify-center text-center gap-1">
                <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 animate-pulse group-hover:scale-110 transition-transform" />
                <div className="text-xs font-black text-white uppercase tracking-widest">A.M.I.</div>
                <div className="text-xs font-bold text-cyan-300 mt-0.5">
                  {totalDiscoveredStars.toLocaleString()} <span className="text-[7.5px] text-cyan-500 uppercase">{t('can.mapped_stars')}</span>
                </div>
              </div>
            </GalaxyFrame>

            <GalaxyFrame className="flex-1 min-h-0 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer group" innerPadding="p-3 flex flex-col items-center justify-center h-full">
              <div onClick={() => { playSfx(660); setShowStatsModal(true); }} className="w-full h-full flex flex-col items-center justify-center text-center gap-1">
                <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 animate-pulse group-hover:scale-110 transition-transform" />
                <div className="text-[9.5px] sm:text-[10px] font-black text-white uppercase tracking-wider">{t('can.stats_title')}</div>
              </div>
            </GalaxyFrame>

          </div>

        </div>

        {/* MODALES DEL SISTEMA */}
        <CanAssetsModal
          isOpen={activeModalCategory !== null}
          onClose={() => setActiveModalCategory(null)}
          category={activeModalCategory}
          assets={canAssetsList}
          userId={currentUserId}
          onRefresh={fetchCanData}
          triggerNotification={triggerNotification}
        />

        {showAmiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm">
            <div className="w-full max-w-xl sm:max-w-2xl max-h-[88dvh] flex flex-col hud-panel hud-corners border border-cyan-500/40 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.25)] overflow-hidden font-mono text-white">
              <div className="shrink-0 px-3 py-2 border-b border-cyan-500/30 flex items-center justify-between bg-[#080d14]">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Globe className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
                  <span className="text-cyan-400 text-xs sm:text-sm font-bold tracking-wider uppercase truncate">
                    {t('can.ami_modal.title')}
                  </span>
                </div>
                <button onClick={() => { playSfx(440); setShowAmiModal(false); }} className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-500/20 text-sm font-bold transition-colors cursor-pointer shrink-0">✕</button>
              </div>
              <div className="shrink-0 px-3 py-1.5 border-b border-cyan-500/20 bg-[#060a10] text-[7.5px] sm:text-[8px] text-zinc-400 uppercase">{t('can.ami_modal.subtitle')}</div>
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 overscroll-contain grid grid-cols-1 sm:grid-cols-2 gap-2 custom-scrollbar">
                {discoveredStars.length === 0 ? (
                  <div className="col-span-full my-auto text-center text-zinc-600 text-[9px] py-10 uppercase font-bold bg-black/40 rounded-xl border border-cyan-950">{t('can.ami_modal.empty')}</div>
                ) : (
                  discoveredStars.map((star) => {
                    const rank = star.discovery_order;
                    const reward = star.reward_details || {};
                    const coinReward = Number(reward.gd_coin || 0);
                    const dynamicTitle = reward.title || t('can.ami_modal.native_record', { rank });

                    let badgeColor = "bg-cyan-950/80 text-cyan-300 border-cyan-800";
                    let badgeIcon = "📡";

                    if (rank === 1) {
                      badgeColor = "bg-amber-950/80 text-amber-300 border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.2)]";
                      badgeIcon = "🥇";
                    } else if (rank === 2) {
                      badgeColor = "bg-slate-900/80 text-slate-200 border-slate-400/80";
                      badgeIcon = "🥈";
                    } else if (rank === 3) {
                      badgeColor = "bg-amber-950/50 text-amber-500 border-amber-700/80";
                      badgeIcon = "🥉";
                    }

                    return (
                      <div key={star.id} className="bg-[#050910] border border-cyan-500/30 rounded-lg p-2.5 flex flex-col justify-between gap-1.5 shadow-md relative overflow-hidden">
                        <div className="flex justify-between items-start gap-1">
                          <div className="flex flex-col text-left overflow-hidden">
                            <span className="text-[9px] font-black text-white uppercase truncate" title={star.star_name}>{star.star_name}</span>
                            <span className="text-[7px] text-cyan-400 font-bold uppercase truncate">{t('can.ami_modal.cluster')}: {star.cluster}</span>
                          </div>
                          <span className="text-[6.5px] text-zinc-500 font-mono shrink-0">{star.discovered_at}</span>
                        </div>
                        <div className={`px-2 py-1 rounded border flex items-center justify-between text-[7.5px] font-bold ${badgeColor}`}>
                          <span className="flex items-center gap-1 uppercase truncate"><span>{badgeIcon}</span><span className="truncate">{dynamicTitle}</span></span>
                        </div>
                        <div className="bg-black/60 px-2 py-1 rounded border border-cyan-950 text-[7px] font-mono flex justify-between items-center">
                          <span className="text-zinc-400 uppercase">{t('can.ami_modal.loot_recorded')}</span>
                          {coinReward > 0 ? (
                            <span className="text-amber-400 font-bold">+{coinReward.toLocaleString()} GD</span>
                          ) : (
                            <span className="text-zinc-600 uppercase font-bold">{t('can.ami_modal.no_extra_loot')}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="shrink-0 p-2 border-t border-cyan-500/30 bg-[#080d14] flex justify-end">
                <button onClick={() => { playSfx(440); setShowAmiModal(false); }} className="px-4 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-white text-[8.5px] font-bold uppercase rounded-lg cursor-pointer transition-colors">
                  {t('can.ami_modal.accept')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showStatsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm">
            <div className="w-full max-w-lg max-h-[88dvh] flex flex-col hud-panel hud-corners border border-cyan-500/40 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.25)] overflow-hidden font-mono text-white">
              <div className="shrink-0 px-3 py-2 border-b border-cyan-500/30 flex items-center justify-between bg-[#080d14]">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-purple-400 animate-pulse shrink-0" />
                  <span className="text-cyan-400 text-xs font-black uppercase tracking-widest truncate">{t('can.stats_modal.title')}</span>
                </div>
                <button onClick={() => { playSfx(440); setShowStatsModal(false); }} className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-500/20 text-sm font-bold transition-colors cursor-pointer shrink-0">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 text-[8.5px] sm:text-[9px] overscroll-contain custom-scrollbar">
                <div className={`p-2.5 bg-black/80 border rounded-xl space-y-1 ${canMetrics.energyRequired > 0 && canMetrics.energyProduced === 0 ? 'border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.3)]' : 'border-cyan-900/60'}`}>
                  <div className="flex justify-between items-center text-cyan-400 font-bold uppercase">
                    <span className="flex items-center gap-1.5"><BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />{t('can.stats_modal.solar_supply')}</span>
                    <span className="text-white font-mono font-black">{canMetrics.energyProduced} / {canMetrics.energyRequired} {t('can.stats_modal.units')}</span>
                  </div>
                  {canMetrics.energyRequired > 0 && canMetrics.energyProduced === 0 ? (
                    <p className="text-[7.5px] text-red-400 font-bold uppercase flex items-center gap-1 pt-1"><AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />{t('can.stats_modal.solar_offline')}</p>
                  ) : (
                    <div className="flex justify-between items-center text-[7.5px] text-zinc-400 pt-0.5 font-mono">
                      <span>{t('can.stats_modal.efficiency')}</span>
                      <span className="text-emerald-400 font-black text-[8.5px]">{(canMetrics.energyEfficiency * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                <span className="text-cyan-400 font-bold uppercase block border-b border-purple-950 pb-1">{t('can.stats_modal.extraction_capacity')}</span>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2.5 bg-black/60 border border-purple-950 rounded-lg flex flex-col justify-between gap-1">
                    <span className="text-zinc-400 uppercase font-bold">{t('can.stats_modal.metal')}</span>
                    <span className="text-cyan-300 font-black text-[10px]">+{canMetrics.hourlyProduction.metal.toLocaleString()} <span className="text-[7px] text-zinc-500">{t('can.stats_modal.per_hour')}</span></span>
                    <span className="text-[7px] text-zinc-400 border-t border-purple-950/60 pt-0.5">{t('can.stats_modal.storage')}: {canMetrics.storageLimits.metal.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-black/60 border border-purple-950 rounded-lg flex flex-col justify-between gap-1">
                    <span className="text-zinc-400 uppercase font-bold">{t('can.stats_modal.crystal')}</span>
                    <span className="text-purple-300 font-black text-[10px]">+{canMetrics.hourlyProduction.crystal.toLocaleString()} <span className="text-[7px] text-zinc-500">{t('can.stats_modal.per_hour')}</span></span>
                    <span className="text-[7px] text-zinc-400 border-t border-purple-950/60 pt-0.5">{t('can.stats_modal.storage')}: {canMetrics.storageLimits.crystal.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-black/60 border border-purple-950 rounded-lg flex flex-col justify-between gap-1">
                    <span className="text-zinc-400 uppercase font-bold">{t('can.stats_modal.deuterium')}</span>
                    <span className="text-blue-300 font-black text-[10px]">+{canMetrics.hourlyProduction.deuterium.toLocaleString()} <span className="text-[7px] text-zinc-500">{t('can.stats_modal.per_hour')}</span></span>
                    <span className="text-[7px] text-zinc-400 border-t border-purple-950/60 pt-0.5">{t('can.stats_modal.storage')}: {canMetrics.storageLimits.deuterium.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-black/60 border border-purple-950 rounded-lg flex flex-col justify-between gap-1">
                    <span className="text-zinc-400 uppercase font-bold">{t('can.stats_modal.dark_matter')}</span>
                    <span className="text-emerald-400 font-black text-[10px]">+{canMetrics.hourlyProduction.dark_matter.toLocaleString()} <span className="text-[7px] text-zinc-500">{t('can.stats_modal.per_hour')}</span></span>
                    <span className="text-[7px] text-zinc-400 border-t border-purple-950/60 pt-0.5">{t('can.stats_modal.storage')}: {canMetrics.storageLimits.dark_matter.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 p-2 border-t border-cyan-500/30 bg-[#080d14] flex justify-end">
                <button onClick={() => { playSfx(440); setShowStatsModal(false); }} className="px-4 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 text-[8.5px] font-bold uppercase rounded-lg cursor-pointer transition-colors">{t('can.stats_modal.accept')}</button>
              </div>
            </div>
          </div>
        )}

        {showSkillsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm">
            <div className="w-full max-w-4xl max-h-[88dvh] flex flex-col hud-panel hud-corners border border-cyan-500/40 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.25)] overflow-hidden font-mono text-white">
              <div className="shrink-0 px-3 py-2 border-b border-cyan-500/30 flex items-center justify-between bg-[#080d14]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
                  <span className="text-cyan-400 text-xs sm:text-sm font-bold tracking-wider uppercase">{t('skills.modal_title')} ({filteredSkillsForModal.length})</span>
                </div>
                <button onClick={() => { playSfx(440); setShowSkillsModal(false); }} className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-500/20 text-sm font-bold transition-colors cursor-pointer shrink-0">✕</button>
              </div>
              <div className="shrink-0 px-3 py-1.5 border-b border-cyan-500/20 flex gap-1.5 overflow-x-auto no-scrollbar bg-[#060a10]">
                {[
                  { id: 'ALL', label: `${t('skills.filter_all')} (${activeSkills.length})` },
                  { id: 'CAN', label: `${t('skills.filter_node')} (${activeSkills.filter(s => s.source === 'CAN').length})` },
                  { id: 'STRUCTURE', label: `${t('skills.filter_structures')} (${activeSkills.filter(s => s.source === 'STRUCTURE').length})` },
                  { id: 'TECH', label: `${t('skills.filter_tech')} (${activeSkills.filter(s => s.source === 'TECH').length})` },
                  { id: 'BADGE', label: `${t('skills.filter_badges')} (${activeSkills.filter(s => s.source === 'BADGE').length})` }
                ].map((tab) => (
                  <button key={tab.id} onClick={() => handleFilterChange(tab.id as any)} className={`text-[10px] py-0.5 px-2 rounded font-bold uppercase transition-all border whitespace-nowrap cursor-pointer shrink-0 ${skillsModalFilter === tab.id ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)]' : 'bg-black/60 text-zinc-400 border-cyan-950 hover:text-white hover:border-cyan-800'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 overscroll-contain custom-scrollbar">
                {paginatedSkillsForModal.length === 0 ? (
                  <div className="w-full my-auto text-center py-6 text-zinc-600 text-[9px] uppercase tracking-widest font-bold bg-black/40 rounded-xl border border-cyan-950">{t('can.no_skills_category')}</div>
                ) : (
                  paginatedSkillsForModal.map((sk) => {
                    const isCanon = sk.source === 'CAN';
                    const isStruct = sk.source === 'STRUCTURE';
                    const isTech = sk.source === 'TECH';
                    return (
                      <div key={sk.id} className={`p-1.5 sm:p-2 rounded-lg border flex items-center gap-2.5 transition-all shrink-0 ${isCanon ? 'bg-cyan-950/30 border-cyan-500/60 text-cyan-200' : isStruct ? 'bg-amber-950/20 border-amber-500/40 text-amber-200' : isTech ? 'bg-purple-950/20 border-purple-500/40 text-purple-200' : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'}`}>
                        <div className="w-8 h-8 rounded-md bg-black border border-cyan-950 overflow-hidden shrink-0 flex items-center justify-center p-0.5 relative">
                          {sk.assetImageUrl ? <img src={sk.assetImageUrl} alt={sk.assetName} className="w-full h-full object-contain" /> : getSkillIcon(sk.source, sk.effectDescription)}
                        </div>
                        <div className="flex-1 flex flex-col gap-0.5 text-left overflow-hidden">
                          <div className="flex justify-between items-center border-b border-cyan-950/80 pb-0.5">
                            <span className="font-black text-white text-[9px] sm:text-[10px] uppercase truncate">{sk.assetName}</span>
                            <span className="text-[7px] font-black uppercase px-1.5 py-0.2 rounded border bg-black/60 border-cyan-900 text-cyan-400 shrink-0">{sk.source} {sk.level ? `• LVL ${sk.level}` : ''}</span>
                          </div>
                          <div className="flex items-center gap-1 pt-0.5">
                            <ChevronRight className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="text-[10px] font-bold text-zinc-200 leading-tight truncate">{sk.effectDescription}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="shrink-0 flex items-center justify-between bg-[#080d14] border-t border-cyan-500/30 p-2 text-[8px] sm:text-[8.5px]">
                <button disabled={currentSkillsPage === 1} onClick={() => { playSfx(660); setSkillsPage(p => Math.max(1, p - 1)); }} className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950 border border-cyan-500/50 hover:border-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-cyan-300 font-bold uppercase rounded-md cursor-pointer transition-all shrink-0">
                  <ChevronLeft className="w-3 h-3" /> {t('can.prev')}
                </button>
                <span className="font-mono font-black text-cyan-400 uppercase tracking-widest text-[8px]">
                  {t('can.page')} <span className="text-white">{currentSkillsPage}</span> {t('can.of')} <span className="text-white">{totalSkillsPages}</span>
                </span>
                <button disabled={currentSkillsPage >= totalSkillsPages} onClick={() => { playSfx(660); setSkillsPage(p => Math.min(totalSkillsPages, p + 1)); }} className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950 border border-cyan-500/50 hover:border-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-cyan-300 font-bold uppercase rounded-md cursor-pointer transition-all shrink-0">
                  {t('can.next')} <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </GalaxyFrame>
  );
};

export default CanView;
```

---

## src/components/ChatSystem.tsx

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, X, Globe, Shield, ShoppingBag,
  Search, Ban, AtSign, Smile, MessageCircle, ChevronLeft,
  Trash2, Flag, Swords
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { chatService, ChatMessage } from '../services/chatService';
import { GalaxyFrame } from './CanView';

interface ChatSystemProps {
  userAllianceName?: string;
  triggerNotification?: (text: string, e?: any) => void;
}

type ChannelType = 'GLOBAL' | 'ALLIANCE' | 'MARKET' | 'COMBAT' | 'PRIVADO';

interface DmPartner {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

interface UserProfileData {
  avatar_url?: string;
  username?: string;
  role?: string;
}

const QUICK_EMOJIS = ['🚀', '⚔️', '🛡️', '💎', '🔥', '👑', '🌌', '💥', '🛸', '⭐', '😎', '👍', '🎯', '⚡', '🏆', '👽'];
const DEFAULT_COMMANDER_AVATAR = "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/1.png";

const resolveAvatarUrl = (url?: string | null): string => {
  if (!url || typeof url !== 'string' || url.trim() === '') return DEFAULT_COMMANDER_AVATAR;
  const clean = url.trim();

  if (
    clean.includes('unsplash.com') ||
    clean.includes('mixkit') ||
    clean.includes('ui-avatars') ||
    clean.includes('photo-') ||
    clean.includes('svg')
  ) {
    return DEFAULT_COMMANDER_AVATAR;
  }

  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  const fileName = clean.endsWith('.png') ? clean : `${clean}.png`;
  return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/${fileName}`;
};

export const ChatSystem: React.FC<ChatSystemProps> = ({
  userAllianceName = 'NO ALLIANCE',
  triggerNotification
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChannelType>('GLOBAL');
  const [channelId, setChannelId] = useState<string>('global-main');
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputContent, setInputContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [profilesMap, setProfilesMap] = useState<Record<string, UserProfileData>>({});
  const [hasActiveCombat, setHasActiveCombat] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const lastSentTimeRef = useRef<number>(0);

  const [activeDmPartner, setActiveDmPartner] = useState<DmPartner | null>(null);
  const [recentDmPartners, setRecentDmPartners] = useState<DmPartner[]>([]);
  
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeUserMenu, setActiveUserMenu] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
        checkActiveCombat(data.user.id);
      }
    });
  }, []);

  const fetchAllUserProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newMap: Record<string, UserProfileData> = {};

      if (user) {
        setCurrentUserId(user.id);
        const authName = user.user_metadata?.username || user.user_metadata?.display_name || user.email?.split('@')[0];
        if (authName) setCurrentUserName(authName);
      }

      const { data, error } = await supabase.from('user_profiles').select('id, username, avatar_url, role');
      if (!error && data && data.length > 0) {
        data.forEach((p: any) => {
          const profileData: UserProfileData = {
            avatar_url: p.avatar_url || undefined,
            username: p.username || undefined,
            role: p.role || undefined
          };
          if (p.id) newMap[p.id] = profileData;
          if (p.username) newMap[p.username.toLowerCase()] = profileData;
        });
      }
      setProfilesMap((prev) => ({ ...prev, ...newMap }));
    } catch (err) {
      console.error("Error al sincronizar perfiles en chat:", err);
    }
  };

  useEffect(() => {
    const handleProfileUpdateEvent = (e: any) => {
      const customAvatar = e?.detail?.avatar_url;
      if (customAvatar && currentUserId) {
        setProfilesMap((prev) => ({
          ...prev,
          [currentUserId]: { ...prev[currentUserId], avatar_url: customAvatar },
          ...(currentUserName ? { [currentUserName.toLowerCase()]: { ...prev[currentUserName.toLowerCase()], avatar_url: customAvatar } } : {})
        }));
      }
      fetchAllUserProfiles();
    };

    window.addEventListener('profile_updated', handleProfileUpdateEvent);
    return () => window.removeEventListener('profile_updated', handleProfileUpdateEvent);
  }, [currentUserId, currentUserName]);

  useEffect(() => {
    fetchAllUserProfiles();
    const profileChannelName = `public_user_profiles_changes_${Date.now()}`;
    const channel = supabase
      .channel(profileChannelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => { fetchAllUserProfiles(); })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, []);

  const checkActiveCombat = async (userId: string) => {
    try {
      const { data: combatData } = await supabase
        .from('combat_logs')
        .select('id')
        .or(`attacker_id.eq.${userId},defender_id.eq.${userId}`)
        .limit(1);

      const inCombat = !!(combatData && combatData.length > 0);
      setHasActiveCombat(inCombat);

      if (!inCombat && activeChannel === 'COMBAT') setActiveChannel('GLOBAL');
    } catch (err) {
      setHasActiveCombat(false);
    }
  };

  useEffect(() => {
    if (activeChannel === 'PRIVADO') {
      if (activeDmPartner && currentUserId) {
        setChannelId(chatService.getDmChannelId(currentUserId, activeDmPartner.id));
      } else {
        setChannelId('dm-none');
      }
    } else if (activeChannel === 'GLOBAL') {
      setChannelId('global-main');
    } else if (activeChannel === 'MARKET') {
      setChannelId('market-main');
    } else if (activeChannel === 'COMBAT') {
      setChannelId('combat-temp-active');
    } else if (activeChannel === 'ALLIANCE') {
      setChannelId(`alliance-${userAllianceName.toLowerCase().replace(/\s+/g, '-')}`);
    }
  }, [activeChannel, activeDmPartner, currentUserId, userAllianceName]);

  useEffect(() => {
    if (channelId === 'dm-none') {
      setMessages([]);
      return;
    }

    let isSubscribed = true;
    let unsubscribeFn: (() => void) | null = null;

    async function initChat() {
      const history = await chatService.fetchHistory(channelId);
      if (isSubscribed) {
        setMessages(history.slice(-100));
      }

      unsubscribeFn = chatService.subscribeToChannel(channelId, (newMsg) => {
        if (isSubscribed) {
          setMessages((prev) => [...prev.slice(-99), newMsg]);
          if (!isOpen && newMsg.user_id !== currentUserId) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      });
    }

    initChat();

    return () => {
      isSubscribed = false;
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, [channelId, isOpen, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    const now = Date.now();
    if (now - lastSentTimeRef.current < 1200) {
      if (triggerNotification) triggerNotification('⚠️ CANAL SATURADO. ESPERA UN SEGUNDO.');
      return;
    }
    lastSentTimeRef.current = now;

    if (activeChannel === 'PRIVADO' && !activeDmPartner) {
      if (triggerNotification) triggerNotification('⚠️ SELECCIONA UN PILOTO PARA TRANSMITIR');
      return;
    }

    try {
      const sentMsg = await chatService.sendMessage(
        channelId, inputContent, 'TEXT', null, activeChannel === 'PRIVADO' && activeDmPartner ? activeDmPartner.id : null
      );
      setMessages((prev) => prev.some((m) => m.id === sentMsg.id) ? prev : [...prev.slice(-99), sentMsg]);
      setInputContent('');
      setShowEmojiPicker(false);
    } catch (err: any) {
      if (triggerNotification) triggerNotification(err.message || 'Error al transmitir');
    }
  };

  const handleStartPrivateChat = (partner: DmPartner) => {
    setRecentDmPartners((prev) => prev.some((p) => p.id === partner.id) ? prev : [partner, ...prev]);
    setActiveDmPartner(partner);
    setActiveChannel('PRIVADO');
    setActiveUserMenu(null);
  };

  const handleDeleteDmConversation = (partnerId: string, partnerName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentDmPartners((prev) => prev.filter((p) => p.id !== partnerId));
    if (activeDmPartner?.id === partnerId) setActiveDmPartner(null);
  };

  const handleMentionUser = (userName: string) => {
    setInputContent((prev) => `${prev} @${userName} `);
    setActiveUserMenu(null);
    inputRef.current?.focus();
  };

  const handleBlockUser = async (userId: string, userName: string) => {
    await chatService.blockUser(userId);
    setMessages((prev) => prev.filter((m) => m.user_id !== userId));
    setActiveUserMenu(null);
    if (triggerNotification) triggerNotification(`🔴 COMANDANTE ${userName} BLOQUEADO.`);
  };

  const handleReportUser = async (userId: string, userName: string) => {
    await chatService.reportUser(userId, userName, "Conducta inapropiada en chat");
    setActiveUserMenu(null);
    if (triggerNotification) triggerNotification(`🚩 REPORTE ENVIADO CONTRA ${userName}`);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatService.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setActiveUserMenu(null);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setActiveUserMenu(null);
    }
  };

  const handleAddEmoji = (emoji: string) => setInputContent((prev) => prev + emoji);

  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const userProf = profilesMap[m.user_id] || (m.user_name ? profilesMap[m.user_name.toLowerCase()] : undefined);
    const nameToFilter = userProf?.username || m.user_name;
    return m.content.toLowerCase().includes(q) || nameToFilter.toLowerCase().includes(q);
  });

  const availableChannels = [
    { id: 'GLOBAL', label: 'GLOBAL', icon: Globe },
    { id: 'ALLIANCE', label: 'ALIANZA', icon: Shield },
    { id: 'MARKET', label: 'MERCADO', icon: ShoppingBag },
    ...(hasActiveCombat ? [{ id: 'COMBAT', label: 'COMBATE', icon: Swords }] : []),
    { id: 'PRIVADO', label: 'PRIVADO', icon: MessageCircle }
  ];

  return (
    <div className="fixed bottom-4 left-4 z-[9999] font-sans select-none">
      {!isOpen && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => { setIsOpen(true); setUnreadCount(0); }}
          className="relative p-3.5 bg-black/85 hover:bg-black border-2 border-cyan-500/60 hover:border-cyan-400 text-cyan-300 rounded-full shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all cursor-pointer group backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-95"
        >
          <MessageSquare className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform animate-pulse" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-mono text-[9px] font-black min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center shadow-[0_0_10px_#ef4444] border-2 border-black animate-bounce">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="absolute -top-0.5 -left-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-black"></span>
          </span>
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-[calc(100vw-2rem)] max-w-[360px] sm:max-w-[460px] h-[520px] max-h-[85dvh]"
          >
            <GalaxyFrame className="w-full h-full overflow-hidden text-left" innerPadding="p-0">
              <div className="flex flex-col h-full w-full overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-black/90 border-b border-cyan-900/50 font-mono text-[8.5px] uppercase font-bold shrink-0">
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                    {availableChannels.map((ch) => {
                      const Icon = ch.icon;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => setActiveChannel(ch.id as ChannelType)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 border ${
                            activeChannel === ch.id
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                              : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{ch.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-500/30 rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {activeChannel === 'PRIVADO' && activeDmPartner ? (
                  <div className="px-3 py-1.5 bg-cyan-950/40 border-b border-cyan-500/30 flex items-center justify-between font-mono shrink-0">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActiveDmPartner(null)} className="p-1 text-cyan-400 hover:text-white bg-black/60 rounded border border-cyan-950 cursor-pointer">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-5 h-5 rounded-full border border-cyan-400 overflow-hidden shrink-0">
                        <img 
                          src={resolveAvatarUrl(profilesMap[activeDmPartner.id]?.avatar_url || activeDmPartner.avatar)} 
                          alt={activeDmPartner.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] font-bold text-white uppercase">
                          {profilesMap[activeDmPartner.id]?.username || activeDmPartner.name}
                        </span>
                        <span className="text-[7px] text-cyan-400 uppercase font-mono">CANAL PRIVADO SEGURO</span>
                      </div>
                    </div>
                    <span className="text-[7.5px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded uppercase font-bold">
                      EN LÍNEA
                    </span>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 bg-black/40 border-b border-cyan-950/60 relative shrink-0">
                    <Search className="absolute left-5 top-2.5 w-3 h-3 text-cyan-600" />
                    <input
                      type="text"
                      placeholder={activeChannel === 'PRIVADO' ? "BUSCAR PILOTO PARA DM..." : "FILTRAR TRANSMISIONES O COMANDANTES..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-black/80 border border-cyan-950 rounded pl-7 pr-3 py-1 text-[8px] font-mono text-cyan-200 placeholder-zinc-600 outline-none uppercase"
                    />
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[9.5px] custom-scrollbar">
                  {activeChannel === 'PRIVADO' && !activeDmPartner ? (
                    <div className="space-y-2">
                      <span className="text-[8px] font-mono text-cyan-400 uppercase tracking-widest block font-bold border-b border-cyan-950 pb-1">
                        CONVERSACIONES PRIVADAS RECIENTES
                      </span>
                      {recentDmPartners.length === 0 ? (
                        <div className="text-center text-zinc-600 uppercase text-[8px] py-12 tracking-widest">NO TIENES CONVERSACIONES PRIVADAS ACTIVAS</div>
                      ) : (
                        recentDmPartners.map((partner) => {
                          const partnerProf = profilesMap[partner.id];
                          const realPartnerAvatar = resolveAvatarUrl(partnerProf?.avatar_url || partner.avatar);
                          const realPartnerName = partnerProf?.username || partner.name;

                          return (
                            <div key={partner.id} onClick={() => handleStartPrivateChat(partner)} className="p-2.5 bg-black/60 hover:bg-cyan-950/50 border border-cyan-950 hover:border-cyan-500/40 rounded-xl flex items-center justify-between cursor-pointer transition-colors group">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full border border-cyan-400/60 overflow-hidden shrink-0 bg-neutral-900">
                                  <img src={realPartnerAvatar} alt={realPartnerName} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col text-left">
                                  <span className="text-white font-bold uppercase group-hover:text-cyan-300 text-[9.5px]">{realPartnerName}</span>
                                  <span className="text-zinc-500 text-[7.5px] uppercase">{partnerProf?.role || partner.role || 'COMANDANTE'}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => handleStartPrivateChat(partner)} className="px-2.5 py-1 bg-cyan-950 group-hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[7.5px] font-bold uppercase rounded cursor-pointer">
                                  ABRIR DM
                                </button>
                                <button onClick={(e) => handleDeleteDmConversation(partner.id, partner.name, e)} className="p-1 bg-red-950/40 hover:bg-red-600 border border-red-500/40 text-red-400 hover:text-white rounded cursor-pointer transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    filteredMessages.length === 0 ? (
                      <div className="text-center text-zinc-600 uppercase text-[8px] py-12 tracking-widest">
                        {activeChannel === 'PRIVADO' ? 'INICIA LA TRANSMISIÓN PRIVADA CON ESTE PILOTO' : 'SIN TRANSMISIONES ACTIVAS EN ESTE CANAL'}
                      </div>
                    ) : (
                      filteredMessages.map((msg) => {
                        const userProf = profilesMap[msg.user_id];
                        const realAvatar = resolveAvatarUrl(userProf?.avatar_url || msg.user_avatar);
                        const realName = userProf?.username || msg.user_name;
                        const realRole = userProf?.role || msg.user_role;

                        return (
                          <div key={msg.id} className="flex gap-2.5 items-start group text-left relative">
                            <div className="w-7 h-7 rounded-full border border-cyan-500/40 bg-neutral-900 overflow-hidden shrink-0 mt-0.5 shadow">
                              <img src={realAvatar} alt={realName} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span onClick={() => setActiveUserMenu(activeUserMenu === msg.id ? null : msg.id)} className="font-bold text-white hover:text-cyan-300 cursor-pointer uppercase text-[9px] transition-colors">
                                    {realName}
                                  </span>
                                  <span className="text-[7px] bg-cyan-950 text-cyan-400 border border-cyan-800/40 px-1 rounded font-black uppercase">
                                    {realRole}
                                  </span>
                                </div>
                                <span className="text-[7.5px] text-zinc-600">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              {msg.message_type === 'SYSTEM' ? (
                                <div className="p-2 bg-red-950/20 border border-red-500/30 text-red-300 rounded text-[8.5px] font-bold uppercase">
                                  📢 {msg.content}
                                </div>
                              ) : (
                                <p className="text-zinc-300 leading-relaxed break-words">{msg.content}</p>
                              )}
                            </div>

                            {activeUserMenu === msg.id && (
                              <div className="absolute right-0 top-6 bg-[#0c1017] border border-cyan-500/50 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-[8.5px] font-mono uppercase backdrop-blur-md">
                                <button onClick={() => handleMentionUser(realName)} className="px-2.5 py-1.5 hover:bg-cyan-950 text-cyan-300 rounded-lg flex items-center gap-2 text-left cursor-pointer transition-colors">
                                  <AtSign className="w-3.5 h-3.5 text-cyan-400" /> MENCIONAR
                                </button>
                                
                                {msg.user_id !== currentUserId && (
                                  <button onClick={() => handleStartPrivateChat({ id: msg.user_id, name: realName, avatar: realAvatar, role: realRole })} className="px-2.5 py-1.5 hover:bg-cyan-950 text-emerald-400 rounded-lg flex items-center gap-2 text-left cursor-pointer font-bold transition-colors">
                                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> MENSAJE PRIVADO
                                  </button>
                                )}

                                <button onClick={() => handleDeleteMessage(msg.id)} className="px-2.5 py-1.5 hover:bg-red-950/80 text-red-400 rounded-lg flex items-center gap-2 text-left cursor-pointer font-bold transition-colors">
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" /> BORRAR MENSAJE
                                </button>

                                {msg.user_id !== currentUserId && (
                                  <>
                                    <button onClick={() => handleBlockUser(msg.user_id, realName)} className="px-2.5 py-1.5 hover:bg-red-950/80 text-red-400 rounded-lg flex items-center gap-2 text-left cursor-pointer transition-colors">
                                      <Ban className="w-3.5 h-3.5 text-red-400" /> BLOQUEAR
                                    </button>
                                    <button onClick={() => handleReportUser(msg.user_id, realName)} className="px-2.5 py-1.5 hover:bg-amber-950/80 text-amber-400 rounded-lg flex items-center gap-2 text-left cursor-pointer transition-colors">
                                      <Flag className="w-3.5 h-3.5 text-amber-400" /> REPORTAR USUARIO
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="p-2.5 bg-neutral-950/95 border-t border-cyan-500/40 grid grid-cols-8 gap-1.5 text-center text-sm font-mono backdrop-blur-md relative z-40 shrink-0">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button key={emoji} type="button" onClick={() => handleAddEmoji(emoji)} className="p-1.5 hover:bg-cyan-950/80 rounded border border-transparent hover:border-cyan-500/40 cursor-pointer transition-all hover:scale-110">
                          {emoji}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSend} className="p-2.5 bg-black/90 border-t border-cyan-900/50 flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 rounded-lg border transition-colors cursor-pointer ${showEmojiPicker ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-neutral-900 hover:bg-cyan-950/80 border-cyan-900/60 hover:border-cyan-500/50 text-cyan-400'}`}>
                    <Smile className="w-4 h-4" />
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={activeChannel === 'PRIVADO' ? activeDmPartner ? `DM A @${profilesMap[activeDmPartner.id]?.username || activeDmPartner.name}...` : "SELECCIONA UN PILOTO..." : `TRANSMITIR A #${activeChannel.toLowerCase()}...`}
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    disabled={activeChannel === 'PRIVADO' && !activeDmPartner}
                    className="flex-1 bg-black border border-cyan-950 focus:border-cyan-500 disabled:opacity-50 rounded-lg px-3 py-2 text-[9px] font-mono text-cyan-200 placeholder-zinc-600 outline-none uppercase"
                  />

                  <button type="submit" disabled={activeChannel === 'PRIVADO' && !activeDmPartner} className="p-2 bg-gradient-to-br from-cyan-600 to-teal-700 hover:brightness-110 disabled:opacity-50 text-white rounded-lg cursor-pointer transition-all shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </GalaxyFrame>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatSystem;
```

---

## src/components/DiplomaticEmbassy.tsx

```tsx
import React from 'react';
import { motion } from 'motion/react';

export const DiplomaticEmbassy: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-4 select-none">
      {/* Light aura ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-rose-500/10 blur-3xl rounded-full" />

      {/* Cybernetic Diplomatic Embassy / Embassy Tower */}
      <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
        
        {/* Slow floating structural rings */}
        <motion.div
          className="absolute inset-0 border border-fuchsia-500/10 rounded-full"
          animate={{
            scale: [0.95, 1.05, 0.95],
            rotate: [360, 0, 360],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />

        <motion.svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-[0_0_25px_rgba(244,63,94,0.25)]"
          animate={{
            y: [0, -3, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <defs>
            {/* Glossy glass facade gradient */}
            <linearGradient id="embassyGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#0F172A" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.8" />
            </linearGradient>

            {/* Glowing neon red highlights */}
            <linearGradient id="neonRose" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#BE123C" />
            </linearGradient>

            {/* Glowing hologram platform */}
            <radialGradient id="hollowRing" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FB7185" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#9F1239" stopOpacity="0" />
            </radialGradient>

            <filter id="roseGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* BASE MATRIX HASH & ALIGNMENT TARGETS */}
          <ellipse cx="100" cy="175" rx="72" ry="14" fill="url(#hollowRing)" stroke="#F43F5E" strokeOpacity="0.25" strokeWidth="1.2" />
          <ellipse cx="100" cy="175" rx="55" ry="10" fill="none" stroke="#F43F5E" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="4, 4" />
          
          {/* BASE FOUNDATION PLATES */}
          <polygon points="45,175 155,175 140,165 60,165" fill="#1E1E24" stroke="#4C1D24" strokeWidth="1" />
          <polygon points="52,165 148,165 136,155 64,155" fill="#0C0A0F" stroke="#F43F5E" strokeOpacity="0.4" strokeWidth="0.8" />

          {/* TOWER COLUMN ARCHITECTURES */}
          
          {/* Left Wing Consulate Offices */}
          <polygon points="56,155 78,155 70,110 52,110" fill="url(#embassyGlass)" stroke="#F43F5E" strokeOpacity="0.3" strokeWidth="1" />
          <line x1="62" y1="155" x2="58" y2="110" stroke="#F43F5E" strokeOpacity="0.5" strokeWidth="1" />
          <line x1="68" y1="155" x2="64" y2="110" stroke="#F43F5E" strokeOpacity="0.5" strokeWidth="1" />

          {/* Right Wing Consulate Offices */}
          <polygon points="122,155 144,155 148,110 130,110" fill="url(#embassyGlass)" stroke="#F43F5E" strokeOpacity="0.3" strokeWidth="1" />
          <line x1="132" y1="155" x2="136" y2="110" stroke="#F43F5E" strokeOpacity="0.5" strokeWidth="1" />
          <line x1="138" y1="155" x2="142" y2="110" stroke="#F43F5E" strokeOpacity="0.5" strokeWidth="1" />

          {/* Floating Command Ring surrounding center tower */}
          <path d="M 40,105 Q 100,120 160,105" fill="none" stroke="#FB7185" strokeWidth="1.5" strokeOpacity="0.8" strokeDasharray="3, 3" filter="url(#roseGlow)" />

          {/* Central Main Diplomatic Spire Tower */}
          <polygon points="80,155 120,155 110,65 90,65" fill="#140D17" stroke="#9F1239" strokeWidth="1.5" />
          <polygon points="85,155 115,155 106,75 94,75" fill="url(#embassyGlass)" />
          
          {/* Central Glowing Power Core column */}
          <line x1="100" y1="155" x2="100" y2="78" stroke="#F43F5E" strokeWidth="2.5" filter="url(#roseGlow)" strokeLinecap="round" />
          <line x1="100" y1="155" x2="100" y2="78" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" />

          {/* Upper Consulate Dome structure */}
          <polygon points="85,65 115,65 108,45 92,45" fill="url(#embassyGlass)" stroke="#BE123C" strokeWidth="1" />
          <circle cx="100" cy="45" r="4.5" fill="url(#neonRose)" />
          
          {/* Main Antenna transmitter beacon */}
          <line x1="100" y1="41" x2="100" y2="24" stroke="#F43F5E" strokeWidth="1" />
          <circle cx="100" cy="24" r="2" fill="#FFFFFF" filter="url(#roseGlow)" />
          
          {/* Beacon transmission wave arcs */}
          <path d="M 96,20 A 4,4 0 0,1 104,20" fill="none" stroke="#F43F5E" strokeWidth="1" strokeOpacity="0.8" />
          <path d="M 92,16 A 8,8 0 0,1 108,16" fill="none" stroke="#F43F5E" strokeWidth="0.8" strokeOpacity="0.5" />

          {/* Side Floating Satellite Sentinels orbiting base */}
          <g>
            {/* Left sentinel */}
            <circle cx="36" cy="130" r="3.5" fill="#111827" stroke="#F43F5E" strokeWidth="1" />
            <circle cx="36" cy="130" r="1.5" fill="#FFFFFF" filter="url(#roseGlow)" />
            <line x1="36" y1="133.5" x2="36" y2="142" stroke="#F43F5E" strokeOpacity="0.6" strokeWidth="0.8" />
          </g>
          <g>
            {/* Right sentinel */}
            <circle cx="164" cy="130" r="3.5" fill="#111827" stroke="#F43F5E" strokeWidth="1" />
            <circle cx="164" cy="130" r="1.5" fill="#FFFFFF" filter="url(#roseGlow)" />
            <line x1="164" y1="133.5" x2="164" y2="142" stroke="#F43F5E" strokeOpacity="0.6" strokeWidth="0.8" />
          </g>
        </motion.svg>
      </div>

      {/* Futuristic status text indicators */}
      <div className="absolute top-2 left-2 text-[7px] font-mono text-rose-400/40 uppercase tracking-widest pointer-events-none">
        AMB_SHIELD::ACTIVE
      </div>
      <div className="absolute bottom-2 right-2 text-[7px] font-mono text-fuchsia-400/40 uppercase tracking-widest pointer-events-none">
        LINK_CON::99.4%
      </div>
    </div>
  );
};

```

---

## src/components/ExpeditionsView.tsx

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CornerUpLeft, X, Search, Lock, MapPin, Wrench, Bot, FileText, Package, Clock, 
  Pickaxe, Radio, Box, Check, Trash2, Rocket, Sparkles, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { GalaxyFrame } from './CanView';

export interface Asset {
  id: string;
  seed_id?: string;
  name: string;
  type: 'Naves' | 'Astrobots' | 'Tools' | 'Consumibles' | 'Licencia' | string;
  rarity: string;
  collection: string;
  image_url?: string;
  is_nft?: boolean;
  engine?: string;
  quantity?: number;
  level?: number;
  effect?: number;
  skill_bonus?: number;
  skills?: string[];
  attack?: number;
  defense?: number;
  cargo_capacity?: number;
  speed?: number;
  fuel_consumption?: number;
  min_metal_capacity?: number;
  max_metal_capacity?: number;
  min_crystal_capacity?: number;
  max_crystal_capacity?: number;
  can_mine_metal?: boolean;
  can_mine_crystal?: boolean;
  min_metal_bonus?: number;
  max_metal_bonus?: number;
  min_crystal_bonus?: number;
  max_crystal_bonus?: number;
  seed_ships?: any;
  seed_data?: any;
  raw_data?: any;
  seed?: any;
  tactical_stats?: any;
  laser_attack?: number;
  plasma_attack?: number;
  ion_attack?: number;
  graviton_attack?: number;
  health?: number;
  shield?: number;
  cargo?: number;
  production?: number;
}

export interface Fleet {
  id: string;
  name: string;
  total_power_score: number;
  ships?: Asset[];
  tools?: Asset[];
  licenses?: Asset[];
}

export interface DiscoveredStar {
  id: string;
  name: string;
  type: string;
  isDiscovered: boolean;
  x: number;
  y: number;
  description?: string;
  risk_factor?: number;
  duration_hours?: number;
}

export interface Expedition {
  id: string;
  fleet_name: string;
  sector_name: string;
  galaxy_cluster: string;
  star_cluster?: string;
  sc_id?: string;
  applied_success_rate?: number;
  progress?: number;
  status: 'LAUNCHED' | 'IN_TRANSIT' | 'RETURNING' | 'SUCCESS' | 'FAILED' | 'CLAIMED';
  estimated_return_time: string;
  launch_time: string;
  is_adrift?: boolean;
  type?: 'EXPLORATION' | 'MINING' | 'DOMINATION';
  equipped_assets?: Asset[];
  calculated_min_metal?: number;
  calculated_max_metal?: number;
  calculated_min_crystal?: number;
  calculated_max_crystal?: number;
  expedition_snapshot?: any;
  fleet_id?: string;
  ship_ids?: string[];
  tool_id?: string;
}

export interface ExpeditionHistoryRecord {
  id: string;
  fleet_name: string;
  galaxy_cluster: string;
  sector_name?: string;
  star_cluster?: string;
  sc_id?: string;
  status: string;
  metal_mined?: number;
  crystal_mined?: number;
  dark_matter_mined?: number;
  created_at: string;
  equipped_assets?: Asset[];
  expedition_snapshot?: any;
  ship_ids?: string[];
  tool_id?: string;
  fleet_id?: string;
}

export interface ExpeditionLog {
  id: string;
  expedition_id: string;
  event_type: string;
  title: string;
  message: string;
  rewards_looted?: any;
  damage_sustained?: number;
  created_at: string;
}

export interface MiningDrop {
  name: string;
  amount: number;
  rarity: string;
  icon: string;
}

export interface GCEntryRequirements {
  require_ship?: boolean;
  require_tool?: boolean;
  require_license?: boolean;
  require_non_nft?: boolean;
  prev_gc?: string | null;
  required_prev_count?: number;
}

export interface GCClusterData {
  id: string;
  name: string;
  entry_requirements?: GCEntryRequirements;
  min_metal?: number;
  max_metal?: number;
  min_crystal?: number;
  max_crystal?: number;
  ss_discovery_rate?: number;
}

export type LeftMenuCategory = 'Fleets' | 'Naves' | 'Astrobots' | 'Tools' | 'Consumibles' | 'Licencia';
export type SelectionStep = 'GC' | 'GAL' | 'SC' | 'SS' | 'PLANETA';

export interface ExpeditionViewProps {
  initialView?: 'selection' | 'flights';
  onBack?: () => void;
  triggerNotification?: (text: string, payload?: any) => void;
}

export type ExpeditionsViewProps = ExpeditionViewProps;

const isValidUUID = (str?: string | null): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

const resolveImageUrl = (rawUrl?: string, fallbackId?: string) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
  }
  const clean = rawUrl.trim();
  if (clean === '' || clean.includes('global_hud_config') || clean.includes('undefined') || clean.includes('[object Object]')) {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
  }
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  if (clean.includes('.') || clean.includes('/')) {
    return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/galaxy-assets/${clean.replace(/^\//, '')}`;
  }
  return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
};

const formatSeconds = (totalSec: number): string => {
  if (totalSec <= 0) return '00:00';
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const isShipAsset = (type: string) => ['naves', 'ship', 'ships', 'nave'].includes(type.toLowerCase());
const isToolAsset = (type: string) => ['tools', 'tool', 'herramientas', 'herramienta'].includes(type.toLowerCase());
const isLicenseAsset = (type: string) => ['licencia', 'license', 'licenses'].includes(type.toLowerCase());

export const ExpeditionView: React.FC<ExpeditionViewProps> = ({
  initialView = 'selection',
  onBack,
  triggerNotification
}) => {
  const { t } = useTranslation();
  const { playSfx } = useAudioEngine();

  const [currentStep, setCurrentStep] = useState<SelectionStep>('GC');
  const [selectedGC, setSelectedGC] = useState<string | null>(null);
  const [selectedGAL, setSelectedGAL] = useState<string | null>(null);
  const [selectedSC, setSelectedSC] = useState<string | null>(null);
  const [selectedSS, setSelectedSS] = useState<string | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<DiscoveredStar | null>(null);

  const [completedCountsByGC, setCompletedCountsByGC] = useState<Record<string, number>>({});
  const [completedHistory, setCompletedHistory] = useState<ExpeditionHistoryRecord[]>([]);
  
  const [gcList, setGcList] = useState<GCClusterData[]>([]);
  const [dbGalaxies, setDbGalaxies] = useState<{ id: string; name: string }[]>([]);
  const [dbStarClusters, setDbStarClusters] = useState<{ id: string; name: string }[]>([]);
  const [dbStarSystems, setDbStarSystems] = useState<{ id: string; name: string }[]>([]);
  const [dbPlanets, setDbPlanets] = useState<DiscoveredStar[]>([]);

  const [isDispatchPanelActive, setIsDispatchPanelActive] = useState(false);
  const [isAdrift, setIsAdrift] = useState(false);

  const [now, setNow] = useState<number>(Date.now());

  const [currentLeftCategory, setCurrentLeftCategory] = useState<LeftMenuCategory>('Naves');
  const [inventoryAssets, setInventoryAssets] = useState<Asset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');
  
  const [globalPassiveBonus, setGlobalPassiveBonus] = useState<number>(0);
  const [userCanLevel, setUserCanLevel] = useState<number>(1);
  const [skillUnlockCrystal, setSkillUnlockCrystal] = useState<boolean>(false);

  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);
  const [activeExpeditions, setActiveExpeditions] = useState<Expedition[]>([]);
  const [expeditionLogs, setExpeditionLogs] = useState<Record<string, ExpeditionLog[]>>({});
  const [loading, setLoading] = useState(false);

  const [isStartJourneyOpen, setIsStartJourneyOpen] = useState(false);
  const [activeFlightCategory, setActiveFlightCategory] = useState<string>('ALL');
  const [flightSearchQuery, setFlightSearchQuery] = useState('');
  const [isRewardSummaryOpen, setIsRewardSummaryOpen] = useState(false);
  const [activeRewardTab, setActiveRewardTab] = useState<'ITEMS' | 'CURRENCIES' | 'LTD_CUR'>('ITEMS');
  const [claimingExpeditionId, setClaimingExpeditionId] = useState<string | null>(null);
  const [recallingExpeditionId, setRecallingExpeditionId] = useState<string | null>(null);
  const [currentRewardDrop, setCurrentRewardDrop] = useState<MiningDrop | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const [showToolRequiredModal, setShowToolRequiredModal] = useState<boolean>(false);
  const [expandedExpeditionId, setExpandedExpeditionId] = useState<string | null>(null);

  const leftMenuOptions: LeftMenuCategory[] = ['Fleets', 'Naves', 'Astrobots', 'Tools', 'Licencia', 'Consumibles'];

  const { busyToolIds, busyShipIds, busyAssetIds } = useMemo(() => {
    const toolIds = new Set<string>();
    const shipIds = new Set<string>();
    const allIds = new Set<string>();
    
    activeExpeditions.forEach((exp: any) => {
      if (exp.status === 'CLAIMED') return;
      
      let snap: any = {};
      try {
        if (typeof exp.expedition_snapshot === 'string') snap = JSON.parse(exp.expedition_snapshot);
        else if (exp.expedition_snapshot) snap = exp.expedition_snapshot;
      } catch (e) {}

      const rawShipIds: string[] = exp.ship_ids ? (Array.isArray(exp.ship_ids) ? exp.ship_ids : [exp.ship_ids]) : (exp.ship_id ? [exp.ship_id] : snap.ship_ids || []);
      const rawToolId: string | null = exp.tool_id || snap.tool_id || null;

      rawShipIds.forEach(id => {
        if (id) {
          allIds.add(id.toString());
          shipIds.add(id.toString());
        }
      });
      if (rawToolId) {
        allIds.add(rawToolId.toString());
        toolIds.add(rawToolId.toString());
      }

      const assets = exp.equipped_assets || exp.assets || exp.ships || [];
      if (Array.isArray(assets)) {
        assets.forEach((a: any) => {
          if (a.id) allIds.add(a.id.toString());
          if (a.seed_id) allIds.add(a.seed_id.toString());
          
          if (a.type && isShipAsset(a.type)) {
            if (a.id) shipIds.add(a.id.toString());
            if (a.seed_id) shipIds.add(a.seed_id.toString());
          }
          if (a.type && isToolAsset(a.type)) {
            if (a.id) toolIds.add(a.id.toString());
            if (a.seed_id) toolIds.add(a.seed_id.toString());
          }
        });
      }
      if (exp.fleet_id) {
        const fleet = fleets.find(f => f.id === exp.fleet_id);
        if (fleet) {
          (fleet.ships || []).forEach(s => {
            if (s.id) { allIds.add(s.id.toString()); shipIds.add(s.id.toString()); }
            if (s.seed_id) { allIds.add(s.seed_id.toString()); shipIds.add(s.seed_id.toString()); }
          });
          (fleet.tools || []).forEach(t => {
            if (t.id) { allIds.add(t.id.toString()); toolIds.add(t.id.toString()); }
            if (t.seed_id) { allIds.add(t.seed_id.toString()); toolIds.add(t.seed_id.toString()); }
          });
          (fleet.licenses || []).forEach(l => {
            if (l.id) allIds.add(l.id.toString());
            if (l.seed_id) allIds.add(l.seed_id.toString());
          });
        }
      }
    });
    return { busyToolIds: toolIds, busyShipIds: shipIds, busyAssetIds: allIds };
  }, [activeExpeditions, fleets]);

  const activeGcObject = useMemo(() => {
    return gcList.find(g => g.id === selectedGC) || null;
  }, [gcList, selectedGC]);

  const isInaraSelected = useMemo(() => {
    return Boolean(selectedGC);
  }, [selectedGC]);

  const totalExpeditionProbability = useMemo(() => {
    const baseClusterRate = activeGcObject?.ss_discovery_rate !== undefined 
      ? Number(activeGcObject.ss_discovery_rate) 
      : 0.5;

    let modifierSum = baseClusterRate + globalPassiveBonus;

    selectedAssets.forEach((asset: Asset) => {
      const effectVal = asset.effect !== undefined ? Number(asset.effect) : Number(asset.skill_bonus || 0);
      modifierSum += effectVal;
    });

    if (selectedFleet) {
      (selectedFleet.ships || []).forEach((s: any) => {
        modifierSum += Number(s.effect || s.mining_bonus || 0);
      });
      (selectedFleet.tools || []).forEach((t: any) => {
        modifierSum += Number(t.effect || t.mining_bonus || 0);
      });
    }

    return Number(modifierSum.toFixed(2));
  }, [activeGcObject, selectedAssets, selectedFleet, globalPassiveBonus]);

  const fleetTotalStats = useMemo(() => {
    return (selectedAssets || []).reduce(
      (acc, item: any) => {
        const raw = item.seed_ships || item.seed_data || item.raw_data || item || {};
        const stats = item.tactical_stats || {};
        const qty = Number(item.quantity || 1);

        // Matriz Ofensiva
        const baseAtk = Number(raw.attack ?? item.attack ?? stats.attack ?? stats.kinetic_attack ?? 0);
        const laser = Number(raw.laser_attack ?? raw.laserAttack ?? item.laser_attack ?? stats.laser_attack ?? 0);
        const plasma = Number(raw.plasma_attack ?? raw.plasmaAttack ?? item.plasma_attack ?? stats.plasma_attack ?? 0);
        const ion = Number(raw.ion_attack ?? raw.ionAttack ?? item.ion_attack ?? stats.ionic_attack ?? 0);
        const graviton = Number(raw.graviton_attack ?? raw.gravitonAttack ?? item.graviton_attack ?? stats.graviton_attack ?? 0);

        // Blindaje y Cinemática / Defensivo
        const hp = Number(raw.health ?? item.health ?? raw.hp ?? stats.hp ?? 0);
        const shd = Number(raw.shield ?? item.shield ?? stats.shield ?? 0);
        const def = Number(raw.defense ?? item.defense ?? stats.defense ?? 0);
        const spd = Number(raw.speed ?? item.speed ?? stats.speed ?? 0);

        // Logística
        const crg = Number(raw.cargo ?? raw.cargo_capacity ?? item.cargo ?? item.cargo_capacity ?? stats.cargo ?? 0);
        const prod = Number(raw.production ?? item.production ?? stats.production ?? 0);

        return {
          attack: acc.attack + (baseAtk * qty),
          laserAttack: acc.laserAttack + (laser * qty),
          plasmaAttack: acc.plasmaAttack + (plasma * qty),
          ionAttack: acc.ionAttack + (ion * qty),
          gravitonAttack: acc.gravitonAttack + (graviton * qty),

          health: acc.health + (hp * qty),
          shield: acc.shield + (shd * qty),
          defense: acc.defense + (def * qty),
          speed: acc.speed === 0 ? spd : (spd > 0 ? Math.min(acc.speed, spd) : acc.speed),

          cargo: acc.cargo + (crg * qty),
          production: acc.production + (prod * qty),
        };
      },
      {
        attack: 0,
        laserAttack: 0,
        plasmaAttack: 0,
        ionAttack: 0,
        gravitonAttack: 0,
        health: 0,
        shield: 0,
        defense: 0,
        speed: 0,
        cargo: 0,
        production: 0,
      }
    );
  }, [selectedAssets]);

  const selectedTool = useMemo(() => {
    return (
      selectedAssets.find(a => isToolAsset(a.type))
      ?? (selectedFleet?.tools?.[0] as Asset | undefined)
      ?? null
    );
  }, [selectedAssets, selectedFleet]);

  const toolSkills = useMemo(() => {
    return selectedTool?.skills || [];
  }, [selectedTool]);

  const isSoloMetal = toolSkills.includes('TOOL_SOLO_METAL');
  const isSoloCrystal = toolSkills.includes('TOOL_SOLO_CRYSTAL');

  const dynamicMiningRanges = useMemo(() => {
    let minMetal = Number(activeGcObject?.min_metal || 300);
    let maxMetal = Number(activeGcObject?.max_metal || 1200);
    let minCrystal = Number(activeGcObject?.min_crystal || 150);
    let maxCrystal = Number(activeGcObject?.max_crystal || 600);

    const allShips = [...selectedAssets.filter(a => isShipAsset(a.type)), ...(selectedFleet?.ships || [])];
    const allTools = [...selectedAssets.filter(a => isToolAsset(a.type)), ...(selectedFleet?.tools || [])];

    allShips.forEach(ship => {
      minMetal += Number(ship.min_metal_capacity || 0);
      maxMetal += Number(ship.max_metal_capacity || 0);
      minCrystal += Number(ship.min_crystal_capacity || 0);
      maxCrystal += Number(ship.max_crystal_capacity || 0);
    });

    allTools.forEach(tool => {
      minMetal += Number(tool.min_metal_bonus || 0);
      maxMetal += Number(tool.max_metal_bonus || 0);
      minCrystal += Number(tool.min_crystal_bonus || 0);
      maxCrystal += Number(tool.max_crystal_bonus || 0);
    });

    const modifierMult = 1.0 + (totalExpeditionProbability / 100.0);

    const hasSoloMetalSkill = allTools.some(t => (t.skills || []).includes('TOOL_SOLO_METAL'));
    const hasSoloCrystalSkill = allTools.some(t => (t.skills || []).includes('TOOL_SOLO_CRYSTAL'));

    return {
      minMetal: hasSoloCrystalSkill && !hasSoloMetalSkill ? 0 : Math.max(100, Math.floor(minMetal * modifierMult)),
      maxMetal: hasSoloCrystalSkill && !hasSoloMetalSkill ? 0 : Math.max(300, Math.floor(maxMetal * modifierMult)),
      minCrystal: hasSoloMetalSkill && !hasSoloCrystalSkill ? 0 : Math.max(50, Math.floor(minCrystal * modifierMult)),
      maxCrystal: hasSoloMetalSkill && !hasSoloCrystalSkill ? 0 : Math.max(150, Math.floor(maxCrystal * modifierMult)),
      canMineMetal: !(hasSoloCrystalSkill && !hasSoloMetalSkill),
      canMineCrystal: !(hasSoloMetalSkill && !hasSoloCrystalSkill)
    };
  }, [activeGcObject, selectedAssets, selectedFleet, totalExpeditionProbability]);

  const formatBreadcrumbText = () => {
    const galObj = dbGalaxies.find(g => g.id === selectedGAL);
    const scObj = dbStarClusters.find(s => s.id === selectedSC);
    const ssObj = dbStarSystems.find(sys => sys.id === selectedSS);

    const parts = [
      activeGcObject?.name || selectedGC, 
      galObj ? galObj.name : (selectedGAL ? 'GAL' : null), 
      scObj ? scObj.name : (selectedSC ? 'SC' : null), 
      ssObj ? ssObj.name : (selectedSS ? 'SS' : null), 
      selectedPlanet?.name
    ].filter(Boolean);
    return parts.join(' > ') || 'SELECCIONA COORDENADAS GALÁCTICAS';
  };

  const resolveExpeditionAssets = (exp: Expedition | ExpeditionHistoryRecord): Asset[] => {
    let snap: any = {};
    try {
      if (typeof exp.expedition_snapshot === 'string') snap = JSON.parse(exp.expedition_snapshot);
      else if (exp.expedition_snapshot) snap = exp.expedition_snapshot;
    } catch (e) {}

    const rawEquipped = exp.equipped_assets || (exp as any).assets || snap.equipped_assets || snap.assets;
    if (Array.isArray(rawEquipped) && rawEquipped.length > 0) {
      return rawEquipped.map(a => {
        const found = inventoryAssets.find(inv => String(inv.id) === String(a.id) || String(inv.seed_id) === String(a.seed_id));
        return found || {
          id: String(a.id || Math.random()),
          name: a.name || a.title || a.ship_name || a.custom_name || 'Activo de Flota',
          type: a.type || 'Naves',
          rarity: a.rarity || 'Common',
          collection: a.collection || 'GD',
          image_url: resolveImageUrl(a.image_url || a.avatar_url)
        };
      });
    }

    const resolvedList: Asset[] = [];
    const shipIds: string[] = exp.ship_ids ? (Array.isArray(exp.ship_ids) ? exp.ship_ids : [exp.ship_ids]) : (snap.ship_ids || []);
    const toolId: string | null = exp.tool_id || snap.tool_id || null;

    shipIds.forEach(id => {
      if (!id) return;
      const found = inventoryAssets.find(inv => String(inv.id) === String(id) || String(inv.seed_id) === String(id));
      if (found) {
        resolvedList.push(found);
      } else {
        resolvedList.push({
          id: String(id),
          name: `Nave #${String(id).slice(0, 4)}`,
          type: 'Naves',
          rarity: 'Common',
          collection: 'GD',
          image_url: resolveImageUrl(undefined)
        });
      }
    });

    if (toolId) {
      const found = inventoryAssets.find(inv => String(inv.id) === String(toolId) || String(inv.seed_id) === String(toolId));
      if (found) {
        resolvedList.push(found);
      } else {
        resolvedList.push({
          id: String(toolId),
          name: `Tool #${String(toolId).slice(0, 4)}`,
          type: 'Tools',
          rarity: 'Common',
          collection: 'GD',
          image_url: resolveImageUrl(undefined)
        });
      }
    }

    if (exp.fleet_id && fleets.length > 0) {
      const fleet = fleets.find(f => String(f.id) === String(exp.fleet_id));
      if (fleet) {
        if (fleet.ships) resolvedList.push(...fleet.ships);
        if (fleet.tools) resolvedList.push(...fleet.tools);
      }
    }

    if (resolvedList.length === 0 && snap) {
      if (snap.tool_specs) {
        resolvedList.push({
          id: String(snap.tool_specs.id || Math.random()),
          name: snap.tool_specs.name || 'Herramienta de Extracción',
          type: 'Tools',
          rarity: snap.tool_specs.rarity || 'Common',
          collection: 'GD',
          image_url: resolveImageUrl(snap.tool_specs.image_url || snap.tool_specs.avatar_url)
        });
      }
      if (snap.ships_specs && Array.isArray(snap.ships_specs)) {
        snap.ships_specs.forEach((s: any) => {
          resolvedList.push({
            id: String(s.id || Math.random()),
            name: s.name || s.ship_name || 'Nave de Combate',
            type: 'Naves',
            rarity: s.rarity || 'Common',
            collection: 'GD',
            image_url: resolveImageUrl(s.image_url || s.avatar_url)
          });
        });
      }
    }

    return resolvedList;
  };

  const handleStepBack = () => {
    playSfx(660);
    if (selectedPlanet || currentStep === 'PLANETA') {
      setSelectedPlanet(null);
      setCurrentStep('SS');
    } else if (selectedSS || currentStep === 'SS') {
      setSelectedSS(null);
      setCurrentStep('SC');
    } else if (selectedSC || currentStep === 'SC') {
      setSelectedSC(null);
      setCurrentStep('GAL');
    } else if (selectedGAL || currentStep === 'GAL') {
      setSelectedGAL(null);
      setCurrentStep('GC');
    } else if (selectedGC || currentStep === 'GC') {
      setSelectedGC(null);
      setCurrentStep('GC');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedGC) { setDbGalaxies([]); return; }
    const fetchGalaxies = async () => {
      const { data } = await supabase
        .from('seed_galaxies')
        .select('id, galaxy_number')
        .eq('cluster_id', selectedGC)
        .order('galaxy_number', { ascending: true });

      if (data && data.length > 0) {
        setDbGalaxies(data.map((g: any) => ({ id: g.id, name: `GALAXY ${g.galaxy_number}` })));
      } else { setDbGalaxies([]); }
    };
    fetchGalaxies();
    setSelectedGAL(null); setSelectedSC(null); setSelectedSS(null); setSelectedPlanet(null);
  }, [selectedGC]);

  useEffect(() => {
    if (!selectedGAL) { setDbStarClusters([]); return; }
    const fetchStarClusters = async () => {
      const { data } = await supabase
        .from('seed_star_clusters')
        .select('id, sc_number')
        .eq('galaxy_id', selectedGAL)
        .order('sc_number', { ascending: true });

      if (data && data.length > 0) {
        setDbStarClusters(data.map((sc: any) => ({ id: sc.id, name: `STARCLUSTER ${sc.sc_number}` })));
      } else { setDbStarClusters([]); }
    };
    fetchStarClusters();
    setSelectedSC(null); setSelectedSS(null); setSelectedPlanet(null);
  }, [selectedGAL]);

  useEffect(() => {
    if (!selectedSC) { setDbStarSystems([]); return; }
    const fetchDiscoveredStarSystems = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setDbStarSystems([]); return; }

      const { data: userDiscoveries } = await supabase
        .from('user_discovered_stars')
        .select('star_id')
        .eq('discoverer_id', user.id);

      const discoveredIds = (userDiscoveries || []).map((d: any) => d.star_id);

      if (discoveredIds.length === 0) { setDbStarSystems([]); return; }

      const { data } = await supabase
        .from('seed_star_systems')
        .select('id, name_code')
        .eq('sc_id', selectedSC)
        .in('id', discoveredIds);

      if (data && data.length > 0) {
        setDbStarSystems(data.map((sys: any) => ({ id: sys.id, name: sys.name_code || `SYS-${sys.id.substring(0, 4)}` })));
      } else { setDbStarSystems([]); }
    };

    fetchDiscoveredStarSystems();
    setSelectedSS(null); setSelectedPlanet(null);
  }, [selectedSC]);

  useEffect(() => {
    if (!selectedSS) { setDbPlanets([]); return; }
    const fetchPlanets = async () => {
      const { data } = await supabase
        .from('seed_locations')
        .select('*')
        .eq('system_id', selectedSS);

      if (data && data.length > 0) {
        setDbPlanets(data.map((loc: any) => ({
          id: loc.id,
          name: `PLANETA ${loc.planet_star_number}`,
          type: loc.conditions?.body_type || 'planeta',
          isDiscovered: true,
          x: 0, y: 0,
          duration_hours: (loc.time_minutes || 60) / 60,
          risk_factor: 15
        })));
      } else { setDbPlanets([]); }
    };
    fetchPlanets();
    setSelectedPlanet(null);
  }, [selectedSS]);

  const syncDatabaseData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setInventoryAssets([]); setGcList([]); setLoading(false); return;
      }
      const userId = user.id;

      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle();
      if (profile) {
        setUserCanLevel(profile.level || profile.can_level || 1);
      }

      const { data: realGCs } = await supabase.from('seed_galaxy_clusters').select('*');
      if (realGCs && realGCs.length > 0) {
        const gcObjects: GCClusterData[] = realGCs.map((g: any) => ({
          id: g.id,
          name: g.name || g.id,
          entry_requirements: g.entry_requirements || {},
          min_metal: g.min_metal ?? 300,
          max_metal: g.max_metal ?? 1200,
          min_crystal: g.min_crystal ?? 150,
          max_crystal: g.max_crystal ?? 600,
          ss_discovery_rate: g.ss_discovery_rate ?? 0.5
        }));
        setGcList(gcObjects);
        setSelectedGC(prev => prev ?? gcObjects[0].id);
      } else {
        setGcList([]);
      }

      let legacyUserId: number | null = null;
      if (profile?.legacy_id) legacyUserId = Number(profile.legacy_id);

      const [
        { data: historyRows },
        { data: claimedExpeditions },
        { data: rewardLogs }
      ] = await Promise.all([
        supabase.from('expedition_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('active_expeditions').select('*').eq('user_id', userId).in('status', ['CLAIMED', 'SUCCESS']).order('launch_time', { ascending: false }),
        supabase.from('expedition_logs').select('*').eq('user_id', userId).not('rewards_looted', 'is', null).order('created_at', { ascending: false })
      ]);

      const unifiedHistoryMap = new Map<string, ExpeditionHistoryRecord>();

      (historyRows || []).forEach((row: any) => {
        const key = String(row.id || row.expedition_id || Math.random());
        unifiedHistoryMap.set(key, {
          id: key,
          fleet_name: row.fleet_name || 'FLOTA IMPERIAL',
          galaxy_cluster: row.galaxy_cluster || 'INARA',
          sector_name: row.sector_name || 'SECTOR MINERO',
          sc_id: row.sc_id || row.sector_name,
          status: row.status || 'CLAIMED',
          metal_mined: Number(row.metal_mined || row.metal || 0),
          crystal_mined: Number(row.crystal_mined || row.crystal || 0),
          dark_matter_mined: Number(row.dark_matter_mined || row.dark_matter || 0),
          created_at: row.created_at || new Date().toISOString(),
          equipped_assets: row.equipped_assets,
          expedition_snapshot: row.expedition_snapshot,
          ship_ids: row.ship_ids,
          tool_id: row.tool_id,
          fleet_id: row.fleet_id
        });
      });

      (claimedExpeditions || []).forEach((exp: any) => {
        const key = String(exp.id);
        if (!unifiedHistoryMap.has(key)) {
          unifiedHistoryMap.set(key, {
            id: key,
            fleet_name: exp.fleet_name || 'FLOTA IMPERIAL',
            galaxy_cluster: exp.galaxy_cluster || 'INARA',
            sector_name: exp.sector_name || 'SECTOR MINERO',
            sc_id: exp.sc_id || exp.sector_name,
            status: exp.status || 'CLAIMED',
            metal_mined: Number(exp.calculated_min_metal || 300),
            crystal_mined: Number(exp.calculated_min_crystal || 150),
            dark_matter_mined: 0,
            created_at: exp.launch_time || exp.created_at || new Date().toISOString(),
            equipped_assets: exp.equipped_assets,
            expedition_snapshot: exp.expedition_snapshot,
            ship_ids: exp.ship_ids,
            tool_id: exp.tool_id,
            fleet_id: exp.fleet_id
          });
        }
      });

      (rewardLogs || []).forEach((log: any) => {
        const key = String(log.expedition_id || log.id);
        const rewards = log.rewards_looted || {};
        const metal = Number(rewards.metal || 0);
        const crystal = Number(rewards.crystal || 0);
        const darkMatter = Number(rewards.dark_matter || 0);

        if (metal > 0 || crystal > 0 || darkMatter > 0) {
          if (!unifiedHistoryMap.has(key)) {
            unifiedHistoryMap.set(key, {
              id: key,
              fleet_name: log.title || 'MISION COMPLETADA',
              galaxy_cluster: 'INARA',
              sector_name: log.message?.includes('EN ') ? log.message.split('EN ')[1]?.split(':')[0] : 'SECTOR EXPLORADO',
              sc_id: log.message?.includes('EN ') ? log.message.split('EN ')[1]?.split(':')[0] : 'SECTOR EXPLORADO',
              status: 'CLAIMED',
              metal_mined: metal,
              crystal_mined: crystal,
              dark_matter_mined: darkMatter,
              created_at: log.created_at || new Date().toISOString(),
              equipped_assets: log.equipped_assets,
              expedition_snapshot: log.expedition_snapshot,
              ship_ids: log.ship_ids,
              tool_id: log.tool_id,
              fleet_id: log.fleet_id
            });
          } else {
            const existing = unifiedHistoryMap.get(key)!;
            if (metal > 0) existing.metal_mined = metal;
            if (crystal > 0) existing.crystal_mined = crystal;
            if (darkMatter > 0) existing.dark_matter_mined = darkMatter;
            if (log.equipped_assets && !existing.equipped_assets) existing.equipped_assets = log.equipped_assets;
            if (log.expedition_snapshot && !existing.expedition_snapshot) existing.expedition_snapshot = log.expedition_snapshot;
          }
        }
      });

      const combinedList = Array.from(unifiedHistoryMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const counts: Record<string, number> = {};
      combinedList.forEach((row) => {
        const gc = row.galaxy_cluster || 'PELA';
        counts[gc] = (counts[gc] || 0) + 1;
      });

      setCompletedCountsByGC(counts);
      setCompletedHistory(combinedList.slice(0, 10));

      let globalNetBonus = 0;
      let hasCrystalUnlock = false;

      const { data: uStructsRaw } = await supabase.from('user_structures').select('*').eq('user_id', userId);
      const { data: seedStructures } = await supabase.from('seed_structures').select('*');
      const seedStructuresMap = new Map((seedStructures || []).map((s: any) => [String(s.id), s]));

      (uStructsRaw || []).forEach((s: any) => {
        const item = seedStructuresMap.get(String(s.structure_id || s.building_id));
        if (item) {
          globalNetBonus += Number(item.mining_bonus || item.effect || item.skill_bonus || 0);
          if (JSON.stringify(item.skills || {}).includes('crystal') || JSON.stringify(item.skills || {}).includes('cristal')) {
            hasCrystalUnlock = true;
          }
        }
      });

      const { data: uTechRaw } = await supabase.from('user_technologies').select('*').eq('user_id', userId);
      const { data: seedTech } = await supabase.from('seed_technologies').select('*');
      const seedTechMap = new Map((seedTech || []).map((t: any) => [String(t.id), t]));

      (uTechRaw || []).forEach((t: any) => {
        const item = seedTechMap.get(String(t.technology_id));
        if (item) {
          globalNetBonus += Number(item.mining_bonus || item.effect || item.skill_bonus || 0);
          if (JSON.stringify(item.skills || {}).includes('crystal') || JSON.stringify(item.skills || {}).includes('cristal')) {
            hasCrystalUnlock = true;
          }
        }
      });

      const { data: uBadges } = await supabase.from('user_badges_unlocked').select('*, seed_badges(*)').eq('user_id', userId);
      (uBadges || []).forEach((b: any) => {
        const item = b.seed_badges;
        if (item) {
          globalNetBonus += Number(item.mining_bonus || item.effect || item.skill_bonus || 0);
          if (JSON.stringify(item.skills || {}).includes('crystal') || JSON.stringify(item.skills || {}).includes('cristal')) {
            hasCrystalUnlock = true;
          }
        }
      });

      setGlobalPassiveBonus(globalNetBonus);
      setSkillUnlockCrystal(hasCrystalUnlock);

      const loadCategoryAssets = async (
        userTable: string,
        seedTable: string,
        categoryType: Asset['type'],
        possibleFkCols: string[],
        nameCols: string[] = ['ship_name', 'name_ship', 'name', 'title']
      ): Promise<Asset[]> => {
        try {
          let query = supabase.from(userTable).select('*');
          if (userTable === 'user_ships') {
            if (legacyUserId !== null) {
              query = query.or(`user_id.eq.${userId},id_user.eq.${legacyUserId}`);
            } else {
              query = query.eq('user_id', userId);
            }
          } else {
            query = query.eq('user_id', userId);
          }

          const { data: userRows } = await query;
          if (!userRows || userRows.length === 0) return [];

          const { data: seedRows } = await supabase.from(seedTable).select('*');
          if (!seedRows || seedRows.length === 0) return [];

          const seedMap = new Map<string, any>();
          seedRows.forEach((s: any) => {
            const keysToRegister = [
              s.id, s.ship_id, s.id_ship, s.tool_id, s.astrobot_id,
              s.license_id, s.consumable_id, s.structure_id, s.technology_id
            ];
            keysToRegister.forEach(k => {
              if (k !== undefined && k !== null) {
                seedMap.set(k.toString(), s);
              }
            });
          });

          const assets: Asset[] = [];

          userRows.forEach((row: any) => {
            let targetId: string | null = null;
            for (const col of possibleFkCols) {
              if (row[col] !== undefined && row[col] !== null) {
                targetId = row[col].toString();
                break;
              }
            }

            if (!targetId) return;

            const seed = seedMap.get(targetId);

            let realName = row.custom_name || row.name_ship || row.name;
            if (seed) {
              for (const col of nameCols) {
                if (seed[col]) { realName = seed[col]; break; }
              }
            }
            if (!realName || realName === 'ACTIVO') {
              realName = `${categoryType} #${targetId}`;
            }

            const rawImg = seed?.image_url || seed?.avatar_url || seed?.avatar || seed?.image || row.image_url;
            const finalImg = resolveImageUrl(rawImg, targetId);

            const rawBonus = seed?.mining_bonus ?? seed?.expedition_bonus ?? seed?.success_bonus ?? seed?.effect ?? seed?.skill_bonus ?? 0;
            const realBonus = typeof rawBonus === 'number' ? rawBonus : (parseFloat(rawBonus) || 0);

            let parsedSkills: string[] = [];
            if (seed?.skills) {
              if (Array.isArray(seed.skills)) {
                parsedSkills = seed.skills.map(String);
              } else if (typeof seed.skills === 'object') {
                parsedSkills = Object.keys(seed.skills);
              } else if (typeof seed.skills === 'string') {
                try { parsedSkills = JSON.parse(seed.skills); } catch { parsedSkills = [seed.skills]; }
              }
            }

            assets.push({
              id: row.id?.toString() || targetId,
              seed_id: targetId,
              name: realName,
              type: categoryType,
              rarity: seed?.rarity || 'Common',
              collection: seed?.company || seed?.collection || seed?.faction || 'GD',
              is_nft: seed?.is_nft || false,
              engine: seed?.engine || (realName.includes('HS') ? 'HS' : 'Impulse'),
              image_url: finalImg,
              quantity: row.quantity || row.amount || 1,
              level: row.current_level || row.level || 1,
              effect: realBonus,
              skills: parsedSkills,
              attack: Number(seed?.attack || seed?.power_score || seed?.power || row.attack || 0),
              defense: Number(seed?.defense || seed?.shield || seed?.health || seed?.hp || row.defense || 0),
              cargo_capacity: Number(seed?.cargo_capacity || seed?.capacity || seed?.cargo || row.cargo_capacity || row.cargo || 0),
              speed: Number(seed?.speed || seed?.ship_speed || row.speed || 0),
              fuel_consumption: Number(seed?.fuel_consumption || seed?.deuterium_cost || seed?.fuel || row.fuel_consumption || 0),
              min_metal_capacity: seed?.min_metal_capacity,
              max_metal_capacity: seed?.max_metal_capacity,
              min_crystal_capacity: seed?.min_crystal_capacity,
              max_crystal_capacity: seed?.max_crystal_capacity,
              can_mine_metal: seed?.can_mine_metal,
              can_mine_crystal: seed?.can_mine_crystal,
              min_metal_bonus: seed?.min_metal_bonus,
              max_metal_bonus: seed?.max_metal_bonus,
              min_crystal_bonus: seed?.min_crystal_bonus,
              max_crystal_bonus: seed?.max_crystal_bonus,
              seed_ships: seed,
              seed_data: seed,
              raw_data: { ...seed, ...row },
              seed: seed,
              laser_attack: Number(seed?.laser_attack ?? seed?.laserAttack ?? row.laser_attack ?? row.laserAttack ?? 0),
              plasma_attack: Number(seed?.plasma_attack ?? seed?.plasmaAttack ?? row.plasma_attack ?? row.plasmaAttack ?? 0),
              ion_attack: Number(seed?.ion_attack ?? seed?.ionAttack ?? row.ion_attack ?? row.ionAttack ?? 0),
              graviton_attack: Number(seed?.graviton_attack ?? seed?.gravitonAttack ?? row.graviton_attack ?? row.gravitonAttack ?? 0),
              health: Number(seed?.health ?? seed?.hp ?? row.health ?? row.hp ?? 0),
              shield: Number(seed?.shield ?? row.shield ?? 0),
              cargo: Number(seed?.cargo ?? seed?.cargo_capacity ?? row.cargo ?? row.cargo_capacity ?? 0),
              production: Number(seed?.production ?? row.production ?? 0),
              tactical_stats: {
                hp: Number(seed?.health ?? seed?.hp ?? row.health ?? row.hp ?? 0),
                shield: Number(seed?.shield ?? row.shield ?? 0),
                defense: Number(seed?.defense ?? row.defense ?? 0),
                speed: Number(seed?.speed ?? row.speed ?? 0),
                attack: Number(seed?.attack ?? row.attack ?? 0),
                laser_attack: Number(seed?.laser_attack ?? seed?.laserAttack ?? row.laser_attack ?? row.laserAttack ?? 0),
                plasma_attack: Number(seed?.plasma_attack ?? seed?.plasmaAttack ?? row.plasma_attack ?? row.plasmaAttack ?? 0),
                ionic_attack: Number(seed?.ion_attack ?? seed?.ionAttack ?? row.ion_attack ?? row.ionAttack ?? 0),
                graviton_attack: Number(seed?.graviton_attack ?? seed?.gravitonAttack ?? row.graviton_attack ?? row.gravitonAttack ?? 0),
                cargo: Number(seed?.cargo ?? seed?.cargo_capacity ?? row.cargo ?? row.cargo_capacity ?? 0),
                production: Number(seed?.production ?? row.production ?? 0),
              }
            });
          });

          return assets;
        } catch (catErr) {
          console.error(`Error cargando categoría ${categoryType}:`, catErr);
          return [];
        }
      };

      const [ships, tools, astrobots, consumables, licenses] = await Promise.all([
        loadCategoryAssets('user_ships', 'seed_ships', 'Naves', ['id_ship', 'ship_id', 'id']),
        loadCategoryAssets('user_tools', 'seed_tools', 'Tools', ['tool_id', 'id']),
        loadCategoryAssets('user_astrobots', 'seed_astrobots', 'Astrobots', ['astrobot_id', 'id']),
        loadCategoryAssets('user_consumibles', 'seed_consumables', 'Consumibles', ['consumable_id', 'id']),
        loadCategoryAssets('user_licenses', 'seed_licenses', 'Licencia', ['license_id', 'id'])
      ]);

      const rawAssets = [...ships, ...tools, ...astrobots, ...consumables, ...licenses];
      const deduplicatedAssets = Array.from(new Map(rawAssets.map(item => [item.id, item])).values());

      setInventoryAssets(deduplicatedAssets);

      const { data: fleetData } = await supabase.from('fleets').select('*').eq('user_id', userId);
      if (fleetData) {
        setFleets(fleetData.map((f: any) => ({
          id: f.id?.toString(), name: f.name || 'Flota Alpha',
          total_power_score: f.total_power_score || 0,
          ships: f.ships || [], tools: f.tools || [], licenses: f.licenses || []
        })));
      }

      const { data: expData } = await supabase
        .from('active_expeditions')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'CLAIMED')
        .order('launch_time', { ascending: false });

      if (expData) setActiveExpeditions(expData);

      const { data: logsData } = await supabase.from('expedition_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (logsData) {
        const map: Record<string, ExpeditionLog[]> = {};
        logsData.forEach((log: any) => {
          const key = String(log.expedition_id || '');
          if (key) {
            if (!map[key]) map[key] = [];
            map[key].push(log);
          }
        });
        setExpeditionLogs(map);
      }
    } catch (err) {
      if (triggerNotification) triggerNotification("⚠️ FALLO AL SINCRONIZAR INVENTARIO REAL");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncDatabaseData();

    let logsChannel: any;
    const initLogsChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channelName = `expedition_logs_realtime_${user.id}`;
      supabase.removeChannel(supabase.channel(channelName));

      logsChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'expedition_logs', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const newLog = payload.new as ExpeditionLog;
            const expKey = String(newLog.expedition_id || '');
            if (expKey) {
              setExpeditionLogs(prev => ({
                ...prev,
                [expKey]: [newLog, ...(prev[expKey] || [])]
              }));
            }
          }
        )
        .subscribe();
    };

    initLogsChannel();

    return () => {
      if (logsChannel) supabase.removeChannel(logsChannel);
    };
  }, []);

  const checkGCRequirements = (gcObj: GCClusterData): { allowed: boolean; reason?: string } => {
    const reqs = gcObj.entry_requirements || {};
    if (reqs.prev_gc) {
      const requiredCount = reqs.required_prev_count || 0;
      const prevCount = completedCountsByGC[reqs.prev_gc] || 0;
      if (prevCount < requiredCount) {
        return { allowed: false, reason: `REQUIERE ${requiredCount} EXPEDICIONES EN ${reqs.prev_gc} (${prevCount}/${requiredCount})` };
      }
    }
    return { allowed: true };
  };

  const validateFleetComposition = (gcObj: GCClusterData | null, assets: Asset[], fleet: Fleet | null): { valid: boolean; error?: string; missingTool?: boolean } => {
    const reqs = gcObj?.entry_requirements || {};
    const allShips = [...assets.filter(a => isShipAsset(a.type)), ...(fleet?.ships || [])];
    const allTools = [...assets.filter(a => isToolAsset(a.type)), ...(fleet?.tools || [])];
    const allLicenses = [...assets.filter(a => isLicenseAsset(a.type)), ...(fleet?.licenses || [])];

    if (reqs.require_non_nft || isAdrift) {
      const hasNonNFT = allShips.some(s => s.is_nft === false || !s.is_nft);
      if (!hasNonNFT) return { valid: false, error: "REQUISITO: La flota debe incluir al menos UNA NAVE NO-NFT." };
    }
    if (reqs.require_ship && allShips.length === 0) return { valid: false, error: `REQUISITO: Debes incluir al menos UNA NAVE.` };
    if (reqs.require_tool && allTools.length === 0) return { valid: false, error: `REQUISITO DE EXTRACCIÓN: Se requiere al menos una Herramienta (Tool) para extracción.`, missingTool: true };
    if (reqs.require_license && allLicenses.length === 0) return { valid: false, error: `REQUISITO: Debes incluir una LICENCIA espacial activa.` };
    return { valid: true };
  };

  const toggleAssetSelection = (asset: Asset) => {
    const isShip = isShipAsset(asset.type);
    const isTool = isToolAsset(asset.type);
    const isInFlight = busyAssetIds.has(asset.id) || 
      (asset.seed_id && (
        (isShip && busyShipIds.has(asset.seed_id)) || 
        (isTool && busyToolIds.has(asset.seed_id))
      ));

    if (isInFlight) {
      playSfx(300);
      if (triggerNotification) triggerNotification("⛔ ESTE ACTIVO SE ENCUENTRA EN VUELO Y NO SE PUEDE SELECCIONAR");
      return;
    }

    playSfx(660);
    if (selectedAssets.find(a => a.id === asset.id)) {
      setSelectedAssets(prev => prev.filter(a => a.id !== asset.id));
    } else {
      setSelectedAssets(prev => [...prev, asset]);
      if (triggerNotification) triggerNotification(`➕ ${asset.name} AÑADIDO`);
    }
  };

  const handleOpenJourneyModal = () => {
    playSfx(880);
    const compValidation = validateFleetComposition(activeGcObject, selectedAssets, selectedFleet);
    if (!compValidation.valid) {
      if (compValidation.missingTool) {
        playSfx(300);
        setShowToolRequiredModal(true);
        return;
      }
      const errorMsg = compValidation.error || "Faltan componentes requeridos.";
      setLaunchError(errorMsg);
      if (triggerNotification) triggerNotification(`⛔ ${errorMsg}`);
      return;
    }
    setLaunchError(null);
    setIsStartJourneyOpen(true);
  };

  const executeLaunchTransaction = async () => {
    if (loading) return;
    setLaunchError(null);
    playSfx(1200);

    const compValidation = validateFleetComposition(activeGcObject, selectedAssets, selectedFleet);
    if (!compValidation.valid) {
      if (compValidation.missingTool) {
        setIsStartJourneyOpen(false);
        setShowToolRequiredModal(true);
        return;
      }
      setLaunchError(compValidation.error || "Validación fallida.");
      if (triggerNotification) triggerNotification(`⛔ ${compValidation.error}`);
      return;
    }

    setLoading(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Usuario no autenticado');

      const deployedAssets: Asset[] = [...selectedAssets];
      if (selectedFleet) {
        if (selectedFleet.ships) deployedAssets.push(...selectedFleet.ships);
        if (selectedFleet.tools) deployedAssets.push(...selectedFleet.tools);
        if (selectedFleet.licenses) deployedAssets.push(...selectedFleet.licenses);
      }

      const launchTool = selectedAssets.find(a => isToolAsset(a.type))
        ?? (selectedFleet?.tools?.[0] as Asset | undefined)
        ?? null;

      const launchShipIds = deployedAssets
        .filter(a => isShipAsset(a.type))
        .map(a => a.id)
        .filter(Boolean);

      const { data: rpcData, error } = await supabase.rpc('launch_expedition_master_audit', {
        p_user_id: currentUser.id,
        p_cluster_id: selectedGC ?? 'STAR CLUSTER',
        p_ship_ids: launchShipIds,
        p_tool_id: launchTool?.seed_id ?? launchTool?.id ?? null
      });

      if (error) throw error;

      if (rpcData && rpcData.success === false) {
        throw new Error(rpcData.error || rpcData.message || 'Error al iniciar la expedición. Revisa los requisitos del clúster.');
      }

      setIsStartJourneyOpen(false);
      setSelectedAssets([]);
      setIsDispatchPanelActive(false);
      setCurrentStep('GC');
      setSelectedPlanet(null);

      syncDatabaseData();
      if (triggerNotification) triggerNotification(`🚀 EXPEDICIÓN DESPLEGADA (${totalExpeditionProbability}% NETO)`);
    } catch (err: any) {
      console.error("Error al desplegar expedición:", err);
      setLaunchError(err.message || "Error de comunicación");
    } finally {
      setLoading(false);
    }
  };

  const handleRecallExpedition = async (expeditionId: string) => {
    if (recallingExpeditionId) return;
    setRecallingExpeditionId(expeditionId);
    playSfx(880);

    try {
      const { data, error } = await supabase.rpc('cancel_recall_expedition', {
        p_expedition_id: expeditionId
      });

      if (error) throw error;

      if (data?.success) {
        playSfx(1200);
        if (triggerNotification) {
          triggerNotification("🚨 RETORNO TRANSMITIDO: La flota volverá a la base C.A.N. en 5 minutos.");
        }
        await syncDatabaseData();
      } else {
        throw new Error(data?.error || "Falló la orden de retorno.");
      }
    } catch (err: any) {
      console.error("Error al retornar expedición:", err);
      playSfx(300);
      if (triggerNotification) {
        triggerNotification(`⛔ ERROR: ${err.message}`);
      }
    } finally {
      setRecallingExpeditionId(null);
    }
  };

  const handleClaimExpeditionRewards = async (exp: Expedition) => {
    const returnMs = new Date(exp.estimated_return_time).getTime();
    if (now < returnMs) {
      playSfx(300);
      if (triggerNotification) triggerNotification("⛔ REQUISITO: La expedición aún no ha finalizado su tiempo de tránsito.");
      return;
    }

    if (!isValidUUID(exp.id)) {
      playSfx(300);
      if (triggerNotification) triggerNotification("⛔ IDENTIFICADOR DE EXPEDICIÓN INVÁLIDO");
      return;
    }

    setClaimingExpeditionId(exp.id);
    playSfx(880);

    try {
      const { data, error } = await supabase.rpc('claim_expedition_secure', {
        p_expedition_id: exp.id
      });

      if (error) {
        console.error("Detalle de error RPC Supabase:", error);
        throw new Error(error.message || 'Error en respuesta RPC del servidor.');
      }

      if (data && data.success) {
        playSfx(1200);

        const metalMined = Number(data.metal_mined || 0);
        const crystalMined = Number(data.crystal_mined || 0);
        const darkMatterMined = Number(data.dark_matter_mined || 0);

        const dropText = `METAL: +${metalMined.toLocaleString()} | CRISTAL: +${crystalMined.toLocaleString()}${darkMatterMined > 0 ? ` | M.O.: +${darkMatterMined.toLocaleString()}` : ''}`;

        setCurrentRewardDrop({
          name: dropText,
          amount: 1,
          rarity: "EPIC",
          icon: "💎"
        });
        setIsRewardSummaryOpen(true);

        if (triggerNotification) {
          triggerNotification(`🎉 BOTÍN EXTRAÍDO EN ${exp.sector_name.toUpperCase()}: ${dropText}`, {
            expId: exp.id,
            rewards: { metal: metalMined, crystal: crystalMined, dark_matter: darkMatterMined }
          });
        }

        await syncDatabaseData();
      } else {
        throw new Error(data?.error || 'Reclamo rechazado por el servidor.');
      }
    } catch (err: any) {
      console.error("Error al reclamar recompensas Zero-Trust:", err);
      playSfx(300);
      if (triggerNotification) triggerNotification(`⛔ ERROR AL RECLAMAR: ${err.message}`);
    } finally {
      setClaimingExpeditionId(null);
    }
  };

  const handleClaimAllExpeditions = async () => {
    const finishedFlights = getFilteredFlights().filter(exp => {
      const returnMs = new Date(exp.estimated_return_time).getTime();
      return now >= returnMs;
    });

    if (finishedFlights.length === 0) {
      if (triggerNotification) triggerNotification("⚠️ NO HAY EXPEDICIONES FINALIZADAS PARA RECLAMAR");
      return;
    }

    for (const exp of finishedFlights) {
      await handleClaimExpeditionRewards(exp);
    }
  };

  const handleAcceptRewardsClose = () => {
    playSfx(440);
    setIsRewardSummaryOpen(false);
    setCurrentRewardDrop(null);
    if (claimingExpeditionId) {
      setActiveExpeditions(prev => prev.filter(e => e.id !== claimingExpeditionId));
      setClaimingExpeditionId(null);
    }
  };

  const toggleMoreInfo = (id: string) => {
    playSfx(660);
    setExpandedExpeditionId(prev => prev === id ? null : id);
  };

  const getFilteredFlights = () => {
    return activeExpeditions.filter(exp => {
      if (exp.status === 'CLAIMED') return false;

      const expType = exp.type || 'EXPLORATION';
      if (activeFlightCategory !== 'ALL' && activeFlightCategory !== 'HISTORIAL' && expType !== activeFlightCategory) return false;

      if (flightSearchQuery.trim() !== '') {
        const query = flightSearchQuery.toLowerCase();
        return exp.fleet_name.toLowerCase().includes(query) || exp.sector_name.toLowerCase().includes(query);
      }
      return true;
    });
  };

  const hasFinishedFlights = useMemo(() => {
    return getFilteredFlights().some(exp => new Date(exp.estimated_return_time).getTime() <= now);
  }, [activeExpeditions, activeFlightCategory, flightSearchQuery, now]);

  const filteredInventory = useMemo(() => {
    if (currentLeftCategory === 'Fleets') return [];
    return inventoryAssets.filter(a => {
      const matchesCategory = a.type.toLowerCase() === currentLeftCategory.toLowerCase();
      const matchesSearch = assetSearchQuery.trim() === '' || a.name.toLowerCase().includes(assetSearchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [inventoryAssets, currentLeftCategory, assetSearchQuery]);

  const getCategoryIcon = (category: LeftMenuCategory) => {
    switch (category) {
      case 'Naves': return <Rocket className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Tools': return <Wrench className="w-3.5 h-3.5 text-amber-400" />;
      case 'Astrobots': return <Bot className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Licencia': return <FileText className="w-3.5 h-3.5 text-purple-400" />;
      case 'Consumibles': return <Package className="w-3.5 h-3.5 text-pink-400" />;
      default: return <Box className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  // 🎯 VISTA 1: FLEET IN FLIGHT (CON MARCO EXPANDIDO)
  if (initialView === 'flights') {
    return (
      <div className="w-full h-full max-h-full flex flex-col overflow-hidden py-1">
        <GalaxyFrame className="w-full max-w-7xl mx-auto h-full max-h-full flex flex-col min-h-0 font-mono text-left select-none text-white" innerPadding="p-2 sm:p-3 h-full flex flex-col min-h-0">
          <div className="flex flex-col gap-2 h-full min-h-0 flex-1 overflow-hidden">
          <div className="w-full bg-[#05070a] border border-cyan-500/30 p-2.5 sm:p-3.5 rounded-xl flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" /> EXPEDITIONS IN FLIGHT
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClaimAllExpeditions}
                disabled={!hasFinishedFlights}
                className="px-4 py-1.5 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 hover:from-amber-500 hover:to-orange-400 disabled:opacity-40 border border-amber-300/80 text-white text-[9.5px] font-black uppercase tracking-widest rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                <span>{t('expeditions.claim_all')}</span>
              </button>
              <button onClick={onBack} className="p-1 text-zinc-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="w-full bg-[#05070a] border border-cyan-500/20 p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="relative min-w-[180px] max-w-xs flex-1">
              <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-cyan-500" />
              <input
                type="text"
                placeholder="BUSCAR FLOTA..."
                value={flightSearchQuery}
                onChange={(e) => setFlightSearchQuery(e.target.value)}
                className="w-full bg-[#0a0f14] border border-cyan-950 rounded-lg pl-7 pr-2.5 py-1.5 text-[8px] text-cyan-200 placeholder-zinc-600 outline-none uppercase font-mono focus:border-cyan-500/60 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5 max-w-full">
              {['ALL', 'EXPLORATION', 'MINING', 'DOMINATION', 'HISTORIAL'].map((cat) => {
                const isDomination = cat === 'DOMINATION';
                return (
                  <button
                    key={cat}
                    disabled={isDomination}
                    onClick={() => {
                      if (!isDomination) {
                        playSfx(660);
                        setActiveFlightCategory(cat);
                      }
                    }}
                    className={`relative px-3 py-1.5 rounded-lg text-[8px] font-mono font-bold uppercase transition-all border whitespace-nowrap overflow-hidden ${
                      isDomination
                        ? 'bg-[#05080c] text-zinc-600 border-zinc-800 opacity-30 grayscale cursor-not-allowed pointer-events-none'
                        : activeFlightCategory === cat
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black shadow-[0_0_8px_rgba(6,182,212,0.3)] cursor-pointer'
                        : 'bg-[#0a0f14] text-zinc-400 border-transparent hover:text-white cursor-pointer'
                    }`}
                  >
                    {cat === 'HISTORIAL' ? 'HISTORIAL (ÚLTIMAS 10)' : cat}
                    {isDomination && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
                        <span className="text-[6px] font-black text-red-500 bg-red-950/80 px-1 py-0.5 rounded border border-red-800 shadow-sm flex items-center gap-0.5">
                          <Lock className="w-2 h-2" />
                          [ LOCKED ]
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 w-full flex flex-col gap-2 min-h-0 overflow-y-auto pr-1 font-mono custom-scrollbar">
            {activeFlightCategory === 'HISTORIAL' ? (
              completedHistory.length === 0 ? (
                <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                  NO HAY HISTORIAL DE EXPEDICIONES REGISTRADO
                </div>
              ) : (
                completedHistory.map((exp) => {
                  const isExpanded = expandedExpeditionId === exp.id;
                  const deployedAssets = resolveExpeditionAssets(exp);

                  let shipCount = 0;
                  let toolCount = 0;
                  let astrobotCount = 0;
                  let fleetCount = exp.fleet_id ? 1 : 0;

                  deployedAssets.forEach((a) => {
                    if (isShipAsset(a.type || '')) shipCount++;
                    if (isToolAsset(a.type || '')) toolCount++;
                    if (String(a.type || '').toLowerCase().includes('astrobot')) astrobotCount++;
                  });

                  return (
                    <div
                      key={exp.id}
                      className="w-full hud-panel hud-corners rounded-xl p-2.5 flex flex-col gap-2 shadow-[0_0_12px_rgba(6,182,212,0.15)] text-white text-[10px] font-mono tracking-wider transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/50 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-emerald-500 text-black font-black text-[8.5px] rounded uppercase shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                            CLAIMED
                          </span>
                          <span className="font-extrabold text-white text-[11px]">
                            EXPEDITION #{exp.id.substring(0, 4)} {exp.sc_id || exp.sector_name || 'SECTOR 1'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[9px]">
                          <span className="text-zinc-500 text-[8px]">
                            REGISTRADO: {new Date(exp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[7.5px] font-mono px-2 py-0.5 rounded font-black border bg-emerald-950 text-emerald-400 border-emerald-800">
                            FINALIZADO Y RECLAMADO
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <div className="text-[9.5px] font-bold text-cyan-200 uppercase tracking-widest">
                          Fleets: <span className="text-white">{fleetCount}</span> | Ships: <span className="text-cyan-300">{shipCount}</span> | Astrobots: <span className="text-emerald-400">{astrobotCount}</span> | Tools: <span className="text-amber-400">{toolCount}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleMoreInfo(exp.id)}
                            className="px-3 py-1 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-500 font-black text-[9px] uppercase tracking-wider rounded flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <span>MORE INFO</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="w-full bg-[#04080f] border-t border-cyan-900/60 p-3 mt-1 rounded-b-xl flex flex-col gap-3"
                          >
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-400" /> BOTÍN EXTRAÍDO Y REGISTRADO
                              </span>
                              <div className="grid grid-cols-3 gap-2 font-mono text-[8.5px] text-center">
                                <div className="bg-black/60 border border-cyan-950 p-2 rounded flex flex-col">
                                  <span className="text-zinc-500">METAL</span>
                                  <span className="text-cyan-300 font-black text-[10px]">+{Number(exp.metal_mined || 0).toLocaleString()}</span>
                                </div>
                                <div className="bg-black/60 border border-cyan-950 p-2 rounded flex flex-col">
                                  <span className="text-zinc-500">CRISTAL</span>
                                  <span className="text-purple-300 font-black text-[10px]">+{Number(exp.crystal_mined || 0).toLocaleString()}</span>
                                </div>
                                <div className="bg-black/60 border border-cyan-950 p-2 rounded flex flex-col">
                                  <span className="text-zinc-500">MATERIA OSCURA</span>
                                  <span className="text-emerald-400 font-black text-[10px]">+{Number(exp.dark_matter_mined || 0).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                                <Layers className="w-3 h-3 text-cyan-400" /> ACTIVOS Y EQUIPAMIENTO UTILIZADO ({deployedAssets.length})
                              </span>

                              {deployedAssets.length === 0 ? (
                                <span className="text-[7.5px] text-zinc-600 uppercase italic p-2 bg-black/40 rounded">
                                  SIN ACTIVOS DETALLADOS EN EL HISTORIAL
                                </span>
                              ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                  {deployedAssets.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-black/70 border border-cyan-900/60 p-1.5 rounded-lg flex flex-col items-center text-center gap-1 relative"
                                    >
                                      <div className="w-8 h-8 rounded bg-cyan-950/40 border border-cyan-800 overflow-hidden">
                                        <img
                                          src={item.image_url}
                                          alt={item.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <span className="text-[7.5px] font-bold text-white uppercase truncate w-full">
                                        {item.name}
                                      </span>
                                      <span className="text-[6.5px] text-cyan-400 uppercase font-mono">
                                        {item.type}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )
            ) : getFilteredFlights().length === 0 ? (
              <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                NO HAY OPERACIONES EN CURSO REGISTRADAS EN ESTE SECTOR
              </div>
            ) : (
              getFilteredFlights().map((exp) => {
                const launchMs = new Date(exp.launch_time).getTime();
                const returnMs = new Date(exp.estimated_return_time).getTime();
                const totalDurationMs = Math.max(1000, returnMs - launchMs);
                const destinationMs = launchMs + (totalDurationMs / 2);

                const destRemainingSec = Math.max(0, Math.floor((destinationMs - now) / 1000));
                const baseRemainingSec = Math.max(0, Math.floor((returnMs - now) / 1000));
                const elapsedSec = Math.max(0, Math.floor((now - launchMs) / 1000));

                const isFlightFinished = baseRemainingSec === 0;

                let snap: any = {};
                try {
                  if (typeof exp.expedition_snapshot === 'string') snap = JSON.parse(exp.expedition_snapshot);
                  else if (exp.expedition_snapshot) snap = exp.expedition_snapshot;
                } catch (e) {}

                const isReturning = exp.status === 'RETURNING' || Boolean(snap.recalled_at);

                const deployedAssets = resolveExpeditionAssets(exp);

                let shipCount = 0;
                let toolCount = 0;
                let astrobotCount = 0;
                let fleetCount = exp.fleet_id ? 1 : 0;

                deployedAssets.forEach((a) => {
                  if (isShipAsset(a.type || '')) shipCount++;
                  if (isToolAsset(a.type || '')) toolCount++;
                  if (String(a.type || '').toLowerCase().includes('astrobot')) astrobotCount++;
                });

                const isExpanded = expandedExpeditionId === exp.id;

                const equippedTool = deployedAssets.find(a => isToolAsset(a.type)) || null;
                const toolSkills = equippedTool?.skills || [];
                const toolName = (equippedTool?.name || '').toLowerCase();

                const isSoloMetal = toolSkills.includes('TOOL_SOLO_METAL') || toolName.includes('metal');
                const isSoloCrystal = toolSkills.includes('TOOL_SOLO_CRYSTAL') || toolName.includes('crystal') || toolName.includes('cristal');
                const canMineDarkMatter = toolSkills.includes('MINE_DARK_MATTER') || toolName.includes('dark') || toolName.includes('oscura');

                const canMetal = !isSoloCrystal;
                const canCrystal = !isSoloMetal;

                const maxMetal = exp.calculated_max_metal || 1200;
                const maxCrystal = exp.calculated_max_crystal || 600;
                const progressPct = Math.min(100, (elapsedSec / (totalDurationMs / 1000)) * 100);

                const liveMetal = canMetal ? Math.floor((progressPct / 100) * maxMetal) : 0;
                const liveCrystal = canCrystal ? Math.floor((progressPct / 100) * maxCrystal) : 0;
                const liveDarkMatter = canMineDarkMatter ? Math.floor((progressPct / 100) * 15) : 0;

                return (
                  <div
                    key={exp.id}
                    className="w-full hud-panel hud-corners rounded-xl p-2.5 flex flex-col gap-2 shadow-[0_0_12px_rgba(6,182,212,0.15)] text-white text-[10px] font-mono tracking-wider transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/50 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 text-black font-black text-[8.5px] rounded uppercase ${isReturning ? 'bg-amber-400' : 'bg-yellow-400'}`}>
                          {isReturning ? 'RET' : 'DEP'}
                        </span>
                        <span className="font-extrabold text-white text-[11px]">
                          EXPEDITION #{exp.id.substring(0, 4)} {exp.sc_id || exp.sector_name || 'SECTOR 1'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-[9px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400 font-bold uppercase">ARRIVAL DESTINATION:</span>
                          <span className="text-white font-bold">{formatSeconds(destRemainingSec)}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400 font-bold uppercase">ARRIVAL TO BASE:</span>
                          <span className="text-white font-bold">{formatSeconds(baseRemainingSec)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <div className="text-[12px] font-black text-white min-w-[50px]">
                        {formatSeconds(elapsedSec)}
                      </div>

                      <div className="text-[9.5px] font-bold text-cyan-200 uppercase tracking-widest">
                        Fleets: <span className="text-white">{fleetCount}</span> | Ships: <span className="text-cyan-300">{shipCount}</span> | Astrobots: <span className="text-emerald-400">{astrobotCount}</span> | Tools: <span className="text-amber-400">{toolCount}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isFlightFinished && (
                          <button
                            onClick={() => handleClaimExpeditionRewards(exp)}
                            disabled={claimingExpeditionId === exp.id}
                            className="px-4 py-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-[9px] uppercase tracking-wider rounded border border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)] cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                          >
                            {claimingExpeditionId === exp.id ? 'CLAIMING...' : 'CLAIM'}
                          </button>
                        )}

                        {!isFlightFinished && !isReturning && (
                          <button
                            onClick={() => handleRecallExpedition(exp.id)}
                            disabled={recallingExpeditionId === exp.id}
                            className="px-4 py-1 bg-red-600 hover:bg-red-500 text-white font-black text-[9px] uppercase tracking-wider rounded border border-red-400 shadow cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                          >
                            {recallingExpeditionId === exp.id ? 'RETURNING...' : 'RETURN'}
                          </button>
                        )}

                        <button
                          onClick={() => toggleMoreInfo(exp.id)}
                          className="px-3 py-1 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-500 font-black text-[9px] uppercase tracking-wider rounded flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                        >
                          <span>MORE INFO</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="w-full bg-[#04080f] border-t border-cyan-900/60 p-3 mt-1 rounded-b-xl flex flex-col gap-3"
                        >
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                              <Pickaxe className="w-3 h-3 text-amber-400" /> {t('expeditions.realtime_resources')}
                            </span>
                            <div className="grid grid-cols-3 gap-2 font-mono text-[8.5px] text-center">
                              <div className="bg-black/60 border border-cyan-950 p-2 rounded flex flex-col">
                                <span className="text-zinc-500">METAL</span>
                                {canMetal ? (
                                  <span className="text-cyan-300 font-black text-[10px]">+{liveMetal.toLocaleString()}</span>
                                ) : (
                                  <span className="text-red-500 font-black text-[7px] uppercase mt-1">{t('expeditions.not_compatible')}</span>
                                )}
                              </div>
                              <div className="bg-black/60 border border-cyan-950 p-2 rounded flex flex-col">
                                <span className="text-zinc-500">CRISTAL</span>
                                {canCrystal ? (
                                  <span className="text-purple-300 font-black text-[10px]">+{liveCrystal.toLocaleString()}</span>
                                ) : (
                                  <span className="text-red-500 font-black text-[7px] uppercase mt-1">{t('expeditions.not_compatible')}</span>
                                )}
                              </div>
                              <div className="bg-black/60 border border-cyan-950 p-2 rounded flex flex-col">
                                <span className="text-zinc-500">MATERIA OSCURA</span>
                                {canMineDarkMatter ? (
                                  <span className="text-emerald-400 font-black text-[10px]">+{liveDarkMatter.toLocaleString()}</span>
                                ) : (
                                  <span className="text-red-500 font-black text-[7px] uppercase mt-1">{t('expeditions.not_compatible')}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                              <Layers className="w-3 h-3 text-cyan-400" /> {t('expeditions.fleet_assets')} ({deployedAssets.length})
                            </span>

                            {deployedAssets.length === 0 ? (
                              <span className="text-[7.5px] text-zinc-600 uppercase italic p-2 bg-black/40 rounded">
                                {t('expeditions.no_detailed_assets')}
                              </span>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {deployedAssets.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-black/70 border border-cyan-900/60 p-1.5 rounded-lg flex flex-col items-center text-center gap-1 relative"
                                  >
                                    <div className="w-8 h-8 rounded bg-cyan-950/40 border border-cyan-800 overflow-hidden">
                                      <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <span className="text-[7.5px] font-bold text-white uppercase truncate w-full">
                                      {item.name}
                                    </span>
                                    <span className="text-[6.5px] text-cyan-400 uppercase font-mono">
                                      {item.type}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

          {isRewardSummaryOpen && currentRewardDrop && (
            <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 font-mono">
              <div className="w-full max-w-sm bg-[#080b0e] border border-cyan-500/40 rounded-xl p-5 text-center space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-widest">{t('expeditions.loot_claimed')}</h3>
                <div className="p-3 bg-black/60 border border-cyan-950 rounded-lg text-[9px] text-cyan-300 font-bold">
                  {currentRewardDrop.name}
                </div>
                <button
                  onClick={handleAcceptRewardsClose}
                  className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[9px] uppercase rounded-lg cursor-pointer"
                >
                  {t('expeditions.understood')}
                </button>
              </div>
            </div>
          )}
        </div>
      </GalaxyFrame>
    </div>
    );
  }

  // 🎯 VISTA 2: MAPA ORIGINAL DE SELECCIÓN Y CONFIGURACIÓN DE EXPEDICIONES
  return (
    <div className="w-full h-full max-h-full flex flex-col overflow-hidden" id="swgoh-expedition-screen">
      <GalaxyFrame className="w-full max-w-7xl mx-auto h-full max-h-full flex flex-col min-h-0 font-mono text-left select-none text-white" innerPadding="p-2 sm:p-3 h-full flex flex-col min-h-0">
        <div className="flex flex-col gap-1.5 h-full min-h-0 flex-1 overflow-hidden">
          <div className="w-full bg-[#05070a] border border-cyan-500/30 p-2.5 rounded-xl flex justify-between items-center shrink-0">
            <div className="flex flex-col gap-0.5 text-left">
              <h1 className="text-xs sm:text-sm font-black tracking-widest text-white uppercase flex items-center gap-2">
                MATRIZ DE EXPEDICIONES DE CLUSTER
              </h1>
              <p className="text-cyan-400 text-[8.5px] sm:text-[9.5px] tracking-wide font-bold uppercase leading-none">{formatBreadcrumbText()}</p>
            </div>

            <div className="flex items-center gap-2">
              {isDispatchPanelActive && (
                <button
                  onClick={() => { playSfx(660); setIsDispatchPanelActive(false); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-[8.5px] font-bold tracking-widest uppercase rounded-lg bg-cyan-950/80 transition-colors cursor-pointer"
                >
                  <CornerUpLeft className="w-3.5 h-3.5 text-cyan-400" /> RETORNAR A MAPA
                </button>
              )}
            </div>
          </div>

          {!isDispatchPanelActive ? (
            <div className="w-full flex-1 flex flex-col sm:flex-row gap-2 overflow-hidden items-stretch min-h-0">

            <div className="w-full sm:w-[300px] shrink-0 border border-cyan-500/20 bg-[#05070a] rounded-xl p-2 flex flex-col justify-between shadow-2xl h-auto">
              <div className="flex flex-col gap-2">
                
                <div className="flex items-center justify-between border-b border-cyan-950 pb-2 text-left">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-400 animate-bounce" />
                    <span className="text-[11px] font-black tracking-widest text-white uppercase">SELECCIONA COORDENADAS GC</span>
                  </div>

                  {(selectedGC || selectedGAL || selectedSC || selectedSS || selectedPlanet) && (
                    <button
                      onClick={handleStepBack}
                      className="flex items-center gap-1 px-2.5 py-1 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-[8px] font-extrabold tracking-widest uppercase rounded-lg bg-cyan-950/80 hover:bg-cyan-900/90 transition-all cursor-pointer shadow-md"
                    >
                      <CornerUpLeft className="w-3 h-3 text-cyan-400" /> VOLVER
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1 bg-black/60 p-1 rounded-lg border border-cyan-950 text-[8.5px] font-bold text-center uppercase">
                  {([
                    { id: 'GC', label: 'GC', isUnlocked: true, isSelected: selectedGC !== null },
                    { id: 'GAL', label: 'GAL', isUnlocked: selectedGC !== null, isSelected: selectedGAL !== null },
                    { id: 'SC', label: 'SC', isUnlocked: selectedGAL !== null, isSelected: selectedSC !== null },
                    { id: 'SS', label: 'SS', isUnlocked: selectedSC !== null, isSelected: selectedSS !== null },
                    { id: 'PLANETA', label: 'PLANETA', isUnlocked: selectedSS !== null && dbPlanets.length > 0, isSelected: selectedPlanet !== null }
                  ] as const).map((tab) => {
                    const isCurrent = currentStep === tab.id;
                    return (
                      <button
                        key={tab.id}
                        disabled={!tab.isUnlocked}
                        onClick={() => {
                          playSfx(660);
                          setCurrentStep(tab.id as SelectionStep);
                        }}
                        className={`py-1.5 rounded transition-all cursor-pointer flex items-center justify-center gap-0.5 border ${
                          isCurrent
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80 font-black shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                            : tab.isSelected
                            ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/60 font-bold'
                            : tab.isUnlocked
                            ? 'bg-black/40 text-zinc-400 border-cyan-950/80 hover:border-cyan-800/60'
                            : 'bg-black/20 text-zinc-700 border-zinc-900 cursor-not-allowed'
                        }`}
                      >
                        {!tab.isUnlocked && <Lock className="w-2.5 h-2.5 text-zinc-700" />}
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="p-1 flex flex-col gap-1 max-h-[40vh] sm:max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {currentStep === 'GC' && (
                    gcList.length === 0 ? (
                      <div className="p-8 text-center text-zinc-600 text-[9px] uppercase italic">
                        {loading ? 'Cargando Clústeres...' : 'No hay Galaxy Clusters registrados.'}
                      </div>
                    ) : (
                      gcList.map((gc) => {
                        const reqCheck = checkGCRequirements(gc);
                        const isSelected = selectedGC === gc.id;
                        const reqs = gc.entry_requirements || {};

                        return (
                          <div
                            key={gc.id}
                            onClick={() => {
                              if (!reqCheck.allowed) {
                                playSfx(300);
                                if (triggerNotification) triggerNotification(`🔒 ${reqCheck.reason}`);
                                return;
                              }
                              playSfx(880);
                              setSelectedGC(gc.id);
                              setSelectedGAL(null);
                              setSelectedSC(null);
                              setSelectedSS(null);
                              setSelectedPlanet(null);
                              setCurrentStep('GAL');
                            }}
                            className={`w-full p-2.5 rounded-lg border text-[9px] font-bold uppercase transition-all flex flex-col gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80 shadow-lg'
                                : reqCheck.allowed
                                ? 'bg-[#0a0f14] text-zinc-300 border-cyan-950 hover:border-cyan-800'
                                : 'bg-black/80 text-zinc-600 border-zinc-900 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-white">{gc.name}</span>
                              {!reqCheck.allowed
                                ? <Lock className="w-3 h-3 text-red-500 shrink-0" />
                                : <span className="text-[7.5px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded font-black">OK</span>
                              }
                            </div>
                            <div className="text-[7px] text-zinc-400 font-mono space-y-0.5">
                              {reqs.prev_gc && (
                                <p className={reqCheck.allowed ? "text-emerald-400" : "text-amber-400 font-bold"}>
                                  • Req: {reqs.required_prev_count || 0} exp. en {reqs.prev_gc} ({completedCountsByGC[reqs.prev_gc] || 0}/{reqs.required_prev_count || 0})
                                </p>
                              )}
                              <p>
                                • Req: {reqs.require_ship ? 'Nave ' : ''}
                                {reqs.require_tool ? '+ Tool ' : ''}
                                {reqs.require_license ? '+ Licencia ' : ''}
                                {reqs.require_non_nft ? '+ Nave NO-NFT' : ''}
                              </p>
                              <p className="text-zinc-600">• ID: {gc.id}</p>
                            </div>
                          </div>
                        );
                      })
                    )
                  )}

                  {currentStep === 'GAL' && (
                    dbGalaxies.length === 0 ? (
                      <div className="p-4 text-center text-zinc-600 text-[9px] uppercase italic">No hay galaxias en este GC.</div>
                    ) : (
                      dbGalaxies.map((gal) => {
                        const isSelected = selectedGAL === gal.id;
                        return (
                          <button 
                            key={gal.id} 
                            onClick={() => {
                              playSfx(880);
                              setSelectedGAL(gal.id);
                              setSelectedSC(null);
                              setSelectedSS(null);
                              setSelectedPlanet(null);
                              setCurrentStep('SC');
                            }} 
                            className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase cursor-pointer text-left transition-all ${
                              isSelected ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-md' : 'bg-[#0a0f14] border-cyan-950 text-zinc-300 hover:border-cyan-800'
                            }`}
                          >
                            {gal.name}
                          </button>
                        );
                      })
                    )
                  )}

                  {currentStep === 'SC' && (
                    dbStarClusters.length === 0 ? (
                      <div className="p-4 text-center text-zinc-600 text-[9px] uppercase italic">No hay Star Clusters en esta galaxia.</div>
                    ) : (
                      dbStarClusters.map((sc) => {
                        const isSelected = selectedSC === sc.id;
                        return (
                          <button 
                            key={sc.id} 
                            onClick={() => {
                              playSfx(880);
                              setSelectedSC(sc.id);
                              setCurrentStep('SS');
                            }} 
                            className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase cursor-pointer text-left transition-all ${
                              isSelected ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-md' : 'bg-[#0a0f14] border-cyan-950 text-zinc-300 hover:border-cyan-800'
                            }`}
                          >
                            {sc.name}
                          </button>
                        );
                      })
                    )
                  )}

                  {currentStep === 'SS' && (
                    dbStarSystems.length === 0 ? (
                      <div className="p-3.5 bg-cyan-950/20 border border-cyan-900/50 rounded-xl text-center space-y-3 my-2">
                        <p className="text-[8.5px] text-zinc-300 font-bold uppercase leading-relaxed">
                          No has descubierto ningún Star System en este Star Cluster
                        </p>
                        <button
                          onClick={() => { playSfx(880); setIsDispatchPanelActive(true); }}
                          className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 border border-cyan-400 text-white font-black text-[9px] uppercase rounded-lg shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                        >
                          ARMAR FLOTA
                        </button>
                      </div>
                    ) : (
                      dbStarSystems.map((ss) => {
                        const isSelected = selectedSS === ss.id;
                        return (
                          <button 
                            key={ss.id} 
                            onClick={() => {
                              playSfx(880);
                              setSelectedSS(ss.id);
                              setCurrentStep('PLANETA');
                            }} 
                            className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase cursor-pointer text-left ${
                              isSelected ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-[#0a0f14] border-cyan-950 text-zinc-300 hover:border-cyan-800'
                            }`}
                          >
                            {ss.name}
                          </button>
                        );
                      })
                    )
                  )}

                  {currentStep === 'PLANETA' && (
                    dbPlanets.length === 0 ? (
                      <div className="p-3 bg-cyan-950/20 border border-cyan-900/50 rounded-xl text-center space-y-2">
                        <p className="text-[8px] text-zinc-400 uppercase">{t('expeditions.no_planets')}</p>
                        <button onClick={() => { playSfx(880); setIsAdrift(true); setIsDispatchPanelActive(true); }} className="w-full py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-black text-[8.5px] uppercase rounded-lg shadow cursor-pointer">
                          {t('expeditions.config_adrift')}
                        </button>
                      </div>
                    ) : (
                      dbPlanets.map((planet) => {
                        const isSelected = selectedPlanet?.id === planet.id;
                        return (
                          <div 
                            key={planet.id} 
                            onClick={() => {
                              playSfx(880);
                              setSelectedPlanet(planet);
                              setIsAdrift(false);
                              setIsDispatchPanelActive(true);
                            }} 
                            className={`p-2.5 rounded-lg border cursor-pointer text-left space-y-1 transition-all ${
                              isSelected ? 'bg-cyan-950 border-cyan-400' : 'bg-[#0a0f14] border-cyan-950 hover:border-cyan-800'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[9.5px] font-extrabold text-white uppercase">{planet.name}</span>
                              <span className="text-[7.5px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded font-bold uppercase">{planet.type}</span>
                            </div>
                            <p className="text-[7.5px] text-zinc-400">⏱️ {t('expeditions.time')}: {planet.duration_hours || 2}h | ⚠️ {t('expeditions.risk')}: {planet.risk_factor || 15}%</p>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              </div>

              <div className="p-2 border-t border-cyan-950 bg-black/60 rounded-lg text-[8.5px] text-zinc-500 font-bold uppercase">
                <span>{t('expeditions.breadcrumb_route')}: {formatBreadcrumbText()}</span>
              </div>
            </div>

            <div className="flex-1 border border-cyan-500/30 bg-[#05070a] rounded-xl overflow-hidden flex flex-col h-full shadow-2xl">
              
              <div className="h-[70%] w-full relative overflow-hidden flex items-center justify-center bg-black/40">
                {isInaraSelected && (
                  <video
                    key="gc-presentation-video-top"
                    src="https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/GCs,Galaxias%20y%20demas/GC1.webm"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover pointer-events-none border-0 outline-none"
                  />
                )}
              </div>

              <div className="flex-shrink-0 w-full border-t border-cyan-500/30 flex items-center justify-center p-2 sm:p-4 bg-[#020508]/80">
                {selectedSC && (
                  <button
                    onClick={() => { playSfx(880); setIsDispatchPanelActive(true); }}
                    className="px-8 py-3.5 bg-gradient-to-r from-cyan-600 to-teal-600 border border-cyan-400 text-white text-[11px] font-black uppercase rounded-lg shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                  >
                    ARMAR FLOTA
                  </button>
                )}
              </div>

            </div>

          </div>
        ) : (
          <div className="h-full max-h-full grid grid-cols-12 gap-2 p-1 sm:p-2 overflow-hidden flex-1 min-h-0">
            {/* Columna Izquierda (Filtros de Flota y Extracción) */}
            <div className="col-span-4 sm:col-span-3 h-full flex flex-col justify-between overflow-hidden bg-[#05080c]/80 border border-cyan-500/30 p-2 rounded">
              <div className="flex flex-col gap-1 shrink-0 overflow-y-auto">
                <span className="text-[8px] font-bold text-zinc-400 uppercase px-1 pb-1 border-b border-cyan-950">
                  SELECCIONAR CATEGORÍA
                </span>
                {leftMenuOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { playSfx(660); setCurrentLeftCategory(opt as LeftMenuCategory); }}
                    className={`w-full text-left px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold uppercase border cursor-pointer flex items-center gap-1.5 ${
                      currentLeftCategory === opt ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black' : 'bg-[#0a0f14] text-zinc-400 border-transparent hover:text-zinc-200'
                    }`}
                  >
                    {getCategoryIcon(opt as LeftMenuCategory)}
                    <span className="truncate">{opt}</span>
                  </button>
                ))}
              </div>

              <div className="mt-auto space-y-1 shrink-0 pt-1.5 border-t border-cyan-950/60">
                 <div className="bg-[#020508] py-1 px-2 mb-1 rounded border border-cyan-900/50 flex flex-col gap-0.5 text-[10px] sm:text-xs font-mono">
                   <div className="flex items-center justify-between">
                     <span className="text-cyan-400 font-bold uppercase text-[9px] sm:text-[10px]">{t('expeditions.estimated_extraction_range')}</span>
                     {isSoloMetal && (
                       <span className="text-[7px] bg-amber-950 text-amber-400 border border-amber-800 px-1 py-0.5 rounded font-black uppercase">{t('expeditions.metal_only')}</span>
                     )}
                     {isSoloCrystal && (
                       <span className="text-[7px] bg-purple-950 text-purple-400 border border-purple-800 px-1 py-0.5 rounded font-black uppercase">{t('expeditions.crystal_only')}</span>
                     )}
                   </div>
                   <div className="flex justify-between items-center text-[8.5px] sm:text-[9.5px]">
                     <span className="text-zinc-400">Metal:</span>
                     {isSoloCrystal ? (
                       <span className="text-red-500 font-black text-[7px] uppercase tracking-wide">{t('expeditions.disabled_tool')}</span>
                     ) : (
                       <span className="text-cyan-300 font-bold">[{dynamicMiningRanges.minMetal.toLocaleString()} ~ {dynamicMiningRanges.maxMetal.toLocaleString()}]</span>
                     )}
                   </div>
                   <div className="flex justify-between items-center text-[8.5px] sm:text-[9.5px]">
                     <span className="text-zinc-400">Cristal:</span>
                     {isSoloMetal ? (
                       <span className="text-red-500 font-black text-[7px] uppercase tracking-wide">{t('expeditions.disabled_tool')}</span>
                     ) : (
                       <span className="text-purple-300 font-bold">[{dynamicMiningRanges.minCrystal.toLocaleString()} ~ {dynamicMiningRanges.maxCrystal.toLocaleString()}]</span>
                     )}
                   </div>
                 </div>

                <button
                  onClick={handleOpenJourneyModal}
                  className="shrink-0 w-full py-1.5 sm:py-2 text-xs font-bold hud-chamfer-sm bg-gradient-to-r from-cyan-600 to-teal-600 text-white uppercase rounded border border-cyan-400 shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                >
                  {selectedPlanet ? t('expeditions.confirm_mining') : t('expeditions.confirm_recon')} ({totalExpeditionProbability}%)
                </button>
              </div>
            </div>

            {/* Columna Derecha (Catálogo y Flota Activa - Split 50/50) */}
            <div className="col-span-8 sm:col-span-9 h-full min-h-0 flex flex-col gap-2 overflow-hidden p-2 bg-[#05080c]/70 border border-cyan-500/30 rounded-xl">
              
              {/* ── PARTE SUPERIOR: CATÁLOGO DE ACTIVOS DISPONIBLES ── */}
              <div className="h-[48%] min-h-0 flex flex-col bg-[#03060a]/80 border border-cyan-900/50 rounded-lg p-2 overflow-hidden">
                <div className="shrink-0 flex items-center justify-between pb-1.5 mb-1.5 border-b border-cyan-950">
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider truncate">
                    {t('expedition.available_ships', `DISPONIBLES: ${currentLeftCategory.toUpperCase()}`)} ({filteredInventory.length})
                  </span>
                  {currentLeftCategory !== 'Fleets' && (
                    <div className="relative w-44">
                      <Search className="absolute left-2 top-1.5 w-3 h-3 text-cyan-500" />
                      <input
                        type="text"
                        placeholder="BUSCAR POR NOMBRE..."
                        value={assetSearchQuery}
                        onChange={(e) => setAssetSearchQuery(e.target.value)}
                        className="w-full h-6 text-[10px] bg-black/70 border border-cyan-500/30 pl-6 pr-6 rounded font-mono text-cyan-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 uppercase"
                      />
                      {assetSearchQuery && (
                        <button onClick={() => setAssetSearchQuery('')} className="absolute right-1.5 top-1.5 text-zinc-500 hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 grid grid-cols-2 md:grid-cols-4 gap-1.5 custom-scrollbar content-start">
                  {currentLeftCategory === 'Fleets' ? (
                    fleets.length === 0 ? (
                      <div className="col-span-full p-4 text-center text-zinc-600 text-[8.5px] uppercase tracking-widest font-mono">
                        NO HAY FLOTAS REGISTRADAS EN TU PERFIL
                      </div>
                    ) : (
                      fleets.map(fleet => {
                        const isSelected = selectedFleet?.id === fleet.id;
                        return (
                          <div
                            key={fleet.id}
                            onClick={() => {
                              playSfx(880);
                              setSelectedFleet(isSelected ? null : fleet);
                            }}
                            className={`p-2 rounded-lg border cursor-pointer flex flex-col justify-between transition-all ${
                              isSelected ? 'bg-cyan-950/90 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : 'bg-[#050910] border-cyan-950 hover:border-cyan-800'
                            }`}
                          >
                            <span className="text-[8.5px] font-black text-white uppercase truncate">{fleet.name}</span>
                            <span className="text-[7px] text-cyan-400 font-mono mt-1">PODER: {fleet.total_power_score} POW</span>
                          </div>
                        );
                      })
                    )
                  ) : filteredInventory.length === 0 ? (
                    <div className="col-span-full p-4 text-center text-zinc-600 text-[8.5px] uppercase tracking-widest font-mono">
                      {assetSearchQuery ? `SIN COINCIDENCIAS PARA "${assetSearchQuery.toUpperCase()}"` : `SIN ACTIVOS EN [${currentLeftCategory.toUpperCase()}]`}
                    </div>
                  ) : (
                    filteredInventory.map(asset => {
                      const isSelected = selectedAssets.some(a => a.id === asset.id);
                      
                      const isShip = isShipAsset(asset.type);
                      const isTool = isToolAsset(asset.type);
                      const isInFlight = busyAssetIds.has(asset.id) || 
                        (asset.seed_id && (
                          (isShip && busyShipIds.has(asset.seed_id)) || 
                          (isTool && busyToolIds.has(asset.seed_id))
                        ));

                      const effectVal = asset.effect || 0;

                      return (
                        <div
                          key={asset.id}
                          onClick={() => {
                            if (!isInFlight) toggleAssetSelection(asset);
                          }}
                          className={`p-1.5 rounded-lg border flex items-center gap-2 transition-all relative ${
                            isInFlight 
                              ? 'bg-red-950/20 border-red-900/60 opacity-50 pointer-events-none' 
                              : isSelected 
                              ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)] cursor-pointer' 
                              : 'bg-[#050910] border-cyan-950 hover:border-cyan-800 cursor-pointer'
                          }`}
                        >
                          <div className="w-8 h-8 rounded bg-black border border-cyan-950 shrink-0 overflow-hidden relative">
                            <img src={asset.image_url} className={`w-full h-full object-cover ${isInFlight ? 'grayscale' : ''}`} alt={asset.name} />
                            {isSelected && !isInFlight && (
                              <div className="absolute inset-0 bg-cyan-500/30 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-cyan-300 stroke-[3]" />
                              </div>
                            )}
                            {isInFlight && (
                              <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center backdrop-blur-[1px]">
                                <span className="text-[5px] text-white font-black uppercase text-center leading-tight shadow-black drop-shadow-md">
                                  EN MISIÓN
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col text-left overflow-hidden flex-1 leading-tight">
                            <span className="text-[8px] font-black text-white truncate">{asset.name}</span>
                            {isInFlight ? (
                              <span className="text-[6.5px] text-red-400 font-mono font-black uppercase">{t('expeditions.in_flight')}</span>
                            ) : effectVal !== 0 ? (
                              <span className={`text-[6.5px] font-mono font-bold ${effectVal > 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                                {effectVal > 0 ? `+${effectVal.toFixed(1)}%` : `${effectVal.toFixed(1)}%`}
                              </span>
                            ) : (
                              <span className="text-[6.5px] text-zinc-500 font-mono uppercase">{asset.rarity}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── PARTE INFERIOR: BANDEJA CLÁSICA DE ACTIVOS SELECCIONADOS ── */}
              <div className="h-[52%] min-h-0 flex flex-col justify-between bg-[#03060a]/90 border border-cyan-900/50 rounded-lg p-2 overflow-hidden">
                
                {/* 1. Header de Selección y Botón Limpiar */}
                <div className="shrink-0 flex items-center justify-between pb-1 border-b border-cyan-950">
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                    {t('expeditions.selected_assets_title', 'ACTIVOS SELECCIONADOS PARA DESPLIEGUE')} ({selectedAssets.length + (selectedFleet ? 1 : 0)})
                  </span>
                  {(selectedAssets.length > 0 || selectedFleet) && (
                    <button
                      onClick={() => {
                        playSfx(440);
                        setSelectedAssets([]);
                        setSelectedFleet(null);
                      }}
                      className="text-[9px] font-mono text-red-400 hover:text-red-300 font-bold uppercase cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-2.5 h-2.5" /> [🗑 {t('expeditions.clean_selection', 'LIMPIAR SELECCIÓN')}]
                    </button>
                  )}
                </div>

                {/* 2. Bandeja Clásica Horizontal */}
                <div className="flex-1 min-h-0 my-1 overflow-x-auto no-scrollbar flex items-center gap-2 py-1">
                  {selectedAssets.length === 0 && !selectedFleet ? (
                    <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-zinc-500 uppercase tracking-widest border border-dashed border-cyan-950 rounded p-2 text-center">
                      {t('expeditions.click_to_add_hint', 'HAZ CLIC EN LOS ACTIVOS DE ARRIBA PARA AÑADIRLOS A ESTA EXPEDICIÓN')}
                    </div>
                  ) : (
                    <>
                      {selectedFleet && (
                        <div
                          onClick={() => { playSfx(440); setSelectedFleet(null); }}
                          className="w-[120px] sm:w-[135px] shrink-0 h-full max-h-[75px] bg-[#05080c] border border-purple-500/60 rounded p-1.5 flex items-center gap-2 relative group cursor-pointer hover:border-purple-400 transition-all"
                        >
                          <div className="w-8 h-8 rounded bg-purple-900/60 border border-purple-800 shrink-0 flex items-center justify-center font-black text-purple-200 text-[10px]">
                            FLT
                          </div>
                          <div className="flex flex-col text-left overflow-hidden flex-1 leading-tight">
                            <span className="text-[8px] font-black text-white truncate">{selectedFleet.name}</span>
                            <span className="text-[6.5px] text-purple-300 font-mono font-bold">{t('expeditions.fleet_equipped')}</span>
                          </div>
                          <div className="absolute -top-1 -right-1 bg-red-950 border border-red-500 text-red-300 rounded-full w-3.5 h-3.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-2 h-2" />
                          </div>
                        </div>
                      )}

                      {selectedAssets.map(asset => {
                        const effectVal = asset.effect || 0;
                        return (
                          <div
                            key={`selected-${asset.id}`}
                            onClick={() => toggleAssetSelection(asset)}
                            className="w-[120px] sm:w-[135px] shrink-0 h-full max-h-[75px] bg-[#05080c] border border-cyan-500/50 rounded p-1.5 flex items-center gap-2 relative group cursor-pointer hover:border-cyan-300 transition-all"
                          >
                            <div className="w-8 h-8 rounded bg-black border border-cyan-900 shrink-0 overflow-hidden">
                              <img src={asset.image_url} className="w-full h-full object-cover" alt={asset.name} />
                            </div>
                            <div className="flex flex-col text-left overflow-hidden flex-1 leading-tight">
                              <span className="text-[8px] font-black text-white truncate">{asset.name}</span>
                              {effectVal !== 0 ? (
                                <span className={`text-[6.5px] font-mono font-bold ${effectVal > 0 ? 'text-cyan-300' : 'text-red-300'}`}>
                                  {effectVal > 0 ? `+${effectVal.toFixed(1)}%` : `${effectVal.toFixed(1)}%`}
                                </span>
                              ) : (
                                <span className="text-[6.5px] text-cyan-400/70 font-mono uppercase">{asset.type}</span>
                              )}
                            </div>
                            <div className="absolute -top-1 -right-1 bg-red-950 border border-red-500 text-red-300 rounded-full w-3.5 h-3.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-2 h-2" />
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* 3. Consolidado Táctico de Stats (DEFENSIVO) */}
                {selectedAssets && selectedAssets.length > 0 && (
                  <div className="shrink-0 w-full py-1 px-1.5 bg-[#020509]/95 border border-cyan-500/25 rounded flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar font-mono text-[8px] sm:text-[9px] select-none my-0.5">
                    
                    {/* GRUPO 1: MATRIZ OFENSIVA */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-red-950/30 border border-red-500/30 px-1.5 py-0.5 rounded">
                      <span className="text-red-400 font-bold uppercase tracking-wider text-[7.5px] border-r border-red-900/60 pr-1.5">
                        OFENSIVA
                      </span>
                      <span className="text-white font-bold" title="Ataque Cinético Base">
                        ⚔ {fleetTotalStats.attack} <span className="text-zinc-500 text-[7px]">DMG</span>
                      </span>
                      {fleetTotalStats.laserAttack > 0 && (
                        <span className="text-cyan-300 font-bold" title="Láser">
                          ⚡ {fleetTotalStats.laserAttack} <span className="text-cyan-600 text-[7px]">LAS</span>
                        </span>
                      )}
                      {fleetTotalStats.plasmaAttack > 0 && (
                        <span className="text-purple-300 font-bold" title="Plasma">
                          🟣 {fleetTotalStats.plasmaAttack} <span className="text-purple-600 text-[7px]">PLS</span>
                        </span>
                      )}
                      {fleetTotalStats.ionAttack > 0 && (
                        <span className="text-blue-300 font-bold" title="Iónico">
                          🔷 {fleetTotalStats.ionAttack} <span className="text-blue-600 text-[7px]">ION</span>
                        </span>
                      )}
                      {fleetTotalStats.gravitonAttack > 0 && (
                        <span className="text-emerald-300 font-bold" title="Gravitón">
                          🌀 {fleetTotalStats.gravitonAttack} <span className="text-emerald-600 text-[7px]">GRV</span>
                        </span>
                      )}
                    </div>

                    {/* GRUPO 2: BLINDAJE Y DEFENSIVO */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-cyan-950/30 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                      <span className="text-cyan-400 font-bold uppercase tracking-wider text-[7.5px] border-r border-cyan-900/60 pr-1.5">
                        DEFENSIVO
                      </span>
                      <span className="text-white font-bold" title="Casco / HP">
                        💚 {fleetTotalStats.health} <span className="text-zinc-500 text-[7px]">HP</span>
                      </span>
                      <span className="text-purple-400 font-bold" title="Escudos">
                        🛡 {fleetTotalStats.shield} <span className="text-purple-600 text-[7px]">SHD</span>
                      </span>
                      <span className="text-cyan-300 font-bold" title="Defensa">
                        🔰 {fleetTotalStats.defense} <span className="text-cyan-600 text-[7px]">DEF</span>
                      </span>
                      <span className="text-amber-400 font-bold" title="Velocidad de Flota">
                        🚀 {fleetTotalStats.speed} <span className="text-amber-600 text-[7px]">SPD</span>
                      </span>
                    </div>

                    {/* GRUPO 3: LOGÍSTICA Y EXTRACCIÓN */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-amber-950/30 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      <span className="text-amber-400 font-bold uppercase tracking-wider text-[7.5px] border-r border-amber-900/60 pr-1.5">
                        LOGÍSTICA
                      </span>
                      <span className="text-amber-300 font-bold" title="Capacidad de Carga">
                        📦 {fleetTotalStats.cargo.toLocaleString()} <span className="text-amber-600 text-[7px]">U</span>
                      </span>
                      {fleetTotalStats.production > 0 && (
                        <span className="text-emerald-400 font-bold" title="Bonificación de Producción">
                          ⛏ +{fleetTotalStats.production}%
                        </span>
                      )}
                    </div>

                  </div>
                )}

                {/* 4. Pie: Probabilidad de Descubrimiento SS */}
                <div className="shrink-0 pt-1 border-t border-cyan-950 flex items-center justify-between text-[8px] sm:text-[9px] font-mono">
                  <span className="text-zinc-400 font-bold uppercase truncate">
                    {selectedPlanet ? "EFICIENCIA DE EXTRACCIÓN:" : "PROBABILIDAD DESCUBRIMIENTO SS:"}
                  </span>
                  <span className={`font-black ${totalExpeditionProbability >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    {totalExpeditionProbability}%
                  </span>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* MODAL: HERRAMIENTA REQUERIDA */}
        {showToolRequiredModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4 font-mono">
            <div className="w-full max-w-md bg-[#080b0e] border-2 border-cyan-500/80 rounded-2xl p-6 text-center space-y-4 shadow-[0_0_35px_rgba(6,182,212,0.3)]">
              <h3 className="text-sm font-black text-white uppercase tracking-widest pt-2">
                {t('expeditions.tool_required_title')}
              </h3>
              
              <p className="text-[9.5px] text-zinc-300 leading-relaxed font-sans normal-case bg-black/50 p-3 rounded-xl border border-cyan-950">
                {t('expeditions.tool_requirement')}
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => {
                    playSfx(880);
                    setShowToolRequiredModal(false);
                    setCurrentLeftCategory('Tools');
                  }}
                  className="py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-[9px] font-black uppercase rounded-lg border border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)] cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                >
                  {t('expeditions.select_tool')}
                </button>
                <button
                  onClick={() => {
                    playSfx(440);
                    setShowToolRequiredModal(false);
                  }}
                  className="py-2.5 bg-black border border-zinc-800 text-zinc-400 text-[9px] font-bold uppercase rounded-lg hover:text-white cursor-pointer"
                >
                  {t('expeditions.understood')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CONFIRMACIÓN DE LANZAMIENTO */}
        {isStartJourneyOpen && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 font-mono">
            <div className="w-full max-w-md bg-[#080b0e] border border-cyan-500/40 rounded-2xl p-6 text-center space-y-4">
              <h3 className="text-lg font-black text-white uppercase">{t('expeditions.launch_title')}</h3>
              <p className="text-xs text-amber-400 font-bold">
                {selectedPlanet ? "MODIFICADOR NETO:" : "PROBABILIDAD ESTIMADA:"} {totalExpeditionProbability}%
              </p>
              
              {launchError && (
                <div className="p-3 bg-red-950/80 border border-red-500 text-red-300 text-[9px] uppercase font-bold rounded-lg">
                  {launchError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={executeLaunchTransaction} disabled={loading} className="py-2.5 bg-cyan-950 border border-cyan-500 text-cyan-300 text-[10px] font-black uppercase rounded-lg hover:bg-cyan-900 cursor-pointer">{t('expeditions.confirm_journey')}</button>
                <button onClick={() => { playSfx(440); setIsStartJourneyOpen(false); }} className="py-2.5 bg-black border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase rounded-lg hover:bg-zinc-900 cursor-pointer">{t('expeditions.cancel')}</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: RECOMPENSAS */}
        {isRewardSummaryOpen && (
          <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 font-mono">
            <div className="w-[480px] bg-[#080b0e] border border-cyan-500/40 rounded-xl flex flex-col overflow-hidden shadow-2xl h-[320px]">
              <div className="w-full grid grid-cols-3 bg-[#05070a] border-b border-cyan-950 text-center text-[10px] font-black uppercase">
                <button onClick={() => setActiveRewardTab('ITEMS')} className={`py-2.5 ${activeRewardTab === 'ITEMS' ? 'bg-[#0a0f14] text-cyan-400' : 'text-zinc-500'}`}>ITEMS (1)</button>
                <button onClick={() => setActiveRewardTab('CURRENCIES')} className={`py-2.5 ${activeRewardTab === 'CURRENCIES' ? 'bg-cyan-500 text-black font-black' : 'text-zinc-500'}`}>{t('expeditions.resources')}</button>
                <button onClick={() => setActiveRewardTab('LTD_CUR')} className={`py-2.5 ${activeRewardTab === 'LTD_CUR' ? 'bg-[#0a0f14] text-cyan-400' : 'text-zinc-500'}`}>LTD</button>
              </div>
              <div className="flex-1 p-6 flex items-center justify-center bg-black/40">
                {activeRewardTab === 'ITEMS' && (
                  <div className="w-80 border border-cyan-500/40 bg-[#05070a] rounded-xl flex flex-col items-center p-4 text-center gap-3">
                    <span className="text-[10px] font-black text-cyan-400 uppercase">{currentRewardDrop ? currentRewardDrop.rarity : 'RARE'}</span>
                    <div className="text-4xl">{currentRewardDrop ? currentRewardDrop.icon : '💎'}</div>
                    <span className="text-[10px] font-bold text-white uppercase">{currentRewardDrop ? currentRewardDrop.name : t('expeditions.loot_obtained')}</span>
                  </div>
                )}
              </div>
              <button onClick={handleAcceptRewardsClose} className="w-full py-2.5 bg-cyan-950 hover:bg-cyan-900 border-t border-cyan-950 text-cyan-300 text-[11px] font-black uppercase cursor-pointer">{t('expeditions.accept')}</button>
            </div>
          </div>
        )}
      </div>
    </GalaxyFrame>
  </div>
);
};

export const ExpeditionsView = ExpeditionView;
export default ExpeditionView;
```

---

## src/components/FleetManager.tsx

```tsx
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, ChevronRight, Check, Zap, ArrowLeft, RefreshCw, Layers } from "lucide-react";
import { supabase } from "../lib/supabase";
import { InventoryItem } from "../lib/inventoryService";
import { useAudioEngine } from "../hooks/useAudioEngine";
import { GalaxyFrame } from "./CanView";

export interface SasoriFleet {
  id: string;
  name: string;
  total_power_score: number;
  ships?: any[];
}

type FleetViewMode = "LIST" | "CREATE_WIZARD";
type WizardStep = 0 | 1 | 2 | 3 | 4;

interface FleetManagerProps {
  characters: InventoryItem[];
  triggerNotification: (text: string, e?: any) => void;
}

export const FleetManager: React.FC<FleetManagerProps> = ({ characters, triggerNotification }) => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [viewMode, setViewMode] = useState<FleetViewMode>("LIST");
  const [fleets, setFleets] = useState<SasoriFleet[]>([]);
  const [loadingFleets, setLoadingFleets] = useState(true);

  // Wizard State
  const [wizardStep, setWizardStep] = useState<WizardStep>(0);
  const [fleetName, setFleetName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("ALL");

  const [selectedShips, setSelectedShips] = useState<InventoryItem[]>([]);
  const [selectedAstrobots, setSelectedAstrobots] = useState<InventoryItem[]>([]);
  const [selectedTools, setSelectedTools] = useState<InventoryItem[]>([]);
  const [selectedConsumables, setSelectedConsumables] = useState<InventoryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { playSfx } = useAudioEngine();

  const loadFleets = async () => {
    if (!userId) return;
    setLoadingFleets(true);
    
    const { data, error } = await supabase
      .from("fleets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setFleets(data as SasoriFleet[]);
    } else {
      setFleets([]);
    }

    setLoadingFleets(false);
  };

  useEffect(() => {
    if (viewMode === "LIST") {
      loadFleets();
    }
  }, [viewMode, userId]);

  const resetWizard = () => {
    setFleetName("");
    setSelectedShips([]);
    setSelectedAstrobots([]);
    setSelectedTools([]);
    setSelectedConsumables([]);
    setWizardStep(0);
    setSearchQuery("");
    setRarityFilter("ALL");
  };

  const handleStartWizard = () => {
    playSfx(880);
    resetWizard();
    setViewMode("CREATE_WIZARD");
  };

  const handleNextStep = (e: React.MouseEvent) => {
    if (wizardStep === 0 && fleetName.trim().length < 3) {
      triggerNotification("⚠️ EL NOMBRE DE LA FLOTA DEBE TENER AL MENOS 3 CARACTERES", e);
      return;
    }
    if (wizardStep === 1 && selectedShips.length === 0) {
      triggerNotification("⚠️ DEBES ASIGNAR AL MENOS UNA NAVE PRINCIPAL", e);
      return;
    }
    playSfx(660);
    setSearchQuery("");
    setRarityFilter("ALL");
    setWizardStep((prev) => (prev + 1) as WizardStep);
  };

  const toggleItemSelection = (item: InventoryItem, step: WizardStep) => {
    playSfx(1200);
    if (step === 1) {
      if (selectedShips.find(s => s.id === item.id)) setSelectedShips(prev => prev.filter(s => s.id !== item.id));
      else setSelectedShips(prev => [...prev, item]);
    } else if (step === 2) {
      if (selectedAstrobots.find(s => s.id === item.id)) setSelectedAstrobots(prev => prev.filter(s => s.id !== item.id));
      else setSelectedAstrobots(prev => [...prev, item]);
    } else if (step === 3) {
      if (selectedTools.find(s => s.id === item.id)) setSelectedTools(prev => prev.filter(s => s.id !== item.id));
      else setSelectedTools(prev => [...prev, item]);
    } else if (step === 4) {
      if (selectedConsumables.find(s => s.id === item.id)) setSelectedConsumables(prev => prev.filter(s => s.id !== item.id));
      else setSelectedConsumables(prev => [...prev, item]);
    }
  };

  const handleSubmitFleet = async (e: React.MouseEvent) => {
    if (!userId) return;
    setIsSubmitting(true);
    playSfx(440);

    try {
      const shipIds = selectedShips.map(s => s.id);
      const astrobotIds = selectedAstrobots.map(a => a.id);
      const toolIds = selectedTools.map(t => t.id);
      const consumableIds = selectedConsumables.map(c => c.id);

      const { data, error } = await supabase.rpc("create_custom_fleet_secure", {
        p_fleet_name: fleetName.trim(),
        p_ship_ids: shipIds,
        p_astrobot_ids: astrobotIds,
        p_tool_ids: toolIds,
        p_consumable_ids: consumableIds
      });

      if (error) throw error;

      if (data && data.success) {
        triggerNotification(`✅ FLOTA "${fleetName.toUpperCase()}" REGISTRADA EXITOSAMENTE (${data.total_power} POW)`, e);
        playSfx(1400);
        setViewMode("LIST");
      } else {
        throw new Error(data?.error || "Transacción rechazada por la red.");
      }
    } catch (err: any) {
      console.error("Error al registrar flota:", err);
      triggerNotification(`⚠️ ERROR AL REGISTRAR FLOTA: ${err.message}`, e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPhaseItems = () => {
    let filtered = characters.filter(c => {
      const catLower = (c.category || '').toLowerCase();
      if (wizardStep === 1) return catLower.includes('ship') || catLower.includes('nave') || catLower.includes('spaceships');
      if (wizardStep === 2) return catLower.includes('astrobot');
      if (wizardStep === 3) return catLower.includes('tool') || catLower.includes('herramienta');
      if (wizardStep === 4) return catLower.includes('consumable') || catLower.includes('consumible');
      return false;
    });

    if (rarityFilter !== "ALL") {
      filtered = filtered.filter(c => (c.rarity || '').toUpperCase() === rarityFilter.toUpperCase());
    }

    if (searchQuery.trim() !== "") {
      const sq = searchQuery.toLowerCase();
      filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(sq) || (c.fullname || '').toLowerCase().includes(sq));
    }

    return filtered;
  };

  const phaseItems = getPhaseItems();

  const renderSelectionGrid = (step: WizardStep) => {
    return (
      <div className="flex flex-col h-full gap-4 font-mono">
        <div className="flex flex-wrap items-center gap-3 bg-cyan-950/20 border border-cyan-900/40 p-3 rounded-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-cyan-500" />
            <input 
              type="text" 
              placeholder="BUSCAR COMPONENTE..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/60 border border-cyan-800 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono tracking-wider text-cyan-100 placeholder-cyan-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/50 uppercase"
            />
          </div>
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="bg-black/60 border border-cyan-800 text-cyan-400 text-[10px] font-mono tracking-widest px-3 py-2 rounded-lg outline-none focus:border-cyan-400 appearance-none uppercase cursor-pointer"
          >
            <option value="ALL">TODAS LAS RAREZAS</option>
            <option value="COMMON">COMMON (Gris)</option>
            <option value="UNCOMMON">UNCOMMON (Verde)</option>
            <option value="RARE">RARE (Cian)</option>
            <option value="EPIC">EPIC (Morado)</option>
            <option value="LEGENDARY">LEGENDARY (Dorado)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 overflow-y-auto max-h-[400px] custom-scrollbar p-1">
          {phaseItems.length === 0 ? (
            <div className="col-span-full text-center py-10 font-mono text-xs text-cyan-800/60 uppercase">No hay activos disponibles con estos filtros.</div>
          ) : (
            phaseItems.map(item => {
              const isSelected = 
                (step === 1 && selectedShips.find(s => s.id === item.id)) ||
                (step === 2 && selectedAstrobots.find(s => s.id === item.id)) ||
                (step === 3 && selectedTools.find(s => s.id === item.id)) ||
                (step === 4 && selectedConsumables.find(s => s.id === item.id));

              return (
                <div 
                  key={item.id} 
                  onClick={() => toggleItemSelection(item, step)}
                  className={`relative flex flex-col items-center bg-black/70 border rounded-xl p-3 cursor-pointer transition-all ${
                    isSelected 
                      ? "border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] bg-cyan-950/30" 
                      : "border-cyan-900/40 hover:border-cyan-700 hover:bg-cyan-950/10"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-black" />
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-full border-2 border-cyan-800 overflow-hidden mb-2 bg-neutral-900">
                    <img src={item.avatar_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[9px] font-sans font-bold text-center uppercase leading-tight">{item.name}</span>
                  <span className="text-[8px] font-mono text-cyan-500 mt-1">{item.rarity}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-auto flex justify-between items-center border-t border-cyan-900/40 pt-4">
          <button 
            onClick={() => setWizardStep(prev => (prev - 1) as WizardStep)}
            className="px-4 py-2 text-[10px] font-mono text-zinc-400 hover:text-white uppercase tracking-widest cursor-pointer"
          >
            Atrás
          </button>
          
          {step === 4 ? (
             <button
              onClick={handleSubmitFleet}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-[0.2em] px-6 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-50 cursor-pointer"
             >
               {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
               COMPILAR Y FIRMAR FLOTA
             </button>
          ) : (
            <button 
              onClick={handleNextStep}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] uppercase tracking-[0.2em] px-6 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] cursor-pointer"
            >
              {step > 1 &&
               ((step === 2 && selectedAstrobots.length === 0) ||
                (step === 3 && selectedTools.length === 0))
                ? "OMITIR FASE"
                : "SIGUIENTE FASE"
              } <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <GalaxyFrame className="w-full max-w-5xl mx-auto my-2 min-h-[420px] text-white font-mono select-none" innerPadding="p-5 sm:p-7">
      <div className="flex flex-col h-full">
        {viewMode === "LIST" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-6 border-b border-cyan-900/40 pb-3">
              <div className="text-left">
                <h3 className="text-sm font-sans font-black tracking-widest text-white uppercase">Hangar de Flotas Activas</h3>
                <p className="text-[10px] font-mono text-cyan-600 uppercase mt-1">Sistemas de combate preconfigurados</p>
              </div>
              {fleets.length > 0 && (
                <button 
                  onClick={handleStartWizard}
                  className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> CREAR FLOTA
                </button>
              )}
            </div>

            {loadingFleets ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
                <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin" />
                <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-500 animate-pulse">Consultando Registros...</span>
              </div>
            ) : fleets.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 rounded-full border border-white/10 bg-white/[0.02] flex items-center justify-center mb-5">
                  <Layers className="w-7 h-7 text-white/20" />
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.4em] text-red-400/80 mb-3 animate-pulse">
                  ⚠ NO SE DETECTAN FLOTAS ACTIVAS
                </div>
                <p className="text-white/30 text-[11px] font-mono max-w-sm mb-6 leading-relaxed">
                  Necesitas crear un Deck antes de lanzar expediciones o participar en combates tácticos.
                </p>
                <button 
                  onClick={handleStartWizard}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[11px] uppercase tracking-[0.2em] px-6 py-3.5 rounded-xl transition-all cursor-pointer shadow-[0_0_25px_rgba(6,182,212,0.4)]"
                >
                  <Plus className="w-4 h-4" />
                  + REGISTRAR NUEVA FLOTA DE COMBATE
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fleets.map(fleet => (
                  <div key={fleet.id} className="bg-black/60 border border-cyan-900/40 rounded-xl p-4 flex flex-col gap-3 hover:border-cyan-700 transition-colors text-left">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">{fleet.name}</h4>
                        <div className="text-[9px] font-mono text-cyan-500 mt-1">POWER: {fleet.total_power_score?.toLocaleString()} POW</div>
                      </div>
                      <div className="bg-cyan-950/50 px-2 py-1 rounded text-[8px] font-mono text-cyan-300 border border-cyan-800/50">
                        FLOTA ACTIVA
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {viewMode === "CREATE_WIZARD" && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6 border-b border-cyan-900/40 pb-3">
              <button onClick={() => setViewMode("LIST")} className="p-1.5 text-zinc-500 hover:text-white bg-black rounded-lg border border-cyan-900/50 cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="text-left">
                <h3 className="text-sm font-sans font-black tracking-widest text-white uppercase">Asistente de Ensamblaje</h3>
                <p className="text-[10px] font-mono text-cyan-600 uppercase mt-1">
                  {wizardStep === 0 && "PASO 0: IDENTIFICADOR"}
                  {wizardStep === 1 && "FASE 1: ACOPLAMIENTO DE NAVES"}
                  {wizardStep === 2 && "FASE 2: ASIGNACIÓN DE ASTROBOTS"}
                  {wizardStep === 3 && "FASE 3: CARGA DE TOOLS"}
                  {wizardStep === 4 && "FASE 4: CONSUMIBLES DE EMERGENCIA"}
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {wizardStep === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center justify-center flex-1 py-8">
                  <Layers className="w-12 h-12 text-cyan-500/50 mb-6" />
                  <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Designa tu Flota</h4>
                  <p className="text-[10px] font-mono text-zinc-400 mb-6 text-center max-w-sm">Establece un código de identificación táctico para agrupar tus activos.</p>
                  <input 
                    type="text" 
                    value={fleetName}
                    onChange={(e) => setFleetName(e.target.value)}
                    placeholder="Ej: FLOTA DE ASALTO SASORI"
                    className="bg-black border-2 border-cyan-900 rounded-xl px-5 py-3 text-sm font-mono tracking-widest text-center text-white placeholder-cyan-900/50 focus:outline-none focus:border-cyan-400 w-full max-w-md uppercase mb-8 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]"
                  />
                  <button 
                    onClick={handleNextStep}
                    className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] cursor-pointer"
                  >
                    INICIAR ENSAMBLAJE <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {wizardStep === 1 && <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">{renderSelectionGrid(1)}</motion.div>}
              {wizardStep === 2 && <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">{renderSelectionGrid(2)}</motion.div>}
              {wizardStep === 3 && <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">{renderSelectionGrid(3)}</motion.div>}
              {wizardStep === 4 && <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">{renderSelectionGrid(4)}</motion.div>}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </GalaxyFrame>
  );
};

export default FleetManager;
```

---

## src/components/GamePreloader.tsx

```tsx
import React, { useEffect, useState } from 'react';
import { RefreshCw, Shield, Terminal, Zap } from 'lucide-react';
import { preloadGameDataAndAssets } from '../lib/gameCache';

interface GamePreloaderProps {
  onComplete: () => void;
}

export const GamePreloader: React.FC<GamePreloaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("INICIALIZANDO SUBSISTEMAS...");

  useEffect(() => {
    let isMounted = true;

    preloadGameDataAndAssets((pct, status) => {
      if (isMounted) {
        setProgress(pct);
        setStatusMessage(status);
      }
    }).then(() => {
      setTimeout(() => {
        if (isMounted) onComplete();
      }, 400); // Pequeño margen estético para completar la animación al 100%
    });

    return () => {
      isMounted = false;
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[999] bg-[#05070a] flex flex-col items-center justify-center p-6 font-mono select-none text-white overflow-hidden">
      {/* Fondo con cuadricula táctica */}
      <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

      <div className="w-full max-w-md bg-[#080b0e] border border-cyan-500/40 p-6 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] relative z-10 flex flex-col items-center text-center gap-5">
        
        {/* Ícono central animado */}
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <Shield className="w-7 h-7 text-cyan-400 absolute animate-pulse" />
        </div>

        {/* Títulos */}
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-black tracking-[0.25em] text-white uppercase drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            GALAXY DUST C.A.N.
          </h2>
          <span className="text-[8px] text-cyan-400/80 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
            <Terminal className="w-3 h-3 text-amber-400" /> CUALIFICANDO NODO TÁCTICO
          </span>
        </div>

        {/* Barra de Progreso */}
        <div className="w-full space-y-2">
          <div className="flex justify-between items-center text-[9px] font-bold">
            <span className="text-zinc-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> PROGRESO
            </span>
            <span className="text-amber-400 font-black">{progress}%</span>
          </div>

          <div className="w-full h-2 bg-black rounded-full overflow-hidden p-0.5 border border-cyan-500/30">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 via-teal-500 to-amber-400 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status Feed */}
        <div className="bg-[#020406] border border-cyan-950 p-2.5 rounded-lg w-full text-left">
          <span className="text-[7.5px] text-cyan-300/90 font-mono block leading-tight truncate">
            &gt; {statusMessage}
          </span>
        </div>

      </div>
    </div>
  );
};

export default GamePreloader;
```

---

## src/components/Header.tsx

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Settings, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  userProfile?: any;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  utcTime?: string;
}

// 🖼️ HELPER: Garantiza que la URL del avatar sea siempre pública y funcional
// Respaldo garantizado vía CDN que NUNCA devuelve 404
const SAFE_FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=200&auto=format&fit=crop';

const resolveAvatarUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return SAFE_FALLBACK_AVATAR;
  }
  const clean = rawUrl.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/galaxy-assets/${clean.replace(/^\//, '')}`;
};

// 🎯 COMPROBACIÓN FLEXIBLE DE PESTAÑAS (SOPORTA MAYÚSCULAS/MINÚSCULAS Y ALIAS)
const isTabActive = (currentActive: string = '', tabId: string): boolean => {
  const cleanActive = currentActive.trim().toUpperCase();
  const cleanTab = tabId.trim().toUpperCase();

  if (cleanActive === cleanTab) return true;

  if (cleanTab === 'MARKET') {
    return ['MARKET', 'MARKETPLACE', 'MARKETPLACE_P2P', 'P2P'].includes(cleanActive);
  }
  if (cleanTab === 'EXPEDITIONS' || cleanTab === 'EXPEDITION') {
    return ['EXPEDITION', 'EXPEDITIONS', 'FLIGHTS', 'EXPEDICION', 'EXPEDICIONES'].includes(cleanActive);
  }
  if (cleanTab === 'CAN') {
    return ['CAN', 'C.A.N.', 'C.A.N'].includes(cleanActive);
  }
  if (cleanTab === 'INVENTORY') {
    return ['INVENTORY', 'INVENTARIO'].includes(cleanActive);
  }
  if (cleanTab === 'MISSION') {
    return ['MISSION', 'MISSIONS', 'MISION', 'MISIONES'].includes(cleanActive);
  }
  if (cleanTab === 'MAIN') {
    return ['MAIN', 'HOME', 'INICIO'].includes(cleanActive);
  }
  if (cleanTab === 'PHANTOM') {
    return ['PHANTOM', 'PHANTOM_STATION'].includes(cleanActive);
  }

  return false;
};

export const Header: React.FC<HeaderProps> = ({
  userProfile,
  activeTab = 'MAIN',
  onSelectTab,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onOpenSettings,
  onOpenProfile,
  utcTime
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'es').startsWith('en') ? 'en' : 'es';

  const [openDropdown, setOpenDropdown] = useState<'MONEDA' | 'RECURSOS' | null>(null);

  const currencyRef = useRef<HTMLDivElement>(null);
  const resourceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        currencyRef.current && !currencyRef.current.contains(event.target as Node) &&
        resourceRef.current && !resourceRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (type: 'MONEDA' | 'RECURSOS') => {
    setOpenDropdown(prev => (prev === type ? null : type));
  };

  // 🌐 RESOLUCIÓN FLEXIBLE DE MONEDAS DEL USUARIO (Soporta singular/plural de DB)
  const currencies = [
    { label: 'GD COIN', value: userProfile?.gd_coin ?? userProfile?.gd_coins ?? 0, color: 'text-amber-300' },
    { label: 'QUANTUM CREDIT', value: userProfile?.quantum_credits ?? userProfile?.quantum_credit ?? 0, color: 'text-cyan-300' },
    { label: 'PHANTOM COIN', value: userProfile?.phantom_coin ?? userProfile?.phantom_coins ?? 0, color: 'text-purple-300' },
    { label: 'HALLOWEEN COIN', value: userProfile?.halloween_coins ?? userProfile?.halloween_coin ?? 0, color: 'text-orange-400' },
    { label: 'XMAS COIN', value: userProfile?.xmas_coins ?? userProfile?.xmas_coin ?? 0, color: 'text-red-400' },
    { label: 'VALENTINE COIN', value: userProfile?.valentine_coins ?? userProfile?.valentine_coin ?? 0, color: 'text-pink-400' }
  ];

  // 🌐 RESOLUCIÓN FLEXIBLE DE RECURSOS DEL USUARIO
  const resources = [
    { label: 'METAL', value: userProfile?.metal ?? 0, color: 'text-cyan-200' },
    { label: 'CRISTAL', value: userProfile?.crystal ?? 0, color: 'text-purple-200' },
    { label: 'DEUTERIO', value: userProfile?.deuterium ?? 0, color: 'text-blue-300' },
    { label: 'MATERIA OSCURA', value: userProfile?.dark_matter ?? 0, color: 'text-indigo-400' },
    { label: 'OMNIPLATE', value: userProfile?.omniplate ?? 0, color: 'text-emerald-300' },
    { label: 'ORICHALTRON', value: userProfile?.orichaltron ?? 0, color: 'text-yellow-300' },
    { label: 'LUNAR FIBER', value: userProfile?.lunar_fiber ?? 0, color: 'text-slate-200' },
    { label: 'INFINITE CORE', value: userProfile?.infinite_core ?? userProfile?.infinity_core ?? 0, color: 'text-teal-300' },
    { label: 'PRIMAL TOKEN', value: userProfile?.primal_token ?? 0, color: 'text-amber-400' },
    { label: 'XENOPLASM', value: userProfile?.xenoplasm ?? 0, color: 'text-green-400' },
    { label: 'ORGANIUM', value: userProfile?.organium ?? 0, color: 'text-lime-300' },
    { label: 'MANA', value: userProfile?.mana ?? 0, color: 'text-blue-400' },
    { label: 'WOOD', value: userProfile?.wood ?? 0, color: 'text-amber-600' }
  ];

  const tabs = [
    { id: 'MAIN', label: t('nav.main') },
    { id: 'CAN', label: t('nav.can') },
    { id: 'EXPEDITIONS', label: t('nav.expedition') },
    { id: 'INVENTORY', label: t('nav.inventory') },
    { id: 'MISSION', label: t('nav.mission') },
  ];

  return (
    <header
      className="w-full h-11 sm:h-12 bg-[#05080c]/98 border-b border-cyan-500/40 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 select-none z-50 font-mono backdrop-blur-md sticky top-0 shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
      style={{
        paddingLeft: 'max(10px, env(safe-area-inset-left))',
        paddingRight: 'max(10px, env(safe-area-inset-right))',
      }}
    >
      
      {/* 1. PERFIL DEL COMANDANTE (IZQUIERDA) */}
      <div
        className="flex items-center gap-2 shrink-0 cursor-pointer group"
        onClick={() => onOpenProfile && onOpenProfile()}
        title="Ver Perfil"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-black border-2 border-cyan-400 group-hover:border-cyan-300 flex items-center justify-center text-cyan-300 font-bold shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all overflow-hidden shrink-0">
          <img
            src={resolveAvatarUrl(userProfile?.avatar_url)}
            alt="Piloto Avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== SAFE_FALLBACK_AVATAR) {
                target.src = SAFE_FALLBACK_AVATAR;
              }
            }}
          />
        </div>
        <div className="flex flex-col text-left leading-tight">
          <span className="text-xs sm:text-sm font-bold font-mono tracking-wider text-white group-hover:text-cyan-200 uppercase truncate max-w-[85px] sm:max-w-[140px]">
            {userProfile?.username || 'COMANDANTE'}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-mono font-bold">
            <span>LVL {userProfile?.level || 1}</span>
            {utcTime && (
              <span className="text-zinc-500 hidden md:inline">| {utcTime}</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. PESTAÑAS DE NAVEGACIÓN CENTRALES */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-1 shrink min-w-0 h-full flex-1">
        {tabs.map(tab => {
          const isActive = isTabActive(activeTab, tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab && onSelectTab(tab.id)}
              className={`text-xs sm:text-sm font-bold tracking-wider px-3 sm:px-4 py-1.5 rounded-md uppercase transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)] font-black'
                  : 'bg-black/50 text-zinc-400 border border-transparent hover:text-white hover:bg-cyan-950/40 hover:border-cyan-800/40'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. BALANCES Y SELECTOR DE IDIOMA (DERECHA) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        
        {/* DROPDOWN MONEDA */}
        <div className="relative" ref={currencyRef}>
          <button
            onClick={() => toggleDropdown('MONEDA')}
            className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
              openDropdown === 'MONEDA'
                ? 'bg-amber-950/90 text-amber-300 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                : 'bg-black/60 text-amber-400 border-amber-900/60 hover:border-amber-500/80 hover:bg-amber-950/30'
            }`}
          >
            {t('nav.currency')}
          </button>

          {openDropdown === 'MONEDA' && (
            <div className="absolute right-0 mt-1.5 w-48 sm:w-60 bg-[#05080c]/98 border border-amber-500/50 rounded-xl p-2 shadow-[0_0_20px_rgba(0,0,0,0.9)] z-50 backdrop-blur-md space-y-1">
              <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                {currencies.map((curr, idx) => (
                  <div key={idx} className="flex justify-between items-center px-2 py-1 bg-black/60 rounded border border-amber-950/60 text-[8.5px] sm:text-[9.5px]">
                    <span className="text-zinc-400 uppercase font-bold">{curr.label}</span>
                    <span className={`font-mono font-bold ${curr.color}`}>{(curr.value || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* DROPDOWN RECURSOS */}
        <div className="relative" ref={resourceRef}>
          <button
            onClick={() => toggleDropdown('RECURSOS')}
            className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
              openDropdown === 'RECURSOS'
                ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                : 'bg-black/60 text-cyan-300 border-cyan-900/60 hover:border-cyan-500/80 hover:bg-cyan-950/30'
            }`}
          >
            {t('nav.resources')}
          </button>

          {openDropdown === 'RECURSOS' && (
            <div className="absolute right-0 mt-1.5 w-52 sm:w-64 bg-[#05080c]/98 border border-cyan-500/50 rounded-xl p-2 shadow-[0_0_20px_rgba(0,0,0,0.9)] z-50 backdrop-blur-md space-y-1">
              <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                {resources.map((res, idx) => (
                  <div key={idx} className="flex justify-between items-center px-2 py-1 bg-black/60 rounded border border-cyan-950/60 text-[8.5px] sm:text-[9.5px]">
                    <span className="text-zinc-400 uppercase font-bold">{res.label}</span>
                    <span className={`font-mono font-bold ${res.color}`}>{(res.value || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </header>
  );
};

export default Header;
```

---

## src/components/HeaderNotificationBell.tsx

```tsx
import React from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";

interface HeaderNotificationBellProps {
  onClick: () => void;
  isActive: boolean;
}

export const HeaderNotificationBell: React.FC<HeaderNotificationBellProps> = ({ onClick, isActive }) => {
  // 🎯 UNIFICACIÓN: Lee el conteo exacto directamente del hook maestro de notificaciones
  const { unreadCount, refresh } = useNotifications();

  return (
    <button
      onClick={() => {
        onClick();
        refresh();
      }}
      className={`relative p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer shadow-lg group ${
        isActive
          ? "bg-cyan-950/90 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-105"
          : "bg-black/80 text-cyan-400 border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-950/80 hover:scale-110"
      }`}
      title="Notificaciones"
    >
      <Bell className="w-5 h-5 text-cyan-400 animate-pulse" />
      
      {/* CÍRCULO ROJO DINÁMICO SINCRONIZADO */}
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-mono text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-black animate-bounce">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}

      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center bg-black/90 border border-cyan-500/60 text-cyan-300 text-[8px] font-mono font-bold uppercase px-2 py-1 rounded shadow-2xl whitespace-nowrap pointer-events-none">
        NOTIFICACIONES
      </div>
    </button>
  );
};

export default HeaderNotificationBell;
```

---

## src/components/IntroVideo.tsx

```tsx
import React, { useRef, useState } from 'react';
import { Volume2, VolumeX, SkipForward } from 'lucide-react';

interface IntroVideoProps {
  src: string;
  onEnded: () => void;
  canSkip?: boolean;
}

export const IntroVideo: React.FC<IntroVideoProps> = ({
  src,
  onEnded,
  canSkip = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleGlobalClick = () => {
    // Si el usuario hace tap en la pantalla por primera vez, desmutear
    if (videoRef.current && videoRef.current.muted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  return (
    <div
      onClick={handleGlobalClick}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden font-mono select-none"
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay
        playsInline
        muted // Requisito estricto para navegadores y WebViews de Android
        className="w-full h-full object-cover"
        onEnded={onEnded}
        onError={() => {
          console.warn('[IntroVideo] Error o fallo al reproducir video, ejecutando fallback.');
          onEnded();
        }}
      />

      {/* Controles Tácticos Flotantes */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <button
          onClick={toggleAudio}
          className="px-3 py-1.5 rounded-lg bg-black/75 border border-cyan-500/50 text-cyan-300 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md hover:bg-cyan-950 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-amber-400" />
              <span>ACTIVAR AUDIO</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>SILENCIAR</span>
            </>
          )}
        </button>

        {canSkip && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnded();
            }}
            className="px-3 py-1.5 rounded-lg bg-black/75 border border-zinc-700 text-zinc-400 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md hover:text-white hover:border-zinc-500 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>SALTAR</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default IntroVideo;

```

---

## src/components/InventoryView.tsx

```tsx
import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Lock,
  Search,
  ChevronDown,
  Layers,
  Sparkles
} from "lucide-react";
import { Button } from "./ui/joly-button";
import { FleetManager } from "./FleetManager";
import { Scroller } from "./ui/Scroller";
import { supabase } from "../lib/supabase";
import { useInventory, type InventoryItem } from "../hooks/useInventory";
import { useAudioEngine } from "../hooks/useAudioEngine";

export type { InventoryItem } from "../hooks/useInventory";

const resolveImageUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
  }
  const clean = rawUrl.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;

  if (clean.startsWith('Assets') || clean.startsWith('Monedas') || clean.includes('Assets%20para')) {
    return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/${clean.replace(/^\//, '')}`;
  }

  return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/galaxy-assets/${clean.replace(/^\//, '')}`;
};

const getShipStats = (char: any) => {
  const raw = char.seed_ships || char.seed_data || char || {};
  const stats = char.tactical_stats || {};

  return {
    name: raw.name || char.name || 'NAVE DESCONOCIDA',
    description: raw.description || char.description || 'Sin especificaciones tácticas archivadas.',
    type: raw.type || char.type || 'Spaceships',
    company: raw.company || char.company || 'NOVA',
    collection: raw.collection || char.collection || 'ESTÁNDAR',
    rarity: raw.rarity || char.rarity || 'COMMON',
    size: raw.size || char.size || 'MEDIUM',
    engine: raw.engine || char.engine || 'WARP DRIVE CLASS I',
    
    cargo: Number(raw.cargo ?? char.cargo ?? stats.cargo ?? 0),
    production: Number(raw.production ?? char.production ?? stats.production ?? 0),
    
    health: Number(raw.health ?? char.health ?? raw.hp ?? stats.hp ?? 0),
    shield: Number(raw.shield ?? char.shield ?? stats.shield ?? 0),
    defense: Number(raw.defense ?? char.defense ?? stats.defense ?? 0),
    speed: Number(raw.speed ?? char.speed ?? stats.speed ?? 0),
    
    attack: Number(raw.attack ?? char.attack ?? stats.attack ?? stats.kinetic_attack ?? 0),
    ionAttack: Number(raw.ion_attack ?? raw.ionAttack ?? char.ion_attack ?? stats.ionic_attack ?? 0),
    laserAttack: Number(raw.laser_attack ?? raw.laserAttack ?? char.laser_attack ?? stats.laser_attack ?? 0),
    plasmaAttack: Number(raw.plasma_attack ?? raw.plasmaAttack ?? char.plasma_attack ?? stats.plasma_attack ?? 0),
    gravitonAttack: Number(raw.graviton_attack ?? raw.gravitonAttack ?? char.graviton_attack ?? stats.graviton_attack ?? 0),
  };
};

const getItemCategory = (item: InventoryItem): string => {
  const cat = String(item.category || "").toLowerCase().trim();
  const type = String((item as any).type || "").toLowerCase().trim();

  if (cat === "fleets" || cat === "fleet" || (item as any).is_fleet) return "Fleets";

  if (
    ["spaceships", "spaceship", "ships", "ship", "naves", "nave"].includes(cat) ||
    ["spaceships", "spaceship", "ships", "ship", "naves", "nave"].includes(type)
  ) {
    return "Spaceships";
  }

  if (
    ["structures", "structure", "estructura", "estructuras"].includes(cat) ||
    ["structures", "structure", "estructura", "estructuras"].includes(type)
  ) {
    return "Structures";
  }

  if (
    ["defense", "defenses", "defensa", "defensas"].includes(cat) ||
    ["defense", "defenses", "defensa", "defensas"].includes(type)
  ) {
    return "Defense";
  }

  if (
    ["astrobots", "astrobot", "robot", "robots"].includes(cat) ||
    ["astrobots", "astrobot", "robot", "robots"].includes(type)
  ) {
    return "Astrobots";
  }

  if (
    ["tecnology", "technology", "technologies", "tech", "tecnologia", "tecnología"].includes(cat) ||
    ["tecnology", "technology", "technologies", "tech", "tecnologia", "tecnología"].includes(type)
  ) {
    return "Tecnology";
  }

  if (
    ["blueprints", "blueprint", "plano", "planos"].includes(cat) ||
    ["blueprints", "blueprint", "plano", "planos"].includes(type)
  ) {
    return "Blueprints";
  }

  if (
    ["badges", "badge", "insignia", "insignias"].includes(cat) ||
    ["badges", "badge", "insignia", "insignias"].includes(type)
  ) {
    return "Badges";
  }

  if (
    ["licencia", "license", "licenses", "licencias"].includes(cat) ||
    ["licencia", "license", "licenses", "licencias"].includes(type)
  ) {
    return "Licencia";
  }

  if (
    ["tools", "tool", "herramientas", "herramienta"].includes(cat) ||
    ["tools", "tool", "herramientas", "herramienta"].includes(type)
  ) {
    return "Tools";
  }

  if (
    ["consumibles", "consumables", "consumable"].includes(cat) ||
    ["consumibles", "consumables", "consumable"].includes(type)
  ) {
    return "Consumibles";
  }

  if (cat) {
    if (cat.includes("ship") || cat.includes("nave")) return "Spaceships";
    if (cat.includes("struct") || cat.includes("estruct")) return "Structures";
    if (cat.includes("defen")) return "Defense";
    if (cat.includes("bot") || cat.includes("robot")) return "Astrobots";
    if (cat.includes("tech") || cat.includes("tecno")) return "Tecnology";
    if (cat.includes("print") || cat.includes("plano")) return "Blueprints";
    if (cat.includes("badge") || cat.includes("insign")) return "Badges";
    if (cat.includes("licen")) return "Licencia";
    if (cat.includes("tool") || cat.includes("herram")) return "Tools";
    if (cat.includes("consum")) return "Consumibles";
  }

  return "Spaceships";
};

const matchInventoryCategory = (item: InventoryItem, selectedSidebarKey: string): boolean => {
  if (!selectedSidebarKey || selectedSidebarKey === "All") return true;
  if (selectedSidebarKey === "Favorites") return Boolean(item.favorite);

  const determinedCategory = getItemCategory(item);
  return determinedCategory.toLowerCase() === selectedSidebarKey.toLowerCase();
};

interface AssetCardProps {
  asset: {
    id: string;
    name: string;
    image: string;
    rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'EXCLUSIVE';
    quantity: number;
    category?: string;
    power?: number;
    isInFlight?: boolean;
    unlocked?: boolean;
    level?: number;
    favorite?: boolean;
  };
  isSelected?: boolean;
  onClick?: () => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, isSelected, onClick }) => {
  const rarity = (asset.rarity?.toUpperCase() || 'COMMON') as 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'EXCLUSIVE';
  
  const rarityStyles: Record<string, string> = {
    COMMON: 'border-slate-600/50 text-slate-300 shadow-slate-950/40',
    RARE: 'border-cyan-500/60 text-cyan-400 shadow-cyan-950/40',
    EPIC: 'border-purple-500/70 text-purple-400 shadow-purple-950/40',
    LEGENDARY: 'border-amber-500/70 text-amber-400 shadow-amber-950/40',
    EXCLUSIVE: 'border-rose-500/80 text-rose-400 shadow-rose-950/40',
  };

  const activeBorder = isSelected
    ? 'border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)] ring-1 ring-cyan-400'
    : (rarityStyles[rarity] || rarityStyles.COMMON);

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex flex-col justify-between
        h-[115px] sm:h-[128px] w-full
        rounded-md overflow-hidden cursor-pointer select-none
        bg-gradient-to-b from-[#0a111c] via-[#04070c] to-[#020306]
        border transition-all duration-150 transform-gpu
        hover:scale-[1.02] hover:z-10
        ${activeBorder}
      `}
    >
      {/* 1. Header de la Tarjeta: Categoría y Cantidad (Compacto y Firme) */}
      <div className="shrink-0 h-5 px-1.5 flex items-center justify-between z-10 bg-[#04080e]/95 border-b border-cyan-500/20">
        <span className="text-[7.5px] sm:text-[8px] font-mono tracking-wider uppercase text-cyan-400 font-bold truncate max-w-[65%]">
          {asset.category || 'ASSET'}
        </span>
        <span className="text-[8px] sm:text-[8.5px] font-mono font-black px-1 py-0.5 rounded bg-black/90 border border-cyan-500/40 text-cyan-300 leading-none shadow">
          x{asset.quantity || 1}
        </span>
      </div>

      {/* 2. Visual del Activo: Imagen Centrada con Resplandor */}
      <div className="flex-1 min-h-0 w-full p-1 flex items-center justify-center relative overflow-hidden bg-black/40">
        <div className="absolute inset-0 bg-radial from-cyan-500/10 via-transparent to-transparent opacity-30 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <img
          src={asset.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200'}
          alt={asset.name}
          className={`max-h-full max-w-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-all duration-200 ${
            asset.unlocked === false ? "grayscale opacity-50 brightness-50" : ""
          }`}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
          }}
        />

        {asset.isInFlight && (
          <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-red-950/90 border border-red-500 text-red-400 font-mono font-black text-[6.5px] z-20 uppercase tracking-widest animate-pulse">
            EN VUELO
          </div>
        )}

        {asset.level && asset.level > 1 && (
          <div className="absolute top-1 right-1 px-1 py-0.5 rounded bg-black/80 border border-amber-500/50 text-amber-300 font-mono font-black text-[7px] z-20">
            LVL {asset.level}
          </div>
        )}

        {asset.unlocked === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
            <Lock className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_cyan]" />
          </div>
        )}
      </div>

      {/* 3. Pie de la Tarjeta: Nombre y Rareza/POW (Siempre Visible, Nunca Cubierto) */}
      <div className="shrink-0 h-6 sm:h-7 px-1.5 py-0.5 flex flex-col justify-center z-10 bg-[#03060a]/95 border-t border-cyan-500/20">
        <p className="text-[8.5px] sm:text-[9.5px] font-mono font-bold text-white truncate group-hover:text-cyan-300 transition-colors flex items-center justify-between leading-tight">
          <span className="truncate">{asset.name}</span>
          {asset.favorite && <span className="text-amber-400 text-[8px] shrink-0 ml-1">★</span>}
        </p>
        <div className="flex items-center justify-between leading-none mt-0.5">
          <span className="text-[7px] sm:text-[7.5px] font-mono tracking-widest uppercase font-semibold text-cyan-400/70 truncate">
            {asset.rarity || 'STANDARD'}
          </span>
          {asset.power ? (
            <span className="text-[7px] sm:text-[7.5px] font-mono text-amber-400 font-bold shrink-0">
              ⚡ {asset.power} POW
            </span>
          ) : null}
        </div>
      </div>

      {/* Línea de escaneo superior en hover */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-cyan-400 opacity-0 group-hover:opacity-100 group-hover:animate-pulse pointer-events-none transition-opacity" />
    </div>
  );
};

interface InventoryViewProps {
  playerGems: number;
  setPlayerGems: React.Dispatch<React.SetStateAction<number>>;
  playerPower: number;
  setPlayerPower: React.Dispatch<React.SetStateAction<number>>;
  playerGold?: number;
  setPlayerGold?: React.Dispatch<React.SetStateAction<number>>;
  triggerNotification: (text: string, e?: any) => void;
  onBack: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  playerPower,
  triggerNotification,
  onBack
}) => {
  const { items: characters, loading: isLoading, error: loadError, toggleFavorite: toggleFav } = useInventory();
  const { playSfx } = useAudioEngine();
  const { t } = useTranslation();

  const [activeSidebarCategory, setActiveSidebarCategory] = useState<string>("All");

  const [filterDropdown1, setFilterDropdown1] = useState<string>("ALL CLASES");
  const [filterDropdown2, setFilterDropdown2] = useState<string>("TODOS LOS FILTROS");
  const [modsEnabled, setModsEnabled] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [showFilter1Modal, setShowFilter1Modal] = useState(false);
  const [showFilter2Modal, setShowFilter2Modal] = useState(false);

  const [selectedChar, setSelectedChar] = useState<InventoryItem | null>(null);

  const [showSubModal, setShowSubModal] = useState<"fleet" | null>(null);
  const [showSkillsPopup, setShowSkillsPopup] = useState(false);
  const [fleets, setFleets] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedChar) {
      setShowSubModal(null);
      setShowSkillsPopup(false);
    }
  }, [selectedChar]);

  useEffect(() => {
    if (showSubModal === "fleet") {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase.from("fleets").select("*").eq("user_id", user.id).then(({ data }) => {
          if (data) setFleets(data);
        });
      });
    }
  }, [showSubModal]);

  const getFilteredCharacters = useMemo(() => {
    let list = [...characters];

    list = list.filter((c) => {
      const cat = getItemCategory(c);
      if (cat === "Licencia") {
        const nameUpper = String(c.name || "").trim().toUpperCase();
        if (/^LICENCIA\s*#[0-9A-F-]{10,}$/i.test(nameUpper) && !(c as any).has_real_seed) {
          return false;
        }
      }
      return true;
    });

    if (modsEnabled) {
      list = list.filter((c) => c.is_in_flight);
    }

    if (activeSidebarCategory === "Favorites") {
      list = list.filter((c) => c.favorite);
    } else if (activeSidebarCategory !== "All") {
      list = list.filter((c) => matchInventoryCategory(c, activeSidebarCategory));
    }

    if (filterDropdown1 !== "ALL CLASES") {
      const cls = filterDropdown1.replace("CLASES: ", "").trim().toUpperCase();
      list = list.filter((c) => c.rarity && c.rarity.trim().toUpperCase() === cls);
    }

    if (filterDropdown2 !== "TODOS LOS FILTROS") {
      const fac = filterDropdown2.replace("FACCIÓN: ", "").trim().toUpperCase();
      list = list.filter((c) => c.faction && c.faction.trim().toUpperCase() === fac);
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.fullname.toLowerCase().includes(query) ||
          (c.category && c.category.toLowerCase().includes(query)) ||
          (c.faction && c.faction.toLowerCase().includes(query))
      );
    }

    return list;
  }, [characters, activeSidebarCategory, filterDropdown1, filterDropdown2, searchQuery, modsEnabled]);

  const handleToggleFavorite = (char: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerNotification(!char.favorite ? "⭐ INDEXADO A SECTOR DE ACCESO PRIORITARIO" : "⭐ ELIMINADO DE FAVORITOS", e);
    toggleFav(char.id);
  };

  const subSections = [
    { key: "All", labelKey: "inventory.categories.all", fallbackLabel: "TODOS LOS ACTIVOS", locked: false },
    { key: "Fleets", labelKey: "inventory.categories.fleets", fallbackLabel: "FLEETS (FLOTAS)", locked: false },
    { key: "Spaceships", labelKey: "inventory.categories.spaceships", fallbackLabel: "SPACESHIPS (NAVES)", locked: false },
    { key: "Structures", labelKey: "inventory.categories.structures", fallbackLabel: "STRUCTURES (ESTRUCTURAS)", locked: false },
    { key: "Defense", labelKey: "inventory.categories.defense", fallbackLabel: "DEFENSE (DEFENSA)", locked: false },
    { key: "Astrobots", labelKey: "inventory.categories.astrobots", fallbackLabel: "ASTROBOTS", locked: false },
    { key: "Tecnology", labelKey: "inventory.categories.technology", fallbackLabel: "TECHNOLOGIES", locked: false },
    { key: "Blueprints", labelKey: "inventory.categories.blueprints", fallbackLabel: "BLUEPRINTS", locked: false },
    { key: "Badges", labelKey: "inventory.categories.badges", fallbackLabel: "BADGES", locked: false },
    { key: "Licencia", labelKey: "inventory.categories.license", fallbackLabel: "LICENCIA", locked: false },
    { key: "Tools", labelKey: "inventory.categories.tools", fallbackLabel: "TOOLS (HERRAMIENTAS)", locked: false },
    { key: "Consumibles", labelKey: "inventory.categories.consumables", fallbackLabel: "CONSUMIBLES", locked: false },
  ];

  return (
    <div className="w-full h-[calc(100dvh-var(--header-height,2.75rem))] grid grid-cols-12 gap-2 p-2 sm:p-3 overflow-hidden select-none font-mono text-white">
      
      {/* ── 1. COLUMNA IZQUIERDA: SIDEBAR TÁCTICO (col-span-3) ── */}
      <div className="col-span-3 hud-panel hud-corners flex flex-col justify-between p-2 h-full overflow-hidden min-h-0 bg-[#05080c]/90 border border-cyan-500/30 rounded-xl shadow-xl">
        
        {/* Cabecera del Sidebar */}
        <div className="shrink-0 mb-1 border-b border-cyan-500/20 pb-1.5">
          <button
            onClick={onBack}
            className="text-xs font-mono font-bold text-cyan-400 hover:text-white flex items-center gap-1 mb-2 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{t('inventory.title', 'INVENTARIO')}</span>
          </button>

          <div className="text-[9px] sm:text-[10px] font-mono text-zinc-400 bg-black/60 border border-cyan-900/50 rounded px-2 py-1 flex items-center justify-between">
            <span className="uppercase">{t('inventory.galactic_power', 'PODER GALÁCTICO')}:</span>
            <span className="text-emerald-400 font-black">{playerPower.toLocaleString()} POW</span>
          </div>
        </div>

        {/* Menú de Categorías Vertical */}
        <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-y-auto no-scrollbar py-1 pr-0.5">
          {subSections.map(({ key, labelKey, fallbackLabel, locked }) => {
            const isActive = activeSidebarCategory === key;
            const label = t(labelKey, fallbackLabel);
            return (
              <button
                key={key}
                onClick={() => {
                  if (!locked) {
                    setActiveSidebarCategory(key);
                    playSfx("laser_success");
                  } else {
                    triggerNotification(`🔒 ${label}: PRÓXIMAMENTE`);
                  }
                }}
                className={`w-full text-left px-2 sm:px-2.5 py-1.5 rounded text-[9.5px] sm:text-xs font-mono tracking-wider uppercase transition-all flex items-center justify-between cursor-pointer ${
                  isActive
                    ? "bg-cyan-500/20 border-l-2 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    : locked
                      ? "bg-[#0a0f13]/40 border-l-2 border-transparent text-zinc-600 cursor-default"
                      : "bg-black/40 hover:bg-cyan-950/30 text-cyan-200/60 hover:text-cyan-300 border-l-2 border-transparent"
                }`}
              >
                <span className="truncate">{label}</span>
                {locked && <Lock className="w-3 h-3 text-zinc-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Contador Inferior */}
        <div className="shrink-0 border-t border-cyan-500/20 pt-1.5 text-[10px] text-cyan-400/70 font-mono tracking-wider uppercase truncate">
          FILTERED ASSETS: {getFilteredCharacters.length} / {characters.length}
        </div>
      </div>

      {/* ── 2. COLUMNA DERECHA: GRILLA DE 5 COLUMNAS DE ACTIVOS (col-span-9) ── */}
      <div className="col-span-9 hud-panel hud-corners flex flex-col h-full min-h-0 p-2 overflow-hidden bg-[#05080c]/80 border border-cyan-500/30 rounded-xl shadow-xl">
        
        {/* Barra Superior Fija: Filtros y Búsqueda */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-2 pb-1.5 border-b border-cyan-500/20 text-xs shrink-0 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5">
            {/* Dropdown 1: Clases */}
            <div className="relative">
              <button
                onClick={() => { setShowFilter1Modal(!showFilter1Modal); setShowFilter2Modal(false); }}
                className="px-2 py-1 bg-[#0b212f]/80 border border-cyan-400/80 rounded text-[8px] sm:text-[9px] font-mono tracking-wider text-white uppercase flex items-center justify-between gap-1 cursor-pointer select-none transition-colors hover:bg-cyan-950/60 shadow-[inset_0_1px_4px_rgba(34,211,238,0.25)] min-w-[95px] sm:min-w-[115px]"
              >
                <span className="truncate">{filterDropdown1}</span>
                <ChevronDown className="w-3 h-3 text-cyan-400 stroke-[3] shrink-0" />
              </button>
              <AnimatePresence>
                {showFilter1Modal && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 mt-1 w-40 bg-[#04080b] border-2 border-cyan-500/40 rounded-xl shadow-2xl z-50 p-1 divide-y divide-cyan-950"
                  >
                    {["ALL CLASES", "CLASES: COMMON", "CLASES: UNCOMMON", "CLASES: RARE", "CLASES: EPIC", "CLASES: LEGENDARY"].map((opt) => (
                      <button key={opt} onClick={() => { setFilterDropdown1(opt); setShowFilter1Modal(false); playSfx("laser_success"); }}
                        className="w-full text-left px-2 py-1 text-[8px] font-mono uppercase tracking-wider text-cyan-300 hover:bg-cyan-950/50 hover:text-white transition-colors cursor-pointer"
                      >{opt}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dropdown 2: Facciones / Filtros */}
            <div className="relative">
              <button
                onClick={() => { setShowFilter2Modal(!showFilter2Modal); setShowFilter1Modal(false); }}
                className="px-2 py-1 bg-[#0b212f]/80 border border-cyan-400/80 rounded text-[8px] sm:text-[9px] font-mono tracking-wider text-white uppercase flex items-center justify-between gap-1 cursor-pointer select-none transition-colors hover:bg-cyan-950/60 shadow-[inset_0_1px_4px_rgba(34,211,238,0.25)] min-w-[95px] sm:min-w-[115px]"
              >
                <span className="truncate">{filterDropdown2}</span>
                <ChevronDown className="w-3 h-3 text-cyan-400 stroke-[3] shrink-0" />
              </button>
              <AnimatePresence>
                {showFilter2Modal && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 mt-1 w-40 bg-[#04080b] border-2 border-cyan-500/40 rounded-xl shadow-2xl z-50 p-1"
                  >
                    {["TODOS LOS FILTROS", "FACCIÓN: NOVA", "FACCIÓN: GD I", "FACCIÓN: OSIRIS", "FACCIÓN: MYTON", "FACCIÓN: ALACRAN", "FACCIÓN: ZEPPELIN"].map((opt) => (
                      <button key={opt} onClick={() => { setFilterDropdown2(opt); setShowFilter2Modal(false); playSfx("laser_success"); }}
                        className="w-full text-left px-2 py-1 text-[8px] font-mono uppercase tracking-wider text-cyan-300 hover:bg-cyan-950/50 hover:text-white transition-colors border-b border-cyan-900/40 last:border-0 cursor-pointer"
                      >{opt}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Checkbox: Flotas en vuelo */}
            <button
              onClick={() => { setModsEnabled(!modsEnabled); triggerNotification(modsEnabled ? "🔴 FILTRO APAGADO" : "🟢 MOSTRANDO FLOTAS EN VUELO"); }}
              className="flex items-center gap-1 hover:opacity-90 select-none cursor-pointer px-1.5 py-0.5"
            >
              <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center bg-black ${modsEnabled ? 'border-red-500' : 'border-cyan-500'}`}>
                {modsEnabled && <div className="w-1.5 h-1.5 bg-red-500 shadow-[0_0_8px_#ef4444]" />}
              </div>
              <span className={`text-[8px] font-mono tracking-wider uppercase ${modsEnabled ? 'text-red-400 font-bold' : 'text-zinc-400'}`}>
                {t('inventory.in_flight_filter', 'FLOTAS EN VUELO')}
              </span>
            </button>
          </div>

          {/* Buscador */}
          <div className="relative w-36 sm:w-48 ml-auto">
            <Search className="absolute left-2 top-2 w-3 h-3 text-cyan-500 pointer-events-none" />
            <input
              type="text"
              placeholder={t('inventory.search_placeholder', 'BUSCAR ACTIVO...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-7 text-xs bg-black/60 border border-cyan-500/30 pl-6 pr-2 rounded font-mono text-cyan-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 uppercase"
            />
          </div>
        </div>

        {/* Galería de Activos: Formato Estricto 5 Columnas con Scroll Interno Suave */}
        {activeSidebarCategory === "Fleets" ? (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <FleetManager characters={characters} triggerNotification={triggerNotification} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1.5 p-1.5 grid grid-cols-5 gap-2 sm:gap-2.5 content-start no-scrollbar">
            {isLoading ? (
              <div className="col-span-5 flex flex-col items-center justify-center h-full gap-2 text-cyan-500 py-12">
                <div className="w-7 h-7 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] font-mono tracking-widest uppercase animate-pulse">{t('inventory.loading', 'CARGANDO ALMACÉN...')}</span>
              </div>
            ) : getFilteredCharacters.length === 0 ? (
              <div className="col-span-5 flex items-center justify-center h-full text-zinc-500 text-[9px] font-mono uppercase tracking-widest py-12">
                {loadError ? (
                  <span className="text-red-500 font-bold">{loadError}</span>
                ) : (
                  modsEnabled ? t('inventory.empty_no_flight', 'NO HAY FLOTAS EN VUELO') : t('inventory.empty_no_assets', 'SIN ACTIVOS EN ESTA CATEGORÍA')
                )}
              </div>
            ) : (
              getFilteredCharacters.map((char, idx) => {
                const uniqueKey = `${char.category || 'asset'}-${char.id}-${idx}`;
                const isSelected = selectedChar?.id === char.id;
                const power = char.power || (char as any).combat_power || (char as any).galactic_power || undefined;
                return (
                  <AssetCard
                    key={uniqueKey}
                    isSelected={isSelected}
                    onClick={() => { playSfx(char.sound); setSelectedChar(char); }}
                    asset={{
                      id: char.id,
                      name: char.name,
                      image: resolveImageUrl(char.avatar_url || (char as any).image_url),
                      rarity: (char.rarity?.toUpperCase() || 'COMMON') as any,
                      quantity: char.quantity || 1,
                      category: getItemCategory(char),
                      power,
                      isInFlight: char.is_in_flight,
                      unlocked: char.unlocked,
                      level: char.level,
                      favorite: char.favorite,
                    }}
                  />
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── MODAL DETALLADO PRINCIPAL DEL ACTIVO ── */}
      <AnimatePresence>
        {selectedChar && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl max-h-[90dvh] flex flex-col bg-[#070b0f] border-2 border-cyan-400 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.25)] text-left"
            >
              <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.015)_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />

              {/* Cabecera del Modal */}
              <div className="shrink-0 flex justify-between items-start border-b border-cyan-950 pb-2 mb-3 relative z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[7.5px] font-mono text-cyan-400 font-extrabold uppercase bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
                      {getItemCategory(selectedChar).toUpperCase()} ASSET
                    </span>
                    <button onClick={(e) => handleToggleFavorite(selectedChar, e)} className="text-amber-400 hover:scale-110 transition-transform font-mono text-[9px] font-bold cursor-pointer">
                      {selectedChar.favorite ? t('inventory.detail.favorited', '★ EN FAVORITOS') : t('inventory.detail.not_favorited', '☆ AÑADIR FAVORITO')}
                    </button>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white tracking-widest mt-1 uppercase">{selectedChar.name}</h3>
                </div>
                <button onClick={() => setSelectedChar(null)} className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 hover:text-white font-bold cursor-pointer flex items-center justify-center">✕</button>
              </div>

              {selectedChar.is_in_flight && (
                <div className="shrink-0 p-2 bg-red-950/60 border border-red-500/80 rounded-xl flex items-center justify-between gap-2 text-red-300 text-[8.5px] mb-2 font-mono relative z-10">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-400 animate-pulse shrink-0" />
                    <span className="font-bold uppercase tracking-wider">
                      {t('inventory.detail.in_flight_warning', 'ACTIVO ACTUALMENTE EN MISIÓN')}
                    </span>
                  </div>
                </div>
              )}

              {/* Cuerpo del Modal con Scroll */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 overscroll-contain">
                {showSubModal === "fleet" ? (
                  <div className="relative z-10 space-y-3">
                    <h4 className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase border-b border-cyan-900/50 pb-2">{t('inventory.detail.select_fleet', 'SELECCIONA FLOTA')}</h4>
                    {fleets.length === 0 ? (
                      <div className="text-[9px] text-zinc-500 font-mono uppercase py-8 text-center bg-black/40 rounded-xl border border-cyan-950">{t('inventory.detail.no_fleets', 'NO TIENES FLOTAS CREADAS')}</div>
                    ) : (
                      <Scroller overflow="x" withButtons className="pb-2" gap="gap-3">
                        {fleets.map(f => (
                          <div key={f.id} onClick={() => { triggerNotification(`🚢 ASIGNADO A FLOTA: ${f.name}`); setShowSubModal(null); }} className="min-w-[140px] bg-cyan-950/30 border border-cyan-900 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-cyan-900/50 hover:border-cyan-400 transition-all text-center">
                            <Layers className="w-7 h-7 text-cyan-400 mb-1.5" />
                            <div className="text-[10px] font-bold text-white uppercase">{f.name || 'Flota Alpha'}</div>
                            <div className="text-[8px] text-cyan-500 font-mono mt-0.5">POW: {f.total_power_score}</div>
                          </div>
                        ))}
                      </Scroller>
                    )}
                  </div>
                ) : getItemCategory(selectedChar) === 'Spaceships' ? (
                  (() => {
                    const ship = getShipStats(selectedChar);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 relative z-10 text-white">
                        
                        {/* COLUMNA IZQUIERDA: VISUAL + ESPECIFICACIONES DE CASCO */}
                        <div className="md:col-span-4 flex flex-col items-center gap-2 bg-black/50 border border-cyan-500/30 p-2.5 rounded-xl h-fit">
                          <div className="relative w-full aspect-square rounded-lg border border-cyan-400/80 overflow-hidden bg-gradient-to-b from-cyan-950/40 via-black to-black p-2 flex items-center justify-center">
                            <img 
                              src={resolveImageUrl(selectedChar.avatar_url || (selectedChar as any).image_url)} 
                              alt={ship.name} 
                              className="max-h-full max-w-full object-contain filter drop-shadow-[0_4px_12px_rgba(6,182,212,0.4)]"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
                              }}
                            />
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/90 border border-cyan-400 text-cyan-300 font-mono font-bold text-[8px]">
                              x{selectedChar.quantity || 1}
                            </div>
                          </div>

                          {/* Ficha de Fabricación y Serie */}
                          <div className="w-full space-y-1 font-mono text-[7.5px] uppercase pt-1 border-t border-cyan-900/40">
                            <div className="flex justify-between text-zinc-400">
                              <span>FABRICANTE:</span>
                              <span className="text-cyan-300 font-bold">{ship.company}</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>COLECCIÓN:</span>
                              <span className="text-amber-300 font-bold">{ship.collection}</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>TAMAÑO/CLASE:</span>
                              <span className="text-white font-bold">{ship.size}</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>MOTOR:</span>
                              <span className="text-emerald-400 font-bold truncate max-w-[55%]">{ship.engine}</span>
                            </div>
                          </div>
                        </div>

                        {/* COLUMNA DERECHA: DESCRIPCIÓN Y ESTADÍSTICAS OPERATIVAS */}
                        <div className="md:col-span-8 flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                          
                          {/* Descripción */}
                          <div className="bg-[#05080e] border border-cyan-500/25 p-2 rounded-lg">
                            <span className="text-[7px] font-mono tracking-widest text-cyan-400 font-bold uppercase block mb-0.5">
                              // DESCRIPCIÓN DEL ACTIVO
                            </span>
                            <p className="text-[8px] sm:text-[8.5px] font-mono text-zinc-300 leading-relaxed uppercase">
                              {ship.description}
                            </p>
                          </div>

                          {/* Matriz Ofensiva (5 Tipos de Daño) */}
                          <div className="bg-[#070508] border border-red-500/30 p-2 rounded-lg">
                            <span className="text-[7px] font-mono text-red-400 font-bold tracking-widest uppercase block mb-1 border-b border-red-950 pb-0.5">
                              MATRIZ OFENSIVA
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[8px]">
                              <div className="bg-black/60 border border-red-950/60 p-1 rounded flex justify-between">
                                <span className="text-zinc-400">Base Atk:</span>
                                <span className="text-white font-black">{ship.attack} DMG</span>
                              </div>
                              <div className="bg-black/60 border border-red-950/60 p-1 rounded flex justify-between">
                                <span className="text-zinc-400">Laser:</span>
                                <span className="text-cyan-300 font-black">{ship.laserAttack} DMG</span>
                              </div>
                              <div className="bg-black/60 border border-red-950/60 p-1 rounded flex justify-between">
                                <span className="text-zinc-400">Plasma:</span>
                                <span className="text-purple-300 font-black">{ship.plasmaAttack} DMG</span>
                              </div>
                              <div className="bg-black/60 border border-red-950/60 p-1 rounded flex justify-between">
                                <span className="text-zinc-400">Ionic:</span>
                                <span className="text-blue-300 font-black">{ship.ionAttack} DMG</span>
                              </div>
                              <div className="bg-black/60 border border-red-950/60 p-1 rounded flex justify-between col-span-2 sm:col-span-1">
                                <span className="text-zinc-400">Graviton:</span>
                                <span className="text-emerald-300 font-black">{ship.gravitonAttack} DMG</span>
                              </div>
                            </div>
                          </div>

                          {/* Blindaje, Supervivencia y Logística */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Blindaje & Cinemática */}
                            <div className="bg-[#04080e] border border-cyan-500/30 p-2 rounded-lg">
                              <span className="text-[7px] font-mono text-cyan-400 font-bold tracking-widest uppercase block mb-1 border-b border-cyan-950 pb-0.5">
                                BLINDAJE Y CINEMÁTICA
                              </span>
                              <div className="space-y-1 font-mono text-[8px]">
                                <div className="flex justify-between bg-black/60 px-1.5 py-0.5 rounded border border-cyan-950">
                                  <span className="text-zinc-400">HP:</span>
                                  <span className="text-white font-bold">{ship.health}</span>
                                </div>
                                <div className="flex justify-between bg-black/60 px-1.5 py-0.5 rounded border border-cyan-950">
                                  <span className="text-zinc-400">Shield:</span>
                                  <span className="text-purple-400 font-bold">{ship.shield}</span>
                                </div>
                                <div className="flex justify-between bg-black/60 px-1.5 py-0.5 rounded border border-cyan-950">
                                  <span className="text-zinc-400">Defense:</span>
                                  <span className="text-cyan-300 font-bold">{ship.defense}</span>
                                </div>
                                <div className="flex justify-between bg-black/60 px-1.5 py-0.5 rounded border border-cyan-950">
                                  <span className="text-zinc-400">Speed:</span>
                                  <span className="text-amber-400 font-bold">{ship.speed}</span>
                                </div>
                              </div>
                            </div>

                            {/* Logística y Capacidad */}
                            <div className="bg-[#05090a] border border-amber-500/30 p-2 rounded-lg">
                              <span className="text-[7px] font-mono text-amber-400 font-bold tracking-widest uppercase block mb-1 border-b border-amber-950 pb-0.5">
                                LOGÍSTICA Y RECURSOS
                              </span>
                              <div className="space-y-1 font-mono text-[8px]">
                                <div className="flex justify-between bg-black/60 px-1.5 py-0.5 rounded border border-amber-950">
                                  <span className="text-zinc-400">Cargo:</span>
                                  <span className="text-white font-bold">{ship.cargo.toLocaleString()} U</span>
                                </div>
                                <div className="flex justify-between bg-black/60 px-1.5 py-0.5 rounded border border-amber-950">
                                  <span className="text-zinc-400">Producción:</span>
                                  <span className="text-emerald-400 font-bold">+{ship.production}%</span>
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 relative z-10">
                    <div className="md:col-span-4 flex flex-col items-center gap-2 bg-black/40 border border-cyan-950 p-3 rounded-xl text-center h-fit">
                      <div className="relative w-24 h-24 rounded-xl border border-cyan-400 overflow-hidden shadow-[0_0_15px_rgba(34,211,238,0.25)]">
                        <img 
                          src={resolveImageUrl(selectedChar.avatar_url || (selectedChar as any).image_url)} 
                          alt={selectedChar.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
                          }}
                        />
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-white font-mono font-black text-[8px] shadow">
                          x{selectedChar.quantity}
                        </div>
                      </div>

                      <div className="font-mono text-[8px] text-zinc-400 space-y-1 w-full text-left uppercase mt-1">
                        <p className="flex justify-between border-b border-zinc-900 pb-0.5">
                          <span>FACCIÓN:</span> <span className="text-cyan-300 font-bold">{selectedChar.faction}</span>
                        </p>
                        <p className="flex justify-between border-b border-zinc-900 pb-0.5">
                          <span>RAREZA:</span> <span className="text-amber-400 font-bold">{selectedChar.rarity}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>TIPO:</span> <span className="text-purple-400 font-bold">{selectedChar.category}</span>
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-8 flex flex-col justify-start gap-2">
                      <div className="bg-black/50 border border-cyan-950 p-2 rounded-xl">
                        <span className="text-[7.5px] font-mono tracking-widest text-cyan-400 font-bold uppercase block mb-0.5">{t('inventory.detail.description', 'DESCRIPCIÓN TÁCTICA')}</span>
                        <p className="text-[8.5px] sm:text-[9px] font-sans text-zinc-300 leading-relaxed uppercase">{selectedChar.description || "Sin descripción disponible."}</p>
                      </div>

                      <div className="bg-black/40 border border-amber-900/40 p-2 rounded-xl font-mono text-[8px]">
                        <span className="text-[7.5px] text-amber-400 font-bold tracking-widest uppercase block mb-1 border-b border-amber-900/30 pb-0.5">{t('inventory.detail.module_card', 'PARÁMETROS DEL MÓDULO')}</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="bg-black/60 border border-amber-950/50 p-1 rounded flex justify-between">
                            <span className="text-zinc-500 text-[7px]">POW</span>
                            <span className="text-emerald-400 font-black">{selectedChar.power_score || 0}</span>
                          </div>
                          <div className="bg-black/60 border border-amber-950/50 p-1 rounded flex justify-between">
                            <span className="text-zinc-500 text-[7px]">Rango</span>
                            <span className="text-white font-black">LVL {selectedChar.level || 1}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de Acción al Pie del Modal */}
              <div className="shrink-0 border-t border-cyan-950/80 pt-2.5 mt-2 flex justify-between items-center gap-2 relative z-10">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSkillsPopup(true)}
                    className="px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/50 text-purple-300 rounded-lg text-[8px] sm:text-[8.5px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.3)] flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    [SKILLS]
                  </button>

                  {getItemCategory(selectedChar) === 'Spaceships' && showSubModal === null && !selectedChar.is_in_flight && (
                    <button
                      onClick={() => setShowSubModal("fleet")}
                      className="px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg text-[8px] sm:text-[8.5px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      [Añadir a Flota]
                    </button>
                  )}
                  {showSubModal !== null && (
                    <button
                      onClick={() => setShowSubModal(null)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-cyan-900/50 text-cyan-400 rounded-lg text-[8px] sm:text-[8.5px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      [Atrás]
                    </button>
                  )}
                </div>

                <Button variant="secondary" size="sm" onClick={() => setSelectedChar(null)} className="text-[8px] sm:text-[8.5px] font-mono font-bold uppercase cursor-pointer">
                  {t('inventory.detail.close_btn', 'CERRAR')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL FLOTANTE DE SKILLS ── */}
      <AnimatePresence>
        {showSkillsPopup && selectedChar && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[10000]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md max-h-[88dvh] flex flex-col hud-panel hud-corners border border-purple-500/60 rounded-2xl p-3 sm:p-4 relative overflow-hidden shadow-[0_0_60px_rgba(168,85,247,0.3)] text-left font-mono text-white"
            >
              <div className="shrink-0 flex justify-between items-center border-b border-purple-900/50 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">
                    {t('inventory.detail.skills_title', 'HABILIDADES TÁCTICAS')}
                  </h3>
                </div>
                <button
                  onClick={() => setShowSkillsPopup(false)}
                  className="w-6 h-6 rounded-full bg-purple-950 border border-purple-800 text-purple-300 hover:text-white font-bold cursor-pointer flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar overscroll-contain">
                <div className="p-2 bg-black/60 border border-purple-950 rounded-xl flex items-center justify-between opacity-50 grayscale pointer-events-none">
                  <span className="text-[9.5px] text-white font-bold uppercase">{selectedChar.name}</span>
                  <span className="text-[7.5px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded font-bold uppercase border border-purple-800">
                    {selectedChar.category}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-black/80 rounded-xl border border-purple-900/50 relative overflow-hidden">
                  <Lock className="w-8 h-8 text-purple-400 mb-2 opacity-80" />
                  <span className="text-[12px] font-black text-purple-300 tracking-widest uppercase">
                    {t('inventory.detail.skills_coming_soon', 'MÓDULO DE HABILIDADES')}
                  </span>
                  <p className="text-[8px] text-zinc-500 mt-2 text-center uppercase">
                    {t('inventory.detail.skills_wip', 'SISTEMA EN CALIBRACIÓN CUÁNTICA')}
                  </p>
                </div>
              </div>

              <div className="shrink-0 mt-2 pt-2 border-t border-purple-900/40 flex justify-end">
                <button
                  onClick={() => setShowSkillsPopup(false)}
                  className="w-full py-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-500/50 text-purple-200 text-[9px] font-black uppercase rounded-xl transition-all cursor-pointer text-center"
                >
                  {t('inventory.detail.accept', 'ENTENDIDO')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InventoryView;
```

---

## src/components/MarketplaceView.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Gavel,
  Tag,
  PlusCircle,
  Search,
  Filter,
  ChevronLeft,
  Lock,
  Unlock,
  Cpu,
  Rocket,
  Bot,
  Wrench,
  Building,
  FileText,
  Package,
  ArrowUpDown,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMarketplace, type MarketListing } from '../hooks/useMarketplace';
import { useInventory } from '../hooks/useInventory';
import { GalaxyFrame } from './CanView';

export type { MarketListing } from '../hooks/useMarketplace';

const GD_COIN_ASSET = "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/GD%20Coin.png";

const resolveImageUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
  }
  const clean = rawUrl.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  if (clean.startsWith('Assets') || clean.startsWith('Monedas') || clean.includes('Assets%20para')) {
    return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/${clean.replace(/^\//, '')}`;
  }
  return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/galaxy-assets/${clean.replace(/^\//, '')}`;
};

interface MarketplaceViewProps {
  playerGems?: number;
  setPlayerGems?: (v: any) => void;
  playerPower?: number;
  setPlayerPower?: (v: any) => void;
  playerGold?: number;
  setPlayerGold?: (v: any) => void;
  onBack: () => void;
  triggerNotification?: (text: string, e?: any) => void;
}

type MarketTab = 'MARKET' | 'AUCTIONS' | 'SELL_ITEM' | 'MY_LISTINGS';
type AssetCategory = 'ALL' | 'SHIPS' | 'TOOLS' | 'STRUCTURES' | 'TECH' | 'BLUEPRINTS' | 'LICENSES' | 'ASTROBOTS' | 'CONSUMABLES';
type RarityFilter = 'ALL' | 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
type PriceSortOption = 'NONE' | 'LOW_TO_HIGH' | 'HIGH_TO_LOW';

interface MyInventoryItem {
  id: string;
  title: string;
  category: AssetCategory;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  description: string;
  image_url: string;
  is_locked: boolean;
  is_in_flight: boolean;
  amount?: number;
}

const normalizeCategory = (cat?: string, type?: string): AssetCategory => {
  const upperCat = String(cat || '').toUpperCase().trim();
  if (['SHIPS', 'TOOLS', 'STRUCTURES', 'TECH', 'BLUEPRINTS', 'LICENSES', 'ASTROBOTS', 'CONSUMABLES'].includes(upperCat)) {
    return upperCat as AssetCategory;
  }

  const raw = `${cat || ''} ${type || ''}`.toLowerCase().trim();
  if (['spaceships', 'ships', 'naves', 'nave', 'spaceship', 'ship'].some(k => raw.includes(k))) return 'SHIPS';
  if (['tools', 'tool', 'herramientas', 'herramienta'].some(k => raw.includes(k))) return 'TOOLS';
  if (['structures', 'structure', 'estructuras', 'estructura', 'defense', 'defensa', 'defenses'].some(k => raw.includes(k))) return 'STRUCTURES';
  if (['technologies', 'technology', 'tech', 'tecnología', 'tecnologia'].some(k => raw.includes(k))) return 'TECH';
  if (['blueprints', 'blueprint', 'planos', 'plano'].some(k => raw.includes(k))) return 'BLUEPRINTS';
  if (['licencia', 'license', 'licenses', 'licencias'].some(k => raw.includes(k))) return 'LICENSES';
  if (['astrobots', 'astrobot', 'robot', 'robots'].some(k => raw.includes(k))) return 'ASTROBOTS';
  if (['consumibles', 'consumables', 'resources', 'recursos', 'consumable'].some(k => raw.includes(k))) return 'CONSUMABLES';
  
  return 'SHIPS';
};

const normalizeRarity = (rar?: string): 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' => {
  const r = String(rar || 'COMMON').toUpperCase().trim();
  if (['COMMON', 'RARE', 'EPIC', 'LEGENDARY'].includes(r)) return r as any;
  if (r.includes('UNCOMMON')) return 'COMMON';
  return 'COMMON';
};

const matchCategory = (itemCat?: string, targetCat?: AssetCategory, itemType?: string) => {
  if (!targetCat || targetCat === 'ALL') return true;
  return normalizeCategory(itemCat, itemType) === targetCat;
};

const matchRarity = (itemRar?: string, targetRar?: RarityFilter) => {
  if (!targetRar || targetRar === 'ALL') return true;
  return normalizeRarity(itemRar) === targetRar;
};

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  setPlayerGold,
  onBack,
  triggerNotification
}) => {
  const {
    listings: marketListings,
    loading: marketLoading,
    publishItem,
    buyItem,
    cancelListing,
    refreshMarket: fetchMarketplaceData,
    currentUserId
  } = useMarketplace();

  const { items: inventoryItems, loading: inventoryLoading, refreshInventory } = useInventory();

  const [activeTab, setActiveTab] = useState<MarketTab>('MARKET');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('ALL');
  const [priceSort, setPriceSort] = useState<PriceSortOption>('NONE');

  const [myInventory, setMyInventory] = useState<MyInventoryItem[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState<boolean>(false);

  const [selectedItemToList, setSelectedItemToList] = useState<MyInventoryItem | null>(null);
  const [sellPrice, setSellPrice] = useState<number>(1000);
  const [sellIsAuction, setSellIsAuction] = useState<boolean>(false);
  const [auctionDuration, setAuctionDuration] = useState<'12h' | '24h' | '48h'>('24h');
  const [sellDescription, setSellDescription] = useState<string>('');

  const syncInventory = async () => {
    setIsLocalLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || currentUserId;
      if (!userId) return;

      const { data: dbListings } = await supabase
        .from('marketplace_listings')
        .select('inventory_item_id')
        .eq('status', 'ACTIVE')
        .eq('seller_id', userId);

      const activeListingIds = new Set((dbListings || []).map((l: any) => String(l.inventory_item_id)));

      const loadCat = async (userTable: string, seedTable: string, category: AssetCategory, fkCols: string[]) => {
        const { data: userRows } = await supabase.from(userTable).select('*').eq('user_id', userId);
        if (!userRows || userRows.length === 0) return [];

        const { data: seedRows } = await supabase.from(seedTable).select('*');
        const seedMap = new Map<string, any>();
        (seedRows || []).forEach((s: any) => {
          [s.id, s.ship_id, s.id_ship, s.tool_id, s.astrobot_id, s.license_id, s.consumable_id, s.technology_id].forEach(k => {
            if (k !== undefined && k !== null) seedMap.set(String(k), s);
          });
        });

        return userRows.map((row: any) => {
          let targetId: string | null = null;
          for (const col of fkCols) {
            if (row[col] !== undefined && row[col] !== null) {
              targetId = String(row[col]);
              break;
            }
          }
          const seed = targetId ? seedMap.get(targetId) : null;
          const realName = row.custom_name || seed?.ship_name || seed?.name || row.name || `${category} #${row.id}`;
          const rawImg = seed?.image_url || seed?.avatar_url || seed?.avatar || row.image_url;
          const finalImg = resolveImageUrl(rawImg);
          const rarity = normalizeRarity(seed?.rarity || row.rarity);
          const isListed = activeListingIds.has(String(row.id)) || (targetId ? activeListingIds.has(targetId) : false);

          return {
            id: String(row.id),
            title: realName,
            category: category,
            rarity: rarity,
            description: seed?.description || row.description || `Activo estelar de la flota.`,
            image_url: finalImg,
            is_locked: Boolean(row.is_in_flight) || isListed,
            is_in_flight: Boolean(row.is_in_flight),
            amount: row.quantity || row.amount || 1
          };
        });
      };

      const [ships, tools, astrobots, consumables, licenses, techs] = await Promise.all([
        loadCat('user_ships', 'seed_ships', 'SHIPS', ['id_ship', 'ship_id', 'id']),
        loadCat('user_tools', 'seed_tools', 'TOOLS', ['tool_id', 'id']),
        loadCat('user_astrobots', 'seed_astrobots', 'ASTROBOTS', ['astrobot_id', 'id']),
        loadCat('user_consumibles', 'seed_consumables', 'CONSUMABLES', ['consumable_id', 'id']),
        loadCat('user_licenses', 'seed_licenses', 'LICENSES', ['license_id', 'id']),
        loadCat('user_technologies', 'seed_technologies', 'TECH', ['technology_id', 'tech_id', 'id'])
      ]);

      const directAssets = [...ships, ...tools, ...astrobots, ...consumables, ...licenses, ...techs];

      const hookAssets: MyInventoryItem[] = (inventoryItems || []).map((item) => {
        const itemCat = normalizeCategory(item.category, item.type);
        const itemRarity = normalizeRarity(item.rarity);
        const isListed = activeListingIds.has(String(item.id));

        return {
          id: String(item.id),
          title: item.name,
          category: itemCat,
          rarity: itemRarity,
          description: item.description || `Activo estelar registrado en la flota.`,
          image_url: resolveImageUrl(item.avatar_url || item.image_url),
          is_locked: item.is_in_flight || isListed,
          is_in_flight: Boolean(item.is_in_flight),
          amount: item.quantity || 1
        };
      });

      const mergedMap = new Map<string, MyInventoryItem>();
      [...directAssets, ...hookAssets].forEach(a => mergedMap.set(a.id, a));

      setMyInventory(Array.from(mergedMap.values()));
    } catch (err) {
      console.error("Error al sincronizar inventario del Marketplace:", err);
    } finally {
      setIsLocalLoading(false);
    }
  };

  useEffect(() => {
    syncInventory();
  }, [inventoryItems, currentUserId, marketListings]);

  const handleConfirmPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemToList) return;
    if (sellPrice <= 0) {
      if (triggerNotification) triggerNotification("⚠️ INGRESA UN PRECIO VÁLIDO");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || currentUserId;

      if (!userId) {
        throw new Error("Sesión no válida.");
      }

      let durationHours = 24;
      if (auctionDuration === '12h') durationHours = 12;
      if (auctionDuration === '48h') durationHours = 48;
      
      const auctionEndTime = sellIsAuction 
        ? new Date(Date.now() + durationHours * 3600 * 1000).toISOString() 
        : null;

      if (publishItem) {
        await publishItem({
          inventoryItemId: selectedItemToList.id,
          title: selectedItemToList.title,
          category: selectedItemToList.category,
          rarity: selectedItemToList.rarity,
          description: sellDescription.trim() || selectedItemToList.description,
          price: sellPrice,
          isAuction: sellIsAuction,
          imageUrl: selectedItemToList.image_url,
          auctionEndTime
        });
      } else {
        const { error } = await supabase.from('marketplace_listings').insert([{
          seller_id: userId,
          inventory_item_id: selectedItemToList.id,
          title: selectedItemToList.title,
          category: selectedItemToList.category,
          rarity: selectedItemToList.rarity,
          description: sellDescription.trim() || selectedItemToList.description,
          price: sellPrice,
          is_auction: sellIsAuction,
          auction_end_time: auctionEndTime,
          image_url: selectedItemToList.image_url,
          status: 'ACTIVE'
        }]);
        if (error) throw error;
      }

      setSelectedItemToList(null);
      setSellPrice(1000);
      setSellDescription('');
      setSellIsAuction(false);

      if (fetchMarketplaceData) await fetchMarketplaceData();
      if (refreshInventory) await refreshInventory();
      await syncInventory();

      if (triggerNotification) {
        triggerNotification(`🔒 ACTIVO PUBLICADO COMO ${sellIsAuction ? 'SUBASTA EN VIVO' : 'VENTA DIRECTA'}`);
      }
    } catch (err: any) {
      console.error("Error al publicar activo:", err);
      if (triggerNotification) triggerNotification(`⛔ ERROR AL PUBLICAR: ${err.message || 'Error de comunicación'}`);
    }
  };

  const handleCancelListing = async (listing: MarketListing) => {
    try {
      await cancelListing(listing.id);
      if (fetchMarketplaceData) await fetchMarketplaceData();
      if (refreshInventory) await refreshInventory();
      await syncInventory();
      if (triggerNotification) triggerNotification("🔓 ACTIVO RETIRADO DEL MERCADO Y DESBLOQUEADO");
    } catch (err: any) {
      console.error("Error al cancelar oferta:", err);
    }
  };

  const handleBuyDirect = async (item: MarketListing) => {
    try {
      await buyItem(item.id);
      if (setPlayerGold) setPlayerGold((prev: number) => Math.max(0, prev - item.price));
      if (fetchMarketplaceData) await fetchMarketplaceData();
      if (refreshInventory) await refreshInventory();
      await syncInventory();
      if (triggerNotification) triggerNotification(`🎉 TRANSACCIÓN EXITOSA: Adquiriste "${item.title}"`);
    } catch (err: any) {
      if (triggerNotification) triggerNotification(`⛔ TRANSACCIÓN RECHAZADA: ${err.message}`);
    }
  };

  const getFilteredAndSortedListings = () => {
    const validInventoryIds = new Set(myInventory.map(i => String(i.id)));

    let result = (marketListings || []).filter((item) => {
      const isAuction = Boolean(item.is_auction || (item as any).isAuction);

      if (activeTab === 'MARKET' && isAuction) return false;
      if (activeTab === 'AUCTIONS' && !isAuction) return false;
      if (activeTab === 'MY_LISTINGS' && String(item.seller_id) !== String(currentUserId)) return false;

      if (String(item.seller_id) === String(currentUserId) && !isLocalLoading) {
        const itemId = String(item.inventory_item_id || item.id);
        const existsInInventory = validInventoryIds.has(itemId);
        if (!existsInInventory) {
          supabase.from('marketplace_listings').delete().eq('id', item.id).then();
          return false;
        }
      }

      if (!matchCategory(item.category, selectedCategory)) return false;
      if (!matchRarity(item.rarity, rarityFilter)) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q);
      }

      return true;
    });

    if (priceSort === 'LOW_TO_HIGH') {
      result.sort((a, b) => a.price - b.price);
    } else if (priceSort === 'HIGH_TO_LOW') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  };

  const getFilteredMyInventory = () => {
    return (myInventory || []).filter((item) => {
      if (!matchCategory(item.category, selectedCategory)) return false;
      if (!matchRarity(item.rarity, rarityFilter)) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q);
      }

      return true;
    });
  };

  const filteredListings = getFilteredAndSortedListings();
  const filteredMyInventory = getFilteredMyInventory();

  const { t } = useTranslation();

  return (
    <GalaxyFrame className="w-full max-w-7xl mx-auto h-full max-h-full font-mono text-left select-none text-white flex flex-col min-h-0" innerPadding="p-2 sm:p-3 h-full flex flex-col min-h-0">
      <div className="flex flex-col gap-2 h-full min-h-0 flex-1 overflow-hidden">
        <div className="w-full bg-[#05070a] border border-cyan-500/30 p-2.5 sm:p-3 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBack}
              className="p-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-left">
              <h1 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-cyan-400 animate-pulse" />
                {t('market.title')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-black/60 p-1 border border-cyan-950 rounded-lg overflow-x-auto">
            {[
              { id: 'MARKET', label: t('market.buy'), icon: ShoppingBag },
              { id: 'AUCTIONS', label: t('market.live_auctions'), icon: Gavel },
              { id: 'SELL_ITEM', label: t('market.publish_sell'), icon: PlusCircle },
              { id: 'MY_LISTINGS', label: t('market.my_listings'), icon: Tag }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as MarketTab);
                    setSelectedCategory('ALL');
                  }}
                  className={`px-3 py-1.5 text-[8.5px] font-bold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                    isActive
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)] font-black'
                      : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full bg-[#05070a] border border-cyan-500/20 p-3 rounded-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 text-[8px] font-bold uppercase">
            {[
              { id: 'ALL', label: t('market.rarities.all') },
              { id: 'COMMON', label: t('market.rarities.common') },
              { id: 'RARE', label: t('market.rarities.rare') },
              { id: 'EPIC', label: t('market.rarities.epic') },
              { id: 'LEGENDARY', label: t('market.rarities.legendary') }
            ].map((rar) => (
              <button
                key={rar.id}
                onClick={() => setRarityFilter(rar.id as RarityFilter)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer border ${
                  rarityFilter === rar.id
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40 font-black'
                    : 'bg-black/40 text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                {rar.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {activeTab !== 'SELL_ITEM' && (
              <div className="flex items-center gap-1 bg-black p-0.5 border border-cyan-950 rounded text-[8px]">
                <ArrowUpDown className="w-3 h-3 text-amber-400 ml-1" />
                <span className="text-zinc-500 pl-1 font-bold">{t('market.price_label')}</span>
                {[
                  { id: 'NONE', label: t('market.sort_off') },
                  { id: 'LOW_TO_HIGH', label: t('market.sort_asc') },
                  { id: 'HIGH_TO_LOW', label: t('market.sort_desc') }
                ].map((sortOpt) => (
                  <button
                    key={sortOpt.id}
                    onClick={() => setPriceSort(sortOpt.id as PriceSortOption)}
                    className={`px-2 py-0.5 rounded font-bold uppercase transition-colors cursor-pointer ${
                      priceSort === sortOpt.id ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    {sortOpt.label}
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1 md:w-52">
              <Search className="absolute left-2.5 top-2 w-3 h-3 text-cyan-500" />
              <input
                type="text"
                placeholder={activeTab === 'SELL_ITEM' ? t('market.search_inventory_placeholder') : t('market.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border border-cyan-950 rounded pl-7 pr-2.5 py-1 text-[8px] text-cyan-200 placeholder-zinc-600 outline-none uppercase font-mono focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col md:flex-row gap-2.5 items-stretch flex-1 min-h-0 overflow-hidden">
          <div className="w-full md:w-52 shrink-0 bg-[#05070a] border border-cyan-500/20 p-2.5 rounded-xl flex flex-col gap-1.5 h-full overflow-hidden">
            <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 px-1 border-b border-cyan-950 pb-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('market.categories_title')}</span>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
              {[
                { id: 'ALL', label: t('market.cats.all'), icon: ShoppingBag },
                { id: 'SHIPS', label: t('market.cats.ships'), icon: Rocket },
                { id: 'TOOLS', label: t('market.cats.tools'), icon: Wrench },
                { id: 'STRUCTURES', label: t('market.cats.structures_defense'), icon: Building },
                { id: 'TECH', label: t('market.cats.technology'), icon: Cpu },
                { id: 'BLUEPRINTS', label: t('market.cats.blueprints'), icon: Tag },
                { id: 'LICENSES', label: t('market.cats.licenses'), icon: FileText },
                { id: 'ASTROBOTS', label: t('market.cats.astrobots'), icon: Bot },
                { id: 'CONSUMABLES', label: t('market.cats.consumables'), icon: Package }
              ].map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const IconComp = cat.icon;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as AssetCategory)}
                    className={`w-full px-2.5 py-2 rounded-lg text-[8px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center justify-between border ${
                      isSelected
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.2)] font-black'
                        : 'bg-[#0a0f14] text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-[#0e1620]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <IconComp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab !== 'SELL_ITEM' ? (
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2.5 h-full overflow-y-auto pr-1.5 custom-scrollbar min-h-0">
              {filteredListings.length === 0 ? (
                <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                  {marketLoading ? t('market.loading_listings') : t('market.empty_listings')}
                </div>
              ) : (
                filteredListings.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#050910] border border-cyan-500/30 hover:border-cyan-400 p-3.5 rounded-xl shadow-xl flex flex-col justify-between gap-3 transition-all relative group"
                  >
                    <div className="flex justify-between items-center border-b border-cyan-950 pb-2">
                      {item.is_auction && (
                        <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase bg-amber-950/80 text-amber-400 border border-amber-800 flex items-center gap-1">
                          <Gavel className="w-3 h-3 text-amber-400" /> {t('market.card.auction_badge')}
                        </span>
                      )}

                      <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border ml-auto ${
                        item.rarity === 'LEGENDARY' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                        item.rarity === 'EPIC' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                        item.rarity === 'RARE' ? 'bg-cyan-950 text-cyan-300 border-cyan-800' :
                        'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}>
                        {item.rarity}
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 bg-black border border-cyan-950 rounded-lg p-1 shrink-0 flex items-center justify-center overflow-hidden">
                        <img src={resolveImageUrl(item.image_url)} alt={item.title} className="w-full h-full object-contain brightness-90 group-hover:scale-110 transition-transform" />
                      </div>

                      <div className="flex flex-col text-left flex-1">
                        <h3 className="text-[10px] font-black text-white uppercase tracking-wider line-clamp-1">{item.title}</h3>
                        <p className="text-[8px] text-zinc-400 font-sans normal-case line-clamp-2 mt-0.5">{item.description}</p>
                      </div>
                    </div>

                    <div className="bg-[#020305] border border-cyan-950 p-2 rounded-lg flex justify-between items-center text-[9px]">
                      <div className="flex flex-col text-left">
                        <span className="text-[7.5px] text-zinc-500 uppercase">{item.is_auction ? t('market.card.current_bid') : t('market.card.direct_price')}</span>
                        <div className="flex items-center gap-1 font-black text-amber-400 text-sm">
                          <span>{item.price.toLocaleString()}</span>
                          <img src={GD_COIN_ASSET} alt="GD Coin" className="w-3.5 h-3.5 object-contain" />
                        </div>
                      </div>
                    </div>

                    {activeTab === 'MY_LISTINGS' ? (
                      <button
                        onClick={() => handleCancelListing(item)}
                        className="w-full py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 font-black text-[8.5px] uppercase rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Unlock className="w-3 h-3" /> {t('market.card.withdraw')}
                      </button>
                    ) : item.is_auction ? (
                      <button
                        onClick={() => handleBuyDirect(item)}
                        className="w-full py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white font-black text-[8.5px] uppercase rounded-lg shadow-[0_0_10px_rgba(245,158,11,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Gavel className="w-3.5 h-3.5" /> {t('market.card.bid')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyDirect(item)}
                        className="w-full py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-110 text-white font-black text-[8.5px] uppercase rounded-lg shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> {t('market.card.buy_now')}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2.5 h-full overflow-y-auto pr-1.5 custom-scrollbar min-h-0">
              {(inventoryLoading || isLocalLoading) ? (
                <div className="col-span-full p-12 text-center text-cyan-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                  {t('market.scanning_assets')}
                </div>
              ) : filteredMyInventory.length === 0 ? (
                <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                  {t('market.no_assets_category')}
                </div>
              ) : (
                filteredMyInventory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all relative group min-h-[140px] ${
                      item.is_locked
                        ? 'bg-black/60 border-zinc-800 opacity-60'
                        : 'bg-[#050910] border-cyan-500/30 hover:border-cyan-400 shadow-xl'
                    }`}
                  >
                    <div className="flex justify-between items-center border-b border-cyan-950 pb-2">
                      {item.is_in_flight ? (
                        <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase bg-red-950/80 text-red-400 border border-red-800 flex items-center gap-1" title={t('market.card.status_in_flight')}>
                          <Lock className="w-3 h-3 text-red-400" /> {t('market.card.status_in_flight')}
                        </span>
                      ) : item.is_locked ? (
                        <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase bg-purple-950/80 text-purple-400 border border-purple-800 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-purple-400" /> {t('market.card.status_listed')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                          <Unlock className="w-3 h-3 text-emerald-400" /> {t('market.card.status_available')}
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase border bg-zinc-800 text-zinc-300 border-zinc-700">
                        {item.rarity}
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 bg-black border border-cyan-950 rounded-lg p-1 shrink-0 flex items-center justify-center overflow-hidden">
                        <img src={resolveImageUrl(item.image_url)} alt={item.title} className="w-full h-full object-contain brightness-90 group-hover:scale-110 transition-transform" />
                      </div>

                      <div className="flex flex-col text-left flex-1">
                        <h3 className="text-[10px] font-black text-white uppercase tracking-wider line-clamp-1">{item.title}</h3>
                        <p className="text-[8px] text-zinc-400 font-sans normal-case line-clamp-2 mt-0.5">{item.description}</p>
                      </div>
                    </div>

                    {item.is_locked ? (
                      <div className="bg-black/80 border border-zinc-800 p-2 rounded-lg text-center text-[8px] text-zinc-500 font-bold uppercase">
                        {item.is_in_flight ? t('market.card.active_mission') : t('market.card.active_listing')}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedItemToList(item);
                          setSellPrice(1000);
                          setSellIsAuction(false);
                        }}
                        className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black text-[8.5px] uppercase rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> {t('market.card.sell_auction')}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {selectedItemToList && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 font-mono">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-[#080b0e] border border-cyan-500/40 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 text-left relative"
              >
                <div className="flex justify-between items-center border-b border-cyan-950 pb-3">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">
                      {t('market.modal.configure_title')}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedItemToList(null)}
                    className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-black/60 p-1 rounded-xl border border-cyan-950 text-[9px] font-bold uppercase">
                  <button
                    type="button"
                    onClick={() => setSellIsAuction(false)}
                    className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                      !sellIsAuction
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'text-zinc-500 border-transparent hover:text-zinc-300'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> {t('market.modal.direct_sale')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellIsAuction(true)}
                    className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                      sellIsAuction
                        ? 'bg-amber-950 text-amber-300 border-amber-500/60 font-black shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                        : 'text-zinc-500 border-transparent hover:text-zinc-300'
                    }`}
                  >
                    <Gavel className="w-3.5 h-3.5" /> {t('market.modal.live_auction')}
                  </button>
                </div>

                <div className="p-3 bg-black/80 border border-cyan-950 rounded-xl flex items-center gap-3">
                  <img src={resolveImageUrl(selectedItemToList.image_url)} alt={selectedItemToList.title} className="w-12 h-12 object-contain" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white uppercase">{selectedItemToList.title}</span>
                    <span className="text-[8px] text-cyan-400 uppercase">{t('market.modal.category_label')}: {selectedItemToList.category} | {t('market.modal.rarity_label')}: {selectedItemToList.rarity}</span>
                  </div>
                </div>

                <form onSubmit={handleConfirmPublish} className="flex flex-col gap-3 text-[9px]">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-zinc-400 font-bold uppercase">
                      <span>{sellIsAuction ? t('market.modal.price_auction') : t('market.modal.price_direct')} {t('market.modal.price_in')}</span>
                      <img src={GD_COIN_ASSET} alt="GD Coin" className="w-3.5 h-3.5 object-contain" />
                    </div>
                    <input
                      type="number"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(Number(e.target.value))}
                      className="bg-black border border-cyan-950 focus:border-cyan-500 rounded-lg p-2 text-amber-400 font-black outline-none"
                    />
                  </div>

                  {sellIsAuction && (
                    <div className="flex flex-col gap-1">
                      <label className="text-zinc-400 font-bold uppercase">{t('market.modal.auction_duration')}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['12h', '24h', '48h'] as const).map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setAuctionDuration(dur)}
                            className={`py-1.5 rounded border text-[8.5px] font-bold uppercase cursor-pointer ${
                              auctionDuration === dur
                                ? 'bg-amber-950 text-amber-300 border-amber-500'
                                : 'bg-black text-zinc-500 border-cyan-950 hover:text-white'
                            }`}
                          >
                            {dur}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-400 font-bold uppercase">{t('market.modal.offer_description')}</label>
                    <textarea
                      rows={2}
                      placeholder={t('market.modal.offer_placeholder')}
                      value={sellDescription}
                      onChange={(e) => setSellDescription(e.target.value)}
                      className="bg-black border border-cyan-950 focus:border-cyan-500 rounded-lg p-2 text-cyan-200 outline-none font-sans text-[9px]"
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-2.5 text-white font-black text-[9.5px] uppercase rounded-lg shadow transition-all cursor-pointer flex items-center justify-center gap-2 mt-1 ${
                      sellIsAuction
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {sellIsAuction ? t('market.modal.publish_auction') : t('market.modal.publish_direct')}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </GalaxyFrame>
  );
};

export default MarketplaceView;
```

---

## src/components/MissionView.tsx

```tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    <GalaxyFrame className="w-full max-w-7xl mx-auto h-full max-h-full font-mono text-left backdrop-blur-md relative overflow-hidden text-white flex flex-col min-h-0" innerPadding="p-3 sm:p-4 h-full flex flex-col min-h-0">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-cyan-900/50 pb-2.5 mb-1.5 shrink-0">
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
              {t('missions.header_subtitle')}
            </span>
            <h2 className="text-lg font-black tracking-widest text-white uppercase">
              {t('missions.title')}
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
      <div className="relative flex-1 min-h-0 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {isCurrentTabLocked ? (
            <motion.div
              key="locked-mission-overlay"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full py-12 px-6 bg-black/70 border border-cyan-950/80 rounded-2xl text-center space-y-3 flex flex-col items-center justify-center backdrop-blur-sm shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-500/60 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <Lock className="w-6 h-6 text-amber-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="px-3 py-0.5 bg-amber-500/20 border border-amber-400/80 text-amber-300 rounded-full font-mono text-[8.5px] font-black uppercase tracking-widest inline-block mb-1 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                  {t('missions.module_wip')}
                </span>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                  {t('missions.category_locked_title')} [{activeMissionType}]
                </h3>
                <p className="text-[9px] text-zinc-400 font-sans normal-case max-w-md mx-auto pt-1 leading-relaxed">
                  {t('missions.locked_description')}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="active-missions-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar w-full"
            >
              {missions.filter(m => m.type === activeMissionType).length === 0 ? (
                <div className="col-span-2 p-12 text-center text-zinc-600 text-[10px] uppercase tracking-widest bg-black/40 border border-cyan-950 rounded-xl">
                  {t('missions.empty')}
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
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {t('missions.claimed')}
                          </span>
                        ) : isComplete ? (
                          <button
                            onClick={() => handleClaimMission(mission.id)}
                            className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-[8.5px] font-black uppercase rounded shadow-[0_0_10px_rgba(16,185,129,0.4)] cursor-pointer transition-all animate-pulse flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{t('missions.claim_btn')}</span>
                          </button>
                        ) : (
                          <span className="text-[8px] text-zinc-500 uppercase font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" /> {t('missions.in_progress')}
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
```

---

## src/components/NotificationsView.tsx

```tsx
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Rocket,
  Skull,
  UserPlus,
  ShoppingBag,
  Users,
  Compass,
  AlertTriangle,
  X
} from "lucide-react";
import { Button } from "./ui/joly-button";
import { useNotifications, NotificationRecord } from "../hooks/useNotifications";
import { GalaxyFrame } from "./CanView";

export type { NotificationRecord } from "../hooks/useNotifications";

// 🎯 FILTRO EXCLUSIVO Y ESTRICTO PARA COMUNICADOS OFICIALES (ÚNICAMENTE 5 CASOS)
export const isOfficialComunicado = (n: NotificationRecord): boolean => {
  const cat = (n.category || n.box_type || "").toUpperCase();
  const title = (n.title || "").toUpperCase();
  const msg = (n.message || "").toUpperCase();

  // 1. Envío o regreso de expedición
  const isExpedition = 
    cat.includes("EXPEDITION") || 
    title.includes("EXPEDICIÓN") || 
    title.includes("DESPLIEGUE") || 
    title.includes("RETORNO") || 
    msg.includes("HA LLEGADO A SU DESTINO") || 
    msg.includes("EN RUTA") || 
    msg.includes("REGRESO A LA BASE");

  // 2. Compras / Ventas / Subastas en Marketplace o Phantom Station
  const isMarketOrPhantom = 
    cat.includes("MARKET") || 
    cat.includes("PHANTOM") || 
    title.includes("COMPRA") || 
    title.includes("VENTA") || 
    title.includes("SUBASTA") || 
    msg.includes("MARKETPLACE") || 
    msg.includes("PHANTOM STATION");

  // 3. Solicitud de amistad o alianza
  const isSocialRequest = 
    title.includes("SOLICITUD DE AMISTAD") || 
    title.includes("SOLICITUD DE ALIANZA") || 
    msg.includes("SOLICITUD DE AMISTAD") || 
    msg.includes("SOLICITUD DE ALIANZA");

  // 4. Descubrimiento de un Sistema Solar (SS)
  const isSSDiscovery = 
    title.includes("SISTEMA SOLAR DESCUBIERTO") || 
    title.includes("DESCUBRIMIENTO DE SS") || 
    msg.includes("SISTEMA SOLAR") || 
    msg.includes("SS DESCUBIERTO") || 
    (cat.includes("DISCOVERY") && (msg.includes("SISTEMA") || msg.includes("SS")));

  // 5. Destrucción de un Asset
  const isAssetDestroyed = 
    title.includes("ACTIVO DESTRUIDO") || 
    title.includes("NAVE DESTRUIDA") || 
    title.includes("HERRAMIENTA DESTRUIDA") || 
    msg.includes("DESTRUIDO POR COMPLETO") || 
    msg.includes("DESTRUIDA EN COMBATE");

  return isExpedition || isMarketOrPhantom || isSocialRequest || isSSDiscovery || isAssetDestroyed;
};

export const NotificationsView: React.FC<{
  triggerNotification?: (text: string, e?: any) => void;
  onBack: () => void;
}> = ({ triggerNotification, onBack }) => {
  const { t } = useTranslation();
  const {
    notifications,
    loading: isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [filterRead, setFilterRead] = useState<"ALL" | "UNREAD">("ALL");
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);

  // Filtrado único de comunicados legítimos
  const comunicadosList = useMemo(() => {
    return notifications.filter(isOfficialComunicado);
  }, [notifications]);

  // Conteo exclusivo de comunicados no leídos
  const unreadComunicadosCount = useMemo(() => {
    return comunicadosList.filter(n => !n.is_read).length;
  }, [comunicadosList]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
    if (triggerNotification) triggerNotification("✓ COMUNICADO MARCADO COMO LEÍDO");
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    if (triggerNotification) triggerNotification("✓ TODOS LOS COMUNICADOS MARCADOS COMO LEÍDOS");
  };

  const handleDeleteNotification = async (notificationId: string) => {
    await deleteNotification(notificationId);
    if (triggerNotification) triggerNotification("🗑️ COMUNICADO ELIMINADO DE LA RED");
  };

  const handleConfirmDeleteAll = async () => {
    try {
      if (deleteAllNotifications) {
        await deleteAllNotifications();
      }
      setShowDeleteConfirmModal(false);
      if (triggerNotification) triggerNotification("🗑️ CANAL DE COMUNICADOS PURGADO");
    } catch (err: any) {
      if (triggerNotification) triggerNotification(`⛔ ERROR AL PURGAR COMUNICADOS: ${err.message}`);
    }
  };

  const filteredNotifications = useMemo(() => {
    let list = [...comunicadosList];

    if (filterRead === "UNREAD") {
      list = list.filter((n) => !n.is_read);
    }

    if (activeTab !== "ALL") {
      list = list.filter((n) => {
        const cat = (n.category || n.box_type || "").toUpperCase();
        const t = (n.title || "").toUpperCase();
        const msg = (n.message || "").toUpperCase();

        if (activeTab === "EXPEDITION") {
          return cat.includes("EXPEDITION") || t.includes("EXPEDICIÓN") || t.includes("DESPLIEGUE") || t.includes("RETORNO");
        }
        if (activeTab === "MARKET") {
          return cat.includes("MARKET") || cat.includes("PHANTOM") || t.includes("COMPRA") || t.includes("VENTA") || t.includes("SUBASTA");
        }
        if (activeTab === "SOCIAL") {
          return t.includes("AMISTAD") || t.includes("ALIANZA") || msg.includes("SOLICITUD");
        }
        if (activeTab === "DISCOVERY") {
          return t.includes("DESCUBRIMIENTO") || msg.includes("SISTEMA SOLAR") || msg.includes("SS");
        }
        if (activeTab === "DESTRUCTION") {
          return t.includes("DESTRUIDO") || t.includes("DESTRUIDA") || msg.includes("DESTRUIDO");
        }
        return true;
      });
    }

    return list;
  }, [comunicadosList, activeTab, filterRead]);

  const getComunicadoIcon = (category: string, boxType: string, title?: string) => {
    const t = (title || "").toUpperCase();

    if (t.includes("DESTRUIDO") || t.includes("DESTRUIDA")) {
      return <Skull className="w-4 h-4 text-red-500 animate-pulse" />;
    }
    if (t.includes("AMISTAD")) return <UserPlus className="w-4 h-4 text-cyan-400" />;
    if (t.includes("ALIANZA")) return <Users className="w-4 h-4 text-indigo-400" />;
    if (t.includes("COMPRA") || t.includes("VENTA") || t.includes("SUBASTA")) return <ShoppingBag className="w-4 h-4 text-amber-400" />;
    if (t.includes("SISTEMA SOLAR") || t.includes("DESCUBRIMIENTO")) return <Compass className="w-4 h-4 text-emerald-400" />;
    return <Rocket className="w-4 h-4 text-cyan-400" />;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).toUpperCase();
    } catch (e) {
      return "RECIENTE";
    }
  };

  return (
    <GalaxyFrame className="w-full max-w-5xl mx-auto my-2 text-white font-sans select-none h-[calc(100vh-6rem)] max-h-[620px]" innerPadding="p-3.5 sm:p-5">
      <div id="swgoh-notifications-screen" className="relative w-full h-full flex flex-col justify-between overflow-hidden">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-cyan-800/25 pb-2.5 mb-2.5 gap-3 relative shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-950 to-neutral-900 border-2 border-cyan-400 text-white flex items-center justify-center hover:bg-cyan-900 transition-all cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.3)] hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-cyan-300 drop-shadow-[0_0_3px_cyan]" />
            </button>
            <div className="text-left">
              <h2 className="text-lg font-bold tracking-widest text-[#e8f1f5] uppercase font-sans flex items-center gap-2">
                {t('notifications.title')}
                <span className="text-[8px] bg-cyan-950 font-mono text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40">
                  {t('notifications.feed_badge')}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadComunicadosCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-xl text-[8.5px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                {t('notifications.mark_all_read')} ({unreadComunicadosCount})
              </button>
            )}

            {comunicadosList.length > 0 && (
              <button
                onClick={() => setShowDeleteConfirmModal(true)}
                className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-300 hover:text-white rounded-xl text-[8.5px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                {t('notifications.delete_all')}
              </button>
            )}
          </div>
        </div>

        {/* BARRA DE PESTAÑAS Y FILTROS */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0a0f14]/85 border border-cyan-900/35 px-3 py-1.5 rounded-xl mb-2.5 shrink-0 font-mono text-[8.5px]">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            {[
              { id: "ALL", label: t('notifications.tabs.all') },
              { id: "EXPEDITION", label: t('notifications.tabs.expedition') },
              { id: "MARKET", label: t('notifications.tabs.market') },
              { id: "SOCIAL", label: t('notifications.tabs.social') },
              { id: "DISCOVERY", label: t('notifications.tabs.discovery') },
              { id: "DESTRUCTION", label: t('notifications.tabs.destruction') }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer font-bold ${
                  activeTab === tab.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.3)]"
                    : "bg-black/40 text-zinc-400 hover:text-white border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => setFilterRead("ALL")}
              className={`px-2.5 py-0.5 rounded uppercase tracking-wider transition-all cursor-pointer ${
                filterRead === "ALL" ? "text-cyan-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t('notifications.view_all')}
            </button>
            <span className="text-zinc-700">|</span>
            <button
              onClick={() => setFilterRead("UNREAD")}
              className={`px-2.5 py-0.5 rounded uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                filterRead === "UNREAD" ? "text-amber-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t('notifications.unread')}
              {unreadComunicadosCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* LISTA DE COMUNICADOS */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-cyan-500 py-16">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[9px] font-mono tracking-widest uppercase animate-pulse">
                {t('notifications.loading')}
              </span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500 text-[9.5px] font-mono uppercase tracking-widest py-16">
              <Bell className="w-8 h-8 text-zinc-700 mb-1" />
              <span>{t('notifications.empty')}</span>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <motion.div
                key={n.notification_id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  !n.is_read
                    ? "bg-[#08121a]/90 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.12)]"
                    : "bg-[#05080c]/60 border-cyan-950/60 opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                    !n.is_read
                      ? "bg-cyan-950/80 border-cyan-400/60 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                      : "bg-black/50 border-cyan-950"
                  }`}>
                    {getComunicadoIcon(n.category, n.box_type, n.title)}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[8px] font-mono font-black text-cyan-400 uppercase tracking-widest bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-900/60">
                        {n.category || n.box_type || "COMUNICADO"}
                      </span>
                      <span className="text-[8px] font-mono text-zinc-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDate(n.created_at)}
                      </span>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-pulse" />
                      )}
                    </div>

                    <h4 className="text-[11px] font-bold text-white uppercase tracking-wide truncate">
                      {n.title}
                    </h4>
                    <p className="text-[9.5px] font-sans text-zinc-300 uppercase leading-relaxed mt-0.5">
                      {n.message}
                    </p>

                    {n.action_url && (
                      <a
                        href={n.action_url}
                        className="inline-flex items-center gap-1 text-[8px] font-mono text-cyan-400 hover:text-cyan-300 uppercase tracking-wider mt-1.5 underline"
                      >
                        <span>Ejecutar Acción</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(n.notification_id)}
                      title="Marcar como leída"
                      className="p-1.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded-lg transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteNotification(n.notification_id)}
                    title="Eliminar comunicado"
                    className="p-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t border-cyan-950/80 pt-2.5 mt-2 flex justify-between items-center shrink-0 font-mono">
          <span className="text-[8px] text-zinc-500 uppercase">
            Comunicados Totales: {comunicadosList.length} | Sin Leer: {unreadComunicadosCount}
          </span>
          <Button variant="secondary" size="sm" onClick={onBack} className="text-[8.5px] font-mono font-bold uppercase cursor-pointer">
            [VOLVER]
          </Button>
        </div>
      </div>

      {/* MODAL CONFIRMACIÓN DE PURGA TOTAL ENMARCADO CON GALAXYFRAME */}
      <AnimatePresence>
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[120] flex items-center justify-center p-4 font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md relative"
            >
              <GalaxyFrame className="w-full shadow-[0_0_40px_rgba(239,68,68,0.25)]" innerPadding="p-5 sm:p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="flex justify-between items-center w-full border-b border-red-900/40 pb-2.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                        {t('notifications.modal_alert')}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirmModal(false)}
                      className="text-zinc-500 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-500/60 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">
                      {t('notifications.modal_title')}
                    </h3>
                    <p className="text-[9.5px] text-zinc-300 leading-relaxed font-sans normal-case bg-black/60 p-3 rounded-xl border border-red-950/80">
                      {t('notifications.modal_desc')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
                    <button
                      onClick={handleConfirmDeleteAll}
                      className="py-2.5 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-[9px] font-black uppercase rounded-lg border border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)] cursor-pointer active:scale-95 transition-all"
                    >
                      {t('notifications.confirm_purge')}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirmModal(false)}
                      className="py-2.5 bg-black border border-zinc-800 text-zinc-400 hover:border-zinc-700 text-[9px] font-bold uppercase rounded-lg hover:text-white cursor-pointer transition-all"
                    >
                      {t('notifications.cancel')}
                    </button>
                  </div>
                </div>
              </GalaxyFrame>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </GalaxyFrame>
  );
};

export default NotificationsView;
```

---

## src/components/PhantomStationView.tsx

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ShoppingBag, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { GalaxyFrame } from './CanView';

const PHANTOM_COIN_ASSET = "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Phantom%20Coin.png";
const GD_COIN_ASSET = "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/GD%20Coin.png";

interface PhantomStationViewProps {
  onBack: () => void;
  triggerNotification?: (text: string, e?: any) => void;
}

interface PhantomBlueprint {
  id: string;
  name: string;
  category: string;
  rarity: string;
  priceValue: number;
  currencyType: string;
  description: string;
  image: string;
}

const CATEGORY_IMAGES: Record<string, string> = {
  NAVES: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300',
  ESTRUCTURAS: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300',
  DEFENSAS: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300',
  TECNOLOGÍAS: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=300',
  INSIGNIAS: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300',
  BLUEPRINTS: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=300',
  LICENCIAS: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300',
  TOOLS: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=300',
  CONSUMIBLES: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300',
  ASTROBOTS: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=300'
};

const EMERGENCY_FALLBACK_ITEMS: PhantomBlueprint[] = [
  {
    id: 'PH-FB-01',
    name: 'LIGHT HUNTER BLUEPRINT',
    category: 'BLUEPRINTS',
    rarity: 'COMMON',
    priceValue: 1000,
    currencyType: 'Phantom Coins',
    description: 'Plano de ensamblaje ligero para unidades de reconocimiento.',
    image: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=300'
  },
  {
    id: 'PH-FB-02',
    name: 'HEAVY HUNTER ZX08 BLUEPRINT',
    category: 'BLUEPRINTS',
    rarity: 'COMMON',
    priceValue: 10000,
    currencyType: 'Phantom Coins',
    description: 'Nave pesada de asalto frontal con blindaje reforzado.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300'
  },
  {
    id: 'PH-FB-03',
    name: 'CHILLIAD CX01 BLUEPRINT',
    category: 'BLUEPRINTS',
    rarity: 'COMMON',
    priceValue: 100000,
    currencyType: 'Phantom Coins',
    description: 'Caza estelar avanzado con propulsión por plasma.',
    image: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=300'
  }
];

export const PhantomStationView: React.FC<PhantomStationViewProps> = ({
  onBack,
  triggerNotification
}) => {
  const { t } = useTranslation();
  const { playSfx } = useAudioEngine();
  const [refreshCountdown, setRefreshCountdown] = useState<string>('03:00:00');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [blueprints, setBlueprints] = useState<PhantomBlueprint[]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLiveStore = useCallback(async () => {
    setLoading(true);
    let loadedItems: PhantomBlueprint[] = [];

    try {
      const { data: allLists, error: listErr } = await supabase
        .from('phantom_rotation_config')
        .select('*');

      if (!listErr && Array.isArray(allLists) && allLists.length > 0) {
        const activeList = allLists.find((l: any) => l.is_active === true || l.isActive === true) || allLists[0];

        if (activeList && Array.isArray(activeList.items) && activeList.items.length > 0) {
          const slotCount = Math.min(8, Math.max(1, Number(activeList.display_slots || activeList.displaySlots) || 8));
          let rawItems = activeList.items.filter((i: any) => i && typeof i === 'object');

          if (activeList.selection_mode === 'random' || activeList.selectionMode === 'random') {
            rawItems = [...rawItems].sort(() => Math.random() - 0.5);
          }
          rawItems = rawItems.slice(0, slotCount);

          loadedItems = rawItems.map((item: any, idx: number) => {
            const rawCat = String(item.category || 'BLUEPRINTS').toUpperCase();
            return {
              id: String(item.id || `PH-${idx}-${Date.now()}`),
              name: String(item.name || 'ACTIVO VOID').toUpperCase(),
              category: rawCat,
              rarity: String(item.rarity || item.rank || 'COMMON').toUpperCase(),
              priceValue: Number(item.priceValue || item.pricePH || item.price) || 1000,
              currencyType: String(item.currencyType || 'Phantom Coins'),
              description: String(item.description || `Dispositivo coloidal en oferta. Stock: ${item.storageLeft ?? 10} u.`),
              image: item.image || CATEGORY_IMAGES[rawCat] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300'
            };
          });
        }
      }

      if (loadedItems.length === 0) {
        const { data: hudData } = await supabase
          .from('sasori_game_hud')
          .select('hud_config')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        const hudConfigObj = (hudData as any)?.hud_config || (hudData as any)?.config;
        const catalog = hudConfigObj?.phantomStation?.suppliesCatalog;
        if (Array.isArray(catalog) && catalog.length > 0) {
          loadedItems = catalog.map((item: any, idx: number) => {
            const rawCat = String(item.category || 'MÓDULO').toUpperCase();
            return {
              id: String(item.id || `HUD-${idx}`),
              name: String(item.name || 'ACTIVO VOID').toUpperCase(),
              category: rawCat,
              rarity: String(item.rank || item.rarity || 'COMMON').toUpperCase(),
              priceValue: Number(item.priceValue || item.pricePH || item.price) || 1000,
              currencyType: String(item.currencyType || 'Phantom Coins'),
              description: String(item.description || 'Módulo espacial registrado en la Estación C.A.N.'),
              image: item.image || CATEGORY_IMAGES[rawCat] || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300'
            };
          });
        }
      }

      if (loadedItems.length === 0) {
        loadedItems = EMERGENCY_FALLBACK_ITEMS;
      }

      setBlueprints(loadedItems);

      const { data: timerData } = await supabase
        .from('sasori_game_hud')
        .select('hud_config')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      const timerConfig = (timerData as any)?.hud_config || (timerData as any)?.config;
      if (timerConfig?.phantomStation?.autoRefreshStockTimerSeconds) {
        setTimerSeconds(Number(timerConfig.phantomStation.autoRefreshStockTimerSeconds));
      }
    } catch (err) {
      console.error("Error cargando tienda:", err);
      setBlueprints(EMERGENCY_FALLBACK_ITEMS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveStore();

    const channel = supabase
      .channel('phantom_game_sync_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phantom_rotation_config' }, () => fetchLiveStore())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sasori_game_hud' }, () => fetchLiveStore())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLiveStore]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const intervalMs = Math.max(10, timerSeconds || 60) * 1000;
      const remainingMs = intervalMs - (now % intervalMs);

      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      setRefreshCountdown(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  const handleAcquireBlueprint = async (bp: PhantomBlueprint) => {
    if (purchasingId) return;
    setPurchasingId(bp.id);
    playSfx(880);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión no autenticada.");

      const { error } = await supabase.rpc('acquire_phantom_station_item_secure', {
        p_item_id: bp.id,
        p_item_name: bp.name,
        p_category: bp.category,
        p_price_ph: bp.priceValue
      });

      if (error) throw error;

      playSfx(1200);
      if (triggerNotification) {
        triggerNotification(`📜 ACTIVO VOID ADQUIRIDO: ${bp.name}`);
      }
    } catch (err: any) {
      console.error("Error en compra:", err);
      playSfx(300);
      if (triggerNotification) {
        triggerNotification(`⛔ TRANSACCIÓN FALLIDA: ${err.message}`);
      }
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="w-full h-full max-h-full flex flex-col overflow-hidden">
      <GalaxyFrame className="w-full max-w-7xl mx-auto h-full max-h-full flex flex-col min-h-0 font-mono text-left select-none text-white" innerPadding="p-2 sm:p-3 h-full flex flex-col min-h-0">
        <div className="w-full flex flex-col lg:flex-row gap-2 items-stretch flex-1 min-h-0 overflow-hidden">
          
          {/* HERO POSTER — oculto en landscape móvil para ganar espacio vertical */}
          <div className="hidden sm:flex w-full lg:w-3/12 shrink-0 relative rounded-xl overflow-hidden hud-panel hud-corners flex-col justify-between p-2.5 min-h-[160px] lg:min-h-[260px] shadow-2xl group">
            <div className="absolute inset-0 z-0">
              <img
                src="https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Phatom%20Station/Skin%20Original/phantom%20station.png"
                alt="Phantom Station"
                className="w-full h-full object-cover object-center brightness-75 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080b0e] via-[#080b0e]/40 to-black/60 z-10" />
              <div className="absolute inset-0 bg-cyan-950/20 mix-blend-overlay z-10" />
            </div>

            <div className="relative z-20 flex justify-between items-center">
              <button
                onClick={() => { playSfx(660); onBack(); }}
                className="p-1.5 bg-black/80 hover:bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded-lg transition-all cursor-pointer backdrop-blur-md flex items-center gap-1 text-[8px] font-bold uppercase shadow-lg"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{t('phantom.back_btn')}</span>
              </button>
            </div>

            <div className="relative z-20 flex flex-col gap-1 mt-auto text-left">
              <h1 className="text-base lg:text-lg font-black text-white uppercase tracking-widest drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                {t('phantom.title')}
              </h1>

              <p className="text-[7.5px] text-zinc-300 font-sans normal-case leading-tight">
                {t('phantom.subtitle')}
              </p>

              <div className="flex items-center gap-1.5 mt-0.5 bg-black/80 border border-cyan-500/40 px-2 py-0.5 rounded-lg backdrop-blur-md w-fit">
                <Clock className="w-3 h-3 text-cyan-400 animate-pulse shrink-0" />
                <div className="flex items-center gap-1 text-[7px] font-mono uppercase">
                  <span className="text-zinc-400">{t('phantom.refresh_label')}</span>
                  <span className="text-amber-400 font-black tracking-wider">{refreshCountdown}</span>
                </div>
              </div>
            </div>
          </div>

          {/* GRID DE CARDS RESISTENTE A FALLOS */}
          <div className="flex-1 w-full lg:w-9/12 hud-panel p-2 rounded-xl flex flex-col min-h-0 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center my-auto text-cyan-400 font-mono text-xs gap-2 py-12">
                <RefreshCw className="animate-spin w-5 h-5" />
                <span>{t('phantom.loading')}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 w-full flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1">
              {blueprints.map((bp) => {
                const isGD = String(bp.currencyType || '').includes('GD');
                const rarityUpper = String(bp.rarity || 'COMMON').toUpperCase();

                return (
                  <div
                    key={bp.id}
                    className="hud-panel hud-corners hud-chamfer-sm p-2 rounded-lg shadow-xl flex flex-col justify-between gap-1.5 transition-all relative group"
                  >
                    <div className="flex justify-between items-center border-b border-cyan-950 pb-1">
                      <span className="text-[6.5px] text-cyan-400/80 font-bold uppercase truncate max-w-[70px]">
                        {bp.category || 'MÓDULO'}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[6px] font-black uppercase border shrink-0 ${
                        rarityUpper === 'LEGENDARY' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                        rarityUpper === 'EPIC' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                        rarityUpper === 'EXCLUSIVE' ? 'bg-red-950 text-red-400 border-red-800' :
                        rarityUpper === 'PHANTOM' ? 'bg-indigo-950 text-indigo-300 border-indigo-800' :
                        'bg-cyan-950 text-cyan-300 border-cyan-800'
                      }`}>
                        {rarityUpper}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="w-full h-12 sm:h-16 bg-black border border-cyan-950 rounded p-0.5 overflow-hidden flex items-center justify-center">
                        <img
                          src={bp.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300'}
                          alt={bp.name || 'Activo'}
                          className="w-full h-full object-cover rounded brightness-90 group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            const t = e.target as HTMLImageElement;
                            if (!t.src.includes('unsplash.com')) {
                              t.onerror = null;
                              t.src = 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=300';
                            }
                          }}
                        />
                      </div>

                      <h3 className="text-[8.5px] font-black text-white uppercase tracking-wider line-clamp-1">
                        {bp.name || 'ACTIVO PHANTOM'}
                      </h3>
                      <p className="text-[7.5px] text-zinc-400 font-sans normal-case line-clamp-1 leading-tight">
                        {bp.description || 'Sin descripción disponible.'}
                      </p>
                    </div>

                    <div className="bg-[#020305] border border-cyan-950 p-1 rounded flex justify-between items-center text-[7.5px]">
                      <span className="text-[6.5px] text-zinc-500 uppercase font-bold">{t('phantom.price_label')}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9.5px] font-black text-cyan-300">
                          {(bp.priceValue || 0).toLocaleString()}
                        </span>
                        <img
                          src={isGD ? GD_COIN_ASSET : PHANTOM_COIN_ASSET}
                          alt={bp.currencyType}
                          className="w-3.5 h-3.5 object-contain"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcquireBlueprint(bp)}
                      disabled={purchasingId === bp.id}
                      className="w-full py-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-110 text-white font-black text-[7.5px] uppercase rounded transition-all cursor-pointer flex items-center justify-center gap-1 shadow-[0_0_6px_rgba(6,182,212,0.3)] disabled:opacity-50"
                    >
                      {purchasingId === bp.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <ShoppingBag className="w-3 h-3" />
                          <span>{t('phantom.acquire_btn')} ({(bp.priceValue || 0).toLocaleString()}</span>
                          <img
                            src={isGD ? GD_COIN_ASSET : PHANTOM_COIN_ASSET}
                            alt={bp.currencyType}
                            className="w-3 h-3 object-contain"
                          />
                          <span>)</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </GalaxyFrame>
  </div>
);
};

export default PhantomStationView;
```

---

## src/components/ProfileView.tsx

```tsx
import React, { useState, useEffect } from 'react';
import {
  User, Swords, CheckCircle2, Lock, ArrowLeft, X, Edit3, Award, Check, LogOut
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { GalaxyFrame } from './CanView';

interface ProfileViewProps {
  onBack?: () => void;
  triggerNotification?: (text: string, e?: any) => void;
  onProfileUpdate?: (updatedFields: { avatar_url?: string; badge_name?: string; badge_image?: string }) => void;
}

const SAFE_FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=200&auto=format&fit=crop';

const resolveAvatarUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return SAFE_FALLBACK_AVATAR;
  }
  const clean = rawUrl.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/galaxy-assets/${clean.replace(/^\//, '')}`;
};

const GAME_AVATARS = [
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/1.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/2.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/3.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/4.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/5.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/6.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/7.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/8.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/9.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/10.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/11.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/12.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/13.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/14.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/15.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/17.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/18.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/19.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/20.png"
];

const GAME_BADGES = [
  {
    id: "badge_1",
    name: "INSIGNIA TÁCTICA ALPHA",
    image: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20(Ambientes%20)/20.jpg"
  },
  {
    id: "badge_2",
    name: "INSIGNIA TÁCTICA BETA",
    image: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20(Ambientes%20)/21.jpg"
  }
];

export const ProfileView: React.FC<ProfileViewProps> = ({ onBack, triggerNotification, onProfileUpdate }) => {
  const { t } = useTranslation();
  const { playSfx } = useAudioEngine();
  const { profile: hookProfile } = usePlayerProfile();

  const [activeTab, setActiveTab] = useState<'STATS' | 'PVP-PVE' | 'ECONOMY' | 'ACHIEVEMENTS'>('STATS');
  const [, setLoading] = useState(true);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);

  const [tempSelectedAvatar, setTempSelectedAvatar] = useState<string | null>(null);
  const [tempSelectedBadge, setTempSelectedBadge] = useState<{ name: string; image: string } | null>(null);

  const [profileData, setProfileData] = useState<any>({
    username: 'COMANDANTE',
    avatar_url: GAME_AVATARS[0],
    level: 1,
    ep: 0,
    max_ep: 1000,
    power_score: 0,
    metal: 0,
    crystal: 0,
    deuterium: 0,
    dark_matter: 0,
    gd_coin: 0,
    quantum_credit: 0,
    phantom_coin: 0,
    badge_name: GAME_BADGES[0].name,
    badge_image: GAME_BADGES[0].image
  });

  const [expeditionStats, setExpeditionStats] = useState({ completed: 0, active: 0, historyByCluster: {} as Record<string, number> });
  const [assetCounts, setAssetStats] = useState({ ships: 0, tools: 0, fleets: 0, discoveredStars: 0 });
  const [battleLogs, setBattleLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!hookProfile) return;

    const savedAvatar = typeof window !== 'undefined'
      ? localStorage.getItem(`user_avatar_${hookProfile.id}`) || localStorage.getItem('user_avatar')
      : null;
    const savedBadgeName = typeof window !== 'undefined'
      ? localStorage.getItem(`user_badge_name_${hookProfile.id}`)
      : null;
    const savedBadgeImage = typeof window !== 'undefined'
      ? localStorage.getItem(`user_badge_image_${hookProfile.id}`)
      : null;

    const realAvatar = resolveAvatarUrl(hookProfile.avatar_url || hookProfile.avatar || savedAvatar || GAME_AVATARS[0]);
    const realBadgeName = hookProfile.badge_name || savedBadgeName || GAME_BADGES[0].name;
    const realBadgeImage = hookProfile.badge_image || savedBadgeImage || GAME_BADGES[0].image;

    setProfileData({
      username: hookProfile.username || hookProfile.display_name || 'PILOTO IMPERIAL',
      avatar_url: realAvatar,
      level: hookProfile.level || 1,
      ep: hookProfile.exp_points || hookProfile.ep || 0,
      max_ep: (hookProfile.level || 1) * 1000,
      power_score: parseFloat(hookProfile.power_score || 0),
      metal: parseFloat(hookProfile.metal || 0),
      crystal: parseFloat(hookProfile.crystal || 0),
      deuterium: parseFloat(hookProfile.deuterium || 0),
      dark_matter: parseFloat(hookProfile.dark_matter || 0),
      gd_coin: parseFloat(hookProfile.gd_coin || 0),
      quantum_credit: parseFloat(hookProfile.quantum_credit || 0),
      phantom_coin: parseFloat(hookProfile.phantom_coin || 0),
      badge_name: realBadgeName,
      badge_image: realBadgeImage
    });
  }, [hookProfile]);

  const fetchRealUserData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const userId = user.id;

      const { data: historyRows, count: completedCount } = await supabase.from('expedition_history').select('galaxy_cluster', { count: 'exact' }).eq('user_id', userId);
      const { count: activeCount } = await supabase.from('active_expeditions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'LAUNCHED');
      const clusterMap: Record<string, number> = {};
      (historyRows || []).forEach((row: any) => {
        const gc = row.galaxy_cluster || 'PELA';
        clusterMap[gc] = (clusterMap[gc] || 0) + 1;
      });
      setExpeditionStats({ completed: completedCount || 0, active: activeCount || 0, historyByCluster: clusterMap });

      const { count: shipsCount } = await supabase.from('user_ships').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      const { count: toolsCount } = await supabase.from('user_tools').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      const { count: fleetsCount } = await supabase.from('fleets').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      const { count: starsCount } = await supabase.from('user_discovered_stars').select('star_id', { count: 'exact', head: true }).eq('discoverer_id', userId);
      setAssetStats({ ships: shipsCount || 0, tools: toolsCount || 0, fleets: fleetsCount || 0, discoveredStars: starsCount || 0 });

      const { data: logs } = await supabase.from('expedition_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
      if (logs) setBattleLogs(logs);
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealUserData();
  }, []);

  const handleOpenAvatarModal = () => {
    playSfx(660);
    setTempSelectedAvatar(resolveAvatarUrl(profileData.avatar_url || GAME_AVATARS[0]));
    setIsAvatarModalOpen(true);
  };

  const handleOpenBadgeModal = () => {
    playSfx(660);
    setTempSelectedBadge({
      name: profileData.badge_name || GAME_BADGES[0].name,
      image: profileData.badge_image || GAME_BADGES[0].image
    });
    setIsBadgeModalOpen(true);
  };

  const handleConfirmAvatar = async () => {
    if (!tempSelectedAvatar) return;
    playSfx(1200);

    const validAvatar = resolveAvatarUrl(tempSelectedAvatar);
    setProfileData((prev: any) => ({ ...prev, avatar_url: validAvatar }));
    setIsAvatarModalOpen(false);

    if (onProfileUpdate) {
      onProfileUpdate({ avatar_url: validAvatar });
    }

    window.dispatchEvent(new CustomEvent('profile_updated', {
      detail: { avatar_url: validAvatar }
    }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.setItem(`user_avatar_${user.id}`, validAvatar);
        localStorage.setItem('user_avatar', validAvatar);

        const { error } = await supabase.rpc('update_user_profile_customization_secure', {
          p_avatar_url: validAvatar
        });

        if (error) throw error;
      }

      if (triggerNotification) {
        triggerNotification("✅ AVATAR GUARDADO CORRECTAMENTE EN LA RED");
      }
    } catch (err: any) {
      console.error("Error al actualizar avatar:", err);
    }
  };

  const handleConfirmBadge = async () => {
    if (!tempSelectedBadge) return;
    playSfx(1200);

    setProfileData((prev: any) => ({
      ...prev,
      badge_name: tempSelectedBadge.name,
      badge_image: tempSelectedBadge.image
    }));
    setIsBadgeModalOpen(false);

    if (onProfileUpdate) {
      onProfileUpdate({ badge_name: tempSelectedBadge.name, badge_image: tempSelectedBadge.image });
    }

    window.dispatchEvent(new CustomEvent('profile_updated', {
      detail: { badge_name: tempSelectedBadge.name, badge_image: tempSelectedBadge.image }
    }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.setItem(`user_badge_name_${user.id}`, tempSelectedBadge.name);
        localStorage.setItem(`user_badge_image_${user.id}`, tempSelectedBadge.image);

        const { error } = await supabase.rpc('update_user_profile_customization_secure', {
          p_badge_name: tempSelectedBadge.name,
          p_badge_image: tempSelectedBadge.image
        });

        if (error) throw error;
      }

      if (triggerNotification) {
        triggerNotification(`✅ INSIGNIA GUARDADA: ${tempSelectedBadge.name}`);
      }
    } catch (err: any) {
      console.error("Error al actualizar insignia:", err);
    }
  };

  const epPercentage = Math.min(100, Math.max(0, (profileData.ep / profileData.max_ep) * 100));

  const realAchievements = [
    { title: "BAUTISMO DE VUELO", desc: "Completar la primera expedición táctica", done: expeditionStats.completed > 0 },
    { title: "COMANDANTE DE FLOTA", desc: "Poseer al menos 5 naves en el hangar", done: assetCounts.ships >= 5 },
    { title: "CARTÓGRAFO ESTELAR", desc: "Descubrir al menos 1 nuevo sector/estrella", done: assetCounts.discoveredStars > 0 },
    { title: "MINERO IMPERIAL", desc: "Extraer más de 10,000 unidades de Metal", done: profileData.metal >= 10000 },
    { title: "PODER ABRUMADOR", desc: "Superar los 100,000 puntos de Poder Total", done: profileData.power_score >= 100000 }
  ];

  return (
    <GalaxyFrame className="w-full max-w-7xl mx-auto my-2 text-white font-mono select-none" innerPadding="p-4 sm:p-6">
      <div className="flex flex-col gap-4 w-full">
        {/* BARRA SUPERIOR */}
        <div className="w-full bg-[#05070a] border border-cyan-500/30 p-3 rounded-xl flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={() => { playSfx(440); onBack(); }} className="p-1.5 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 rounded-lg cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-sm font-black tracking-widest text-white uppercase flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" /> {t('profile.title')}
            </h1>
          </div>
        </div>

        {/* TARJETA PRINCIPAL */}
        <div className="w-full bg-[#05070a] border border-cyan-500/30 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div 
              onClick={handleOpenAvatarModal}
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-black border-2 border-cyan-400/80 hover:border-cyan-300 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.3)] cursor-pointer group"
              title="Cambiar Avatar"
            >
              <img 
                src={resolveAvatarUrl(profileData.avatar_url)} 
                alt="Avatar" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== SAFE_FALLBACK_AVATAR) {
                    target.src = SAFE_FALLBACK_AVATAR;
                  }
                }}
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Edit3 className="w-5 h-5 text-cyan-300" />
              </div>
            </div>

            <div className="flex flex-col text-left gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white uppercase">{profileData.username}</h2>
                <span className="text-[8px] font-black bg-cyan-950 border border-cyan-500/60 text-cyan-300 px-2 py-0.5 rounded uppercase">LVL {profileData.level}</span>
                
                <button
                  onClick={async () => {
                    playSfx(440);
                    await supabase.auth.signOut();
                    window.location.reload();
                  }}
                  className="ml-2 px-3 py-1 bg-red-950/70 hover:bg-red-900/90 border border-red-500/60 hover:border-red-400 text-red-300 text-[8.5px] font-mono font-black uppercase tracking-wider rounded-lg shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut className="w-3 h-3 text-red-400" />
                  <span>{t('profile.logout')}</span>
                </button>
              </div>

              <div className="w-full max-w-xs space-y-1">
                <div className="flex justify-between text-[7.5px] text-zinc-400 font-mono">
                  <span>{t('profile.exp')}</span>
                  <span className="text-cyan-400 font-bold">{profileData.ep} / {profileData.max_ep}</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-cyan-950">
                  <div className="h-full bg-cyan-400 rounded-full transition-all duration-300" style={{ width: `${epPercentage}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div 
            className="relative w-full md:w-64 h-16 rounded-xl border border-cyan-500/50 bg-cover bg-center overflow-hidden flex items-center justify-between p-3 shadow-lg shrink-0"
            style={{ backgroundImage: `url('${profileData.badge_image}')` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/90" />
            <span className="relative z-10 text-[10px] font-black text-cyan-300 uppercase truncate max-w-[140px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{profileData.badge_name}</span>
            <button
              onClick={handleOpenBadgeModal}
              className="relative z-10 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 border border-cyan-400/80 text-white text-[8px] font-black uppercase rounded cursor-pointer hover:brightness-110 active:scale-95 transition-all"
            >
              {t('profile.change_badge')}
            </button>
          </div>
        </div>

        {/* PESTAÑAS SUB-MENÚ */}
        <div className="w-full grid grid-cols-4 gap-1.5 bg-black/60 p-1 rounded-lg border border-cyan-950 text-[9px] font-bold text-center uppercase">
          {([
            { id: 'STATS', label: t('profile.tab_stats') },
            { id: 'PVP-PVE', label: t('profile.tab_pvp') },
            { id: 'ECONOMY', label: t('profile.tab_economy') },
            { id: 'ACHIEVEMENTS', label: t('profile.tab_achievements') }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => { playSfx(880); setActiveTab(tab.id as any); }}
              className={`py-2 rounded transition-all cursor-pointer border ${
                activeTab === tab.id
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black shadow-md'
                  : 'bg-black/40 text-zinc-400 border-transparent hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* PESTAÑA STATS */}
        {activeTab === 'STATS' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#050910] border border-cyan-500/30 p-4 rounded-xl flex flex-col justify-between gap-2 shadow-lg">
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">{t('profile.stat_domination')}</span>
                <div className="text-2xl font-black text-white font-mono">{assetCounts.discoveredStars}</div>
                <span className="text-[7.5px] text-zinc-500 uppercase">{t('profile.stat_stars')}</span>
              </div>

              <div className="bg-[#050910] border border-cyan-500/30 p-4 rounded-xl flex flex-col justify-between gap-2 shadow-lg">
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">{t('profile.stat_expeditions')}</span>
                <div className="flex justify-between items-baseline font-mono">
                  <span className="text-2xl font-black text-white">{expeditionStats.completed}</span>
                  <span className="text-[9px] text-amber-400 font-bold">{expeditionStats.active} {t('profile.stat_in_flight')}</span>
                </div>
                <span className="text-[7.5px] text-zinc-500 uppercase">{t('profile.stat_completed')}</span>
              </div>

              <div className="bg-[#050910] border border-cyan-500/30 p-4 rounded-xl flex flex-col justify-between gap-2 shadow-lg">
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">{t('profile.stat_power')}</span>
                <div className="text-2xl font-black text-cyan-300 font-mono">{profileData.power_score.toLocaleString()} POW</div>
                <span className="text-[7.5px] text-zinc-500 uppercase">{t('profile.stat_score')}</span>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA PVP - PVE */}
        {activeTab === 'PVP-PVE' && (
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center p-12 bg-[#05080c] rounded-xl border border-red-900/50 shadow-[inset_0_0_50px_rgba(220,38,38,0.05)] relative overflow-hidden">
              {/* Sello Top Secret background */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-5 pointer-events-none">
                <span className="text-[100px] font-black text-red-500 uppercase tracking-tighter whitespace-nowrap">CLASSIFIED</span>
              </div>
              
              <Lock className="w-10 h-10 text-red-500 mb-3 opacity-80" />
              <span className="text-[14px] font-black text-red-400 tracking-widest uppercase drop-shadow-md z-10 text-center">
                MÓDULO DE COMBATE EN DESARROLLO
              </span>
              <p className="text-[9px] text-zinc-500 mt-3 text-center uppercase max-w-md z-10 leading-relaxed font-bold">
                El registro de operaciones PvP y simulaciones PvE (Combate Táctico) se encuentra bajo restricciones de nivel Beta. Acceso denegado temporalmente por alto mando.
              </p>
            </div>
          </div>
        )}

        {/* PESTAÑA ECONOMY */}
        {activeTab === 'ECONOMY' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#05070a] border border-cyan-950 p-4 rounded-xl space-y-2.5 text-left">
              <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest block border-b border-cyan-950 pb-1">RESERVA DE RECURSOS BÁSICOS</span>
              <div className="space-y-2 text-[9px] font-mono">
                <div className="flex justify-between items-center p-2 bg-black/50 rounded border border-cyan-950"><span className="text-zinc-400">METAL:</span><span className="text-cyan-200 font-bold">{profileData.metal.toLocaleString()}</span></div>
                <div className="flex justify-between items-center p-2 bg-black/50 rounded border border-purple-950"><span className="text-zinc-400">CRISTAL:</span><span className="text-purple-200 font-bold">{profileData.crystal.toLocaleString()}</span></div>
                <div className="flex justify-between items-center p-2 bg-black/50 rounded border border-blue-950"><span className="text-zinc-400">DEUTERIO:</span><span className="text-blue-200 font-bold">{profileData.deuterium.toLocaleString()}</span></div>
              </div>
            </div>
            <div className="bg-[#05070a] border border-cyan-950 p-4 rounded-xl space-y-2.5 text-left">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block border-b border-amber-950 pb-1">SALDO DE MONEDAS</span>
              <div className="space-y-2 text-[9px] font-mono">
                <div className="flex justify-between items-center p-2 bg-black/50 rounded border border-amber-950"><span className="text-zinc-400">GD COIN:</span><span className="text-amber-300 font-bold">{profileData.gd_coin.toLocaleString()}</span></div>
                <div className="flex justify-between items-center p-2 bg-black/50 rounded border border-cyan-950"><span className="text-zinc-400">QUANTUM CREDIT:</span><span className="text-cyan-300 font-bold">{profileData.quantum_credit.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA ACHIEVEMENTS */}
        {activeTab === 'ACHIEVEMENTS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {realAchievements.map((ach, idx) => (
              <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between text-left font-mono ${ach.done ? 'bg-cyan-950/40 border-cyan-500/60' : 'bg-black/60 border-cyan-950 opacity-50'}`}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9.5px] font-black text-white uppercase">{ach.title}</span>
                  <span className="text-[7.5px] text-zinc-400 normal-case">{ach.desc}</span>
                </div>
                {ach.done ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <Lock className="w-4 h-4 text-zinc-600 shrink-0" />}
              </div>
            ))}
          </div>
        )}

        {/* MODAL 1: SELECCIÓN DE AVATAR */}
        {isAvatarModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 font-mono">
            <div className="w-full max-w-md bg-[#080b0e] border border-cyan-500/50 rounded-2xl p-5 text-left space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-cyan-950 pb-3">
                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" /> SELECCIONAR AVATAR IMPERIAL
                </h3>
                <button onClick={() => setIsAvatarModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <p className="text-[8.5px] text-zinc-400 uppercase">
                Toca una opción para seleccionarla y luego presiona "Confirmar Cambio".
              </p>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2.5 py-2 max-h-[190px] sm:max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
                {GAME_AVATARS.map((url, idx) => {
                  const resolvedUrl = resolveAvatarUrl(url);
                  const isSelected = tempSelectedAvatar === resolvedUrl || tempSelectedAvatar === url;
                  return (
                    <div
                      key={idx}
                      onClick={() => { playSfx(660); setTempSelectedAvatar(resolvedUrl); }}
                      className={`relative w-full aspect-square rounded-xl bg-black border-2 cursor-pointer overflow-hidden transition-all hover:scale-102 ${
                        isSelected 
                          ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.7)]' 
                          : 'border-cyan-950 hover:border-cyan-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={resolvedUrl} 
                        alt={`Avatar ${idx + 1}`} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== SAFE_FALLBACK_AVATAR) {
                            target.src = SAFE_FALLBACK_AVATAR;
                          }
                        }}
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-cyan-500 text-black rounded-full p-1 shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-cyan-950 flex justify-between items-center">
                <button
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="px-3 py-2 bg-black border border-zinc-800 text-zinc-400 hover:text-white text-[9px] font-bold uppercase rounded-lg cursor-pointer"
                >
                  CANCELAR
                </button>

                <button
                  onClick={handleConfirmAvatar}
                  disabled={!tempSelectedAvatar}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border border-cyan-400 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-[0_0_12px_rgba(34,211,238,0.4)] disabled:opacity-50 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  CONFIRMAR CAMBIO
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: CATÁLOGO DE INSIGNIAS */}
        {isBadgeModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 font-mono">
            <div className="w-full max-w-md bg-[#080b0e] border border-cyan-500/50 rounded-2xl p-5 text-left space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-cyan-950 pb-3">
                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400" /> CATÁLOGO DE INSIGNIAS
                </h3>
                <button onClick={() => setIsBadgeModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <p className="text-[8.5px] text-zinc-400 uppercase">
                Toca una insignia para seleccionarla y luego presiona "Confirmar Cambio".
              </p>

              <div className="grid grid-cols-1 gap-3 py-2">
                {GAME_BADGES.map((badge) => {
                  const isSelected = tempSelectedBadge?.name === badge.name;
                  return (
                    <div
                      key={badge.id}
                      onClick={() => { playSfx(660); setTempSelectedBadge({ name: badge.name, image: badge.image }); }}
                      className={`relative h-20 rounded-xl border-2 cursor-pointer overflow-hidden flex items-center justify-between p-4 transition-all hover:scale-101 ${
                        isSelected
                          ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.7)]'
                          : 'border-cyan-950 hover:border-cyan-700 opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundImage: `url('${badge.image}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/90" />
                      <span className="relative z-10 text-[10px] font-black text-cyan-300 uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                        {badge.name}
                      </span>

                      {isSelected && (
                        <div className="relative z-10 bg-cyan-500 text-black rounded-full p-1 shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-cyan-950 flex justify-between items-center">
                <button
                  onClick={() => setIsBadgeModalOpen(false)}
                  className="px-3 py-2 bg-black border border-zinc-800 text-zinc-400 hover:text-white text-[9px] font-bold uppercase rounded-lg cursor-pointer"
                >
                  CANCELAR
                </button>

                <button
                  onClick={handleConfirmBadge}
                  disabled={!tempSelectedBadge}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border border-cyan-400 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-[0_0_12px_rgba(34,211,238,0.4)] disabled:opacity-50 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  CONFIRMAR CAMBIO
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GalaxyFrame>
  );
};

export default ProfileView;
```

---

## src/components/ResourceHUD.tsx

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResourceEngine } from '../hooks/useResourceEngine';
import { Hexagon } from 'lucide-react';

const formatNumber = (num: number = 0) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return Math.floor(num).toString();
};

const GLOW_THRESHOLD = 5;

export const ResourceHUD: React.FC = () => {
  const { metal = 0, crystal = 0 } = useResourceEngine() || {};

  const prevMetalRef = useRef<number>(metal);
  const prevCrystalRef = useRef<number>(crystal);

  const [metalGlow, setMetalGlow] = useState(false);
  const [crystalGlow, setCrystalGlow] = useState(false);

  const [metalParticles, setMetalParticles] = useState<number[]>([]);
  const [crystalParticles, setCrystalParticles] = useState<number[]>([]);

  useEffect(() => {
    const prev = prevMetalRef.current;
    const delta = metal - prev;

    if (delta >= GLOW_THRESHOLD) {
      setMetalGlow(true);
      setMetalParticles([Date.now(), Date.now() + 1, Date.now() + 2]);
      const timer = setTimeout(() => {
        setMetalGlow(false);
        setMetalParticles([]);
      }, 900);
      prevMetalRef.current = metal;
      return () => clearTimeout(timer);
    }

    prevMetalRef.current = metal;
  }, [metal]);

  useEffect(() => {
    const prev = prevCrystalRef.current;
    const delta = crystal - prev;

    if (delta >= GLOW_THRESHOLD) {
      setCrystalGlow(true);
      setCrystalParticles([Date.now(), Date.now() + 1, Date.now() + 2]);
      const timer = setTimeout(() => {
        setCrystalGlow(false);
        setCrystalParticles([]);
      }, 900);
      prevCrystalRef.current = crystal;
      return () => clearTimeout(timer);
    }

    prevCrystalRef.current = crystal;
  }, [crystal]);

  return (
    <div className="fixed top-2 left-0 w-full z-50 flex justify-center pointer-events-none px-4">
      <div className="bg-[#0c0d0e]/95 backdrop-blur-lg border border-white/10 rounded-full px-5 py-2 flex items-center gap-6 shadow-[0_0_20px_rgba(0,0,0,0.6)] pointer-events-auto">

        {/* CONTENEDOR METAL */}
        <motion.div
          className="relative flex items-center gap-2"
          animate={{ scale: metalGlow ? 1.12 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          <div className={`flex items-center justify-center w-7 h-7 rounded-md bg-[#131518] transition-all duration-300 ${metalGlow ? 'border border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]' : 'border border-emerald-500/20'}`}>
            <Hexagon className={`w-4 h-4 transition-colors duration-300 ${metalGlow ? 'text-emerald-300' : 'text-emerald-500'}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest leading-none">Metal</span>
            <span className={`font-mono text-sm font-black leading-none mt-0.5 transition-colors duration-300 ${metalGlow ? 'text-emerald-300 drop-shadow-[0_0_5px_rgba(52,211,153,0.9)]' : 'text-white'}`}>
              {formatNumber(metal)}
            </span>
          </div>
          <AnimatePresence>
            {metalParticles.map((key, i) => (
              <motion.span
                key={key}
                className="absolute -top-4 left-1/2 text-[10px] font-black text-emerald-400 pointer-events-none font-mono"
                initial={{ opacity: 1, y: 0, x: (i - 1) * 10 }}
                animate={{ opacity: 0, y: -20 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                +
              </motion.span>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* SEPARADOR */}
        <div className="w-[2px] h-6 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

        {/* CONTENEDOR CRISTAL */}
        <motion.div
          className="relative flex items-center gap-2"
          animate={{ scale: crystalGlow ? 1.12 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          <div className={`flex items-center justify-center w-7 h-7 rounded-md bg-[#131518] transition-all duration-300 ${crystalGlow ? 'border border-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.9)]' : 'border border-cyan-500/20'}`}>
            <div className={`w-2.5 h-2.5 rotate-45 transition-all duration-300 ${crystalGlow ? 'border-[1.5px] border-cyan-300 bg-cyan-400/30' : 'border-[1.5px] border-cyan-500 bg-cyan-500/10'}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-cyan-500/80 uppercase tracking-widest leading-none">Cristal</span>
            <span className={`font-mono text-sm font-black leading-none mt-0.5 transition-colors duration-300 ${crystalGlow ? 'text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.9)]' : 'text-white'}`}>
              {formatNumber(crystal)}
            </span>
          </div>
          <AnimatePresence>
            {crystalParticles.map((key, i) => (
              <motion.span
                key={key}
                className="absolute -top-4 left-1/2 text-[10px] font-black text-cyan-400 pointer-events-none font-mono"
                initial={{ opacity: 1, y: 0, x: (i - 1) * 10 }}
                animate={{ opacity: 0, y: -20 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                +
              </motion.span>
            ))}
          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  );
};

export default ResourceHUD;
```

---

## src/components/SciFiButton.tsx

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAudioEngine } from '../hooks/useAudioEngine';

interface SciFiButtonProps {
  label: string;
  variant: 'primary' | 'secondary';
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const SciFiButton: React.FC<SciFiButtonProps> = ({
  label,
  variant,
  onClick,
  isLoading = false,
  disabled = false,
  type = 'button'
}) => {
  const { playSfx } = useAudioEngine();
  const isPrimary = variant === 'primary';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    playSfx(isPrimary ? 880 : 660);
    onClick();
  };

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      disabled={disabled || isLoading}
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={`group relative w-full py-5 px-8 font-mono text-xs font-bold uppercase tracking-[0.2em] rounded-2xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        isPrimary
          ? 'bg-white text-[#0C0D0E] shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:bg-cyan-100'
          : 'border border-[#2D2F33] text-[#A0A2A5] bg-transparent hover:bg-[#151719] hover:text-white hover:border-[#404348]'
      }`}
    >
      {/* Loading state indicator */}
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className={`w-4 h-4 animate-spin ${isPrimary ? 'text-[#0C0D0E]' : 'text-white'}`} />
          <span>Procesando...</span>
        </span>
      ) : (
        <span>{label}</span>
      )}
    </motion.button>
  );
};

export default SciFiButton;
```

---

## src/components/SciFiIcons.tsx

```tsx
import React from 'react';

interface IconProps {
  className?: string;
}

// 🔨 1. CONSTRUCCIÓN / ESTRUCTURAS (Inspirado en crafting.jpg)
export const SciFiCraftingIcon: React.FC<IconProps> = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg className={`${className} filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 13.5L9.5 18.7M14.7 13.5L18.2 17M14.7 13.5L10 8.8" />
    <path d="M5.5 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" strokeDasharray="2 2" />
    <path d="M12 2l3 3-4 4 1.5 1.5 4-4 3 3L17 12l4 4-3.5 3.5L14 16l-2.5 3.5" />
  </svg>
);

// 🚀 2. NAVE / VELOCIDAD (Inspirado en image (1).jpg y image (6).jpg)
export const SciFiSpeedIcon: React.FC<IconProps> = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg className={`${className} filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5l-2.5 3 4-1 3 3 3-2.5" />
    <path d="M12 3l9 9-4.5 1.5L12 9l-4.5 4.5L3 12l9-9z" />
    <path d="M2 12l4-4M5 15l4-4M8 18l4-4" />
  </svg>
);

// 🔫 3. ARMA / COMBATE (Inspirado en image (2).jpg)
export const SciFiWeaponIcon: React.FC<IconProps> = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg className={`${className} filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11h11v4H3zM14 12h5v2h-5zM6 15l-2 6h3l2-6zM19 10v6M21 11v4" />
    <path d="M8 8h4v3H8z" />
  </svg>
);

// 🌐 4. RED / C.A.N. NODES (Inspirado en image (3).jpg)
export const SciFiNodeIcon: React.FC<IconProps> = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg className={`${className} filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3" />
    <circle cx="5" cy="18" r="3" />
    <circle cx="19" cy="18" r="3" />
    <path d="M12 8v4M10 13.5L6.5 16M14 13.5l3.5 2.5" />
  </svg>
);

// ⚛️ 5. ÁTOMO / CIENCIA (Inspirado en image (4).jpg)
export const SciFiAtomIcon: React.FC<IconProps> = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg className={`${className} filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)" />
    <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(90 12 12)" />
    <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(150 12 12)" />
  </svg>
);

// 💥 6. LÁSER / ENERGÍA (Inspirado en image (5).jpg)
export const SciFiLaserIcon: React.FC<IconProps> = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg className={`${className} filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="12" r="3" />
    <path d="M9 12h12M18 6l3 6-3 6M15 8l3 4-3 4M21 12h-2" />
  </svg>
);

// ⏱️ 7. TEMPORIZADOR / TRÁNSITO (Inspirado en image (7).jpg)
export const SciFiTimerIcon: React.FC<IconProps> = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg className={`${className} filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l3 3M10 2h4M12 2v3M19 6l-1.5 1.5" />
  </svg>
);
```

---

## src/components/SettingsModal.tsx

```tsx
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

```

---

## src/components/SpaceCompass.tsx

```tsx
import React from 'react';
import { motion } from 'framer-motion';

export const SpaceCompass: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-4 select-none">
      {/* Glow aura background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-red-500/10 blur-3xl rounded-full" />

      {/* Outer Rotating Compass Frame */}
      <motion.svg
        viewBox="0 0 200 200"
        className="w-48 h-48 md:w-56 md:h-56 drop-shadow-[0_0_25px_rgba(34,211,238,0.25)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      >
        <defs>
          <radialGradient id="compassGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0E1726" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#030712" stopOpacity="0.95" />
          </radialGradient>
          <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
          <linearGradient id="neonRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Base dark backdrop plate */}
        <circle cx="100" cy="100" r="90" fill="url(#compassGlow)" stroke="#1F2937" strokeWidth="1.5" />
        
        {/* Holographic orbital paths */}
        <circle cx="100" cy="100" r="78" fill="none" stroke="#22D3EE" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3, 3" />
        <circle cx="100" cy="100" r="66" fill="none" stroke="#EF4444" strokeOpacity="0.1" strokeWidth="0.8" />

        {/* Radial tick marks */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 360) / 24;
          const isMajor = i % 6 === 0;
          const r1 = isMajor ? 82 : 85;
          const r2 = 88;
          const rad = (angle * Math.PI) / 180;
          const x1 = 100 + r1 * Math.cos(rad);
          const y1 = 100 + r1 * Math.sin(rad);
          const x2 = 100 + r2 * Math.cos(rad);
          const y2 = 100 + r2 * Math.sin(rad);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isMajor ? '#22D3EE' : '#374151'}
              strokeWidth={isMajor ? 1.5 : 0.8}
              strokeOpacity={isMajor ? 0.8 : 0.5}
            />
          );
        })}

        {/* Cardinal Directions Text */}
        <text x="100" y="24" textAnchor="middle" fill="#22D3EE" fontSize="9" fontWeight="bold" fontFamily="monospace" letterSpacing="0.1em">N</text>
        <text x="100" y="184" textAnchor="middle" fill="#EF4444" fontSize="9" fontWeight="bold" fontFamily="monospace" letterSpacing="0.1em">S</text>
        <text x="178" y="103" textAnchor="middle" fill="#9CA3AF" fontSize="8" fontWeight="semibold" fontFamily="monospace">E</text>
        <text x="22" y="103" textAnchor="middle" fill="#9CA3AF" fontSize="8" fontWeight="semibold" fontFamily="monospace">W</text>

        {/* Outer Ring Telemetry markers */}
        <path d="M 100,5 A 95,95 0 0,1 182.25,52.25" fill="none" stroke="#22D3EE" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="5, 15" />
        <path d="M 100,195 A 95,95 0 0,1 17.75,147.75" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="5, 15" />
      </motion.svg>

      {/* Layer 2: Inner Compass Rose */}
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute w-48 h-48 md:w-56 md:h-56 pointer-events-none"
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      >
        {/* Glowing holographic nodes */}
        {Array.from({ length: 4 }).map((_, i) => {
          const angle = i * 90 + 45;
          const rad = (angle * Math.PI) / 180;
          const cx = 100 + 55 * Math.cos(rad);
          const cy = 100 + 55 * Math.sin(rad);
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="2"
              fill="#22D3EE"
              className="animate-pulse"
              style={{ animationDelay: `${i * 0.4}s` }}
            />
          );
        })}

        {/* Compass main needles */}
        <polygon points="100,100 92,100 100,32" fill="url(#neonCyan)" filter="url(#glow)" />
        <polygon points="100,100 108,100 100,32" fill="#0891B2" opacity="0.9" />

        <polygon points="100,100 92,100 100,168" fill="url(#neonRed)" />
        <polygon points="100,100 108,100 100,168" fill="#991B1B" opacity="0.9" />

        {/* Center brass pivot & digital coordinate target ring */}
        <circle cx="100" cy="100" r="14" fill="#070A0F" stroke="#22D3EE" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="8" fill="none" stroke="#EF4444" strokeWidth="1" strokeDasharray="3, 3" />
        <circle cx="100" cy="100" r="3" fill="#22D3EE" />
      </motion.svg>

      {/* Cybernetic telemetry display vectors */}
      <div className="absolute top-2 left-2 text-[7px] font-mono text-cyan-400/40 uppercase tracking-widest pointer-events-none">
        HEADING_LOCK::E_O2
      </div>
      <div className="absolute bottom-2 right-2 text-[7px] font-mono text-red-500/40 uppercase tracking-widest pointer-events-none">
        ORBIT_DEV::73.4°
      </div>
    </div>
  );
};

export default SpaceCompass;
```

---

## src/components/SpaceshipIcon.tsx

```tsx
import React from 'react';
import { motion } from 'framer-motion';

export const SpaceshipIcon: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-4 select-none">
      {/* Dynamic thrust fire glow aura */}
      <div className="absolute inset-x-0 bottom-4 h-48 bg-gradient-to-t from-fuchsia-600/15 via-purple-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Futuristic spacecraft core hull vector rendering */}
      <div className="relative w-52 h-52 md:w-60 md:h-60 flex items-center justify-center">
        {/* Plasma Flame Jet Embers Particles */}
        <div className="absolute top-[75%] left-[45%] w-2 h-14 bg-gradient-to-t from-transparent via-fuchsia-500 to-white rounded-full blur-[2px] animate-pulse" />
        <div className="absolute top-[75%] left-[53%] w-2 h-14 bg-gradient-to-t from-transparent via-fuchsia-500 to-white rounded-full blur-[2px] animate-pulse [animation-delay:0.2s]" />
        
        <motion.svg
          viewBox="0 0 240 240"
          className="w-full h-full drop-shadow-[0_0_30px_rgba(168,85,247,0.35)]"
          animate={{
            y: [0, -4, 0],
            rotateX: [12, 16, 12],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ transformStyle: 'preserve-3d', perspective: 800 }}
        >
          <defs>
            {/* Dark Metallic armor fill */}
            <linearGradient id="hullDark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E1625" />
              <stop offset="50%" stopColor="#0B0912" />
              <stop offset="100%" stopColor="#251E32" />
            </linearGradient>

            {/* Glowing neon purple panels */}
            <linearGradient id="neonPurple" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D946EF" />
              <stop offset="100%" stopColor="#701A75" />
            </linearGradient>

            {/* Wing armor plate highlights */}
            <linearGradient id="platingShade" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B2654" />
              <stop offset="100%" stopColor="#180C26" />
            </linearGradient>

            {/* Glowing thruster vector plasma */}
            <linearGradient id="thrusterPlasma" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#E879F9" />
              <stop offset="70%" stopColor="#A21CAF" />
              <stop offset="100%" stopColor="#4A044E" stopOpacity="0" />
            </linearGradient>

            {/* Cockpit holographic shield */}
            <linearGradient id="canopyGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F472B6" />
              <stop offset="100%" stopColor="#581C87" />
            </linearGradient>
            
            <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* BACKGROUND ENERGY FIELD RINGS */}
          <ellipse cx="120" cy="180" rx="45" ry="12" fill="none" stroke="#D946EF" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3, 5" />
          <ellipse cx="120" cy="195" rx="30" ry="8" fill="none" stroke="#D946EF" strokeWidth="0.8" strokeOpacity="0.15" />

          {/* THRUST PLASMA PLUMES */}
          <path d="M 103,172 L 107,240 L 111,172 Z" fill="url(#thrusterPlasma)" opacity="0.9" />
          <path d="M 129,172 L 133,240 L 137,172 Z" fill="url(#thrusterPlasma)" opacity="0.9" />

          {/* SPACESHIP GEOMETRY */}
          {/* 1. Tail Fins / Back stabilizers */}
          <polygon points="120,45 110,95 120,85 130,95" fill="#1E0E2E" stroke="#701A75" strokeWidth="1" />
          <polygon points="120,45 120,85 130,95" fill="#14071F" />

          {/* 2. Left Wing */}
          <polygon points="120,95 35,160 55,178 100,165" fill="url(#hullDark)" stroke="#4A1D6D" strokeWidth="1" />
          <polygon points="110,110 48,158 60,168 100,158" fill="url(#platingShade)" />
          <polyline points="55,157 95,145 100,155" fill="none" stroke="#D946EF" strokeWidth="1.5" strokeLinecap="round" filter="url(#purpleGlow)" />

          {/* 3. Right Wing */}
          <polygon points="120,95 205,160 185,178 140,165" fill="url(#hullDark)" stroke="#4A1D6D" strokeWidth="1" />
          <polygon points="130,110 192,158 180,168 140,158" fill="url(#platingShade)" />
          <polyline points="185,157 145,145 140,155" fill="none" stroke="#D946EF" strokeWidth="1.5" strokeLinecap="round" filter="url(#purpleGlow)" />

          {/* 4. Thruster Engine Cowlings and Mounts */}
          <rect x="98" y="154" width="14" height="20" rx="3" fill="#0D0714" stroke="#D946EF" strokeWidth="1.2" />
          <rect x="128" y="154" width="14" height="20" rx="3" fill="#0D0714" stroke="#D946EF" strokeWidth="1.2" />

          {/* 5. Main Mid Fuselage */}
          <polygon points="120,50 90,140 105,165 135,165 150,140" fill="url(#hullDark)" stroke="#701A75" strokeWidth="1.2" />
          
          {/* 6. Nose Plating */}
          <polygon points="120,50 100,140 120,158" fill="#1D122D" stroke="#A21CAF" strokeWidth="0.8" />
          <polygon points="120,50 120,158 140,140" fill="#120B1D" stroke="#A21CAF" strokeWidth="0.8" />

          {/* 7. Canopy Glass */}
          <polygon points="120,78 110,125 120,140" fill="url(#canopyGlass)" opacity="0.9" stroke="#E879F9" strokeWidth="0.8" filter="url(#purpleGlow)" />
          <polygon points="120,78 120,140 130,125" fill="#701A75" opacity="0.8" stroke="#E879F9" strokeWidth="0.8" />

          {/* 8. Laser Emitters */}
          <line x1="39" y1="162" x2="33" y2="152" stroke="#F472B6" strokeWidth="1.5" strokeLinecap="round" filter="url(#purpleGlow)" />
          <line x1="201" y1="162" x2="207" y2="152" stroke="#F472B6" strokeWidth="1.5" strokeLinecap="round" filter="url(#purpleGlow)" />

          {/* 9. Core Center Module */}
          <circle cx="120" cy="148" r="4.5" fill="#FFFFFF" filter="url(#purpleGlow)" />
          <circle cx="120" cy="148" r="2" fill="#D946EF" />
        </motion.svg>
      </div>

      {/* Cybernetic HUD elements */}
      <div className="absolute top-2 left-2 text-[7px] font-mono text-purple-400/40 uppercase tracking-widest pointer-events-none">
        ENG_BURN::95_KW
      </div>
      <div className="absolute bottom-2 right-2 text-[7px] font-mono text-fuchsia-400/40 uppercase tracking-widest pointer-events-none">
        WEAP_SYS::STA_OFF
      </div>
    </div>
  );
};

export default SpaceshipIcon;
```

---

## src/components/tutorial/TutorialOverlay.tsx

```tsx
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

```

---

## src/components/ui/card-stack.tsx

```tsx
import React from "react";
import { motion } from "framer-motion";

export interface CardStackItem {
  id: string | number;
  content?: React.ReactNode;
  [key: string]: any;
}

interface CardStackProps {
  items?: CardStackItem[];
  offset?: number;
  scaleFactor?: number;
}

export const CardStack: React.FC<CardStackProps> = ({
  items = [],
  offset = 10,
  scaleFactor = 0.06,
}) => {
  const springStiffness = 300;
  const springDamping = 20;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {items.map((card, index) => {
        const isActive = index === 0;
        return (
          <motion.div
            key={card.id}
            className="absolute w-full h-full rounded-2xl p-4 shadow-xl border border-white/10 bg-[#0c1017]"
            style={{
              transformOrigin: "top center",
            }}
            animate={{
              top: index * -offset,
              scale: 1 - index * scaleFactor,
              zIndex: items.length - index,
            }}
            transition={{
              x: { type: "spring", stiffness: springStiffness, damping: springDamping },
              y: { type: "spring", stiffness: springStiffness, damping: springDamping },
              rotateZ: { type: "spring", stiffness: springStiffness, damping: springDamping },
              scale: isActive
                ? {
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut",
                  }
                : { type: "tween", duration: 0.15, ease: "easeOut" },
            }}
          >
            {card.content}
          </motion.div>
        );
      })}
    </div>
  );
};

export default CardStack;
```

---

## src/components/ui/full-screen-scroll-fx.tsx

```tsx
import React, {
  CSSProperties,
  ReactNode,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Section = {
  id?: string;
  background: string;
  leftLabel?: ReactNode;
  title: string | ReactNode;
  rightLabel?: ReactNode;
  renderBackground?: (active: boolean, previous: boolean) => ReactNode;
};

type Colors = Partial<{
  text: string;
  overlay: string;
  pageBg: string;
  stageBg: string;
}>;

type Durations = Partial<{
  change: number; // section change animation
  snap: number;   // programmatic scroll duration (ms)
}>;

export type FullScreenFXAPI = {
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  getIndex: () => number;
  refresh: () => void;
};

export type FullScreenFXProps = {
  sections: Section[];
  className?: string;
  style?: CSSProperties;

  // Layout
  fontFamily?: string;
  header?: ReactNode;
  footer?: ReactNode;
  gap?: number;           // rem
  gridPaddingX?: number;  // rem

  showProgress?: boolean;
  debug?: boolean;

  // Motion
  durations?: Durations;
  reduceMotion?: boolean;
  smoothScroll?: boolean; // if you use Lenis, set to true and install lenis

  // Background transition
  bgTransition?: "fade" | "wipe"; // default "fade"
  parallaxAmount?: number;        // % for outgoing bg (fade mode uses a tiny y drift)

  // Controlled index
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
  initialIndex?: number;

  // Colors
  colors?: Colors;

  // Imperative API
  apiRef?: React.Ref<FullScreenFXAPI>;
  ariaLabel?: string;
  scrollDisabled?: boolean;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const FullScreenScrollFX = forwardRef<HTMLDivElement, FullScreenFXProps>(
  (
    {
      sections,
      className,
      style,

      fontFamily = 'Inter, system-ui, -apple-system, sans-serif',
      header,
      footer,
      gap = 1,
      gridPaddingX = 2,

      showProgress = true,
      debug = false,

      durations = { change: 0.7, snap: 800 },
      reduceMotion,
      smoothScroll = false, // enable if you install Lenis

      bgTransition = "fade",
      parallaxAmount = 4,

      currentIndex,
      onIndexChange,
      initialIndex = 0,

      colors = {
        text: "rgba(245,245,245,0.92)",
        overlay: "rgba(0,0,0,0.35)",
        pageBg: "#070809",
        stageBg: "#000000",
      },

      apiRef,
      ariaLabel = "Full screen scroll slideshow",
      scrollDisabled = true,
    },
    ref
  ) => {
    const total = sections.length;
    const [localIndex, setLocalIndex] = useState(clamp(initialIndex, 0, Math.max(0, total - 1)));
    const isControlled = typeof currentIndex === "number";
    const index = isControlled ? clamp(currentIndex!, 0, Math.max(0, total - 1)) : localIndex;

    const rootRef = useRef<HTMLDivElement | null>(null);
    const fixedRef = useRef<HTMLDivElement | null>(null);
    const fixedSectionRef = useRef<HTMLDivElement | null>(null);

    const bgRefs = useRef<HTMLImageElement[]>([]);
    const wordRefs = useRef<HTMLSpanElement[][]>([]);

    const leftTrackRef = useRef<HTMLDivElement | null>(null);
    const rightTrackRef = useRef<HTMLDivElement | null>(null);
    const leftItemRefs = useRef<HTMLDivElement[]>([]);
    const rightItemRefs = useRef<HTMLDivElement[]>([]);

    const progressFillRef = useRef<HTMLDivElement | null>(null);
    const currentNumberRef = useRef<HTMLSpanElement | null>(null);

    const stRef = useRef<ScrollTrigger | null>(null);
    const lastIndexRef = useRef(index);
    const isAnimatingRef = useRef(false);
    const isSnappingRef = useRef(false);
    const sectionTopRef = useRef<number[]>([]);

    // prefers-reduced-motion
    const prefersReduced = useMemo(() => {
      if (typeof window === "undefined") return false;
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }, []);
    const motionOff = reduceMotion ?? prefersReduced;

    // Split words for center title
    const tempWordBucket = useRef<HTMLSpanElement[]>([]);
    const splitWords = (text: string) => {
      const words = text.split(/\s+/).filter(Boolean);
      return words.map((w, i) => (
        <span className="fx-word-mask inline-block overflow-hidden" key={i}>
          <span className="fx-word inline-block" ref={(el) => el && tempWordBucket.current.push(el)}>{w}</span>
          {i < words.length - 1 ? " " : null}
        </span>
      ));
    };
    const WordsCollector = ({ onReady }: { onReady: () => void }) => {
      useEffect(() => onReady(), []); // eslint-disable-line
      return null;
    };

    // Compute scroll snap positions
    const computePositions = () => {
      const el = fixedSectionRef.current;
      if (!el) return;
      const top = el.offsetTop;
      const h = el.offsetHeight;
      const arr: number[] = [];
      for (let i = 0; i < total; i++) arr.push(top + (h * i) / total);
      sectionTopRef.current = arr;
    };

    // Align lists: center active row
    const measureAndCenterLists = (toIndex = index, animate = true) => {
      const centerTrack = (
        container: HTMLDivElement | null,
        items: HTMLDivElement[],
        isRight: boolean
      ) => {
        if (!container || items.length === 0) return;
        const first = items[0];
        const second = items[1];
        if (!first) return;
        const contRect = container.getBoundingClientRect();
        let rowH = first.getBoundingClientRect().height;
        if (second) {
          // more accurate: distance between rows includes gap
          rowH = second.getBoundingClientRect().top - first.getBoundingClientRect().top;
        }
        // center math
        const targetY = contRect.height / 2 - rowH / 2 - toIndex * rowH;
        const prop = isRight ? rightTrackRef : leftTrackRef;
        if (!prop.current) return;
        if (animate) {
          gsap.to(prop.current, {
            y: targetY,
            duration: (durations.change ?? 0.7) * 0.9,
            ease: "power3.out",
          });
        } else {
          gsap.set(prop.current, { y: targetY });
        }
      };

      measureRAF(() => {
        measureRAF(() => {
          centerTrack(leftTrackRef.current, leftItemRefs.current, false);
          centerTrack(rightTrackRef.current, rightItemRefs.current, true);
        });
      });
    };

    const measureRAF = (fn: () => void) => {
      if (typeof window === "undefined") return;
      requestAnimationFrame(() => requestAnimationFrame(fn));
    };

    // ScrollTrigger for pinning + index step detection
    useLayoutEffect(() => {
      if (typeof window === "undefined") return;
      const fixed = fixedRef.current;
      const fs = fixedSectionRef.current;
      if (!fixed || !fs || total === 0) return;

      // initial bg states
      gsap.set(bgRefs.current, { opacity: 0, scale: 1.04, yPercent: 0 });
      if (bgRefs.current[0]) gsap.set(bgRefs.current[0], { opacity: 1, scale: 1 });

      // initial center words
      wordRefs.current.forEach((words, sIdx) => {
        words.forEach((w) => {
          gsap.set(w, {
            yPercent: sIdx === index ? 0 : 100,
            opacity: sIdx === index ? 1 : 0,
          });
        });
      });

      computePositions();
      measureAndCenterLists(index, false);

      const st = !scrollDisabled ? ScrollTrigger.create({
        trigger: fs,
        start: "top top",
        end: "bottom bottom",
        pin: fixed,
        pinSpacing: true,
        onUpdate: (self) => {
          if (motionOff || isSnappingRef.current) return;
          const prog = self.progress;
          const target = Math.min(total - 1, Math.floor(prog * total));
          if (target !== lastIndexRef.current && !isAnimatingRef.current) {
            const next = lastIndexRef.current + (target > lastIndexRef.current ? 1 : -1);
            // programmatic one-step snap without extra sound
            goTo(next, false);
          }
          if (progressFillRef.current) {
            const p = (lastIndexRef.current / (total - 1 || 1)) * 100;
            progressFillRef.current.style.width = `${p}%`;
          }
        },
      }) : null;

      if (st) stRef.current = st;

      // initial jump if needed
      if (initialIndex && initialIndex > 0 && initialIndex < total) {
        requestAnimationFrame(() => goTo(initialIndex, false));
      }

      // handle resize
      const ro = new ResizeObserver(() => {
        computePositions();
        measureAndCenterLists(lastIndexRef.current, false);
        if (!scrollDisabled) {
          ScrollTrigger.refresh();
        }
      });
      ro.observe(fs);

      return () => {
        ro.disconnect();
        if (st) st.kill();
        stRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [total, initialIndex, motionOff, bgTransition, parallaxAmount, scrollDisabled]);

    // Keyboard and mouse wheel event listener when scroll is blocked
    useEffect(() => {
      if (!scrollDisabled) return;

      let lastWheelTime = 0;
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();

        const now = Date.now();
        // 900ms speed control to make transitions ultra deliberate and clean
        if (now - lastWheelTime < 900) return;
        if (isAnimatingRef.current) return;
        if (Math.abs(e.deltaY) < 15) return; // avoid scroll jitter

        if (e.deltaY > 0) {
          if (index < total - 1) {
            lastWheelTime = now;
            goTo(index + 1, false);
          }
        } else {
          if (index > 0) {
            lastWheelTime = now;
            goTo(index - 1, false);
          }
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (isAnimatingRef.current) return;
        if (e.key === "ArrowDown" || e.key === "PageDown") {
          if (index < total - 1) {
            goTo(index + 1, false);
          }
        } else if (e.key === "ArrowUp" || e.key === "PageUp") {
          if (index > 0) {
            goTo(index - 1, false);
          }
        }
      };

      const el = rootRef.current;
      if (el) {
        el.addEventListener("wheel", handleWheel, { passive: false });
      }
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        if (el) {
          el.removeEventListener("wheel", handleWheel);
        }
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [index, total, scrollDisabled]);

    // Section change visuals
    const changeSection = (to: number) => {
      if (to === lastIndexRef.current || isAnimatingRef.current) return;
      const from = lastIndexRef.current;
      const down = to > from;
      isAnimatingRef.current = true;

      if (!isControlled) setLocalIndex(to);
      onIndexChange?.(to);

      // progress numbers
      if (currentNumberRef.current) {
        currentNumberRef.current.textContent = String(to + 1).padStart(2, "0");
      }
      if (progressFillRef.current) {
        const p = (to / (total - 1 || 1)) * 100;
        progressFillRef.current.style.width = `${p}%`;
      }

      const D = durations.change ?? 0.7;

      // center title word animation (mask slide)
      const outWords = wordRefs.current[from] || [];
      const inWords = wordRefs.current[to] || [];
      if (outWords.length) {
        gsap.to(outWords, {
          yPercent: down ? -100 : 100,
          opacity: 0,
          duration: D * 0.6,
          stagger: down ? 0.03 : -0.03,
          ease: "power3.out",
        });
      }
      if (inWords.length) {
        gsap.set(inWords, { yPercent: down ? 100 : -100, opacity: 0 });
        gsap.to(inWords, {
          yPercent: 0,
          opacity: 1,
          duration: D,
          stagger: down ? 0.05 : -0.05,
          ease: "power3.out",
        });
      }

      // backgrounds — FADE mode (requested)
      const prevBg = bgRefs.current[from];
      const newBg = bgRefs.current[to];
      if (bgTransition === "fade") {
        if (newBg) {
          gsap.set(newBg, { opacity: 0, scale: 1.04, yPercent: down ? 1 : -1 });
          gsap.to(newBg, { opacity: 1, scale: 1, yPercent: 0, duration: D, ease: "power2.out" });
        }
        if (prevBg) {
          gsap.to(prevBg, {
            opacity: 0,
            yPercent: down ? -parallaxAmount : parallaxAmount,
            duration: D,
            ease: "power2.out",
          });
        }
      } else {
        // optional wipe mode
        if (newBg) {
          gsap.set(newBg, {
            opacity: 1,
            clipPath: down ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)",
            scale: 1,
            yPercent: 0,
          });
          gsap.to(newBg, { clipPath: "inset(0 0 0 0)", duration: D, ease: "power3.out" });
        }
        if (prevBg) {
          gsap.to(prevBg, { opacity: 0, duration: D * 0.8, ease: "power2.out" });
        }
      }

      // lists — center active row and animate active state
      measureAndCenterLists(to, true);

      leftItemRefs.current.forEach((el, i) => {
        if (el) {
          el.classList.toggle("active", i === to);
          gsap.to(el, {
            opacity: i === to ? 1 : 0.35,
            x: i === to ? 10 : 0,
            duration: D * 0.6,
            ease: "power3.out",
          });
        }
      });
      rightItemRefs.current.forEach((el, i) => {
        if (el) {
          el.classList.toggle("active", i === to);
          gsap.to(el, {
            opacity: i === to ? 1 : 0.35,
            x: i === to ? -10 : 0,
            duration: D * 0.6,
            ease: "power3.out",
          });
        }
      });

      gsap.delayedCall(D, () => {
        lastIndexRef.current = to;
        isAnimatingRef.current = false;
      });
    };

    // programmatic navigation
    const goTo = (to: number, withScroll = true) => {
      const clamped = clamp(to, 0, total - 1);
      isSnappingRef.current = true;
      changeSection(clamped);

      const pos = sectionTopRef.current[clamped];
      const snapMs = durations.snap ?? 800;

      if (withScroll && typeof window !== "undefined" && typeof pos === "number") {
        window.scrollTo({ top: pos, behavior: "smooth" });
        setTimeout(() => (isSnappingRef.current = false), snapMs);
      } else {
        setTimeout(() => (isSnappingRef.current = false), 10);
      }
    };

    const next = () => goTo(index + 1);
    const prev = () => goTo(index - 1);

    useImperativeHandle(apiRef, () => ({
      next,
      prev,
      goTo,
      getIndex: () => index,
      refresh: () => ScrollTrigger.refresh(),
    }));

    // click/hover on list items
    const handleJump = (i: number) => goTo(i);
    const handleLoadedStagger = () => {
      // soft entrance for lists at mount
      leftItemRefs.current.forEach((el, i) => {
        if (el) {
          gsap.fromTo(
            el,
            { opacity: 0, y: 20 },
            { opacity: i === index ? 1 : 0.35, y: 0, duration: 0.5, delay: i * 0.06, ease: "power3.out" }
          );
        }
      });
      rightItemRefs.current.forEach((el, i) => {
        if (el) {
          gsap.fromTo(
            el,
            { opacity: 0, y: 20 },
            { opacity: i === index ? 1 : 0.35, y: 0, duration: 0.5, delay: 0.2 + i * 0.06, ease: "power3.out" }
          );
        }
      });
    };

    // mount entrance
    useEffect(() => {
      handleLoadedStagger();
      measureAndCenterLists(index, false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // CSS vars
    const cssVars: CSSProperties = {
      ["--fx-font" as any]: fontFamily,
      ["--fx-text" as any]: colors.text ?? "rgba(245,245,245,0.92)",
      ["--fx-overlay" as any]: colors.overlay ?? "rgba(0,0,0,0.35)",
      ["--fx-page-bg" as any]: colors.pageBg ?? "#070809",
      ["--fx-stage-bg" as any]: colors.stageBg ?? "#000",
      ["--fx-gap" as any]: `${gap}rem`,
      ["--fx-grid-px" as any]: `${gridPaddingX}rem`,
      ["--fx-row-gap" as any]: "10px",
    };

    return (
      <div
        ref={(node) => {
          (rootRef as any).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={["fx", className].filter(Boolean).join(" ")}
        style={{ ...cssVars, ...style }}
        aria-label={ariaLabel}
      >
        {debug && <div className="fx-debug">Section: {index}</div>}

        <div className="fx-scroll">
          <div className="fx-fixed-section" ref={fixedSectionRef}>
            <div className="fx-fixed" ref={fixedRef}>
              {/* Backgrounds */}
              <div className="fx-bgs" aria-hidden="true">
                {sections.map((s, i) => (
                  <div className="fx-bg" key={s.id ?? i}>
                    {s.renderBackground ? (
                      s.renderBackground(index === i, lastIndexRef.current === i)
                    ) : (
                      <>
                        <img
                          ref={(el) => el && (bgRefs.current[i] = el)}
                          src={s.background}
                          alt=""
                          className="fx-bg-img"
                        />
                        <div className="fx-bg-overlay" />
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="fx-grid">
                {/* Header */}
                {header && <div className="fx-header">{header}</div>}

                {/* Content (lists + center) */}
                <div className="fx-content">
                  {/* Left list */}
                  <div className="fx-left" role="list">
                    <div className="fx-track" ref={leftTrackRef}>
                      {sections.map((s, i) => (
                        <div
                          key={`L-${s.id ?? i}`}
                          className={`fx-item fx-left-item ${i === index ? "active" : ""}`}
                          ref={(el) => el && (leftItemRefs.current[i] = el)}
                          onClick={() => handleJump(i)}
                          role="button"
                          tabIndex={0}
                          aria-pressed={i === index}
                        >
                          {s.leftLabel}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Center title (masked words if string) */}
                  <div className="fx-center">
                    {sections.map((s, sIdx) => {
                      tempWordBucket.current = [];
                      const isString = typeof s.title === "string";
                      return (
                        <div key={`C-${s.id ?? sIdx}`} className={`fx-featured ${sIdx === index ? "active" : ""}`}>
                          <h3 className="fx-featured-title">
                            {isString ? splitWords(s.title as string) : s.title}
                          </h3>
                          <WordsCollector
                            onReady={() => {
                              if (tempWordBucket.current.length) {
                                wordRefs.current[sIdx] = [...tempWordBucket.current];
                              }
                              tempWordBucket.current = [];
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Right list */}
                  <div className="fx-right" role="list">
                    <div className="fx-track" ref={rightTrackRef}>
                      {sections.map((s, i) => (
                        <div
                          key={`R-${s.id ?? i}`}
                          className={`fx-item fx-right-item ${i === index ? "active" : ""}`}
                          ref={(el) => el && (rightItemRefs.current[i] = el)}
                          onClick={() => handleJump(i)}
                          role="button"
                          tabIndex={0}
                          aria-pressed={i === index}
                        >
                          {s.rightLabel}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer + progress */}
                <div className="fx-footer">
                  {footer && <div className="fx-footer-title">{footer}</div>}
                  {showProgress && (
                    <div className="fx-progress">
                      <div className="fx-progress-numbers">
                        <span ref={currentNumberRef}>{String(index + 1).padStart(2, "0")}</span>
                        <span>{String(total).padStart(2, "0")}</span>
                      </div>
                      <div className="fx-progress-bar">
                        <div className="fx-progress-fill" ref={progressFillRef} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* End spacer */}
          {!scrollDisabled && (
            <div className="fx-end">
              <p className="fx-fin text-white/20 tracking-widest font-mono text-[9px] uppercase">FIN DE SECCIONES</p>
            </div>
          )}
        </div>

        <style jsx>{`
          .fx {
            width: 100%;
            overflow: hidden;
            background: var(--fx-page-bg);
            color: #000;
            font-family: var(--fx-font);
            text-transform: uppercase;
            letter-spacing: -0.02em;
          }

          .fx-debug {
            position: fixed; bottom: 10px; right: 10px; z-index: 9999;
            background: rgba(255,255,255,0.8); color: #000; padding: 6px 8px; font: 12px/1 monospace; border-radius: 4px;
          }

          .fx-fixed-section { height: ${scrollDisabled ? "100vh" : `${Math.max(1, total + 1)}00vh`}; position: relative; }
          .fx-fixed { position: sticky; top: 0; height: 100vh; width: 100%; overflow: hidden; background: var(--fx-page-bg); }

          .fx-grid {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: var(--fx-gap);
            padding: 0 var(--fx-grid-px);
            position: relative;
            height: 100%;
            z-index: 2;
          }

          .fx-bgs { position: absolute; inset: 0; background: var(--fx-stage-bg); z-index: 1; }
          .fx-bg { position: absolute; inset: 0; }
          .fx-bg-img {
            position: absolute; inset: -10% 0 -10% 0;
            width: 100%; height: 120%; object-fit: cover;
            filter: brightness(0.8);
            opacity: 0;
            will-change: transform, opacity;
          }
          .fx-bg-overlay { position: absolute; inset: 0; background: var(--fx-overlay); }

          .fx-header {
            grid-column: 1 / 13; align-self: start; padding-top: 6vh;
            font-size: clamp(2rem, 9vw, 9rem); line-height: 0.86; text-align: center; color: var(--fx-text);
          }
          .fx-header > * { display: block; }

          .fx-content {
            grid-column: 1 / 13;
            position: absolute; inset: 0;
            display: grid; grid-template-columns: 1fr 1.3fr 1fr; /* L 30% / C 40% / R 30% vibe */
            align-items: center;
            height: 100%;
            padding: 0 var(--fx-grid-px);
          }

          .fx-left, .fx-right {
            height: 60vh; /* gives us room to center the active row */
            overflow: hidden;
            display: grid; align-content: center;
          }
          .fx-left { justify-items: start; }
          .fx-right { justify-items: end; }
          .fx-track { will-change: transform; }

          .fx-item {
            color: var(--fx-text);
            font-weight: 800;
            letter-spacing: 0.1em;
            line-height: 1.2;
            margin: calc(var(--fx-row-gap) / 2) 0;
            opacity: 0.35;
            transition: opacity 0.3s ease, transform 0.3s ease;
            position: relative;
            font-size: clamp(0.75rem, 1.2vw, 1.2rem);
            user-select: none;
            cursor: pointer;
          }
          .fx-left-item.active, .fx-right-item.active { opacity: 1; }
          .fx-left-item.active { transform: translateX(10px); padding-left: 16px; }
          .fx-right-item.active { transform: translateX(-10px); padding-right: 16px; }

          .fx-left-item.active::before,
          .fx-right-item.active::after {
            content: "";
            position: absolute; top: 50%; transform: translateY(-50%);
            width: 6px; height: 6px; background: #E53E3E; border-radius: 50%;
          }
          .fx-left-item.active::before { left: 0; }
          .fx-right-item.active::after { right: 0; }

          .fx-center {
            display: grid; place-items: center; text-align: center; height: 60vh; overflow: hidden;
          }
          .fx-featured { position: absolute; opacity: 0; visibility: hidden; }
          .fx-featured.active { opacity: 1; visibility: visible; }
          .fx-featured-title {
            margin: 0; color: var(--fx-text);
            font-weight: 900; letter-spacing: -0.01em;
            font-size: clamp(2rem, 7.5vw, 6rem);
          }
          .fx-word-mask { display: inline-block; overflow: hidden; vertical-align: middle; }
          .fx-word { display: inline-block; vertical-align: middle; }

          .fx-footer {
            grid-column: 1 / 13; align-self: end; padding-bottom: 5vh; text-align: center;
          }
          .fx-footer-title { color: var(--fx-text); font-size: clamp(1.6rem, 7vw, 7rem); font-weight: 900; letter-spacing: -0.01em; line-height: 0.9; }
          .fx-progress { width: 240px; height: 2px; margin: 1rem auto 0; background: rgba(245,245,245,0.1); position: relative; }
          .fx-progress-fill { position: absolute; inset: 0 auto 0 0; width: 0%; background: #E53E3E; height: 100%; transition: width 0.3s ease; }
          .fx-progress-numbers { position: absolute; inset: auto 0 100% 0; display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--fx-text); opacity: 0.6; font-family: monospace; }

          .fx-end { height: 100vh; display: grid; place-items: center; }
          .fx-fin { transform: rotate(90deg); color: #111; }

          @media (max-width: 900px) {
            .fx-content {
              grid-template-columns: 1fr; row-gap: 3vh;
              place-items: center;
            }
            .fx-left, .fx-right, .fx-center { height: auto; }
            .fx-left, .fx-right { justify-items: center; }
            .fx-track { transform: none !important; }
          }
        `}</style>
      </div>
    );
  }
);

FullScreenScrollFX.displayName = "FullScreenScrollFX";

```

---

## src/components/ui/HudBox.tsx

```tsx
import React from 'react';

export interface HudBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  chamfer?: boolean;
  active?: boolean;
  glow?: boolean;
}

export const HudBox: React.FC<HudBoxProps> = ({ 
  children, 
  chamfer = true, 
  active = false, 
  glow = true,
  className = '', 
  ...props 
}) => {
  return (
    <div 
      className={`
        relative hud-panel hud-corners transition-all duration-300
        ${chamfer ? 'hud-chamfer-sm' : 'rounded-lg'}
        ${active ? 'border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Línea de escaneo holográfica sutil superior */}
      <div className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />
      {children}
    </div>
  );
};

export default HudBox;

```

---

## src/components/ui/joly-button.tsx

```tsx
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import * as React from "react";

const buttonVariants = cva(
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-xl font-semibold text-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[#E53E3E] via-[#C53030] to-[#9B2C2C] text-white shadow-lg shadow-red-500/25 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity hover:shadow-red-500/30 hover:shadow-xl hover:before:opacity-100",
        destructive:
          "bg-gradient-to-br from-destructive via-destructive to-destructive/80 text-destructive-foreground shadow-destructive/25 shadow-lg before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity hover:shadow-destructive/30 hover:shadow-xl hover:before:opacity-100",
        outline:
          "border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white shadow-sm backdrop-blur-sm hover:shadow-md",
        secondary:
          "bg-[#090a0e]/80 border border-white/5 text-white shadow-lg shadow-black/20 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent before:opacity-0 before:transition-opacity hover:before:opacity-100 hover:border-white/10",
        ghost:
          "backdrop-blur-sm hover:bg-white/5 hover:text-white",
        link: "text-white underline-offset-4 transition-colors hover:text-white/80 hover:underline",
        shimmer:
          "relative animate-shimmer border border-slate-800/50 bg-[length:200%_100%] bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] text-white shadow-2xl shadow-primary/30 before:absolute before:inset-0 before:translate-x-[-200%] before:animate-shimmer-slide before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent hover:shadow-primary/50",
        glow: "relative animate-gradient-x bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50 before:absolute before:inset-[-2px] before:-z-10 before:rounded-xl before:bg-gradient-to-r before:from-violet-600 before:via-purple-600 before:to-fuchsia-600 before:opacity-75 before:blur-md hover:shadow-2xl hover:shadow-purple-500/60",
      },
      size: {
        default: "h-9 px-5 py-2",
        sm: "h-7 rounded-lg px-3.5 text-xs",
        lg: "h-11 rounded-xl px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    // 🛡️ CORRECCIÓN: Forzamos la inyección dinámica sobre motion para heredar tipos en ambos modos (Botón nativo o Slot externo)
    const ComponentNode = asChild ? Slot : "button";
    const MotionComponent = motion(ComponentNode as any);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (variant === "link" || variant === "ghost") return;
      const { left, top } = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - left);
      mouseY.set(e.clientY - top);
    };

    const background = useMotionTemplate`radial-gradient(circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.12), transparent 80%)`;

    return (
      <MotionComponent
        className={`${buttonVariants({ variant, size })} ${className || ""}`}
        ref={ref}
        onMouseMove={handleMouseMove}
        whileHover={{ scale: variant === "link" ? 1 : 1.02 }}
        whileTap={{ scale: variant === "link" ? 1 : 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        {...(props as any)}
      >
        {variant !== "link" && variant !== "ghost" && (
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-0"
            style={{ background }}
          />
        )}
        <span className="relative z-10 flex items-center justify-center gap-2 pointer-events-none">
          {children}
        </span>
      </MotionComponent>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

---

## src/components/ui/LandscapeGuard.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LandscapeGuardProps {
  children: React.ReactNode;
}

export const LandscapeGuard: React.FC<LandscapeGuardProps> = ({ children }) => {
  const { t } = useTranslation();
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(orientation: portrait)').matches || window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const checkOrientation = () => {
      const mediaMatch = window.matchMedia('(orientation: portrait)').matches;
      const dimensionMatch = window.innerHeight > window.innerWidth;
      setIsPortrait(mediaMatch || dimensionMatch);
    };

    checkOrientation();

    const mediaQuery = window.matchMedia('(orientation: portrait)');
    
    // Escucha cambios en matchMedia
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', checkOrientation);
    } else {
      mediaQuery.addListener(checkOrientation);
    }

    // Escucha eventos clásicos de redimensionado y giro
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', checkOrientation);
      } else {
        mediaQuery.removeListener(checkOrientation);
      }
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      if (screen.orientation && 'lock' in screen.orientation) {
        // @ts-ignore
        await screen.orientation.lock('landscape');
      }
    } catch {
      // Ignorar fallos de fullscreen si el navegador no los permite
    }
  };

  return (
    <>
      {/* OVERLAY DE ROTACIÓN OBLIGATORIA EN MODO PORTRAIT */}
      {isPortrait && (
        <div className="fixed inset-0 z-[999999] bg-[#05080c] flex flex-col items-center justify-center p-6 text-center select-none font-mono">
          <div className="relative mb-6 flex items-center justify-center">
            {/* Anillo de pulso neón cian */}
            <div className="absolute w-28 h-28 rounded-full border border-cyan-500/30 animate-ping pointer-events-none" />
            
            {/* Contenedor del icono sci-fi */}
            <div className="relative w-24 h-24 rounded-2xl border border-cyan-500/50 bg-[#080e18] shadow-[0_0_35px_rgba(6,182,212,0.4)] flex items-center justify-center">
              <Smartphone className="w-12 h-12 text-cyan-400 animate-bounce" />
              <div className="absolute -bottom-2 -right-2 bg-[#05080c] border border-cyan-400/80 rounded-full p-1.5 shadow-[0_0_15px_rgba(6,182,212,0.6)]">
                <RotateCw className="w-5 h-5 text-cyan-300 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>
          </div>

          <h1 className="text-sm sm:text-base md:text-lg font-black tracking-widest text-cyan-400 uppercase mb-2 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
            {t('system.rotation_required')}
          </h1>

          <p className="text-xs text-zinc-400 max-w-sm uppercase leading-relaxed tracking-wider mb-6">
            {t('system.rotation_hint')}
          </p>

          <button
            onClick={handleFullscreen}
            className="px-5 py-2.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/60 hover:border-cyan-400 text-cyan-300 hover:text-white text-[10px] font-black uppercase rounded-lg tracking-widest shadow-[0_0_18px_rgba(6,182,212,0.3)] active:scale-95 transition-all cursor-pointer"
          >
            CALIBRAR PANTALLA COMPLETA
          </button>
        </div>
      )}

      {/* CONTENIDO DE LA APLICACIÓN */}
      <div className="w-full h-full min-h-screen overflow-hidden bg-black">
        {children}
      </div>
    </>
  );
};

```

---

## src/components/ui/Scroller.tsx

```tsx
import React, { useRef } from 'react';
import { ScrollerButton } from './ScrollerButton';

interface ScrollerProps {
  children: React.ReactNode;
  overflow?: 'x' | 'y';
  withButtons?: boolean;
  className?: string;
  gapClass?: string;
}

export const Scroller: React.FC<ScrollerProps> = ({
  children,
  overflow = 'x',
  withButtons = false,
  className = "",
  gapClass = "gap-4"
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isX = overflow === 'x';

  const scroll = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = isX ? current.clientWidth * 0.75 : current.clientHeight * 0.75;

      if (isX) {
        current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
      } else {
        current.scrollBy({ top: direction === 'up' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className={`relative w-full ${className} group select-none`}>

      {withButtons && isX && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="pointer-events-auto">
            <ScrollerButton direction="left" onClick={() => scroll('left')} />
            <ScrollerButton direction="right" onClick={() => scroll('right')} />
          </div>
        </div>
      )}

      {withButtons && !isX && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="pointer-events-auto">
            <ScrollerButton direction="up" onClick={() => scroll('up')} className="absolute top-2 left-1/2 -translate-x-1/2 rotate-90 z-40" />
            <ScrollerButton direction="down" onClick={() => scroll('down')} className="absolute bottom-2 left-1/2 -translate-x-1/2 rotate-90 z-40" />
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className={`flex ${isX ? 'flex-row overflow-x-auto snap-x snap-mandatory px-4' : 'flex-col overflow-y-auto snap-y snap-mandatory py-4 h-full'} ${gapClass} hide-scrollbar`}
        style={{
          maskImage: isX ? 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' : 'linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)',
          WebkitMaskImage: isX ? 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' : 'linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)'
        }}
      >
        {/* 🛡️ INYECCIÓN DE ESCUDO ANTI-APLASTAMIENTO: Forzamos la integridad estructural de los componentes hijos */}
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return <div className="shrink-0 snap-start">{child}</div>;
          }
          return child;
        })}
      </div>
    </div>
  );
};
```

---

## src/components/ui/ScrollerButton.tsx

```tsx
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

interface ScrollerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  direction: 'left' | 'right' | 'up' | 'down';
}

export const ScrollerButton: React.FC<ScrollerButtonProps> = ({
  direction,
  className = "",
  ...props
}) => {
  const isHorizontal = direction === 'left' || direction === 'right';

  // 🛰️ MATRIZ POSICIONAL: Evita el solapamiento de clases calculando los ejes por separado
  const positionClasses = isHorizontal
    ? `top-1/2 -translate-y-1/2 ${direction === 'left' ? 'left-2' : 'right-2'}`
    : `left-1/2 -translate-x-1/2 ${direction === 'up' ? 'top-2' : 'bottom-2'}`;

  // Diccionario para el escudo de accesibilidad en terminales tácticas
  const labelMap = {
    left: "Desplazar hacia la izquierda",
    right: "Desplazar hacia la derecha",
    up: "Desplazar hacia arriba",
    down: "Desplazar hacia abajo"
  };

  return (
    <button
      type="button"
      aria-label={labelMap[direction]}
      className={`absolute z-10 p-2 bg-black/60 border border-cyan-500/50 text-cyan-400 hover:text-cyan-300 hover:bg-black/80 hover:border-cyan-400 transition-all shadow-[0_0_10px_rgba(6,182,212,0.5)] backdrop-blur-md rounded active:scale-95 ${positionClasses} ${className}`}
      {...props}
    >
      {direction === 'left' && <ChevronLeft className="w-5 h-5" />}
      {direction === 'right' && <ChevronRight className="w-5 h-5" />}
      {direction === 'up' && <ChevronUp className="w-5 h-5" />}
      {direction === 'down' && <ChevronDown className="w-5 h-5" />}
    </button>
  );
};
```

---

## src/components/ui/Spinner.tsx

```tsx
import React from 'react';

interface SpinnerProps {
  className?: string;
  colorClass?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  className = "w-4 h-4",
  colorClass = "border-t-cyan-500 border-b-cyan-500"
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`animate-spin rounded-full border-2 border-transparent ${colorClass} ${className}`}
    >
      <span className="sr-only">Procesando telemetría...</span>
    </div>
  );
};
```

---

## src/context/AuthContext.tsx

```tsx
import React, { createContext, useContext, useMemo } from 'react';
import { useSasoriAuth, UseSasoriAuthReturn } from '../hooks/useSasoriAuth';

const AuthContext = createContext<UseSasoriAuthReturn | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useSasoriAuth();

  const value = useMemo(() => auth, [
    auth.screen,
    auth.state,
    auth.user,
    auth.isInitializing,
    auth.errorMessage,
    auth.successMessage,
    auth.setScreen,
    auth.submitLogin,
    auth.submitRegister,
    auth.verifyTwoFA,
    auth.logout
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): UseSasoriAuthReturn => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      "🚨 [GALAXYDUST KERNEL]: `useAuth` debe ser utilizado estrictamente dentro de un contenedor <AuthProvider />. " +
      "Verifique la inicialización de la jerarquía en `src/App.tsx`."
    );
  }
  return context;
};
```

---

## src/hooks/useAudioEngine.ts

```ts
import { useCallback } from 'react';

export interface AudioSettings {
  master: number; // 0 - 100
  bgm: number;    // 0 - 100
  sfx: number;    // 0 - 100
}

let sharedAudioCtx: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) {
      sharedAudioCtx = new Ctx();
    }
  }
  return sharedAudioCtx;
}

export const unlockAudioContext = () => {
  try {
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {}
};

// Desbloqueo pasivo global al primer gesto táctil o clic
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    unlockAudioContext();
    window.removeEventListener('click', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);
  };
  window.addEventListener('click', handleFirstInteraction, { once: true, passive: true });
  window.addEventListener('touchstart', handleFirstInteraction, { once: true, passive: true });
}

export function getAudioSettings(): AudioSettings {
  try {
    const master = localStorage.getItem('gd_audio_master');
    const bgm = localStorage.getItem('gd_audio_bgm');
    const sfx = localStorage.getItem('gd_audio_sfx');
    return {
      master: master !== null ? Math.max(0, Math.min(100, Number(master))) : 80,
      bgm: bgm !== null ? Math.max(0, Math.min(100, Number(bgm))) : 40,
      sfx: sfx !== null ? Math.max(0, Math.min(100, Number(sfx))) : 80,
    };
  } catch {
    return { master: 80, bgm: 40, sfx: 80 };
  }
}

export function saveAudioSettings(settings: Partial<AudioSettings>) {
  try {
    if (settings.master !== undefined) localStorage.setItem('gd_audio_master', String(Math.round(settings.master)));
    if (settings.bgm !== undefined) localStorage.setItem('gd_audio_bgm', String(Math.round(settings.bgm)));
    if (settings.sfx !== undefined) localStorage.setItem('gd_audio_sfx', String(Math.round(settings.sfx)));
  } catch {}
}

export function useAudioEngine() {
  const playSfx = useCallback((freqOrSound: number | string = 660) => {
    try {
      const { master, sfx } = getAudioSettings();
      const factor = (master / 100) * (sfx / 100);
      if (factor <= 0.001) return; // Mute

      if (typeof freqOrSound === 'string') {
        const audio = new Audio();
        audio.src = freqOrSound === 'heavy_laser'
          ? "https://assets.mixkit.co/active_storage/sfx/2759/2759-84.wav"
          : "https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav";
        audio.volume = Math.min(1, Math.max(0, 0.25 * factor));
        audio.play().catch(() => {});
      } else {
        const ctx = getSharedAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqOrSound, ctx.currentTime);
        const peakGain = 0.12 * factor;
        gain.gain.setValueAtTime(peakGain, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (_) {}
  }, []);

  return { playSfx, getAudioSettings, saveAudioSettings, unlockAudioContext };
}


```

---

## src/hooks/useExpeditionEngine.ts

```ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Expedition {
  id: string;
  fleet_name: string;
  sector_name: string;
  galaxy_cluster: string;
  star_cluster?: string;
  status: 'LAUNCHED' | 'SUCCESS' | 'FAILED' | 'CLAIMED';
  timeLeft: number;
  progress: number;
  is_adrift?: boolean;
  estimated_return_time: string;
}

export function useExpeditionEngine() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeExpeditions, setActiveExpeditions] = useState<Expedition[]>([]);
  const [loading, setLoading] = useState(true);

  // Obtener el UUID real de Supabase Auth (UserProfile del AuthContext no expone `id`)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadExpeditions = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('active_expeditions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'LAUNCHED');

      if (error) throw error;

      if (data) {
        const mapped: Expedition[] = data.map((exp: any) => {
          const returnDate = new Date(exp.estimated_return_time || Date.now());
          const launchDate = new Date(exp.launch_time || Date.now());
          const now = Date.now();

          const totalSeconds = Math.max(1, Math.floor((returnDate.getTime() - launchDate.getTime()) / 1000));
          const diffSeconds = Math.max(0, Math.floor((returnDate.getTime() - now) / 1000));
          const elapsedSeconds = totalSeconds - diffSeconds;
          const calculatedProgress = Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100));

          return {
            id: exp.id,
            fleet_name: exp.fleet_name || "Flota Sin Nombre",
            sector_name: exp.sector_name || "Espacio Profundo",
            galaxy_cluster: exp.galaxy_cluster || "Cúmulo Desconocido",
            star_cluster: exp.star_cluster,
            status: exp.status,
            timeLeft: diffSeconds,
            progress: parseFloat(calculatedProgress.toFixed(1)),
            is_adrift: exp.is_adrift,
            estimated_return_time: exp.estimated_return_time
          };
        });

        setActiveExpeditions(mapped);
      }
    } catch (err: any) {
      console.error("🚨 Fallo al escanear radar estelar:", err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    if (isMounted) {
      loadExpeditions();
    }

    const channel = supabase
      .channel(`exp_engine_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_expeditions',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadExpeditions();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, loadExpeditions]);

  useEffect(() => {
    if (activeExpeditions.length === 0) return;

    const timer = setInterval(() => {
      setActiveExpeditions((prev) =>
        prev.map((exp) => ({
          ...exp,
          timeLeft: Math.max(0, exp.timeLeft - 1)
        }))
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [activeExpeditions.length]);

  return { activeExpeditions, loading, refreshExpeditions: loadExpeditions };
}
```

---

## src/hooks/useInventory.ts

```ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface InventoryItem {
  id: string;
  seed_id?: string;
  name: string;
  fullname?: string;
  category: string;
  type?: string;
  rarity: string;
  faction?: string;
  level: number;
  stars?: number;
  quantity: number;
  unlocked: boolean;
  favorite: boolean;
  is_in_flight: boolean;
  avatar_url: string;
  image_url?: string;
  description?: string;
  power_score?: number;
  effect?: string | number;
  stack_info?: string;
  duration_info?: string;
  set_skills?: string;
  skills?: any;
  sound?: string;
  tactical_stats?: {
    hp?: number;
    shield?: number;
    defense?: number;
    speed_boost?: number;
    kinetic_attack?: number;
    laser_attack?: number;
    plasma_attack?: number;
    ionic_attack?: number;
    graviton_attack?: number;
  };
  seed_data?: any;
  seed_ships?: any;
  raw_data?: any;
  company?: string;
  collection?: string;
  size?: string;
  engine?: string;
  cargo?: number;
  production?: number;
  defense?: number;
  speed?: number;
  attack?: number;
  ionAttack?: number;
  laserAttack?: number;
  plasmaAttack?: number;
  gravitonAttack?: number;
}

const resolveImageUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
  }
  const clean = rawUrl.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;

  if (clean.startsWith('Assets') || clean.startsWith('Monedas') || clean.includes('Assets%20para')) {
    return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/${clean.replace(/^\//, '')}`;
  }

  return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/galaxy-assets/${clean.replace(/^\//, '')}`;
};

export const useInventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setItems([]);
        return;
      }
      
      console.log("Cargando inventario para user:", user.id);

      // 1. OBTENER EXPEDICIONES ACTIVAS EN VUELO
      const { data: activeExpeditions } = await supabase
        .from('active_expeditions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'LAUNCHED');

      // 2. OBTENER FLOTAS DEL USUARIO
      const { data: userFleets } = await supabase
        .from('fleets')
        .select('*')
        .eq('user_id', user.id);

      const inFlightIds = new Set<string>();
      const inFlightNames = new Set<string>();

      (activeExpeditions || []).forEach((exp: any) => {
        const deployed = exp.equipped_assets || exp.assets || exp.ships || [];
        if (Array.isArray(deployed)) {
          deployed.forEach((a: any) => {
            if (a.id) inFlightIds.add(String(a.id).trim().toLowerCase());
            if (a.seed_id) inFlightIds.add(String(a.seed_id).trim().toLowerCase());
            if (a.id_ship) inFlightIds.add(String(a.id_ship).trim().toLowerCase());
            if (a.name) inFlightNames.add(String(a.name).trim().toLowerCase());
          });
        }

        if (exp.fleet_id && userFleets) {
          const fleet = userFleets.find((f: any) => String(f.id) === String(exp.fleet_id));
          if (fleet) {
            const fleetMembers = [
              ...(fleet.ships || []),
              ...(fleet.tools || []),
              ...(fleet.licenses || [])
            ];
            fleetMembers.forEach((a: any) => {
              if (a.id) inFlightIds.add(String(a.id).trim().toLowerCase());
              if (a.seed_id) inFlightIds.add(String(a.seed_id).trim().toLowerCase());
              if (a.id_ship) inFlightIds.add(String(a.id_ship).trim().toLowerCase());
              if (a.name) inFlightNames.add(String(a.name).trim().toLowerCase());
            });
          }
        }
      });

      // Helper para consultas seguras
      const safeQuery = async (tableName: string, filterUserId = false) => {
        try {
          let q = supabase.from(tableName).select('*');
          if (filterUserId) q = q.eq('user_id', user.id);
          const { data, error } = await q;
          if (error) return [];
          return data || [];
        } catch {
          return [];
        }
      };

      // 3. CARGAR TODAS LAS TABLAS DE ACTIVOS DEL USUARIO (CONECTADO Y COMPLETO)
      const [
        userShips,
        seedShips,
        userTools,
        seedTools,
        userAstrobots,
        seedAstrobots,
        userStructures,
        seedStructures,
        userTech,
        seedTech,
        userBadges,
        seedBadges,
        userLicenses,
        userConsumables
      ] = await Promise.all([
        (async () => {
          try {
            const { data: shipsData, error: shipsErr } = await supabase
              .from('user_ships')
              .select('*, seed_ships(*)')
              .eq('user_id', user.id);
            if (!shipsErr && shipsData && shipsData.length > 0) {
              return shipsData;
            }
          } catch (e) {
            console.warn("Error en user_ships con relación seed_ships:", e);
          }
          return await safeQuery('user_ships', true);
        })(),
        safeQuery('seed_ships'),
        safeQuery('user_tools', true),
        safeQuery('seed_tools'),
        safeQuery('user_astrobots', true),
        safeQuery('seed_astrobots'),
        safeQuery('user_structures', true),
        safeQuery('seed_structures'),
        safeQuery('user_technologies', true),
        safeQuery('seed_technologies'),
        safeQuery('user_badges_unlocked', true),
        safeQuery('seed_badges'),
        safeQuery('user_licenses', true),
        safeQuery('user_consumibles', true)
      ]);

      const combinedItems: InventoryItem[] = [];

      const checkIsInFlight = (rowId?: any, seedId?: any, name?: string): boolean => {
        const idStr = rowId ? String(rowId).trim().toLowerCase() : '';
        const seedStr = seedId ? String(seedId).trim().toLowerCase() : '';
        const nameStr = name ? String(name).trim().toLowerCase() : '';

        return (
          (idStr !== '' && inFlightIds.has(idStr)) ||
          (seedStr !== '' && inFlightIds.has(seedStr)) ||
          (nameStr !== '' && inFlightNames.has(nameStr))
        );
      };

      // Mapear Naves con seed_ships completo
      (userShips || []).forEach((ship: any) => {
        const seedRel = ship.seed_ships;
        const seedFound = (seedShips || []).find((ss: any) => ss.id === ship.ship_id || ss.id === ship.seed_id || ss.id === ship.id_ship) || {};
        const seed = (seedRel && typeof seedRel === 'object' && Object.keys(seedRel).length > 0) ? seedRel : seedFound;
        const shipName = seed.name || ship.seed_ships?.name || ship.name || ship.name_ship || ship.custom_name || `Nave #${ship.id}`;
        const realId = String(ship.id);
        const seedId = String(ship.id_ship || ship.ship_id || ship.seed_id || seed.id || '');

        combinedItems.push({
          id: ship.id,
          name: ship.seed_ships?.name || ship.name || shipName,
          category: 'Spaceships',
          seed_ships: ship.seed_ships || seed,
          ...seed,
          ...ship,
          seed_id: seedId,
          fullname: shipName,
          type: 'Naves',
          rarity: seed.rarity || ship.rarity || 'COMMON',
          faction: seed.company || seed.faction || ship.company || ship.faction || 'NOVA',
          company: seed.company || ship.company || 'NOVA',
          collection: seed.collection || ship.collection || 'ESTÁNDAR',
          size: seed.size || ship.size || 'MEDIUM',
          engine: seed.engine || ship.engine || 'WARP DRIVE CLASS I',
          level: ship.current_level || ship.level || 1,
          stars: seed.stars || ship.stars || 1,
          quantity: ship.quantity || ship.amount || 1,
          unlocked: true,
          favorite: Boolean(ship.favorite),
          is_in_flight: checkIsInFlight(realId, seedId, shipName),
          avatar_url: resolveImageUrl(seed.image_url || seed.avatar_url || ship.image_url || ship.avatar_url),
          description: seed.description || ship.description || 'Sin especificaciones tácticas archivadas.',
          skills: seed.skills || ship.skills || [],
          seed_data: seed,
          raw_data: { ...seed, ...ship },
          cargo: Number(seed.cargo ?? ship.cargo ?? 0),
          production: Number(seed.production ?? ship.production ?? 0),
          defense: Number(seed.defense ?? ship.defense ?? 0),
          speed: Number(seed.speed ?? ship.speed ?? 0),
          attack: Number(seed.attack ?? ship.attack ?? 0),
          ionAttack: Number(seed.ion_attack ?? seed.ionAttack ?? ship.ion_attack ?? ship.ionAttack ?? 0),
          laserAttack: Number(seed.laser_attack ?? seed.laserAttack ?? ship.laser_attack ?? ship.laserAttack ?? 0),
          plasmaAttack: Number(seed.plasma_attack ?? seed.plasmaAttack ?? ship.plasma_attack ?? ship.plasmaAttack ?? 0),
          gravitonAttack: Number(seed.graviton_attack ?? seed.gravitonAttack ?? ship.graviton_attack ?? ship.gravitonAttack ?? 0),
          tactical_stats: {
            hp: Number(seed.health ?? seed.hp ?? ship.health ?? ship.hp ?? 100),
            shield: Number(seed.shield ?? ship.shield ?? 0),
            defense: Number(seed.defense ?? ship.defense ?? 0),
            speed_boost: Number(seed.speed ?? ship.speed ?? 0),
            kinetic_attack: Number(seed.attack ?? ship.attack ?? 0),
            laser_attack: Number(seed.laser_attack ?? seed.laserAttack ?? ship.laser_attack ?? ship.laserAttack ?? 0),
            plasma_attack: Number(seed.plasma_attack ?? seed.plasmaAttack ?? ship.plasma_attack ?? ship.plasmaAttack ?? 0),
            ionic_attack: Number(seed.ion_attack ?? seed.ionAttack ?? ship.ion_attack ?? ship.ionAttack ?? 0),
            graviton_attack: Number(seed.graviton_attack ?? seed.gravitonAttack ?? ship.graviton_attack ?? ship.gravitonAttack ?? 0)
          }
        });
      });

      // Mapear Herramientas
      (userTools || []).forEach((t: any) => {
        const seed = (seedTools || []).find((st: any) => st.id === t.tool_id || st.id === t.seed_id || st.tool_id === t.tool_id) || {};
        const toolName = t.name || seed.name || seed.tool_name || seed.title || seed.id || `Tool #${t.id}`;
        const realId = String(t.id);
        const seedId = String(t.tool_id || t.seed_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: toolName,
          fullname: toolName,
          category: 'Tools',
          type: 'Herramientas',
          rarity: seed.rarity || 'COMMON',
          faction: seed.faction || 'GD',
          level: t.level || 1,
          quantity: t.quantity || 1,
          unlocked: true,
          favorite: Boolean(t.favorite),
          is_in_flight: checkIsInFlight(realId, seedId, toolName),
          avatar_url: resolveImageUrl(seed.image_url || t.image_url),
          description: seed.description || 'Herramienta de extracción de recursos.',
          skills: seed.skills || []
        });
      });

      // Mapear Astrobots
      (userAstrobots || []).forEach((a: any) => {
        const seed = (seedAstrobots || []).find((sa: any) => sa.id === a.astrobot_id || sa.id === a.seed_id) || {};
        const botName = a.name || seed.name || seed.astrobot_name || `Astrobot #${a.id}`;
        const realId = String(a.id);
        const seedId = String(a.astrobot_id || a.seed_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: botName,
          fullname: botName,
          category: 'Astrobots',
          type: 'Astrobots',
          rarity: seed.rarity || 'COMMON',
          faction: seed.company || seed.faction || 'GD',
          level: a.level || 1,
          quantity: a.quantity || 1,
          unlocked: true,
          favorite: Boolean(a.favorite),
          is_in_flight: checkIsInFlight(realId, seedId, botName),
          avatar_url: resolveImageUrl(seed.image_url || seed.avatar_url || a.image_url),
          description: seed.description || 'Unidad robótica autónoma de asistencia táctica.'
        });
      });

      // Mapear Estructuras
      (userStructures || []).forEach((st: any) => {
        const seed = (seedStructures || []).find((ss: any) => ss.id === st.structure_id || ss.id === st.seed_id) || {};
        const structName = st.name || seed.structure_name || seed.name || seed.title || st.structure_id || `Estructura #${st.id}`;
        const realId = String(st.id);
        const seedId = String(st.structure_id || st.seed_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: structName,
          fullname: structName,
          category: 'Structures',
          type: 'Estructuras',
          rarity: seed.rarity || 'COMMON',
          faction: seed.company || seed.faction || 'GD',
          level: st.current_level || st.level || 1,
          quantity: st.quantity || 1,
          unlocked: true,
          favorite: Boolean(st.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || seed.avatar_url || st.image_url),
          description: seed.description || 'Infraestructura de defensa y desarrollo planetario.',
          power_score: seed.power_score_base || 100
        });
      });

      // Mapear Tecnologías
      (userTech || []).forEach((tc: any) => {
        const seed = (seedTech || []).find((st: any) => st.id === tc.technology_id || st.id === tc.seed_id) || {};
        const techName = tc.name || seed.technology_name || seed.name || seed.title || tc.technology_id || `Tecnología #${tc.id}`;
        const realId = String(tc.id);
        const seedId = String(tc.technology_id || tc.seed_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: techName,
          fullname: techName,
          category: 'Technologies',
          type: 'Tecnología',
          rarity: seed.rarity || 'COMMON',
          faction: seed.company || seed.faction || 'GD',
          level: tc.level || 1,
          quantity: tc.quantity || 1,
          unlocked: true,
          favorite: Boolean(tc.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || seed.avatar_url || tc.image_url),
          description: seed.description || 'Avance científico y militar para la flota.',
          power_score: seed.power_score_base || 100
        });
      });

      // Mapear Insignias (Badges)
      (userBadges || []).forEach((b: any) => {
        const seed = (seedBadges || []).find((sb: any) => sb.id === b.badge_id || sb.id === b.seed_id) || {};
        const badgeName = b.name || seed.name || b.badge_id || `Insignia #${b.id}`;
        const realId = String(b.id);
        const seedId = String(b.badge_id || b.seed_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: badgeName,
          fullname: badgeName,
          category: 'Badges',
          type: 'Insignia',
          rarity: seed.rarity || 'RARE',
          faction: seed.company || 'GD',
          level: 1,
          quantity: 1,
          unlocked: true,
          favorite: Boolean(b.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || b.image_url),
          description: seed.description || 'Insignia de honor y logro galáctico.',
          power_score: seed.mining_bonus || 50
        });
      });

      // Mapear Licencias
      (userLicenses || []).forEach((l: any) => {
        const seed = l.seed_licenses || {};
        const licName = l.name || seed.name || `Licencia #${l.id}`;
        const realId = String(l.id);
        const seedId = String(l.license_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: licName,
          fullname: licName,
          category: 'Licencia',
          type: 'Licencia',
          rarity: seed.rarity || 'COMMON',
          faction: 'GD',
          level: 1,
          quantity: l.quantity || 1,
          unlocked: true,
          favorite: Boolean(l.favorite),
          is_in_flight: checkIsInFlight(realId, seedId, licName),
          avatar_url: resolveImageUrl(seed.image_url || l.image_url),
          description: seed.description || 'Permiso oficial de navegación e industrialización.'
        });
      });

      // Mapear Consumibles
      (userConsumables || []).forEach((co: any) => {
        const seed = co.seed_consumables || {};
        const consName = co.name || seed.name || `Consumible #${co.id}`;
        const realId = String(co.id);
        const seedId = String(co.consumable_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: consName,
          fullname: consName,
          category: 'Consumibles',
          type: 'Consumibles',
          rarity: seed.rarity || 'COMMON',
          faction: 'GD',
          level: 1,
          quantity: co.quantity || co.amount || 1,
          unlocked: true,
          favorite: Boolean(co.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || co.image_url),
          description: seed.description || 'Recurso consumible de apoyo logístico.'
        });
      });

      setItems(combinedItems);
    } catch (err) {
      console.error("Error al construir inventario unificado:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFavorite = async (itemId: string) => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, favorite: !item.favorite } : item));
    return () => {};
  };

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return { items, loading, error, refreshInventory: fetchInventory, toggleFavorite };
};
```

---

## src/hooks/useMarketplace.ts

```ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface MarketListing {
  id: string;
  seller_id: string;
  inventory_item_id: string;
  title: string;
  category: 'SHIPS' | 'TECH' | 'BLUEPRINTS' | 'RESOURCES' | 'ASTROBOTS';
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  description: string;
  price: number;
  currency: 'GD';
  is_auction: boolean;
  current_bid?: number;
  ends_at?: string;
  image_url: string;
  created_at: string;
}

export function useMarketplace() {
  const [userId, setUserId] = useState<string | null>(null);
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Obtener el UUID real de Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchMarketplaceData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: dbListings, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });

      if (!error && dbListings) {
        setListings(dbListings.map((l: any) => ({
          id: l.id,
          seller_id: l.seller_id,
          inventory_item_id: l.inventory_item_id,
          title: l.title || 'ACTIVO GALÁCTICO',
          category: l.category || 'SHIPS',
          rarity: l.rarity || 'COMMON',
          description: l.description || 'Sin descripción.',
          price: Number(l.price || 0),
          currency: 'GD',
          is_auction: l.is_auction || false,
          current_bid: Number(l.current_bid || l.price || 0),
          ends_at: l.ends_at ? new Date(l.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '24h 00m',
          image_url: l.image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200',
          created_at: new Date(l.created_at).toLocaleDateString()
        })));
      }
    } catch (err) {
      console.error("Error al cargar Marketplace:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketplaceData();

    const channel = supabase
      .channel('marketplace_pub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_listings' }, () => {
        fetchMarketplaceData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMarketplaceData]);

  const publishItem = useCallback(async (params: {
    inventoryItemId: string;
    title: string;
    category: string;
    rarity: string;
    description: string;
    price: number;
    isAuction: boolean;
    imageUrl: string;
  }) => {
    if (!userId) throw new Error("Usuario no autenticado.");

    const { data, error } = await supabase.rpc('publish_marketplace_item_secure', {
      p_inventory_item_id: params.inventoryItemId,
      p_title: params.title,
      p_category: params.category,
      p_rarity: params.rarity,
      p_description: params.description,
      p_price: params.price,
      p_is_auction: params.isAuction,
      p_image_url: params.imageUrl
    });

    if (error) throw error;
    fetchMarketplaceData();
    return data;
  }, [userId, fetchMarketplaceData]);

  const buyItem = useCallback(async (listingId: string) => {
    if (!userId) throw new Error("Usuario no autenticado.");

    const { data, error } = await supabase.rpc('buy_marketplace_item_secure', {
      p_listing_id: listingId
    });

    if (error) throw error;
    fetchMarketplaceData();
    return data;
  }, [userId, fetchMarketplaceData]);

  const cancelListing = useCallback(async (listingId: string) => {
    if (!userId) throw new Error("Usuario no autenticado.");

    const { data, error } = await supabase.rpc('cancel_marketplace_listing_secure', {
      p_listing_id: listingId
    });

    if (error) throw error;
    fetchMarketplaceData();
    return data;
  }, [userId, fetchMarketplaceData]);

  return {
    listings,
    loading,
    publishItem,
    buyItem,
    cancelListing,
    refreshMarket: fetchMarketplaceData,
    currentUserId: userId
  };
}

```

---

## src/hooks/useNotifications.ts

```ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { isOfficialComunicado } from '../components/NotificationsView';

export interface NotificationRecord {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  category?: string;
  box_type?: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  // Obtener sesión activa una sola vez
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    }).catch(() => {});
  }, []);

  // 1. Carga protegida sin parámetros conflictivos en PostgREST
  const fetchNotifications = useCallback(async (currentUserId?: string) => {
    const uid = currentUserId || userId;
    if (!uid || isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setLoading(true);

      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50); // Límite defensivo para evitar sobrecarga de red

      if (error) {
        console.warn('[NOTIFICATIONS] Consulta silenciada:', error.message);
        return;
      }

      if (data) {
        // Filtrado en memoria: soporta boolean (false), integer (0) o string ('0')
        const unreadOnly = data.filter((item: any) => {
          const val = item.is_read;
          return val === false || val === 0 || val === '0' || val === null || val === undefined;
        });

        const mapped: NotificationRecord[] = unreadOnly.map((item: any) => ({
          notification_id: String(item.id || item.notification_id || Math.random()),
          user_id: item.user_id,
          title: item.title || 'COMUNICADO OFICIAL',
          message: item.message || '',
          category: item.category || 'EXPEDITION',
          box_type: item.box_type || item.category,
          is_read: Boolean(item.is_read === true || item.is_read === 1 || item.is_read === '1'),
          created_at: item.created_at || new Date().toISOString(),
          action_url: item.action_url
        }));

        setNotifications(mapped);
      }
    } catch (err: any) {
      console.warn('[NOTIFICATIONS] Fallo de red recuperable:', err?.message || err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [userId]);

  // 2. Suscripción única al canal Realtime
  useEffect(() => {
    if (!userId) return;

    fetchNotifications(userId);
    let channel: any = null;

    const channelName = `realtime_user_notifications_${userId}`;
    const existing = supabase.getChannels().find(
      (ch) => (ch as any).name === channelName || ch.topic === channelName || ch.topic === `realtime:${channelName}`
    );
    if (existing) {
      supabase.removeChannel(existing);
    }

    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications(userId);
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }, [userId, fetchNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read && isOfficialComunicado(n)).length;
  }, [notifications]);

  const markAsRead = async (notificationId: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        await supabase
          .from('user_notifications')
          .update({ is_read: true })
          .eq('notification_id', notificationId)
          .eq('user_id', userId);
      }
      fetchNotifications(userId);
    } catch (err) {
      console.warn('[NOTIFICATIONS] Error en markAsRead:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', userId);

      if (error) {
        await supabase
          .from('user_notifications')
          .update({ is_read: 1 })
          .eq('user_id', userId);
      }
      fetchNotifications(userId);
    } catch (err) {
      console.warn('[NOTIFICATIONS] Error en markAllAsRead:', err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        await supabase
          .from('user_notifications')
          .delete()
          .eq('notification_id', notificationId)
          .eq('user_id', userId);
      }
      fetchNotifications(userId);
    } catch (err) {
      console.warn('[NOTIFICATIONS] Error en deleteNotification:', err);
    }
  };

  const deleteAllNotifications = async () => {
    if (!userId) return;
    try {
      await supabase
        .from('user_notifications')
        .delete()
        .eq('user_id', userId);
      fetchNotifications(userId);
    } catch (err) {
      console.warn('[NOTIFICATIONS] Error en deleteAllNotifications:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    refresh: () => fetchNotifications(userId || undefined),
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
  };
};

export default useNotifications;
```

---

## src/hooks/usePlayerProfile.ts

```ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function usePlayerProfile() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Obtener el UUID real de Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.error("Error al cargar perfil de usuario:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();

    if (!userId) return;

    const channel = supabase
      .channel(`profile_rt_${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${userId}` }, (payload) => {
        setProfile(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchProfile]);

  return { profile, loading, refreshProfile: fetchProfile };
}

```

---

## src/hooks/useResourceEngine.ts

```ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ResourcesState {
  metal: number;
  crystal: number;
  deuterium: number;
  darkMatter: number;
  gdCoin: number;
  loading: boolean;
}

export function useResourceEngine(): ResourcesState {
  const [userId, setUserId] = useState<string | null>(null);
  const [resources, setResources] = useState<ResourcesState>({
    metal: 0,
    crystal: 0,
    deuterium: 0,
    darkMatter: 0,
    gdCoin: 0,
    loading: true
  });

  // Obtener el UUID real de Supabase Auth (UserProfile del AuthContext no expone `id`)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const fetchUserResources = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('metal, crystal, deuterium, dark_matter, gd_coin')
          .eq('id', userId)
          .maybeSingle();

        if (error) throw error;

        if (data && isMounted) {
          setResources({
            metal: Number(data.metal || 0),
            crystal: Number(data.crystal || 0),
            deuterium: Number(data.deuterium || 0),
            darkMatter: Number(data.dark_matter || 0),
            gdCoin: Number(data.gd_coin || 0),
            loading: false
          });
        }
      } catch (err) {
        console.error("Error al sincronizar recursos:", err);
      }
    };

    fetchUserResources();

    // 🛰️ Escucha Realtime: Refresca el HUD inmediatamente cuando cambien los recursos en la DB
    const channel = supabase
      .channel(`res_engine_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`
        },
        (payload: any) => {
          const updated = payload.new;
          if (updated && isMounted) {
            setResources((prev) => ({
              ...prev,
              metal: Number(updated.metal ?? prev.metal),
              crystal: Number(updated.crystal ?? prev.crystal),
              deuterium: Number(updated.deuterium ?? prev.deuterium),
              darkMatter: Number(updated.dark_matter ?? prev.darkMatter),
              gdCoin: Number(updated.gd_coin ?? prev.gdCoin),
              loading: false
            }));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return resources;
}

export default useResourceEngine;
```

---

## src/hooks/useSasoriAuth.ts

```ts
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type ScreenState =
  | 'menu'
  | 'login'
  | 'register'
  | 'forgot_password'
  | 'email_verification'
  | 'two_factor'
  | 'profile'
  | 'homepage';

export type AuthState =
  | 'idle'
  | 'authenticating'
  | 'registering'
  | 'resetting'
  | 'verifying_email'
  | 'verifying_2fa'
  | 'connected'
  | 'error';

export interface UserProfile {
  email: string;
  name: string;
  provider: 'password' | 'google' | 'github' | 'facebook';
  registrationDate: string;
  mfaEnabled: boolean;
  verified: boolean;
  avatarUrl: string;
  assignedToken: string;
}

export interface UseSasoriAuthReturn {
  screen: ScreenState;
  state: AuthState;
  errorMessage: string | null;
  successMessage: string | null;
  user: UserProfile | null;
  tempEmail: string;
  isInitializing: boolean;
  setScreen: (screen: ScreenState) => void;
  submitLogin: (email: string, password: string, rememberMe: boolean) => Promise<boolean>;
  submitRegister: (email: string, password: string, metadata?: any) => Promise<boolean>;
  submitResetPassword: (email: string) => Promise<boolean>;
  triggerSocialLogin: (provider: 'google' | 'github' | 'facebook') => Promise<boolean>;
  verifyEmailCode: (code: string) => Promise<boolean>;
  verifyTwoFA: (code: string) => Promise<boolean>;
  logout: () => void;
  resetAuthStatus: () => void;
}

export function useSasoriAuth(): UseSasoriAuthReturn {
  const [screen, setScreenState] = useState<ScreenState>('menu');
  const [state, setState] = useState<AuthState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tempEmail, setTempEmail] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // 🛡️ HIDRATACIÓN Y CENTINELA DE SESIÓN ZERO-TRUST
  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async (userId: string) => {
      const { data: p1 } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (p1) return p1;

      const { data: p2 } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      return p2;
    };

    const hydrateActiveSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session && session.user && isMounted) {
          const dbProfile = await fetchUserProfile(session.user.id);
          if (!isMounted) return;

          setUser({
            email: session.user.email || '',
            name: dbProfile?.username || session.user.email?.split('@')[0].toUpperCase() || 'PILOTO',
            provider: (session.user.app_metadata.provider || 'password') as any,
            registrationDate: dbProfile?.created_at ? new Date(dbProfile.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            mfaEnabled: dbProfile?.mfa_enabled ?? false,
            verified: true,
            avatarUrl: dbProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${session.user.email}`,
            assignedToken: 'GD-SEC-' + session.user.id.slice(0, 8).toUpperCase(),
          });

          setScreenState('homepage');
          setState('connected');
        }
      } catch (err) {
        console.error("Error al hidratar sesión activa:", err);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    hydrateActiveSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && isMounted) {
        setUser(null);
        setScreenState('menu');
        setState('idle');
        setIsInitializing(false);
      } else if (event === 'SIGNED_IN' && session?.user && isMounted) {
        const provider = session.user.app_metadata?.provider;
        if (provider && provider !== 'email') {
          fetchUserProfile(session.user.id).then((dbProfile) => {
            if (!isMounted) return;
            setUser({
              email: session.user.email || '',
              name: dbProfile?.username || session.user.email?.split('@')[0].toUpperCase() || 'PILOTO',
              provider: provider as any,
              registrationDate: dbProfile?.created_at ? new Date(dbProfile.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              mfaEnabled: dbProfile?.mfa_enabled ?? false,
              verified: true,
              avatarUrl: dbProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${session.user.email}`,
              assignedToken: 'GD-SEC-' + session.user.id.slice(0, 8).toUpperCase(),
            });
            setScreenState('homepage');
            setState('connected');
            setIsInitializing(false);
          });
        } else {
          setIsInitializing(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const setScreen = useCallback((newScreen: ScreenState) => {
    setScreenState(newScreen);
    setState('idle');
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  // 1. INICIAR SESIÓN CON SUPABASE AUTH
  const submitLogin = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    setState('authenticating');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setTempEmail(email);

      const { data: dbProfile } = await supabase
        .from('user_profiles')
        .select('username, avatar_url')
        .eq('id', data.user.id)
        .maybeSingle();

      if ((dbProfile as any)?.mfa_enabled) {
        setScreenState('two_factor');
        setState('idle');
        setSuccessMessage('CREDENCIALES CORRECTAS • COMPILANDO VERIFICACIÓN MULTIFACTOR');
      } else {
        const loadedProfile: UserProfile = {
          email: data.user.email || '',
          name: dbProfile?.username || data.user.email?.split('@')[0].toUpperCase() || 'PILOTO',
          provider: 'password',
          registrationDate: new Date().toISOString().split('T')[0],
          mfaEnabled: false,
          verified: true,
          avatarUrl: dbProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${data.user.email}`,
          assignedToken: 'GD-SEC-' + data.user.id.slice(0, 8).toUpperCase(),
        };
        setUser(loadedProfile);
        setScreenState('homepage');
        setState('connected');
      }
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'CONEXIÓN RECHAZADA • FIRMA INVÁLIDA');
      return false;
    }
  }, []);

  // 2. REGISTRO DE NUEVOS PILOTOS
  const submitRegister = useCallback(async (email: string, password: string, metadata?: any) => {
    setState('registering');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: metadata ? { data: metadata } : undefined
      });
      if (error) throw error;

      if (data.user && data.user.identities?.length === 0) {
        throw new Error('Esta firma digital ya se encuentra registrada en los servidores centrales.');
      }

      setTempEmail(email);
      setScreenState('email_verification');
      setState('idle');
      setSuccessMessage('REGISTRO COMPLETADO • ENLACE REMITIDO A SU CORREO');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'FALLO EN EL REGISTRO • HANDSHAKE INTERRUMPIDO');
      return false;
    }
  }, []);

  // 3. NEGOCIACIÓN OAUTH SOCIAL
  const triggerSocialLogin = useCallback(async (provider: 'google' | 'github' | 'facebook') => {
    setState('authenticating');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage('FALLO EN LA NEGOCIACIÓN CON EL PROVEEDOR SOCIAL EXTERNO');
      return false;
    }
  }, []);

  // 4. VERIFICACIÓN SMTP DE EMAIL ZERO-TRUST VÍA SUPABASE OTP
  const verifyEmailCode = useCallback(async (code: string) => {
    setState('verifying_email');
    setErrorMessage(null);

    try {
      if (!tempEmail) throw new Error('No se encontró dirección de correo para verificación.');

      const { error } = await supabase.auth.verifyOtp({
        email: tempEmail,
        token: code,
        type: 'signup'
      });

      if (error) throw error;

      setSuccessMessage('DIRECCIÓN DE CORREO VALIDADA CON ÉXITO');
      setState('idle');
      setScreenState('login');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'CÓDIGO DE VERIFICACIÓN INVÁLIDO O EXSPIRADO');
      return false;
    }
  }, [tempEmail]);

  // 5. RESOLUCIÓN DE SEGUNDO FACTOR (OTP) ZERO-TRUST
  const verifyTwoFA = useCallback(async (code: string) => {
    setState('verifying_2fa');
    setErrorMessage(null);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !authUser.email) throw new Error('No se detectó sesión activa en el cliente.');

      const { error } = await supabase.auth.verifyOtp({
        email: authUser.email,
        token: code,
        type: 'mfa'
      });

      if (error) {
        const { error: emailOtpErr } = await supabase.auth.verifyOtp({
          email: authUser.email,
          token: code,
          type: 'email'
        });
        if (emailOtpErr) throw error;
      }

      const { data: dbProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const loadedProfile: UserProfile = {
        email: authUser.email || '',
        name: dbProfile?.username || authUser.email.split('@')[0].toUpperCase(),
        provider: (authUser.app_metadata.provider || 'password') as any,
        registrationDate: dbProfile?.created_at ? new Date(dbProfile.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        mfaEnabled: true,
        verified: true,
        avatarUrl: dbProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${authUser.email}`,
        assignedToken: 'GD-SEC-' + authUser.id.slice(0, 8).toUpperCase(),
      };

      setUser(loadedProfile);
      setScreenState('homepage');
      setState('connected');
      setSuccessMessage('ACCESO CONCEDIDO • PERFIL MAESTRO INYECTADO');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'TOKEN OTP RECHAZADO POR EL KERNEL DE SEGURIDAD');
      return false;
    }
  }, []);

  // 6. RESTABLECER CREDENCIALES
  const submitResetPassword = useCallback(async (email: string) => {
    setState('resetting');
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setState('idle');
      setSuccessMessage(`TRANSMISIÓN EMITIDA • REVISE SU BANDEJA EN ${email.toUpperCase()}`);
      setScreenState('login');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'RESTABLECIMIENTO RECHAZADO POR EL SERVIDOR');
      return false;
    }
  }, []);

  // 7. CIERRE DE SESIÓN
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTempEmail('');
    setScreenState('menu');
    setState('idle');
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const resetAuthStatus = useCallback(() => {
    setState('idle');
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  return {
    screen,
    state,
    errorMessage,
    successMessage,
    user,
    tempEmail,
    isInitializing,
    setScreen,
    submitLogin,
    submitRegister,
    submitResetPassword,
    triggerSocialLogin,
    verifyEmailCode,
    verifyTwoFA,
    logout,
    resetAuthStatus,
  };
}
```

---

## src/hooks/useUpdater.ts

```ts
import { useEffect } from "react";

/**
 * Hook de auto-update para GalaxyDust.
 * Solo se activa en contexto Tauri (Desktop). En navegador/dev web, es un no-op.
 */
export function useUpdater(): void {
  useEffect(() => {
    // Guard: solo ejecutar dentro de Tauri Desktop
    if (typeof window === "undefined" || !("__TAURI__" in window)) {
      return;
    }
    checkForUpdates();
  }, []);
}

async function checkForUpdates(): Promise<void> {
  try {
    // Importación dinámica para evitar errores en modo web/dev
    const { check } = await import("@tauri-apps/plugin-updater");
    const { relaunch } = await import("@tauri-apps/plugin-process");

    const update = await check();

    if (update?.available) {
      console.log(`[UPDATER] Nueva versión disponible: ${update.version}`);
      console.log(`[UPDATER] Notas de release: ${update.body ?? "Sin notas"}`);
      await update.downloadAndInstall();
      console.log("[UPDATER] Actualización instalada. Relanzando...");
      await relaunch();
    } else {
      console.log("[UPDATER] La aplicación está actualizada.");
    }
  } catch (error) {
    // Error silencioso: el auto-update nunca debe bloquear el arranque del juego
    console.error("[UPDATER] Error al comprobar actualizaciones:", error);
  }
}

```

---

## src/i18n.ts

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import esTranslation from './locales/es.json';
import enTranslation from './locales/en.json';

const resources = {
  es: {
    translation: esTranslation
  },
  en: {
    translation: enTranslation
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'gd_preferred_language',
      caches: ['localStorage']
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

```

---

## src/lib/gameCache.ts

```ts
import { supabase } from './supabase';

const CACHE_KEY_PREFIX = 'GD_GAME_CACHE_';
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos de validez en memoria local

// Assets multimedia críticos que se precargarán en RAM
const CRITICAL_ASSETS = [
    "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Phatom%20Station/Skin%20Original/phantom%20station.png",
    "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Phantom%20Coin.png",
    "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/GD%20Coin.png",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300",
    "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=300"
];

export const getCachedData = (key: string) => {
    try {
        const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
            localStorage.removeItem(CACHE_KEY_PREFIX + key);
            return null;
        }
        return parsed.data;
    } catch (e) {
        return null;
    }
};

export const setCachedData = (key: string, data: any) => {
    try {
        localStorage.setItem(
            CACHE_KEY_PREFIX + key,
            JSON.stringify({ timestamp: Date.now(), data })
        );
    } catch (e) {
        console.warn("No se pudo guardar en caché local:", e);
    }
};

export const preloadGameDataAndAssets = async (
    onProgress: (pct: number, status: string) => void
): Promise<void> => {
    try {
        // 1. Sincronizar catálogo semilla de Clústeres (20%)
        onProgress(15, "CONECTANDO CON LA MATRIZ DE DATOS C.A.N...");
        let clusters = getCachedData('GALAXY_CLUSTERS');
        if (!clusters) {
            const { data } = await supabase.from('seed_galaxy_clusters').select('*');
            if (data) {
                clusters = data;
                setCachedData('GALAXY_CLUSTERS', data);
            }
        }

        // 2. Sincronizar Herramientas y Semillas (40%)
        onProgress(40, "SINCRONIZANDO CATÁLOGOS DE HERRAMIENTAS Y NAVES...");
        let tools = getCachedData('SEED_TOOLS');
        if (!tools) {
            const { data } = await supabase.from('seed_tools').select('*');
            if (data) {
                tools = data;
                setCachedData('SEED_TOOLS', data);
            }
        }

        // 3. Precargar Multimedia en memoria RAM (80%)
        onProgress(65, "CARGANDO TEXTURAS MULTIMEDIA Y INTERFAZ...");
        const imagePromises = CRITICAL_ASSETS.map((src) => {
            return new Promise<void>((resolve) => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Previene bloqueos por fallos de imagen
            });
        });

        await Promise.all(imagePromises);

        // 4. Finalizar precarga (100%)
        onProgress(100, "SISTEMAS ONLINE. ACCEDIENDO A LA DAPP...");
    } catch (error) {
        console.error("Error durante el Preloader:", error);
        onProgress(100, "INICIANDO EN MODO DIRECTO...");
    }
};
```

---

## src/lib/inventoryService.ts

```ts
import { supabase } from '../lib/supabase';

export interface CraftingCosts {
  metal?: number;
  crystal?: number;
  deuterium?: number;
  dark_matter?: number;
  organium?: number;
  gd_coins?: number;
}

export interface TacticalStats {
  kinetic_attack?: number;
  laser_attack?: number;
  plasma_attack?: number;
  ionic_attack?: number;
  graviton_attack?: number;
  travel_speed?: number;
  combat_speed?: number;
  speed_boost?: number;
  shield?: number;
  hp?: number;
  defense?: number;
  durability?: number;
  cargo_capacity?: number;
  fleet_space?: number;
  production?: number;
}

export interface SkillDetail {
  name: string;
  description: string;
}

export interface AssetSkills {
  active?: SkillDetail[];
  passive?: SkillDetail[];
  set?: SkillDetail;
}

export interface InventoryItem {
  id: string;
  name: string;
  fullname: string;
  category: 'Spaceships' | 'Structures' | 'Tecnology' | 'Astrobots' | 'Tools' | 'Badges' | 'Consumibles';
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | string;
  faction?: string;
  avatar_url: string;
  unlocked: boolean;
  quantity: number;
  stars: number;
  level: number;
  power?: number;
  favorite?: boolean;
  sound?: string;
  description?: string;
  blueprints_owned: number;
  blueprints_required: number;
  crafting_costs?: CraftingCosts;
  tactical_stats?: TacticalStats;
  skills?: AssetSkills;
}

/**
 * 📡 CONSULTA CANÓNICA DE INVENTARIOS
 * Obtiene directamente los componentes asociados al usuario desde `user_inventory`.
 */
export async function fetchAllInventory(): Promise<InventoryItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("⚠️ No se detectó ninguna sesión activa de piloto.");
  }

  const { data, error } = await supabase
    .from('user_inventory')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("🚨 [GALAXYDUST KERNEL]: Error al cargar user_inventory:", error.message);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Mapeo determinista sin valores aleatorios
  return data.map((item: any) => ({
    id: item.id,
    name: item.name || 'Activo Sin Nombre',
    fullname: item.fullname || item.name || 'Activo Desconocido',
    category: item.category || 'Spaceships',
    rarity: item.rarity || 'Common',
    faction: item.faction || 'NOVA',
    avatar_url: item.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200',
    unlocked: Boolean(item.unlocked),
    quantity: Number(item.quantity || 1),
    stars: Number(item.stars || 1),
    level: Number(item.level || 1),
    power: Number(item.power || 0),
    favorite: Boolean(item.favorite),
    sound: item.sound || 'laser_success',
    description: item.description || '',
    blueprints_owned: Number(item.blueprints_owned || 0),
    blueprints_required: Number(item.blueprints_required || 1),
    crafting_costs: item.crafting_costs || {
      metal: 0,
      crystal: 0,
      deuterium: 0,
      dark_matter: 0,
      organium: 0,
      gd_coins: 0
    },
    tactical_stats: item.tactical_stats || {},
    skills: item.skills || {}
  }));
}

export const inventoryService = {
  /**
   * Transacción atómica de fabricación en Backend.
   * Ejecuta el RPC `craft_inventory_item` verificando materiales y descontando fondos.
   */
  async craftAsset(
    userId: string,
    costs: CraftingCosts,
    itemMeta: { id: string; name: string; category: string; rarity: string }
  ) {
    const { data, error } = await supabase.rpc('craft_inventory_item', {
      p_user_id: userId,
      p_item_id: itemMeta.id,
      p_cost_metal: costs.metal || 0,
      p_cost_crystal: costs.crystal || 0,
      p_cost_deuterium: costs.deuterium || 0,
      p_cost_dark_matter: costs.dark_matter || 0,
      p_cost_organium: costs.organium || 0,
      p_cost_gd_coins: costs.gd_coins || 0
    });

    if (error) {
      console.error("🚨 [GALAXYDUST KERNEL]: Rechazo en transacción RPC craft_inventory_item:", error.message);
      throw error;
    }

    return data;
  }
};
```

---

## src/lib/supabase.ts

```ts
import { createClient } from '@supabase/supabase-js';

// 🌌 Extracción y validación de las coordenadas de red de la terminal
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ [GALAXYDUST KERNEL]: Las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están definidas en el archivo .env. " +
    "El sistema iniciará en modo simulado local."
  );
}

// 🛰️ Inicialización del cliente con persistencia de sesión blindada y soporte MFA
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce' // Garantiza compatibilidad con flujos de autenticación modernos y seguros
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// 🔧 Aumentar límite de listeners para soporte de múltiples hooks con Realtime simultáneo
// Evita MaxListenersExceededWarning cuando varios hooks suscriben canales en paralelo
if (typeof process !== 'undefined' && process.setMaxListeners) {
  process.setMaxListeners(50);
}

/**
 * 🛠️ HELPER: Validador de estado del canal de comunicación.
 * Permite a cualquier vista comprobar rápidamente si la pasarela con Supabase está activa.
 */
export const checkKernelConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true }).limit(1);
    if (error && error.code === 'PGRST116') return true; // La tabla existe pero está vacía (Conexión OK)
    return !error;
  } catch {
    return false;
  }
};
```

---

## src/main.tsx

```tsx
import './i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 🔒 Bloqueo obligatorio de orientación horizontal (Landscape)
if (typeof window !== 'undefined' && window.screen?.orientation && 'lock' in window.screen.orientation) {
  (window.screen.orientation as any).lock('landscape').catch(() => {});
}

// 🚀 Disparador absoluto del árbol del DOM en el nodo raíz
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

---

## src/pages/ExpeditionLogsView.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Terminal, Radio, ShieldX, Sparkles, Coins, Skull, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ExpeditionLog {
  id: string;
  expedition_id: string;
  event_type: 'nominal' | 'anomaly' | 'hostile' | 'discovery' | 'rescue';
  title: string;
  message: string;
  rewards_looted: {
    metal?: number;
    crystal?: number;
    dark_matter?: number;
    phantom_coins?: number;
  };
  damage_sustained: number;
  created_at: string;
}

export const ExpeditionLogsView: React.FC = () => {
  const [logs, setLogs] = useState<ExpeditionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let channel: any;

    const fetchBitacoras = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 🎯 CORRECCIÓN ZERO-TRUST: Filtrado obligatorio por user.id
      const { data, error } = await supabase
        .from('expedition_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && isMounted) {
        setLogs(data);
        setLoading(false);
      }
    };

    fetchBitacoras();

    // 🛰️ TRANSMISIÓN EN TIEMPO REAL: Listener filtrado por usuario
    const listenToIncomingEvents = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`cinematic_logs_channel_${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'expedition_logs', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (isMounted) {
              setLogs(prev => [payload.new as ExpeditionLog, ...prev]);
            }
          }
        )
        .subscribe();
    };

    listenToIncomingEvents();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const getEventCosmetics = (type: ExpeditionLog['event_type']) => {
    switch (type) {
      case 'hostile':
        return { icon: <Skull className="w-4 h-4 text-red-500" />, border: 'border-red-500/20 bg-red-950/5', text: 'text-red-400' };
      case 'anomaly':
        return { icon: <ShieldAlert className="w-4 h-4 text-amber-500" />, border: 'border-amber-500/20 bg-amber-950/5', text: 'text-amber-400' };
      case 'discovery':
        return { icon: <Sparkles className="w-4 h-4 text-emerald-500" />, border: 'border-emerald-500/20 bg-emerald-950/5', text: 'text-emerald-400' };
      case 'rescue':
        return { icon: <Radio className="w-4 h-4 text-cyan-500" />, border: 'border-cyan-500/20 bg-cyan-950/5', text: 'text-cyan-400' };
      default:
        return { icon: <Terminal className="w-4 h-4 text-neutral-400" />, border: 'border-white/5 bg-[#141517]', text: 'text-neutral-200' };
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-[#070809] flex flex-col items-center justify-center gap-2 font-mono text-xs text-cyan-500">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="tracking-widest uppercase">Abriendo canales de telemetría...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#070809] text-white p-8 font-sans select-none overflow-y-auto flex flex-col gap-6">
      
      {/* Cabecera Táctica */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-4 select-none">
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          <Radio className="w-6 h-6 animate-pulse" />
        </div>
        <div className="text-left">
          <h1 className="text-xl font-black tracking-widest uppercase">Canal de Comunicaciones</h1>
          <p className="text-xs text-neutral-400 font-mono">FEED CRONOLÓGICO DE INCIDENTES EN FLOTA</p>
        </div>
      </div>

      {/* Listado de Bitácoras Cinemáticas */}
      <div className="w-full max-w-4xl flex flex-col gap-4 font-mono">
        <AnimatePresence initial={false}>
          {logs.length === 0 ? (
            <div className="text-center py-20 text-neutral-600 text-xs border border-dashed border-white/5 rounded-2xl uppercase tracking-widest">
              Canal limpio. Sin transmisiones de radio de flotas exteriores.
            </div>
          ) : (
            logs.map((log) => {
              const style = getEventCosmetics(log.event_type);
              const hasRewards = Object.values(log.rewards_looted || {}).some(v => Number(v) > 0);

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`w-full border rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-300 hover:border-white/10 text-left ${style.border}`}
                >
                  <div className="flex justify-between items-start text-[11px] font-black tracking-wide">
                    <div className="flex items-center gap-2">
                      {style.icon}
                      <span className={`uppercase ${style.text}`}>{log.title}</span>
                    </div>
                    <span className="text-neutral-500 text-[10px]">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed font-sans font-medium pl-6">
                    {log.message}
                  </p>

                  {(log.damage_sustained > 0 || hasRewards) && (
                    <div className="ml-6 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase select-none mt-1">
                      
                      {log.damage_sustained > 0 && (
                        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 px-2.5 py-1 rounded">
                          <ShieldX className="w-3.5 h-3.5" />
                          Daño Casco: -{log.damage_sustained} HP
                        </div>
                      )}

                      {log.rewards_looted?.metal && (
                        <div className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 text-neutral-300 px-2.5 py-1 rounded">
                          Metal: +{log.rewards_looted.metal}
                        </div>
                      )}

                      {log.rewards_looted?.crystal && (
                        <div className="flex items-center gap-1.5 bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 px-2.5 py-1 rounded">
                          Cristal: +{log.rewards_looted.crystal}
                        </div>
                      )}

                      {log.rewards_looted?.dark_matter && (
                        <div className="flex items-center gap-1.5 bg-purple-950/30 border border-purple-500/20 text-purple-400 px-2.5 py-1 rounded shadow-[0_0_8px_rgba(168,85,247,0.15)]">
                          Materia Oscura: +{log.rewards_looted.dark_matter}
                        </div>
                      )}

                      {log.rewards_looted?.phantom_coins && (
                        <div className="flex items-center gap-1.5 bg-amber-950/30 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded">
                          <Coins className="w-3.5 h-3.5" />
                          Phantom: +{log.rewards_looted.phantom_coins}
                        </div>
                      )}

                    </div>
                  )}

                  <div className={`absolute top-0 left-0 w-[2px] h-full ${
                    log.event_type === 'hostile' ? 'bg-red-500' : log.event_type === 'anomaly' ? 'bg-amber-500' : log.event_type === 'discovery' ? 'bg-emerald-500' : log.event_type === 'rescue' ? 'bg-cyan-500' : 'bg-neutral-800'
                  }`} />
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default ExpeditionLogsView;
```

---

## src/pages/Homepage.tsx

```tsx
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Settings, X, Bell, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { ExpeditionsView } from '../components/ExpeditionsView';
import { MarketplaceView } from '../components/MarketplaceView';
import { PhantomStationView } from '../components/PhantomStationView';
import { InventoryView } from '../components/InventoryView';
import { AllianceView } from '../components/AllianceView';
import { CanView, GalaxyFrame } from '../components/CanView';
import { ProfileView } from '../components/ProfileView';
import { NotificationsView, isOfficialComunicado } from '../components/NotificationsView';
import { MissionView } from '../components/MissionView';
import { SettingsModal } from '../components/SettingsModal';
import { TutorialOverlay } from '../components/tutorial/TutorialOverlay';
import { ChatSystem } from '../components/ChatSystem';
import { Header } from '../components/Header';
import { miningService } from '../services/miningService';
import { useNotifications } from '../hooks/useNotifications';

const GAME_ASSETS = {
  background: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20(Ambientes%20)/22.jpg",
};

interface UserProfile {
  email: string;
  name: string;
  provider: 'password' | 'google' | 'github' | 'facebook';
  registrationDate: string;
  mfaEnabled: boolean;
  verified: boolean;
  avatarUrl: string;
  assignedToken: string;
  allianceName?: string;
}

interface HomepageProps {
  user: UserProfile;
  onLogout: () => void;
}

interface SectorCard {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  targetTab?: "inventory" | "marketplace" | "phantom" | "can" | "mission";
  targetWindow?: "expeditions" | "alliance" | "profile" | "settings";
}

interface ToastNotification {
  id: string;
  text: string;
  timestamp: string;
}

const isValidUUID = (str?: string | null): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

const SAFE_FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=200&auto=format&fit=crop';

const resolveAvatarUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return SAFE_FALLBACK_AVATAR;
  }
  const clean = rawUrl.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/galaxy-assets/${clean.replace(/^\//, '')}`;
};

// Helpers para almacenamiento persistente anti-bucle
const getNotifiedExpeditionIds = (userId: string): Set<string> => {
  try {
    const stored = localStorage.getItem(`notified_expeditions_${userId}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

const addNotifiedExpeditionId = (userId: string, expId: string) => {
  try {
    const stored = getNotifiedExpeditionIds(userId);
    stored.add(expId);
    localStorage.setItem(`notified_expeditions_${userId}`, JSON.stringify(Array.from(stored)));
  } catch (e) {
    console.error(e);
  }
};

export const Homepage: React.FC<HomepageProps> = ({ user, onLogout }) => {
  const { t } = useTranslation();

  const cards: SectorCard[] = useMemo(() => [
    { 
      id: "expedition", 
      title: t('hub.expedition_title'), 
      description: t('hub.expedition_desc'), 
      imageSrc: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20(Ambientes%20)/13.jpg", 
      targetWindow: "expeditions" 
    },
    { 
      id: "alliance", 
      title: t('hub.alliance_title'), 
      description: t('hub.alliance_desc'), 
      imageSrc: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20(Ambientes%20)/Alliance%20depot.jpg", 
      targetWindow: "alliance" 
    },
    { 
      id: "market", 
      title: t('hub.market_title'), 
      description: t('hub.market_desc'), 
      imageSrc: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20(Ambientes%20)/17.jpg", 
      targetTab: "marketplace" 
    },
    { 
      id: "phantom", 
      title: t('hub.phantom_title'), 
      description: t('hub.phantom_desc'), 
      imageSrc: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Phatom%20Station/Skin%20Original/image%20(18).png", 
      targetTab: "phantom" 
    }
  ], [t]);

  const [activeTab, setActiveTab] = useState<"home" | "marketplace" | "phantom" | "can" | "inventory" | "mission">("home");
  const [activeWindow, setActiveWindow] = useState<"home" | "expeditions" | "alliance" | "profile" | "settings">("home");

  const [showFlightsModal, setShowFlightsModal] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('gd_tutorial_completed');
    } catch {
      return false;
    }
  });

  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>(user.avatarUrl || '');
  const [utcTime, setUtcTime] = useState<string>(miningService.getFormattedUtcTime());

  // Hook maestro de notificaciones / comunicados oficiales
  const { unreadCount, refresh: refreshNotifications } = useNotifications();

  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [activeFlights, setActiveFlights] = useState<any[]>([]);

  const [power, setPower] = useState(0);
  const [currencies, setCurrencies] = useState({ gd_coin: 0, quantum_credit: 0, phantom_coin: 0, halloween_coin: 0, xmas_coin: 0, valentine_coin: 0 });
  const [resources, setResources] = useState({
    metal: 0, crystal: 0, deuterium: 0, dark_matter: 0, omniplate: 0, orichaltron: 0,
    lunar_fiber: 0, infinite_core: 0, primal_token: 0, xenoplasm: 0, organium: 0, mana: 0, wood: 0
  });

  const readyFlightsCount = useMemo(() => {
    const nowMs = Date.now();
    return activeFlights.filter(exp => new Date(exp.estimated_return_time).getTime() <= nowMs).length;
  }, [activeFlights, utcTime]);

  // 🎯 Muestra SIEMPRE el aviso flotante Toast en pantalla, pero NUNCA suma +1 directo a la campana
  // Solo se persiste en DB si es uno de los 5 Comunicados Oficiales permitidos
  const handleTriggerNotification = async (text: string, payloadOrExpId?: any) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newToast: ToastNotification = {
      id,
      text,
      timestamp: new Date().toLocaleTimeString()
    };

    // 1. Mostrar Toast flotante para feedback inmediato
    setToasts(prev => [newToast, ...prev].slice(0, 4));

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5500);

    // 2. Separar notificaciones de UI vs Logs de Expedición
    // Toasts de selección de inventario o avisos generales solo actualizan la interfaz visual y nunca realizan INSERT en BD
    const rawExpId = typeof payloadOrExpId === 'string'
      ? payloadOrExpId
      : payloadOrExpId && typeof payloadOrExpId === 'object'
      ? (payloadOrExpId.expedition_id || payloadOrExpId.expId)
      : null;

    const validExpId = isValidUUID(rawExpId) ? rawExpId : null;

    // Si no cuenta con un expedition_id válido, concluye la ejecución sin persistir en BD
    if (!validExpId) {
      return;
    }

    // 3. Persistir en Supabase expedition_logs únicamente ante eventos con expedition_id verificado
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: existingLog } = await supabase
        .from('expedition_logs')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('expedition_id', validExpId)
        .maybeSingle();

      if (existingLog) return;

      const title = typeof payloadOrExpId === 'object' && payloadOrExpId?.title
        ? payloadOrExpId.title
        : 'COMUNICADO OFICIAL';
      const eventType = typeof payloadOrExpId === 'object' && (payloadOrExpId?.event_type || payloadOrExpId?.category)
        ? (payloadOrExpId.event_type || payloadOrExpId.category)
        : 'EXPEDITION';
      const rewardsPayload = typeof payloadOrExpId === 'object' && payloadOrExpId?.rewards
        ? payloadOrExpId.rewards
        : {};

      await supabase.from('expedition_logs').insert([{
        user_id: authUser.id,
        expedition_id: validExpId,
        event_type: eventType,
        title: title,
        message: text,
        rewards_looted: rewardsPayload,
        is_read: false
      }]);

      refreshNotifications();
    } catch (err: any) {
      console.warn("[NOTIFICATIONS] Error al persistir comunicado oficial:", err?.message || err);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(miningService.getFormattedUtcTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Control estricto anti-duplicados al verificar vuelos terminados
  useEffect(() => {
    if (!activeFlights.length) return;
    const nowMs = Date.now();

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return;

      const notifiedSet = getNotifiedExpeditionIds(authUser.id);

      activeFlights.forEach(async (exp) => {
        const returnMs = new Date(exp.estimated_return_time).getTime();
        if (nowMs >= returnMs && !notifiedSet.has(exp.id)) {
          // Registrar en almacenamiento persistente
          addNotifiedExpeditionId(authUser.id, exp.id);

          const { data: existingLog } = await supabase
            .from('expedition_logs')
            .select('id')
            .eq('user_id', authUser.id)
            .eq('expedition_id', exp.id)
            .maybeSingle();

          if (!existingLog) {
            handleTriggerNotification(
              `🎉 ¡EXPEDICIÓN FINALIZADA! La flota ${exp.fleet_name || 'de expedición'} ha llegado a su destino (${exp.sector_name || 'SC'}). Reclama tus recompensas en Expeditions In Flight.`,
              { expId: exp.id, category: 'EXPEDITION', title: 'EXPEDICIÓN FINALIZADA' }
            );
          }
        }
      });
    });
  }, [utcTime, activeFlights]);

  useEffect(() => {
    let profileChannel: any;
    let logsChannel: any;
    let expeditionsChannel: any;
    let pollInterval: any;
    let isMounted = true;

    const loadUserProfile = async (authUser: any) => {
      let { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (!profile) {
        const { data: profileById } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        profile = profileById;
      }

      if (profile && isMounted) {
        if (profile.avatar_url) {
          const validUrl = resolveAvatarUrl(profile.avatar_url);
          setCurrentAvatarUrl(validUrl);
          try { localStorage.setItem(`user_avatar_${authUser.id}`, validUrl); } catch {}
        }
        setPower(parseFloat(profile.power_score || 0));
        setCurrencies({
          gd_coin: parseFloat(profile.gd_coin || 0),
          quantum_credit: parseFloat(profile.quantum_credit || 0),
          phantom_coin: parseFloat(profile.phantom_coin || 0),
          halloween_coin: parseFloat(profile.halloween_coin || 0),
          xmas_coin: parseFloat(profile.xmas_coin || 0),
          valentine_coin: parseFloat(profile.valentine_coin || 0)
        });
        setResources({
          metal: parseFloat(profile.metal || 0),
          crystal: parseFloat(profile.crystal || 0),
          deuterium: parseFloat(profile.deuterium || 0),
          dark_matter: parseFloat(profile.dark_matter || 0),
          omniplate: parseFloat(profile.omniplate || 0),
          orichaltron: parseFloat(profile.orichaltron || 0),
          lunar_fiber: parseFloat(profile.lunar_fiber || 0),
          infinite_core: parseFloat(profile.infinite_core || 0),
          primal_token: parseFloat(profile.primal_token || 0),
          xenoplasm: parseFloat(profile.xenoplasm || 0),
          organium: parseFloat(profile.organium || 0),
          mana: parseFloat(profile.mana || 0),
          wood: parseFloat(profile.wood || 0)
        });
      }
    };

    const loadActiveExpeditions = async (userId: string) => {
      const { data: expData } = await supabase
        .from('active_expeditions')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'CLAIMED');

      if (expData && isMounted) {
        setActiveFlights(expData);
      }
    };

    const initEngine = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !isMounted) return;

      const savedAvatar = localStorage.getItem(`user_avatar_${authUser.id}`);
      if (savedAvatar) {
        setCurrentAvatarUrl(savedAvatar);
      }

      await loadUserProfile(authUser);
      await loadActiveExpeditions(authUser.id);

      const createSafeChannel = async (channelName: string, options: any, callback: () => void) => {
        const existing = supabase.getChannels().find(ch => ch.topic === channelName || ch.topic === `realtime:${channelName}`);
        if (existing) await supabase.removeChannel(existing);
        return supabase.channel(channelName).on('postgres_changes', options, callback).subscribe();
      };

      profileChannel = await createSafeChannel(
        `economy_hud_stream_${authUser.id}`,
        { event: 'UPDATE', schema: 'public', table: 'user_profiles' },
        () => { if (isMounted) loadUserProfile(authUser); }
      );

      expeditionsChannel = await createSafeChannel(
        `active_expeditions_stream_${authUser.id}`,
        { event: '*', schema: 'public', table: 'active_expeditions', filter: `user_id=eq.${authUser.id}` },
        () => { if (isMounted) loadActiveExpeditions(authUser.id); }
      );

      logsChannel = await createSafeChannel(
        `expedition_logs_stream_${authUser.id}`,
        { event: 'INSERT', schema: 'public', table: 'expedition_logs', filter: `user_id=eq.${authUser.id}` },
        () => { if (isMounted) refreshNotifications(); }
      );

      pollInterval = setInterval(() => {
        if (isMounted) {
          loadUserProfile(authUser);
          loadActiveExpeditions(authUser.id);
        }
      }, 5000);
    };

    initEngine();

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (profileChannel) supabase.removeChannel(profileChannel);
      if (logsChannel) supabase.removeChannel(logsChannel);
      if (expeditionsChannel) supabase.removeChannel(expeditionsChannel);
    };
  }, [refreshNotifications]);

  return (
    <div 
      className="game-viewport-lock w-full h-full bg-black flex flex-col items-stretch overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed font-sans select-none text-white relative"
      style={{ backgroundImage: `url('${GAME_ASSETS.background}')` }}
    >
      <div className="fixed inset-0 bg-black/55 backdrop-blur-[1px] z-0 pointer-events-none" />

      {/* TOASTS SUPERIORES DERECHA */}
      <div className="fixed top-14 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none font-mono">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="pointer-events-auto bg-[#080d14]/95 border-2 border-cyan-400/80 rounded-xl p-3 shadow-[0_0_20px_rgba(6,182,212,0.4)] backdrop-blur-md flex items-start gap-3 relative text-left"
            >
              <div className="p-1.5 bg-cyan-950/80 border border-cyan-500/50 rounded-lg text-cyan-300 shrink-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>

              <div className="flex-1 pr-4">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">ALERTA C.A.N.</span>
                  <span className="text-[7.5px] text-zinc-500 font-mono">{toast.timestamp}</span>
                </div>
                <p className="text-[9.5px] font-bold text-zinc-200 leading-tight uppercase">
                  {toast.text}
                </p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="absolute top-2 right-2 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* HEADER PRINCIPAL DE NAVEGACIÓN */}
      <Header
        userProfile={{
          ...user,
          username: user.name,
          avatar_url: currentAvatarUrl,
          level: 1,
          gd_coin: currencies.gd_coin,
          quantum_credit: currencies.quantum_credit,
          phantom_coin: currencies.phantom_coin,
          halloween_coin: currencies.halloween_coin,
          xmas_coin: currencies.xmas_coin,
          valentine_coin: currencies.valentine_coin,
          metal: resources.metal,
          crystal: resources.crystal,
          deuterium: resources.deuterium,
          dark_matter: resources.dark_matter,
          omniplate: resources.omniplate,
          orichaltron: resources.orichaltron,
          lunar_fiber: resources.lunar_fiber,
          infinite_core: resources.infinite_core,
          primal_token: resources.primal_token,
          xenoplasm: resources.xenoplasm,
          organium: resources.organium,
          mana: resources.mana,
          wood: resources.wood
        }}
        utcTime={utcTime}
        activeTab={
          activeTab === 'marketplace' ? 'MARKET' :
          activeTab === 'phantom' ? 'PHANTOM' :
          activeTab === 'inventory' ? 'INVENTORY' :
          activeTab === 'mission' ? 'MISSION' :
          activeTab === 'can' ? 'CAN' :
          activeWindow === 'expeditions' ? 'EXPEDITIONS' :
          'MAIN'
        }
        onSelectTab={(tab) => {
          if (tab === 'MAIN') { setActiveTab('home'); setActiveWindow('home'); }
          else if (tab === 'CAN') { setActiveTab('can'); setActiveWindow('home'); }
          else if (tab === 'EXPEDITIONS') { setActiveTab('home'); setActiveWindow('expeditions'); }
          else if (tab === 'MARKET') { setActiveTab('marketplace'); setActiveWindow('home'); }
          else if (tab === 'PHANTOM') { setActiveTab('phantom'); setActiveWindow('home'); }
          else if (tab === 'INVENTORY') { setActiveTab('inventory'); setActiveWindow('home'); }
          else if (tab === 'MISSION') { setActiveTab('mission'); setActiveWindow('home'); }
        }}
        unreadNotificationsCount={unreadCount}
        onOpenNotifications={() => {
          setShowNotificationsModal(true);
          refreshNotifications();
        }}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenProfile={() => { setActiveTab('home'); setActiveWindow('profile'); }}
      />

      {/* BOTONES ACCESO RÁPIDO Y POPUPS */}
      <div 
        className="fixed top-14 sm:top-16 flex flex-col items-center gap-1.5 sm:gap-2 z-30 font-mono"
        style={{ right: 'max(6px, env(safe-area-inset-right))' }}
      >
        <button 
          onClick={() => setShowFlightsModal(true)} 
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-black/80 text-cyan-400 border border-cyan-500/40 rounded-lg cursor-pointer relative hover:border-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          title="Expeditions in Flight"
        >
          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-pulse" />
          {readyFlightsCount > 0 ? (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-black text-[7.5px] font-black px-1 py-0.2 rounded-full border border-emerald-300 animate-bounce shadow-[0_0_8px_#10b981]">
              {readyFlightsCount}
            </span>
          ) : activeFlights.length > 0 ? (
            <span className="absolute -top-1 -right-1 bg-cyan-950 text-cyan-300 text-[7.5px] font-black px-1 py-0.2 rounded-full border border-cyan-500">
              {activeFlights.length}
            </span>
          ) : null}
        </button>

        {/* BOTÓN CAMPANA DE NOTIFICACIONES */}
        <button 
          onClick={() => {
            setShowNotificationsModal(true);
            refreshNotifications();
          }} 
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-black/80 text-cyan-400 border border-cyan-500/40 rounded-lg cursor-pointer relative hover:border-cyan-400 transition-all shadow-md"
          title="Comunicados Oficiales"
        >
          <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white font-mono text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-black animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <button 
          onClick={() => setShowSettingsModal(true)} 
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-black/80 text-cyan-400 border border-cyan-500/40 rounded-lg cursor-pointer hover:border-cyan-400 transition-all shadow-md"
          title="Ajustes del Sistema"
        >
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
        </button>
      </div>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 min-h-0 w-full overflow-hidden relative flex flex-col items-stretch">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            activeWindow === "home" ? (
              <motion.div
                key="sector-home-screen"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full h-full max-h-full flex flex-col justify-between p-2 sm:p-3 overflow-hidden"
              >
                {/* ── GRID TÁCTICO AAA: 4 tarjetas viewport-fit, sin scroll ── */}
                <div className="flex-1 grid grid-cols-4 gap-2.5 max-h-[calc(100%-1.75rem)] items-stretch w-full">
                  {cards.map((card, idx) => {
                    const isLocked = card.id === 'alliance';
                    const sectorLabels = ['SEC-01', 'SEC-02', 'SEC-03', 'SEC-04'];
                    return (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.07, duration: 0.4, ease: 'easeOut' }}
                        className="relative h-full flex flex-col"
                      >
                        <GalaxyFrame
                          className={`h-full w-full transition-all duration-300 group shadow-2xl bg-transparent
                            ${isLocked
                              ? 'pointer-events-none opacity-50 grayscale'
                              : 'cursor-pointer hover:scale-[1.025] hover:shadow-[0_0_28px_rgba(6,182,212,0.35)] active:scale-[0.98]'
                            }`}
                          innerPadding="p-0"
                        >
                          {/* ── Fondo imagen ── */}
                          <div className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
                            <img
                              src={card.imageSrc}
                              alt={card.title}
                              className="w-full h-full object-cover brightness-50 group-hover:scale-110 group-hover:brightness-70 transition-all duration-700"
                            />
                            {/* Gradiente táctica inferior */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                            {/* Scan-line top glow */}
                            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent group-hover:via-cyan-300 transition-colors duration-300 pointer-events-none" />
                          </div>

                          {/* ── Cuerpo de la tarjeta ── */}
                          <div
                            onClick={() => {
                              if (isLocked) return;
                              if (card.targetWindow) { setActiveTab("home"); setActiveWindow(card.targetWindow); }
                              else if (card.targetTab) { setActiveTab(card.targetTab); setActiveWindow("home"); }
                            }}
                            className="relative z-10 h-full w-full flex flex-col justify-between p-2 sm:p-3"
                          >
                            {/* Header sector ID */}
                            <div className="flex items-center justify-between">
                              <span className="text-[7px] sm:text-[8px] font-mono font-black text-cyan-500/80 tracking-widest uppercase">
                                {sectorLabels[idx]}
                              </span>
                              {/* Indicador de estado */}
                              <span className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-zinc-600' : 'bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(6,182,212,0.8)]'}`} />
                            </div>

                            {/* Título */}
                            <div className="mt-auto">
                              <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest leading-tight group-hover:text-cyan-300 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                                {card.title}
                              </h2>
                              <p className="text-[7px] sm:text-[8.5px] font-mono text-zinc-300/90 leading-snug uppercase mt-1 line-clamp-2 drop-shadow-md">
                                {card.description}
                              </p>

                              {/* CTA bar */}
                              {!isLocked && (
                                <div className="mt-2 flex items-center gap-1 text-cyan-400 group-hover:text-cyan-200 transition-colors">
                                  <div className="h-[1px] flex-1 bg-cyan-500/40 group-hover:bg-cyan-400/70 transition-colors" />
                                  <span className="text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-widest">{t('hub.access')}</span>
                                  <div className="h-[1px] w-3 bg-cyan-500/40 group-hover:bg-cyan-400/70 transition-colors" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── COMING SOON overlay ── */}
                          {isLocked && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
                              <motion.div
                                initial={{ opacity: 0, scale: 0.75 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="bg-black/90 border border-cyan-500/40 rounded-lg px-3 py-2 flex flex-col items-center gap-1.5 shadow-[0_0_20px_rgba(6,182,212,0.25)] backdrop-blur-md"
                              >
                                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                                <span className="text-[7.5px] sm:text-[8.5px] font-black text-cyan-300 tracking-widest uppercase">{t('hub.coming_soon')}</span>
                              </motion.div>
                            </div>
                          )}
                        </GalaxyFrame>
                      </motion.div>
                    );
                  })}
                </div>

                {/* HUD Footer Status Bar */}
                <div className="h-6 shrink-0 flex justify-between items-center px-1 font-mono text-[8px] sm:text-[8.5px] text-cyan-400/80 uppercase border-t border-cyan-900/30">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
                    {t('hub.status_online')}
                  </span>
                  <span className="font-bold tracking-widest text-zinc-400">
                    {t('hub.sector_label')}
                  </span>
                </div>
              </motion.div>
            ) : activeWindow === "expeditions" ? (
              <ExpeditionsView initialView="selection" triggerNotification={handleTriggerNotification} />
            ) : activeWindow === "alliance" ? (
              <AllianceView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} onBack={() => { setActiveTab("home"); setActiveWindow("home"); }} triggerNotification={handleTriggerNotification} />
            ) : (
              <ProfileView 
                onBack={() => { setActiveTab("home"); setActiveWindow("home"); }} 
                triggerNotification={handleTriggerNotification}
                onProfileUpdate={(updated) => {
                  if (updated.avatar_url) {
                    setCurrentAvatarUrl(updated.avatar_url);
                  }
                }}
              />
            )
          )}

          {activeTab === "mission" && (
            <MissionView 
              triggerNotification={handleTriggerNotification} 
              onBack={() => { setActiveTab("home"); setActiveWindow("home"); }} 
            />
          )}

          {activeTab === "can" && <CanView />}
          {activeTab === "marketplace" && <MarketplaceView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} playerGold={currencies.gd_coin} setPlayerGold={(v) => setCurrencies(p => ({ ...p, gd_coin: typeof v === 'function' ? v(p.gd_coin) : v }))} onBack={() => { setActiveTab("home"); setActiveWindow("home"); }} triggerNotification={handleTriggerNotification} />}
          {activeTab === "phantom" && <PhantomStationView onBack={() => { setActiveTab("home"); setActiveWindow("home"); }} triggerNotification={handleTriggerNotification} />}
          {activeTab === "inventory" && <InventoryView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} playerGold={currencies.gd_coin} setPlayerGold={(v) => setCurrencies(p => ({ ...p, gd_coin: typeof v === 'function' ? v(p.gd_coin) : v }))} onBack={() => { setActiveTab("home"); setActiveWindow("home"); }} triggerNotification={handleTriggerNotification} />}
        </AnimatePresence>
      </main>

      {/* VENTANA POPUP 1: EXPEDITIONS IN FLIGHT */}
      <AnimatePresence>
        {showFlightsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-start sm:items-center justify-center p-2 pt-9 sm:p-4 sm:pt-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl max-h-[calc(100dvh-2.25rem)] overflow-y-auto relative"
            >
              <ExpeditionsView 
                initialView="flights" 
                onBack={() => setShowFlightsModal(false)} 
                triggerNotification={handleTriggerNotification}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VENTANA POPUP 2: NOTIFICACIONES / COMUNICADOS */}
      <AnimatePresence>
        {showNotificationsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-start sm:items-center justify-center p-2 pt-9 sm:p-4 sm:pt-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl max-h-[calc(100dvh-2.25rem)] overflow-y-auto relative"
            >
              <GalaxyFrame className="w-full h-full overflow-hidden text-left" innerPadding="p-2 sm:p-5">
                <NotificationsView onBack={() => setShowNotificationsModal(false)} triggerNotification={handleTriggerNotification} />
              </GalaxyFrame>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VENTANA POPUP 3: AJUSTES (CONFIGURACIÓN) */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
        triggerNotification={handleTriggerNotification}
        onOpenTutorial={() => {
          setShowSettingsModal(false);
          setShowTutorial(true);
        }}
      />

      {/* TUTORIAL INTERACTIVO SCI-FI */}
      <TutorialOverlay
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      <ChatSystem userAllianceName={user.allianceName} triggerNotification={handleTriggerNotification} />
    </div>
  );
};

export default Homepage;
```

---

## src/services/chatService.ts

```ts
import { supabase } from '../lib/supabase';

export interface EmbeddedAsset {
  id: string;
  name: string;
  category: string;
  rarity: string;
  avatar_url?: string;
  price?: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  user_avatar?: string;
  content: string;
  message_type: 'TEXT' | 'SYSTEM' | 'ASSET_LINK' | 'ALERT';
  embedded_asset?: EmbeddedAsset | null;
  target_user_id?: string | null;
  created_at: string;
}

let lastMessageTimestamp = 0;

// Lista de saneamiento de términos no permitidos (PDF Pág. 16, Req 575)
const BAD_WORDS = ['badword1', 'cheat', 'hack', 'exploit', 'spam', 'ofensa'];

export const chatService = {
  /**
   * Sanea el texto reemplazando términos prohibidos por asteriscos
   */
  filterProfanity(text: string): string {
    let sanitized = text;
    BAD_WORDS.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '***');
    });
    return sanitized;
  },

  getDmChannelId(user1Id: string, user2Id: string): string {
    const sorted = [user1Id, user2Id].sort();
    return `dm_${sorted[0]}_${sorted[1]}`;
  },

  async fetchHistory(channelId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) return [];
      return data || [];
    } catch (err) {
      return [];
    }
  },

  async sendMessage(
    channelId: string,
    content: string,
    messageType: 'TEXT' | 'SYSTEM' | 'ASSET_LINK' | 'ALERT' = 'TEXT',
    embeddedAsset: EmbeddedAsset | null = null,
    targetUserId: string | null = null
  ): Promise<ChatMessage> {
    const now = Date.now();
    if (now - lastMessageTimestamp < 1000) {
      throw new Error('⚠️ RATE_LIMIT: Espera un segundo antes de transmitir otro mensaje.');
    }
    lastMessageTimestamp = now;

    // Saneamiento de profanidad
    const sanitizedContent = this.filterProfanity(content);

    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id || 'local-pilot-id';

    let userName = 'AMIJARES';
    let userRole = 'LÍDER DE ALIANZA';
    let userAvatar = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';

    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username, display_name, role, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        userName = (profile as any).display_name || profile.username || userName;
        userRole = (profile as any).role || userRole;
        userAvatar = profile.avatar_url || userAvatar;
      }
    }

    const payload: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channel_id: channelId,
      user_id: currentUserId,
      user_name: userName,
      user_role: userRole,
      user_avatar: userAvatar,
      content: sanitizedContent,
      message_type: messageType,
      embedded_asset: embeddedAsset,
      target_user_id: targetUserId,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          user_id: currentUserId,
          user_name: userName,
          user_role: userRole,
          user_avatar: userAvatar,
          content: sanitizedContent,
          message_type: messageType,
          embedded_asset: embeddedAsset,
          target_user_id: targetUserId
        })
        .select()
        .single();

      if (!error && data) return data as ChatMessage;
    } catch (err) {
      console.warn('📡 Transmitiendo en canal local de fallback...');
    }

    return payload;
  },

  async deleteMessage(messageId: string) {
    try {
      await supabase.from('chat_messages').delete().eq('id', messageId);
    } catch (err) {}
  },

  /**
   * Registro de reportes de moderación (PDF Pág. 15, Req 470)
   */
  async reportUser(reportedUserId: string, reportedUserName: string, reason: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('chat_reports').insert({
        reporter_id: user.id,
        reported_id: reportedUserId,
        reported_name: reportedUserName,
        reason: reason,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Reporte registrado localmente');
    }
  },

  subscribeToChannel(channelId: string, onNewMessage: (msg: ChatMessage) => void) {
    const uniqueChannelName = `chat_${channelId}_${Math.random().toString(36).substring(2, 9)}`;
    
    const channelStream = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          onNewMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelStream);
    };
  },

  async blockUser(blockedId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_blocks').insert({
        blocker_id: user.id,
        blocked_id: blockedId
      });
    } catch (ignore) {}
  }
};
```

---

## src/services/miningService.ts

```ts
import { supabase } from '../lib/supabase';

// ============================================================================
// ESTRUCTURAS E INTERFACES DEL SERVICIO DE MINERÍA Y C.A.N.
// ============================================================================

export interface MiningDrop {
  type: 'RESOURCE' | 'CURRENCY' | 'BLUEPRINT' | 'ASTROBOT';
  name: string;
  amount: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
  icon: string;
  numericAmount?: number;
}

export interface StructureSkill {
  skill_code: string;
  stat_affected: string;
  operator: 'add' | 'multiply';
  modifier_value: number;
}

export interface UserStructureActive {
  id: string;
  user_id: string;
  structure_id: string;
  structure_name: string;
  is_active: boolean;
  skills: StructureSkill[];
}

export interface CANProductionReport {
  energyProduced: number;
  energyRequired: number;
  energyEfficiency: number; // Factor entre 0.0 (Sin energía) y 1.0 (100% Operativa)
  hourlyProduction: {
    metal: number;
    crystal: number;
    deuterium: number;
    dark_matter: number;
  };
  storageLimits: {
    metal: number;
    crystal: number;
    deuterium: number;
    dark_matter: number;
  };
}

// Configuración de almacenamiento base del jugador
const BASE_STORAGE = {
  metal: 10000,
  crystal: 5000,
  deuterium: 2500,
  dark_matter: 100
};

// ============================================================================
// MOTOR MAESTRO MINING SERVICE
// ============================================================================

export const miningService = {
  /**
   * CÁLCULO DE ESTRUCTURAS, ENERGÍA SOLAR Y LÍMITES DE ALMACENAMIENTO C.A.N.
   * Audita estructuras activas, consumo de energía y producción por hora.
   */
  async calculateUserCANMetrics(userId: string): Promise<CANProductionReport> {
    try {
      const { data: userStructs } = await supabase
        .from('user_structures')
        .select(`
          id,
          user_id,
          structure_id,
          is_active,
          seed_structures (
            name,
            skills
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      let energyProduced = 0;
      let energyRequired = 0;

      let rawMetalRates = 0;
      let rawCrystalRates = 0;
      let rawDeuteriumRates = 0;
      let rawDarkMatterRates = 0;

      let totalMineBoostPercent = 0;

      let storageAdditions = {
        metal: 0,
        crystal: 0,
        deuterium: 0,
        dark_matter: 0
      };

      if (userStructs && userStructs.length > 0) {
        for (const struct of userStructs) {
          const rawSkills = (struct.seed_structures as any)?.skills || [];
          let skillsList: StructureSkill[] = [];

          if (Array.isArray(rawSkills)) {
            skillsList = rawSkills;
          } else if (typeof rawSkills === 'string') {
            try { skillsList = JSON.parse(rawSkills); } catch { skillsList = []; }
          }

          for (const skill of skillsList) {
            const val = Number(skill.modifier_value || 0);

            switch (skill.stat_affected) {
              // 1. Energía Solar
              case 'energy_production':
                energyProduced += val;
                break;
              case 'energy_required':
                energyRequired += val;
                break;

              // 2. Extracción por Hora
              case 'metal_production':
                rawMetalRates += val;
                break;
              case 'crystal_production':
                rawCrystalRates += val;
                break;
              case 'deuterium_production':
                rawDeuteriumRates += val;
                break;
              case 'dark_matter_production':
                rawDarkMatterRates += val;
                break;

              // 3. Potenciador %
              case 'mine_boost':
                totalMineBoostPercent += val;
                break;

              // 4. Capacidad de Almacenamiento
              case 'metal_storage':
                storageAdditions.metal += val;
                break;
              case 'crystal_storage':
                storageAdditions.crystal += val;
                break;
              case 'deuterium_storage':
                storageAdditions.deuterium += val;
                break;
              case 'dark_matter_storage':
                storageAdditions.dark_matter += val;
                break;
            }
          }
        }
      }

      // 🛡️ Regla de Energía: Si la mina requiere energía y no hay Planta Solar activa, se apaga la producción (eficiencia 0.0)
      let energyEfficiency = 1.0;
      if (energyRequired > 0) {
        if (energyProduced === 0) {
          energyEfficiency = 0.0;
        } else {
          energyEfficiency = Math.min(1.0, energyProduced / energyRequired);
        }
      }

      const boostMultiplier = 1.0 + totalMineBoostPercent;

      return {
        energyProduced,
        energyRequired,
        energyEfficiency,
        hourlyProduction: {
          metal: Math.floor(rawMetalRates * boostMultiplier * energyEfficiency),
          crystal: Math.floor(rawCrystalRates * boostMultiplier * energyEfficiency),
          deuterium: Math.floor(rawDeuteriumRates * boostMultiplier * energyEfficiency),
          dark_matter: Math.floor(rawDarkMatterRates * boostMultiplier * energyEfficiency)
        },
        storageLimits: {
          metal: BASE_STORAGE.metal + storageAdditions.metal,
          crystal: BASE_STORAGE.crystal + storageAdditions.crystal,
          deuterium: BASE_STORAGE.deuterium + storageAdditions.deuterium,
          dark_matter: BASE_STORAGE.dark_matter + storageAdditions.dark_matter
        }
      };
    } catch (error) {
      console.error("Error al calcular métricas C.A.N.:", error);
      return {
        energyProduced: 0,
        energyRequired: 0,
        energyEfficiency: 0,
        hourlyProduction: { metal: 0, crystal: 0, deuterium: 0, dark_matter: 0 },
        storageLimits: BASE_STORAGE
      };
    }
  },

  /**
   * Comprueba si el jugador tiene expediciones de minería en curso
   * para bloquear cambios de tecnología en inventario (Página 1, Req 4)
   */
  async hasActiveMiningExpeditions(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { count, error } = await supabase
        .from('active_expeditions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'MINING')
        .in('status', ['LAUNCHED', 'TRAVELING', 'MINING', 'RETURNING']);

      if (error) return true; // Por seguridad bloquea si hay fallo de red
      return (count || 0) > 0;
    } catch (err) {
      return false;
    }
  },

  /**
   * Calcula un Drop Aleatorio para Minería basado en tablas de probabilidad (Página 1, Req 2)
   * Acepta modificadores de riqueza estelar y bonos de rareza de la C.A.N.
   */
  calculateMiningDrop(starRichnessMultiplier: number = 1.0, userRarityBonusPct: number = 0): MiningDrop {
    const roll = Math.random() * 100;
    const effectiveRoll = Math.max(0, roll - userRarityBonusPct);

    if (effectiveRoll < 5) {
      // 5% Probabilidad: Drop Legendario (Blueprint de Nave o Astrobot Autónomo)
      const isAstrobot = Math.random() > 0.5;
      if (isAstrobot) {
        return {
          type: 'ASTROBOT',
          name: 'ASTROBOT EXTRACCIÓN OMEGA X-1',
          amount: '1 UNIDAD',
          rarity: 'LEGENDARY',
          icon: '🤖',
          numericAmount: 1
        };
      }
      return {
        type: 'BLUEPRINT',
        name: 'BLUEPRINT TOX-SYNDICATE MK-II',
        amount: '1 UNIDAD',
        rarity: 'LEGENDARY',
        icon: '📜',
        numericAmount: 1
      };
    } else if (effectiveRoll < 25) {
      // 20% Probabilidad: Drop Raro (Dark Matter & Phantom Coins)
      const dmAmount = Math.floor((Math.random() * 300 + 200) * starRichnessMultiplier);
      const phAmount = Math.floor(Math.random() * 15 + 10);
      return {
        type: 'CURRENCY',
        name: 'DARK MATTER & PHANTOM COINS',
        amount: `+${dmAmount} DM & +${phAmount} PH`,
        rarity: 'RARE',
        icon: '🔮',
        numericAmount: dmAmount
      };
    } else {
      // 75% Probabilidad: Drop Común de Recursos Extra
      const baseResource = Math.floor((Math.random() * 15000 + 5000) * starRichnessMultiplier);
      return {
        type: 'RESOURCE',
        name: 'PACK DE RECURSOS EXTRAÍDOS',
        amount: `+${baseResource.toLocaleString()} CRISTAL / METAL`,
        rarity: 'COMMON',
        icon: '💎',
        numericAmount: baseResource
      };
    }
  },

  /**
   * Aplica la regla del tope máximo para Boost de Producción
   * "El Boost de producción es acumulable hasta un máximo de 1 día (24 horas)" (Página 1, Req 6)
   */
  calculateProductionBoost(accumulatedHours: number, boostPercentagePerHour: number): {
    cappedHours: number;
    totalBoostPercentage: number;
    isCapped: boolean;
  } {
    const MAX_BOOST_HOURS = 24; // 1 día límite máximo estricto
    const cappedHours = Math.min(accumulatedHours, MAX_BOOST_HOURS);
    const totalBoostPercentage = cappedHours * boostPercentagePerHour;

    return {
      cappedHours,
      totalBoostPercentage,
      isCapped: accumulatedHours >= MAX_BOOST_HOURS
    };
  },

  /**
   * Rastrea y devuelve el número de jugadores activos en línea en tiempo real (Página 1, Req 5 - KPI Backend)
   */
  async getActivePlayersCount(): Promise<number> {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const { count, error } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', fifteenMinutesAgo);

      if (error || count === null) {
        const { count: expCount } = await supabase
          .from('active_expeditions')
          .select('user_id', { count: 'exact', head: true })
          .eq('status', 'LAUNCHED');
        
        return expCount || 1;
      }

      return Math.max(1, count);
    } catch (err) {
      return 1;
    }
  },

  /**
   * Guarda y acredita el Drop Raro de Minería en la base de datos de Supabase
   */
  async saveMiningDropReward(userId: string, drop: MiningDrop): Promise<boolean> {
    try {
      if (drop.type === 'RESOURCE' || drop.type === 'CURRENCY') {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('metal, crystal, dark_matter')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          const currentMetal = parseFloat(profile.metal || 0);
          const currentCrystal = parseFloat(profile.crystal || 0);
          const currentDM = parseFloat(profile.dark_matter || 0);

          const addedAmount = drop.numericAmount || 1000;

          await supabase
            .from('user_profiles')
            .update({
              metal: drop.type === 'RESOURCE' ? currentMetal + addedAmount : currentMetal,
              crystal: drop.type === 'RESOURCE' ? currentCrystal + Math.floor(addedAmount * 0.5) : currentCrystal,
              dark_matter: drop.type === 'CURRENCY' ? currentDM + addedAmount : currentDM,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        }
      } else {
        await supabase.from('user_inventory').insert({
          user_id: userId,
          title: drop.name,
          category: drop.type === 'BLUEPRINT' ? 'BLUEPRINTS' : 'ASTROBOTS',
          rarity: drop.rarity,
          quantity: 1,
          created_at: new Date().toISOString()
        });
      }

      return true;
    } catch (err) {
      console.error("Error al acreditar drop de minería:", err);
      return false;
    }
  },

  /**
   * Formatea la fecha y hora actual a estándar UTC (Página 2, Req 4)
   */
  getFormattedUtcTime(): string {
    const now = new Date();
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds} UTC`;
  }
};
```

---

## src/services/notificationService.ts

```ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface NotificationRecord {
  notification_id: string;
  category: string;
  box_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 🎯 Consulta unificada de logs de expedición y notificaciones de sistema
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted: NotificationRecord[] = data.map((item: any) => ({
          notification_id: (item.notification_id || item.id || Math.random()).toString(),
          category: item.category || item.event_type || 'EXPEDITION',
          box_type: item.box_type || item.category || 'EXPEDITION',
          title: item.title || 'INFORME DE EXPEDICIÓN',
          message: item.message || 'Misión completada con éxito.',
          is_read: Boolean(item.is_read),
          created_at: item.created_at || new Date().toISOString()
        }));

        setNotifications(formatted);
        setUnreadCount(formatted.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.warn("[NOTIFICATIONS] Error recuperable al cargar comunicaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await supabase.from('user_notifications').update({ is_read: true }).eq('notification_id', id);
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await supabase.from('user_notifications').update({ is_read: true }).eq('user_id', user.id);
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.notification_id !== id));
    await supabase.from('user_notifications').delete().eq('notification_id', id);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, refresh: fetchNotifications };
};
```

---

## src/utils/expeditionValidator.ts

```ts
export interface FleetAsset {
  id: string;
  name: string;
  type: 'ship' | 'robot' | 'tool' | 'tech' | 'structure';
  is_nft: boolean; // true = Quantum, false = Non-Quantum
  hp: number;
  max_hp: number;
  fleet_space?: number; // Peso volumétrico de la nave
  engine_type?: 'IMPULSE' | 'HYPERSPACE' | 'NONE';
  tech_type?: string;   // Tipo/Familia de tecnología
  is_armed?: boolean;   // Si posee cañones KIN, LAS, PLA, etc.
}

interface ValidationContext {
  fleet: {
    ships: FleetAsset[];
    astrobots: FleetAsset[];
    tools: FleetAsset[];
  };
  completedExpeditionsByGC: Record<string, number>; // Ej: { "GC1": 250, "GC2": 10 }
  hasStorageDeposits: boolean;
  activeFlightsCount: number;
}

export const validateExpeditionDispatch = (
  clusterName: string,
  ctx: ValidationContext
): { canLaunch: boolean; reason?: string } => {
  const { fleet, completedExpeditionsByGC, hasStorageDeposits, activeFlightsCount } = ctx;
  
  // ─── REGLA 1: CONTROL CRÍTICO DE HERRAMIENTAS ───
  if (fleet.tools.length === 0) {
    return { canLaunch: false, reason: "Bloqueo Logístico: No se pueden enviar expediciones sin herramientas (Tools)." };
  }
  if (fleet.tools.length > 1) {
    return { canLaunch: false, reason: "Restricción de Bahía: No se puede equipar más de una herramienta por expedición." };
  }

  // ─── REGLA 2: ARMAMENTO SEGURO ───
  const isArmedFleet = fleet.ships.some(s => s.is_armed);
  if (isArmedFleet && fleet.tools.length === 0) {
    return { canLaunch: false, reason: "Protocolo Militar: No se puede enviar una flota armada si no se añade una herramienta." };
  }

  // ─── REGLA 3: ANÁLISIS DE ESPACIO VOLUMÉTRICO DE FLOTA ───
  const maxAllowedSpace = 30; // Este límite puede leerse dinámicamente de la Licencia
  const totalOccupiedSpace = fleet.ships.reduce((acc, s) => acc + (s.fleet_space || 0), 0);
  if (totalOccupiedSpace > maxAllowedSpace) {
    return { canLaunch: false, reason: `Exceso de Carga: La flota supera el máximo de espacios disponibles (${totalOccupiedSpace}/${maxAllowedSpace}).` };
  }

  // ─── REGLA 4: ALMACENAMIENTO DE RECURSOS ───
  if (!hasStorageDeposits) {
    // Alerta visual de desbordamiento de almacenes en el frontend
    console.warn("Advertencia: Al no poseer depósitos, los recursos que excedan el tope se destruirán.");
  }

  // ─── 🧭 REQUISITOS DE ACCESO SELECTIVO POR CÚMULO GALÁCTICO (GC) ───
  const gc = clusterName.toUpperCase();
  const hasShips = fleet.ships.length > 0;
  const hasTools = fleet.tools.length === 1;

  if (gc === 'PELA') {
    const hasNonNftShip = fleet.ships.some(s => !s.is_nft);
    if (!hasNonNftShip) return { canLaunch: false, reason: "Requisito PELA: Debes tener al menos una nave No-NFT por flota." };
  }

  if (gc === 'GC1' && (!hasShips || !hasTools)) {
    return { canLaunch: false, reason: "Requisito GC1: Requiere un mazo compuesto por Nave + Herramienta." };
  }

  if (gc === 'GC2') {
    if ((completedExpeditionsByGC['GC1'] || 0) < 200) {
      return { canLaunch: false, reason: `Acceso Denegado: Requiere 200 expediciones completadas en GC1 (Llevas: ${completedExpeditionsByGC['GC1'] || 0}).` };
    }
    if (!hasShips || !hasTools) return { canLaunch: false, reason: "Requisito GC2: Requiere Nave + Herramienta." };
  }

  if (gc === 'GC3') {
    if ((completedExpeditionsByGC['GC2'] || 0) < 300) {
      return { canLaunch: false, reason: "Acceso Denegado: Requiere 300 expediciones completadas en GC2." };
    }
    // La validación de licencia se asume superada al entrar al panel de despacho
  }

  if (gc === 'GC4' || gc === 'GC5' || gc === 'GC6') {
    const minRequired = gc === 'GC4' ? 400 : gc === 'GC5' ? 500 : 100;
    const previousGC = gc === 'GC4' ? 'GC3' : gc === 'GC5' ? 'GC4' : 'GC5';
    
    if ((completedExpeditionsByGC[previousGC] || 0) < minRequired) {
      return { canLaunch: false, reason: `Acceso Denegado: Requiere ${minRequired} misiones en ${previousGC}.` };
    }
    
    const hasValidEngine = fleet.ships.some(s => s.engine_type === 'IMPULSE' || s.engine_type === 'HYPERSPACE');
    if (!hasValidEngine) return { canLaunch: false, reason: `Requisito ${gc}: Al menos una nave debe portar un motor Impulse o Hyperspace.` };
  }

  if (gc === 'GC7' || gc === 'GC8') {
    const minRequired = gc === 'GC7' ? 200 : 300;
    const previousGC = gc === 'GC7' ? 'GC6' : 'GC7';

    if ((completedExpeditionsByGC[previousGC] || 0) < minRequired) {
      return { canLaunch: false, reason: `Acceso Denegado: Requiere ${minRequired} misiones en ${previousGC}.` };
    }

    const hasHSEngine = fleet.ships.some(s => s.engine_type === 'HYPERSPACE');
    if (!hasHSEngine) return { canLaunch: false, reason: `Requisito de Salto Extremo ${gc}: Requiere estrictamente motores Hyperspace (HS Engine).` };
  }

  return { canLaunch: true };
};

// ─── REGLAS COMPLEMENTARIAS DE C.A.N. Y RESTRICCIONES DE TECNOLOGÍA ───
export const validateCanModification = (activeFlightsCount: number): boolean => {
  return activeFlightsCount === 0; // Falso si hay naves en vuelo
};

export const validateTechnologyEquip = (equippedTechs: FleetAsset[], newTech: FleetAsset): boolean => {
  return !equippedTechs.some(t => t.tech_type === newTech.tech_type);
};

```

---

## src/vite-env.d.ts

```ts
/// <reference types="vite/client" />

// 🛡️ CORRECCIÓN: Se reemplazó el 'return' inválido por exportaciones por defecto de TypeScript
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const content: string;
  export default content;
}
```


