import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Settings, X, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ExpeditionsView } from '../components/ExpeditionsView';
import { MarketplaceView } from '../components/MarketplaceView';
import { PhantomStationView } from '../components/PhantomStationView';
import { InventoryView } from '../components/InventoryView';
import { AllianceView } from '../components/AllianceView';
import { CanView } from '../components/CanView';
import { ProfileView } from '../components/ProfileView';
import { NotificationsView } from '../components/NotificationsView';
import { MissionView } from '../components/MissionView';
import { ChatSystem } from '../components/ChatSystem';
import { Header } from '../components/Header';
import { miningService } from '../services/miningService';

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

const cards: SectorCard[] = [
  { id: "expedition", title: "EXPEDITION", description: "Venture into the unknown, explore, farm, and dominate the galaxy.", imageSrc: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop", targetWindow: "expeditions" },
  { id: "alliance", title: "ALLIANCE", description: "Coordinate your power. Expand your dominion.", imageSrc: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800&auto=format&fit=crop", targetWindow: "alliance" },
  { id: "market", title: "MARKET", description: "Acquire cargo bundles, speedups, and imperial fleet supplies.", imageSrc: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800&auto=format&fit=crop", targetTab: "marketplace" },
  { id: "phantom", title: "PHANTOM STATION", description: "Exchange void crystals, blueprints, and rare synaptic upgrades.", imageSrc: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop", targetTab: "phantom" }
];

export const Homepage: React.FC<HomepageProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<"home" | "marketplace" | "phantom" | "can" | "inventory" | "mission">("home");
  const [activeWindow, setActiveWindow] = useState<"home" | "expeditions" | "expeditions_flights" | "alliance" | "profile" | "settings" | "notifications">("home");

  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>(user.avatarUrl || '');
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [utcTime, setUtcTime] = useState<string>(miningService.getFormattedUtcTime());

  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [activeFlights, setActiveFlights] = useState<any[]>([]);
  const [notifiedFlightIds, setNotifiedFlightIds] = useState<Set<string>>(new Set());

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

  const handleTriggerNotification = async (text: string, payloadOrExpId?: any) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newToast: ToastNotification = {
      id,
      text,
      timestamp: new Date().toLocaleTimeString()
    };

    setToasts(prev => [newToast, ...prev].slice(0, 4));

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        let validExpId: string | null = null;
        let rewardsPayload: any = {};

        if (typeof payloadOrExpId === 'string' && isValidUUID(payloadOrExpId)) {
          validExpId = payloadOrExpId;
        } else if (payloadOrExpId && typeof payloadOrExpId === 'object') {
          if (isValidUUID(payloadOrExpId.expId)) validExpId = payloadOrExpId.expId;
          if (payloadOrExpId.rewards) rewardsPayload = payloadOrExpId.rewards;
        }

        await supabase.from('expedition_logs').insert([{
          user_id: authUser.id,
          expedition_id: validExpId,
          event_type: 'discovery',
          title: 'EXPEDICIÓN FINALIZADA',
          message: text,
          rewards_looted: rewardsPayload,
          damage_sustained: 0
        }]);

        setUnreadNotifCount(prev => prev + 1);
      }
    } catch (err) {
      console.error("Error al persistir notificación:", err);
      setUnreadNotifCount(prev => prev + 1);
    }

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5500);
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

  useEffect(() => {
    if (!activeFlights.length) return;
    const nowMs = Date.now();
    activeFlights.forEach((exp) => {
      const returnMs = new Date(exp.estimated_return_time).getTime();
      if (nowMs >= returnMs && !notifiedFlightIds.has(exp.id)) {
        setNotifiedFlightIds(prev => new Set(prev).add(exp.id));
        handleTriggerNotification(
          `🎉 ¡EXPEDICIÓN FINALIZADA! La flota ${exp.fleet_name || 'de expedición'} ha llegado a su destino (${exp.sector_name || 'SC'}). Reclama tus recompensas en Expeditions In Flight.`,
          { expId: exp.id }
        );
      }
    });
  }, [utcTime, activeFlights, notifiedFlightIds]);

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

      profileChannel = supabase
        .channel(`economy_hud_stream_${authUser.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, () => {
          if (isMounted) loadUserProfile(authUser);
        })
        .subscribe();

      expeditionsChannel = supabase
        .channel(`active_expeditions_stream_${authUser.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'active_expeditions', filter: `user_id=eq.${authUser.id}` }, () => {
          if (isMounted) loadActiveExpeditions(authUser.id);
        })
        .subscribe();

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
            setUnreadNotifCount(prev => prev + 1);
          }
        })
        .subscribe();

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
  }, []);

  return (
    <main 
      className="w-full min-h-screen bg-black flex flex-col items-center justify-start overflow-y-auto p-1 sm:p-3 bg-cover bg-center bg-no-repeat bg-fixed overflow-x-hidden font-sans select-none text-white relative"
      style={{ backgroundImage: `url('${GAME_ASSETS.background}')` }}
    >
      <div className="fixed inset-0 bg-black/55 backdrop-blur-[1px] z-0 pointer-events-none" />

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

      <div className="w-full px-6 pt-2 flex justify-start items-center z-20 pointer-events-none">
        <div className="flex items-center gap-2 font-mono text-[10px] text-cyan-400/80 font-bold tracking-widest uppercase">
          <span>{utcTime}</span>
        </div>
      </div>

      <div className="fixed right-6 top-24 flex flex-col items-center gap-3 z-30 font-mono">
        <button 
          onClick={() => { setActiveTab("home"); setActiveWindow("expeditions_flights"); }} 
          className="p-2.5 bg-black/80 text-cyan-400 border border-cyan-500/40 rounded-xl cursor-pointer relative hover:border-cyan-400 transition-all"
        >
          <Eye className="w-5 h-5 text-cyan-400 animate-pulse" />
          {readyFlightsCount > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full border border-emerald-300 animate-bounce shadow-[0_0_10px_#10b981]">
              {readyFlightsCount}
            </span>
          ) : activeFlights.length > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 bg-cyan-950 text-cyan-300 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-cyan-500">
              {activeFlights.length}
            </span>
          ) : null}
        </button>

        <button 
          onClick={() => { setActiveTab("home"); setActiveWindow("notifications"); }} 
          className="p-2.5 bg-black/80 text-cyan-400 border border-cyan-500/40 rounded-xl cursor-pointer relative hover:border-cyan-400 transition-all"
        >
          <Bell className="w-5 h-5 text-cyan-400" />
          {unreadNotifCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-red-400 shadow-[0_0_10px_#ef4444] animate-pulse">
              {unreadNotifCount}
            </span>
          )}
        </button>

        <button 
          onClick={() => { setActiveTab("home"); setActiveWindow("settings"); }} 
          className="p-2.5 bg-black/80 text-cyan-400 border border-cyan-500/40 rounded-xl cursor-pointer hover:border-cyan-400 transition-all"
        >
          <Settings className="w-5 h-5 text-cyan-400" />
        </button>
      </div>

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
      </div>

      <ChatSystem userAllianceName={user.allianceName} triggerNotification={handleTriggerNotification} />
    </main>
  );
};