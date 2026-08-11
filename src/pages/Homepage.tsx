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

// 🌐 DICCIONARIO DE ASSETS OFICIALES (SUPABASE)
const GAME_ASSETS = {
  background: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20(Ambientes%20)/22.jpg",
  crystal: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Crystal.png",
  metal: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Metal.png",
  deuterium: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Deuterium.png",
  gdCoin: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/GD%20Coin.png",
  halloweenCoin: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Halloween%20Coin.png",
  darkMatter: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/logo_PNG_11.png",
  phantomCoin: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Phantom%20Coin.png",
  primalToken: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Primal%20Token.png",
  quantumCredit: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Quatum%20Credit.png",
  xenoplasm: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Xenoplasm.png",
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

const cards: SectorCard[] = [
  {
    id: "expedition",
    title: "EXPEDITION",
    description: "Venture into the unknown, explore, farm, and dominate the galaxy.",
    imageSrc: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
    targetWindow: "expeditions"
  },
  {
    id: "alliance",
    title: "ALLIANCE",
    description: "Coordinate your power. Expand your dominion.",
    imageSrc: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800&auto=format&fit=crop",
    targetWindow: "alliance"
  },
  {
    id: "market",
    title: "MARKET",
    description: "Acquire cargo bundles, speedups, and imperial fleet supplies.",
    imageSrc: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800&auto=format&fit=crop",
    targetTab: "marketplace"
  },
  {
    id: "phantom",
    title: "PHANTOM STATION",
    description: "Exchange void crystals, blueprints, and rare synaptic upgrades.",
    imageSrc: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
    targetTab: "phantom"
  }
];

export const Homepage: React.FC<HomepageProps> = ({ user, onLogout }) => {
  const [activeMissionType, setActiveMissionType] = useState<MissionType>('DAILY');

  const [activeTab, setActiveTab] = useState<"home" | "marketplace" | "phantom" | "can" | "inventory" | "mission">("home");
  const [activeWindow, setActiveWindow] = useState<"home" | "expeditions" | "expeditions_flights" | "alliance" | "profile" | "settings" | "notifications">("home");
  const [unreadNotifCount] = useState(3);
  const [activeFlightsCount, setActiveFlightsCount] = useState(1);
  const [showExtraResources, setShowExtraResources] = useState(false);

  // Métrica UTC Discreta
  const [utcTime, setUtcTime] = useState<string>(miningService.getFormattedUtcTime());

  const [power, setPower] = useState(0);
  const [currencies, setCurrencies] = useState({
    gd_coin: 0,
    quantum_credit: 0,
    phantom_coin: 0,
    halloween_coin: 0,
    xmas_coin: 0,
    valentine_coin: 0
  });

  const [resources, setResources] = useState({
    metal: 0,
    crystal: 0,
    deuterium: 0,
    dark_matter: 0,
    omniplate: 0,
    orichaltron: 0,
    lunar_fiber: 0,
    infinite_core: 0,
    primal_token: 0,
    xenoplasm: 0,
    organium: 0,
    mana: 0,
    wood: 0
  });

  // Gestor Global de Notificaciones para Vistas Hijas
  const handleTriggerNotification = (text: string, e?: any) => {
    console.log("📢 [SYSTEM_NOTIFICATION]:", text);
  };

  // Lista de Misiones del Mission Center
  const [missions, setMissions] = useState<Mission[]>([
    { id: 'M-D1', type: 'DAILY', title: 'EXPEDICIÓN DE MINERÍA', description: 'Completar 3 expediciones de minería con éxito', progress: 3, maxProgress: 3, reward: '+50 CRISTALES', claimed: false },
    { id: 'M-D2', type: 'DAILY', title: 'SINCRO DE C.A.N.', description: 'Escanear 1 cluster galáctico en el mapa estelar', progress: 1, maxProgress: 1, reward: '+100 GD COINS', claimed: true },
    { id: 'M-D3', type: 'DAILY', title: 'COMERCIO INGAME', description: 'Realizar 1 compra o venta en el Marketplace', progress: 0, maxProgress: 1, reward: '+10 PHANTOM COINS', claimed: false },
    { id: 'M-W1', type: 'WEEKLY', title: 'DOMINACIÓN TERRITORIAL', description: 'Conquistar o defender 2 estrellas en modo Dominación', progress: 1, maxProgress: 2, reward: '+500 CRISTALES', claimed: false },
    { id: 'M-W2', type: 'WEEKLY', title: 'CRAFTING DE FLOTA', description: 'Ensamblar 2 naves en el hangar de inventario', progress: 2, maxProgress: 2, reward: '+1,500 GD COINS', claimed: false },
    { id: 'M-M1', type: 'MONTHLY', title: 'MAESTRÍA DE SECTORES', description: 'Completar 50 expediciones en la galaxia', progress: 32, maxProgress: 50, reward: '+2,500 CRISTALES + 1 BLUEPRINT', claimed: false },
    { id: 'M-E1', type: 'EVENT', title: 'INCURSIÓN ANOMALÍA COLOIDAL', description: 'Recolectar 5,000 de Xenoplasma durante el evento activo', progress: 1200, maxProgress: 5000, reward: '+1 PRIMAL TOKEN', claimed: false },
    { id: 'M-L1', type: 'LIMITED', title: 'DESAFÍO FLASH DE VANGUARDIA', description: 'Alcanzar 160,000 de Poder de Comando en las próximas 12 horas', progress: 156420, maxProgress: 160000, reward: '+300 PHANTOM COINS', claimed: false },
    { id: 'M-F1', type: 'FLEET', title: 'DESPLIEGUE ARMADO', description: 'Mantener 3 flotas personalizadas activas en el Fleet Manager', progress: 3, maxProgress: 3, reward: '+200 QUANTUM CREDITS', claimed: false },
    { id: 'M-C1', type: 'CLAN', title: 'APORTE DE ALIANZA', description: 'Contribuir al fondo de tecnología de tu Clan o Alianza', progress: 500, maxProgress: 1000, reward: '+1,000 GD COINS', claimed: false }
  ]);

  // Temporizador para el Reloj UTC Discreto
  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(miningService.getFormattedUtcTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let channel: any;
    let isMounted = true;

    const initEngine = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !isMounted) return;

      const { count } = await supabase
        .from('active_expeditions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('status', 'LAUNCHED');

      if (count !== null && count !== undefined && isMounted) {
        setActiveFlightsCount(count > 0 ? count : 1);
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (profile && isMounted) {
        setPower(parseFloat(profile.power_score || 0));
        setCurrencies({
          gd_coin: parseFloat(profile.gd_coin || 0),
          quantum_credit: parseFloat(profile.quantum_credit || 0),
          phantom_coin: parseFloat(profile.phantom_coin || 0),
          halloween_coin: parseFloat(profile.halloween_coin || 0),
          xmas_coin: parseFloat(profile.xmas_coin || 0),
          valentine_coin: parseFloat(profile.valentine_coin || 0)
        });
        setResources(prev => ({
          ...prev,
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
        }));
      }

      channel = supabase
        .channel(`economy_hud_stream_${authUser.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${authUser.id}` }, (payload: any) => {
          const updated = payload.new;
          if (!updated || !isMounted) return;

          setPower(parseFloat(updated.power_score || 0));
          setCurrencies({
            gd_coin: parseFloat(updated.gd_coin || 0),
            quantum_credit: parseFloat(updated.quantum_credit || 0),
            phantom_coin: parseFloat(updated.phantom_coin || 0),
            halloween_coin: parseFloat(updated.halloween_coin || 0),
            xmas_coin: parseFloat(updated.xmas_coin || 0),
            valentine_coin: parseFloat(updated.valentine_coin || 0)
          });
          setResources(prev => ({
            ...prev,
            metal: parseFloat(updated.metal || 0),
            crystal: parseFloat(updated.crystal || 0),
            deuterium: parseFloat(updated.deuterium || 0),
            dark_matter: parseFloat(updated.dark_matter || 0),
            omniplate: parseFloat(updated.omniplate || 0),
            orichaltron: parseFloat(updated.orichaltron || 0),
            lunar_fiber: parseFloat(updated.lunar_fiber || 0),
            infinite_core: parseFloat(updated.infinite_core || 0),
            primal_token: parseFloat(updated.primal_token || 0),
            xenoplasm: parseFloat(updated.xenoplasm || 0),
            organium: parseFloat(updated.organium || 0),
            mana: parseFloat(updated.mana || 0),
            wood: parseFloat(updated.wood || 0)
          }));
        })
        .subscribe();
    };

    initEngine();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const formatVal = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toLocaleString();
  };

  const handleClaimMission = (missionId: string) => {
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, claimed: true } : m));
  };

  return (
    <main 
      className="w-full min-h-screen bg-black flex flex-col items-center justify-start overflow-y-auto p-1 sm:p-3 bg-cover bg-center bg-no-repeat bg-fixed overflow-x-hidden font-sans select-none text-white relative"
      style={{ backgroundImage: `url('${GAME_ASSETS.background}')` }}
    >
      {/* Capa de contraste traslúcida */}
      <div className="fixed inset-0 bg-black/55 backdrop-blur-[1px] z-0 pointer-events-none" />

      {/* ─── NUEVA BARRA SUPERIOR CON Header COMPONENTE ─── */}
      <Header
        userProfile={{
          ...user,
          username: user.name,
          avatar_url: user.avatarUrl,
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
          wood: resources.wood,
        }}
        activeTab={activeTab === 'home' && activeWindow === 'home' ? 'MAIN' :
                   activeTab === 'can' ? 'CAN' :
                   activeWindow === 'expeditions' || activeWindow === 'expeditions_flights' ? 'EXPEDITIONS' :
                   activeTab === 'marketplace' ? 'MARKET' :
                   activeTab === 'phantom' ? 'PHANTOM' :
                   activeTab === 'inventory' ? 'INVENTORY' :
                   activeTab === 'mission' ? 'MISSION' : 'MAIN'}
        onSelectTab={(tab) => {
          if (tab === 'MAIN') { setActiveTab('home'); setActiveWindow('home'); }
          else if (tab === 'CAN') { setActiveTab('can'); }
          else if (tab === 'EXPEDITIONS') { setActiveTab('home'); setActiveWindow('expeditions'); }
          else if (tab === 'MARKET') { setActiveTab('marketplace'); }
          else if (tab === 'PHANTOM') { setActiveTab('phantom'); }
          else if (tab === 'INVENTORY') { setActiveTab('inventory'); }
          else if (tab === 'MISSION') { setActiveTab('mission'); }
        }}
        unreadNotificationsCount={unreadNotifCount}
        onOpenNotifications={() => { setActiveTab('home'); setActiveWindow('notifications'); }}
        onOpenSettings={() => { setActiveTab('home'); setActiveWindow('settings'); }}
        onOpenProfile={() => { setActiveTab('home'); setActiveWindow('profile'); }}
      />


      {/* ⏱️ RELOJ UTC DISCRETO ALINEADO COMPLETAMENTE AL BORDE IZQUIERDO */}
      <div className="w-full px-6 pt-2 flex justify-start items-center z-20 pointer-events-none">
        <div className="flex items-center gap-2 font-mono text-[10px] text-cyan-400/80 font-bold tracking-widest uppercase drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]">
          <span>{utcTime}</span>
        </div>
      </div>

      {/* 🎯 BARRA LATERAL DERECHA DE ACCESO RÁPIDO (QUICK ACCESS BAR) */}
      <div className="fixed right-6 top-24 flex flex-col items-center gap-3 z-30 font-mono">
        {/* 1. EXPEDITION IN FLIGHT */}
        <button
          onClick={() => { setActiveTab("home"); setActiveWindow("expeditions_flights"); }}
          className={`relative p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer shadow-lg group ${
            activeWindow === "expeditions_flights"
              ? "bg-cyan-950/90 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-105"
              : "bg-black/80 text-cyan-400 border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-950/80 hover:scale-110"
          }`}
          title="Expeditions in Flight (Flotas en Vuelo)"
        >
          <Eye className="w-5 h-5 text-cyan-400 animate-pulse" />
          {activeFlightsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-cyan-400 text-black font-mono text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.8)] border border-black">
              {activeFlightsCount}
            </span>
          )}

          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center bg-black/90 border border-cyan-500/60 text-cyan-300 text-[8px] font-mono font-bold uppercase px-2 py-1 rounded shadow-2xl whitespace-nowrap pointer-events-none">
            EXPEDITIONS IN FLIGHT
          </div>
        </button>

        {/* 2. NOTIFICACIONES */}
        <button
          onClick={() => { setActiveTab("home"); setActiveWindow("notifications"); }}
          className={`relative p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer shadow-lg group ${
            activeWindow === "notifications"
              ? "bg-cyan-950/90 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-105"
              : "bg-black/80 text-cyan-400 border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-950/80 hover:scale-110"
          }`}
          title="Notificaciones"
        >
          <Bell className="w-5 h-5 text-cyan-400" />
          {unreadNotifCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-mono text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-black">
              {unreadNotifCount}
            </span>
          )}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center bg-black/90 border border-cyan-500/60 text-cyan-300 text-[8px] font-mono font-bold uppercase px-2 py-1 rounded shadow-2xl whitespace-nowrap pointer-events-none">
            NOTIFICACIONES
          </div>
        </button>

        {/* 3. SETTINGS */}
        <button
          onClick={() => { setActiveTab("home"); setActiveWindow("settings"); }}
          className={`relative p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer shadow-lg group ${
            activeWindow === "settings"
              ? "bg-cyan-950/90 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-105"
              : "bg-black/80 text-cyan-400 border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-950/80 hover:scale-110"
          }`}
          title="Settings"
        >
          <Settings className="w-5 h-5 text-cyan-400 transition-transform group-hover:rotate-90 duration-300" />
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center bg-black/90 border border-cyan-500/60 text-cyan-300 text-[8px] font-mono font-bold uppercase px-2 py-1 rounded shadow-2xl whitespace-nowrap pointer-events-none">
            SETTINGS
          </div>
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL DE PÁGINAS */}
      <div className="w-full max-w-7xl flex-1 overflow-y-auto px-8 py-4 z-10 flex flex-col items-center justify-start">
        <AnimatePresence mode="wait">
          
          {/* SECTOR HOME */}
          {activeTab === "home" && (
            activeWindow === "home" ? (
              <motion.div key="sector-home-screen" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="w-full my-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => {
                        if (card.targetWindow) {
                          setActiveWindow(card.targetWindow);
                        } else if (card.targetTab) {
                          setActiveTab(card.targetTab);
                        }
                      }}
                      className="relative h-[440px] w-full rounded-xl overflow-hidden cursor-pointer border border-neutral-800 hover:border-red-500/60 transition-all duration-300 group flex flex-col justify-between p-6 bg-black/85 backdrop-blur-sm shadow-2xl"
                    >
                      <div className="absolute inset-0 z-0">
                        <img
                          src={card.imageSrc}
                          alt={card.title}
                          className="w-full h-full object-cover brightness-40 group-hover:scale-105 group-hover:brightness-60 transition-all duration-500"
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
              <motion.div key="sector-expeditions-screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
                <ExpeditionsView initialView="selection" triggerNotification={handleTriggerNotification} />
              </motion.div>
            ) : activeWindow === "expeditions_flights" ? (
              <motion.div key="sector-expeditions-flights-screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
                <ExpeditionsView initialView="flights" onBack={() => setActiveWindow("home")} triggerNotification={handleTriggerNotification} />
              </motion.div>
            ) : activeWindow === "alliance" ? (
              <motion.div key="sector-alliance-screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
                <AllianceView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} onBack={() => setActiveWindow("home")} triggerNotification={handleTriggerNotification} />
              </motion.div>
            ) : activeWindow === "settings" ? (
              <motion.div key="sector-settings-screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full bg-[#080b0e] border border-cyan-500/30 p-8 rounded-2xl font-mono text-left space-y-6">
                <div className="flex justify-between items-center border-b border-cyan-900/50 pb-4">
                  <div className="flex items-center gap-3">
                    <Settings className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">SETTINGS / CONFIGURACIÓN DE COMANDO</h2>
                  </div>
                  <button onClick={() => setActiveWindow("home")} className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded text-[9px] font-bold uppercase cursor-pointer">
                    VOLVER
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px]">
                  <div className="p-4 bg-black/60 border border-cyan-950 rounded-xl space-y-2">
                    <span className="text-cyan-400 font-bold block uppercase">PREFERENCIAS DE AUDIO</span>
                    <label className="flex items-center justify-between text-zinc-300">
                      <span>EFECTOS DE SONIDO TÁCTICOS (SFX)</span>
                      <input type="checkbox" defaultChecked className="accent-cyan-500" />
                    </label>
                    <label className="flex items-center justify-between text-zinc-300">
                      <span>MÚSICA AMBIENTAL ESTELAR</span>
                      <input type="checkbox" defaultChecked className="accent-cyan-500" />
                    </label>
                  </div>
                  <div className="p-4 bg-black/60 border border-cyan-950 rounded-xl space-y-2">
                    <span className="text-cyan-400 font-bold block uppercase">RENDIMIENTO VISUAL</span>
                    <label className="flex items-center justify-between text-zinc-300">
                      <span>ANIMACIONES DE INTERFAZ</span>
                      <input type="checkbox" defaultChecked className="accent-cyan-500" />
                    </label>
                    <label className="flex items-center justify-between text-zinc-300">
                      <span>PARTÍCULAS Y GLOW EN TIEMPO REAL</span>
                      <input type="checkbox" defaultChecked className="accent-cyan-500" />
                    </label>
                  </div>

                  <div className="p-4 bg-black/60 border border-cyan-950 rounded-xl space-y-2 col-span-1 md:col-span-2">
                    <span className="text-cyan-400 font-bold block uppercase border-b border-cyan-950 pb-1 mb-2">
                      PREFERENCIAS DE NOTIFICACIÓN (ALERTAS TÁCTICAS)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[9.5px]">
                      <label className="flex items-center justify-between text-zinc-300 bg-black/40 p-2 rounded border border-cyan-950">
                        <span>ANUNCIOS IMPERIALES (ANNOUNCEMENTS)</span>
                        <input type="checkbox" defaultChecked className="accent-cyan-500" />
                      </label>
                      <label className="flex items-center justify-between text-zinc-300 bg-black/40 p-2 rounded border border-cyan-950">
                        <span>EXPEDICIONES Y FLOTAS (EXPEDITIONS)</span>
                        <input type="checkbox" defaultChecked className="accent-cyan-500" />
                      </label>
                      <label className="flex items-center justify-between text-zinc-300 bg-black/40 p-2 rounded border border-cyan-950">
                        <span>TRANSACCIONES DE MERCADO (MARKET)</span>
                        <input type="checkbox" defaultChecked className="accent-cyan-500" />
                      </label>
                      <label className="flex items-center justify-between text-zinc-300 bg-black/40 p-2 rounded border border-cyan-950">
                        <span>COMUNICADOS DE ALIANZA (ALLIANCE)</span>
                        <input type="checkbox" defaultChecked className="accent-cyan-500" />
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeWindow === "notifications" ? (
              <motion.div key="sector-notifications-screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
                <NotificationsView
                  onBack={() => setActiveWindow("home")}
                  onNavigateModule={(mod) => {
                    if (mod === 'AMI' || mod === 'FIF') setActiveTab('can');
                    else if (mod === 'MARKET') setActiveTab('marketplace');
                    else if (mod === 'EXPEDITION') setActiveWindow('expeditions');
                    else if (mod === 'ALLIANCE') setActiveWindow('alliance');
                    setActiveWindow(mod === 'EXPEDITION' ? 'expeditions' : mod === 'ALLIANCE' ? 'alliance' : 'home');
                  }}
                  triggerNotification={handleTriggerNotification}
                />
              </motion.div>
            ) : (
              <motion.div key="sector-profile-screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
                <ProfileView onBack={() => setActiveWindow("home")} triggerNotification={handleTriggerNotification} />
              </motion.div>
            )
          )}

          {/* SECTOR MISSION (PÁGINA PRINCIPAL DE MISIONES) */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-950">
                {missions.filter(m => m.type === activeMissionType).length === 0 ? (
                  <div className="col-span-2 p-12 text-center text-zinc-600 text-[10px] uppercase tracking-widest">
                    NO HAY MISIONES DISPONIBLES EN ESTA CATEGORÍA
                  </div>
                ) : (
                  missions.filter(m => m.type === activeMissionType).map((mission) => {
                    const isComplete = mission.progress >= mission.maxProgress;
                    const pct = Math.min(100, Math.floor((mission.progress / mission.maxProgress) * 100));

                    return (
                      <div
                        key={mission.id}
                        className="p-4 bg-black/60 border border-cyan-950 hover:border-cyan-800 rounded-xl flex flex-col justify-between gap-3 relative transition-all"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col text-left">
                            <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                              {mission.title}
                            </span>
                            <span className="text-[9px] text-zinc-400 mt-0.5 normal-case">
                              {mission.description}
                            </span>
                          </div>

                          <span className="text-[8.5px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 shrink-0">
                            {mission.reward}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] text-zinc-500">
                            <span>PROGRESO</span>
                            <span className="text-cyan-400 font-bold">{mission.progress} / {mission.maxProgress} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-cyan-950">
                            <div
                              className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
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

          {/* SECTOR MARKET */}
          {activeTab === "marketplace" && (
            <motion.div key="sector-marketplace-screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
              <MarketplaceView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} playerGold={currencies.gd_coin} setPlayerGold={(v) => setCurrencies(p => ({ ...p, gd_coin: typeof v === 'function' ? v(p.gd_coin) : v }))} playerWood={resources.wood} setPlayerWood={() => { }} playerFood={resources.deuterium} setPlayerFood={() => { }} playerStone={resources.dark_matter} setPlayerStone={() => { }} playerOre={resources.metal} setPlayerOre={() => { }} onBack={() => setActiveTab("home")} triggerNotification={handleTriggerNotification} />
            </motion.div>
          )}

          {/* SECTOR PHANTOM STATION */}
          {activeTab === "phantom" && (
            <motion.div key="sector-phantom-screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
              <PhantomStationView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} playerGold={currencies.gd_coin} setPlayerGold={(v) => setCurrencies(p => ({ ...p, gd_coin: typeof v === 'function' ? v(p.gd_coin) : v }))} onBack={() => setActiveTab("home")} triggerNotification={handleTriggerNotification} />
            </motion.div>
          )}

          {/* SECTOR INVENTARIO */}
          {activeTab === "inventory" && (
            <motion.div key="sector-inventory-screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
              <InventoryView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} playerGold={currencies.gd_coin} setPlayerGold={(v) => setCurrencies(p => ({ ...p, gd_coin: typeof v === 'function' ? v(p.gd_coin) : v }))} onBack={() => setActiveTab("home")} triggerNotification={handleTriggerNotification} />
            </motion.div>
          )}

          {/* SECTOR C.A.N. MATRIX */}
          {activeTab === "can" && (
            <motion.div key="sector-can-screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
              <CanView />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ─── HUD DEL CHAT EN TIEMPO REAL ─── */}
      <ChatSystem userAllianceName={user.allianceName} triggerNotification={handleTriggerNotification} />

    </main>
  );
};