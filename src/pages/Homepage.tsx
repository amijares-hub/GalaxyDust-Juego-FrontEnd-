import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Target, CheckCircle2, Clock,
  Settings, X, Rocket, Layers, Cpu, Bot, Globe, Activity, Bell
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ExpeditionsView } from '../components/ExpeditionsView';
import { MarketplaceView } from '../components/MarketplaceView';
import { PhantomStationView } from '../components/PhantomStationView';
import { InventoryView } from '../components/InventoryView';
import { AllianceView } from '../components/AllianceView';
import { CanView } from '../components/CanView';
import { ProfileView } from '../components/ProfileView';
import { NotificationsView } from '../components/NotificationsView';
import { ChatSystem } from '../components/ChatSystem';
import { Header } from '../components/Header';
import { miningService } from '../services/miningService';

const GAME_ASSETS = {
  background: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20(Ambientes%20)/22.jpg",
  crystal: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Crystal.png",
  metal: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Metal.png",
  deuterium: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Deuterium.png",
  gdCoin: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/GD%20Coin.png",
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

type MissionType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'EVENT' | 'LIMITED' | 'FLEET' | 'CLAN';

interface Mission {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  progress: number;
  maxProgress: number;
  reward: string;
  claimed: boolean;
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

const cards: SectorCard[] = [
  { id: "expedition", title: "EXPEDITION", description: "Venture into the unknown, explore, farm, and dominate the galaxy.", imageSrc: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop", targetWindow: "expeditions" },
  { id: "alliance", title: "ALLIANCE", description: "Coordinate your power. Expand your dominion.", imageSrc: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800&auto=format&fit=crop", targetWindow: "alliance" },
  { id: "market", title: "MARKET", description: "Acquire cargo bundles, speedups, and imperial fleet supplies.", imageSrc: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800&auto=format&fit=crop", targetTab: "marketplace" },
  { id: "phantom", title: "PHANTOM STATION", description: "Exchange void crystals, blueprints, and rare synaptic upgrades.", imageSrc: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop", targetTab: "phantom" }
];

export const Homepage: React.FC<HomepageProps> = ({ user, onLogout }) => {
  const [activeMissionType, setActiveMissionType] = useState<MissionType>('DAILY');
  const [activeTab, setActiveTab] = useState<"home" | "marketplace" | "phantom" | "can" | "inventory" | "mission">("home");
  const [activeWindow, setActiveWindow] = useState<"home" | "expeditions" | "expeditions_flights" | "alliance" | "profile" | "settings" | "notifications">("home");

  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>(user.avatarUrl || '');
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [activeFlightsCount, setActiveFlightsCount] = useState<number>(0);
  const [utcTime, setUtcTime] = useState<string>(miningService.getFormattedUtcTime());

  // 🎯 ESTADO PARA NOTIFICACIONES FLOTANTES (TOASTS)
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const [power, setPower] = useState(0);
  const [currencies, setCurrencies] = useState({ gd_coin: 0, quantum_credit: 0, phantom_coin: 0, halloween_coin: 0, xmas_coin: 0, valentine_coin: 0 });
  const [resources, setResources] = useState({
    metal: 0, crystal: 0, deuterium: 0, dark_matter: 0, omniplate: 0, orichaltron: 0,
    lunar_fiber: 0, infinite_core: 0, primal_token: 0, xenoplasm: 0, organium: 0, mana: 0, wood: 0
  });

  // 🎯 MANEJADOR VISUAL DE NOTIFICACIONES
  const handleTriggerNotification = (text: string, e?: any) => {
    console.log("📢 [SYSTEM_NOTIFICATION]:", text);
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newToast: ToastNotification = {
      id,
      text,
      timestamp: new Date().toLocaleTimeString()
    };

    setToasts(prev => [newToast, ...prev].slice(0, 4));
    setUnreadNotifCount(prev => prev + 1);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const [missions, setMissions] = useState<Mission[]>([
    { id: 'M-D1', type: 'DAILY', title: 'EXPEDICIÓN DE MINERÍA', description: 'Completar 3 expediciones de minería con éxito', progress: 3, maxProgress: 3, reward: '+50 CRISTALES', claimed: false },
    { id: 'M-D2', type: 'DAILY', title: 'SINCRO DE C.A.N.', description: 'Escanear 1 cluster galáctico en el mapa estelar', progress: 1, maxProgress: 1, reward: '+100 GD COINS', claimed: true },
    { id: 'M-D3', type: 'DAILY', title: 'COMERCIO INGAME', description: 'Realizar 1 compra o venta en el Marketplace', progress: 0, maxProgress: 1, reward: '+10 PHANTOM COINS', claimed: false }
  ]);

  const handleClaimMission = (missionId: string) => {
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, claimed: true } : m));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(miningService.getFormattedUtcTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 🔄 CARGA Y SINCRONIZACIÓN CONTINUA DE RECURSOS / MONEDAS REALES + LISTENERS DE LOGS
  useEffect(() => {
    let profileChannel: any;
    let logsChannel: any;
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
        if (profile.avatar_url) setCurrentAvatarUrl(profile.avatar_url);
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

    const initEngine = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !isMounted) return;

      const savedAvatar = localStorage.getItem(`user_avatar_${authUser.id}`);
      if (savedAvatar) {
        setCurrentAvatarUrl(savedAvatar);
      }

      // Carga Inicial
      await loadUserProfile(authUser);

      // Expediciones
      const { count: flightCount } = await supabase
        .from('active_expeditions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('status', 'LAUNCHED');

      if (flightCount !== null && flightCount !== undefined && isMounted) {
        setActiveFlightsCount(flightCount);
      }

      // Notificaciones
      const { count: notifCount } = await supabase
        .from('expedition_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('is_read', false);

      if (notifCount !== null && notifCount !== undefined && isMounted) {
        setUnreadNotifCount(notifCount);
      }

      // Suscripción Realtime Perfil
      profileChannel = supabase
        .channel(`economy_hud_stream_${authUser.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, (payload: any) => {
          const updated = payload.new;
          if (!updated || !isMounted) return;
          if (updated.id === authUser.id || updated.user_id === authUser.id) {
            loadUserProfile(authUser);
          }
        })
        .subscribe();

      // 🎯 SUSCRIPCIÓN REALTIME PARA EVENTOS/LOGS DE EXPEDICIÓN DEL USUARIO
      logsChannel = supabase
        .channel(`expedition_logs_stream_${authUser.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'expedition_logs',
          filter: `user_id=eq.${authUser.id}`
        }, (payload: any) => {
          const newLog = payload.new;
          if (newLog && isMounted) {
            handleTriggerNotification(`🛰️ [${newLog.event_type || 'ALERTA'}]: ${newLog.title || newLog.message}`);
          }
        })
        .subscribe();

      // Refresco automático cada 3 segundos
      const pollInterval = setInterval(() => {
        if (isMounted) loadUserProfile(authUser);
      }, 3000);

      return () => clearInterval(pollInterval);
    };

    initEngine();

    return () => {
      isMounted = false;
      if (profileChannel) supabase.removeChannel(profileChannel);
      if (logsChannel) supabase.removeChannel(logsChannel);
    };
  }, []);

  return (
    <main 
      className="w-full min-h-screen bg-black flex flex-col items-center justify-start overflow-y-auto p-1 sm:p-3 bg-cover bg-center bg-no-repeat bg-fixed overflow-x-hidden font-sans select-none text-white relative"
      style={{ backgroundImage: `url('${GAME_ASSETS.background}')` }}
    >
      <div className="fixed inset-0 bg-black/55 backdrop-blur-[1px] z-0 pointer-events-none" />

      {/* ─── CONTENEDOR FLOTANTE DE NOTIFICACIONES TOAST (Z-INDEX 100) ─── */}
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

      {/* ─── BARRA SUPERIOR HEADER ─── */}
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
        activeTab={
          activeTab === 'marketplace' ? 'MARKET' :
          activeTab === 'phantom' ? 'PHANTOM' :
          activeTab === 'inventory' ? 'INVENTORY' :
          activeTab === 'mission' ? 'MISSION' :
          activeTab === 'can' ? 'CAN' :
          (activeWindow === 'expeditions' || activeWindow === 'expeditions_flights') ? 'EXPEDITIONS' :
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
        unreadNotificationsCount={unreadNotifCount}
        onOpenNotifications={() => { setActiveTab('home'); setActiveWindow('notifications'); }}
        onOpenSettings={() => { setActiveTab('home'); setActiveWindow('settings'); }}
        onOpenProfile={() => { setActiveTab('home'); setActiveWindow('profile'); }}
      />

      {/* RELOJ UTC */}
      <div className="w-full px-6 pt-2 flex justify-start items-center z-20 pointer-events-none">
        <div className="flex items-center gap-2 font-mono text-[10px] text-cyan-400/80 font-bold tracking-widest uppercase">
          <span>{utcTime}</span>
        </div>
      </div>

      {/* BARRA LATERAL DERECHA */}
      <div className="fixed right-6 top-24 flex flex-col items-center gap-3 z-30 font-mono">
        <button onClick={() => { setActiveTab("home"); setActiveWindow("expeditions_flights"); }} className="p-2.5 bg-black/80 text-cyan-400 border border-cyan-500/40 rounded-xl cursor-pointer">
          <Eye className="w-5 h-5 text-cyan-400 animate-pulse" />
        </button>
        <button onClick={() => { setActiveTab("home"); setActiveWindow("notifications"); }} className="p-2.5 bg-black/80 text-cyan-400 border border-cyan-500/40 rounded-xl cursor-pointer">
          <Bell className="w-5 h-5 text-cyan-400" />
        </button>
        <button onClick={() => { setActiveTab("home"); setActiveWindow("settings"); }} className="p-2.5 bg-black/80 text-cyan-400 border border-cyan-500/40 rounded-xl cursor-pointer">
          <Settings className="w-5 h-5 text-cyan-400" />
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="w-full max-w-7xl flex-1 overflow-y-auto px-8 py-4 z-10 flex flex-col items-center justify-start">
        <AnimatePresence mode="wait">
          
          {/* SECTOR HOME / TARJETAS */}
          {activeTab === "home" && (
            activeWindow === "home" ? (
              <motion.div key="sector-home-screen" className="w-full my-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => {
                        if (card.targetWindow) {
                          setActiveTab("home");
                          setActiveWindow(card.targetWindow);
                        } else if (card.targetTab) {
                          setActiveTab(card.targetTab);
                          setActiveWindow("home");
                        }
                      }}
                      className="relative h-[440px] w-full rounded-xl overflow-hidden cursor-pointer border border-neutral-800 hover:border-red-500/60 transition-all duration-300 group flex flex-col justify-between p-6 bg-black/85 backdrop-blur-sm shadow-2xl"
                    >
                      <div className="absolute inset-0 z-0">
                        <img
                          src={card.imageSrc}
                          alt={card.title}
                          className="w-full h-full object-cover brightness-50 group-hover:scale-105 group-hover:brightness-75 transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      </div>

                      <div className="relative z-10">
                        <h2 className="text-xl font-black text-white uppercase tracking-widest group-hover:text-red-400 transition-colors">
                          {card.title}
                        </h2>
                      </div>

                      <div className="relative z-10 mt-auto">
                        <p className="text-[11px] font-mono text-zinc-400 leading-relaxed uppercase">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : activeWindow === "expeditions" ? (
              <ExpeditionsView initialView="selection" triggerNotification={handleTriggerNotification} />
            ) : activeWindow === "expeditions_flights" ? (
              <ExpeditionsView initialView="flights" onBack={() => { setActiveTab("home"); setActiveWindow("home"); }} triggerNotification={handleTriggerNotification} />
            ) : activeWindow === "alliance" ? (
              <AllianceView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} onBack={() => { setActiveTab("home"); setActiveWindow("home"); }} triggerNotification={handleTriggerNotification} />
            ) : activeWindow === "notifications" ? (
              <NotificationsView onBack={() => { setActiveTab("home"); setActiveWindow("home"); }} triggerNotification={handleTriggerNotification} />
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

          {/* SECTOR MISSION CENTER */}
          {activeTab === "mission" && (
            <motion.div key="sector-mission-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full bg-[#080b0e] border border-cyan-500/30 p-6 sm:p-8 rounded-2xl font-mono text-left space-y-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
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
          )}

          {activeTab === "can" && <CanView />}
          {activeTab === "marketplace" && <MarketplaceView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} playerGold={currencies.gd_coin} setPlayerGold={(v) => setCurrencies(p => ({ ...p, gd_coin: typeof v === 'function' ? v(p.gd_coin) : v }))} playerWood={resources.wood} setPlayerWood={() => { }} playerFood={resources.deuterium} setPlayerFood={() => { }} playerStone={resources.dark_matter} setPlayerStone={() => { }} playerOre={resources.metal} setPlayerOre={() => { }} onBack={() => { setActiveTab("home"); setActiveWindow("home"); }} triggerNotification={handleTriggerNotification} />}
          {activeTab === "phantom" && <PhantomStationView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} playerGold={currencies.gd_coin} setPlayerGold={(v) => setCurrencies(p => ({ ...p, gd_coin: typeof v === 'function' ? v(p.gd_coin) : v }))} onBack={() => { setActiveTab("home"); setActiveWindow("home"); }} triggerNotification={handleTriggerNotification} />}
          {activeTab === "inventory" && <InventoryView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} playerGold={currencies.gd_coin} setPlayerGold={(v) => setCurrencies(p => ({ ...p, gd_coin: typeof v === 'function' ? v(p.gd_coin) : v }))} onBack={() => { setActiveTab("home"); setActiveWindow("home"); }} triggerNotification={handleTriggerNotification} />}
        </AnimatePresence>
      </div>

      <ChatSystem userAllianceName={user.allianceName} triggerNotification={handleTriggerNotification} />
    </main>
  );
};