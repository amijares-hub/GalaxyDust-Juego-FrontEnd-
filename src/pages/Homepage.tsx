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

  const [power, setPower] = useState(0);
  const [currencies, setCurrencies] = useState({ gd_coin: 0, quantum_credit: 0, phantom_coin: 0, halloween_coin: 0, xmas_coin: 0, valentine_coin: 0 });
  const [resources, setResources] = useState({ metal: 0, crystal: 0, deuterium: 0, dark_matter: 0, omniplate: 0, orichaltron: 0, lunar_fiber: 0, infinite_core: 0, primal_token: 0, xenoplasm: 0, organium: 0, mana: 0, wood: 0 });

  const handleTriggerNotification = (text: string, e?: any) => {
    console.log("📢 [SYSTEM_NOTIFICATION]:", text);
  };

  const [missions, setMissions] = useState<Mission[]>([
    { id: 'M-D1', type: 'DAILY', title: 'EXPEDICIÓN DE MINERÍA', description: 'Completar 3 expediciones de minería con éxito', progress: 3, maxProgress: 3, reward: '+50 CRISTALES', claimed: false },
    { id: 'M-D2', type: 'DAILY', title: 'SINCRO DE C.A.N.', description: 'Escanear 1 cluster galáctico en el mapa estelar', progress: 1, maxProgress: 1, reward: '+100 GD COINS', claimed: true },
    { id: 'M-D3', type: 'DAILY', title: 'COMERCIO INGAME', description: 'Realizar 1 compra o venta en el Marketplace', progress: 0, maxProgress: 1, reward: '+10 PHANTOM COINS', claimed: false }
  ]);

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

      const savedAvatar = localStorage.getItem(`user_avatar_${authUser.id}`);
      if (savedAvatar) {
        setCurrentAvatarUrl(savedAvatar);
      }

      const { count: flightCount } = await supabase
        .from('active_expeditions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('status', 'LAUNCHED');

      if (flightCount !== null && flightCount !== undefined && isMounted) {
        setActiveFlightsCount(flightCount);
      }

      const { count: notifCount } = await supabase
        .from('expedition_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('is_read', false);

      if (notifCount !== null && notifCount !== undefined && isMounted) {
        setUnreadNotifCount(notifCount);
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

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
      }

      channel = supabase
        .channel(`economy_hud_stream_${authUser.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${authUser.id}` }, (payload: any) => {
          const updated = payload.new;
          if (!updated || !isMounted) return;
          if (updated.avatar_url) setCurrentAvatarUrl(updated.avatar_url);
        })
        .subscribe();
    };

    initEngine();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main 
      className="w-full min-h-screen bg-black flex flex-col items-center justify-start overflow-y-auto p-1 sm:p-3 bg-cover bg-center bg-no-repeat bg-fixed overflow-x-hidden font-sans select-none text-white relative"
      style={{ backgroundImage: `url('${GAME_ASSETS.background}')` }}
    >
      <div className="fixed inset-0 bg-black/55 backdrop-blur-[1px] z-0 pointer-events-none" />

      {/* BARRA SUPERIOR HEADER */}
      <Header
        userProfile={{
          ...user,
          username: user.name,
          avatar_url: currentAvatarUrl,
          level: 1,
          gd_coin: currencies.gd_coin,
          quantum_credit: currencies.quantum_credit,
          phantom_coin: currencies.phantom_coin,
          metal: resources.metal,
          crystal: resources.crystal,
          deuterium: resources.deuterium,
          dark_matter: resources.dark_matter,
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

      {/* CONTENIDO PRINCIPAL DE TARJETAS */}
      <div className="w-full max-w-7xl flex-1 overflow-y-auto px-8 py-4 z-10 flex flex-col items-center justify-start">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            activeWindow === "home" ? (
              <motion.div key="sector-home-screen" className="w-full my-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => {
                        if (card.targetWindow) setActiveWindow(card.targetWindow);
                        else if (card.targetTab) setActiveTab(card.targetTab);
                      }}
                      className="relative h-[440px] w-full rounded-xl overflow-hidden cursor-pointer border border-neutral-800 hover:border-red-500/60 transition-all duration-300 group flex flex-col justify-between p-6 bg-black/85 backdrop-blur-sm shadow-2xl"
                    >
                      {/* 🖼️ IMAGEN DE FONDO RESTAURADA CON DEGRADADO ESPACIAL */}
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
              <ExpeditionsView initialView="selection" triggerNotification={handleTriggerNotification} />
            ) : activeWindow === "expeditions_flights" ? (
              <ExpeditionsView initialView="flights" onBack={() => setActiveWindow("home")} triggerNotification={handleTriggerNotification} />
            ) : activeWindow === "alliance" ? (
              <AllianceView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} onBack={() => setActiveWindow("home")} triggerNotification={handleTriggerNotification} />
            ) : activeWindow === "notifications" ? (
              <NotificationsView onBack={() => setActiveWindow("home")} triggerNotification={handleTriggerNotification} />
            ) : (
              <ProfileView 
                onBack={() => setActiveWindow("home")} 
                triggerNotification={handleTriggerNotification}
                onProfileUpdate={(updated) => {
                  if (updated.avatar_url) {
                    setCurrentAvatarUrl(updated.avatar_url);
                  }
                }}
              />
            )
          )}

          {activeTab === "can" && <CanView />}
          {activeTab === "marketplace" && <MarketplaceView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} playerGold={currencies.gd_coin} setPlayerGold={(v) => setCurrencies(p => ({ ...p, gd_coin: typeof v === 'function' ? v(p.gd_coin) : v }))} playerWood={resources.wood} setPlayerWood={() => { }} playerFood={resources.deuterium} setPlayerFood={() => { }} playerStone={resources.dark_matter} setPlayerStone={() => { }} playerOre={resources.metal} setPlayerOre={() => { }} onBack={() => setActiveTab("home")} triggerNotification={handleTriggerNotification} />}
          {activeTab === "phantom" && <PhantomStationView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} playerGold={currencies.gd_coin} setPlayerGold={(v) => setCurrencies(p => ({ ...p, gd_coin: typeof v === 'function' ? v(p.gd_coin) : v }))} onBack={() => setActiveTab("home")} triggerNotification={handleTriggerNotification} />}
          {activeTab === "inventory" && <InventoryView playerGems={resources.crystal} setPlayerGems={(v) => setResources(p => ({ ...p, crystal: typeof v === 'function' ? v(p.crystal) : v }))} playerPower={power} setPlayerPower={setPower} playerGold={currencies.gd_coin} setPlayerGold={(v) => setCurrencies(p => ({ ...p, gd_coin: typeof v === 'function' ? v(p.gd_coin) : v }))} onBack={() => setActiveTab("home")} triggerNotification={handleTriggerNotification} />}
        </AnimatePresence>
      </div>

      <ChatSystem userAllianceName={user.allianceName} triggerNotification={handleTriggerNotification} />
    </main>
  );
};