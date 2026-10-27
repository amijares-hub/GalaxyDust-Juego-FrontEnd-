import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Settings, X, Bell, Lock, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { DownloadModal } from '../components/DownloadModal';
import { ExpeditionsView } from '../components/ExpeditionsView';
import { MarketplaceView } from '../components/MarketplaceView';
import { PhantomStationView } from '../components/PhantomStationView';
import { InventoryView } from '../components/InventoryView';
import { AllianceView } from '../components/AllianceView';
import { CanView, GalaxyFrame } from '../components/CanView';
import { ProfileView } from '../components/ProfileView';
import { NotificationsView } from '../components/NotificationsView';
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
      title: t('hub.expedition_title', 'EXPEDICIÓN'), 
      description: t('hub.expedition_desc', 'Adéntrate en lo desconocido. Explora clústeres, recolecta recursos y domina sectores estelares.'), 
      imageSrc: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20(Ambientes%20)/13.jpg", 
      targetWindow: "expeditions" 
    },
    { 
      id: "alliance", 
      title: t('hub.alliance_title', 'ALIANZA'), 
      description: t('hub.alliance_desc', 'Coordina tu flota, expande tu dominio y forja imperios galácticos.'), 
      imageSrc: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20(Ambientes%20)/Alliance%20depot.jpg", 
      targetWindow: "alliance" 
    },
    { 
      id: "market", 
      title: t('hub.market_title', 'MERCADO'), 
      description: t('hub.market_desc', 'Comercia cargamentos, aceleradores y tecnología con otros comandantes.'), 
      imageSrc: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20(Ambientes%20)/17.jpg", 
      targetTab: "marketplace" 
    },
    { 
      id: "phantom", 
      title: t('hub.phantom_title', 'ESTACIÓN PHANTOM'), 
      description: t('hub.phantom_desc', 'Intercambia cristales del vacío por planos tácticos y prototipos clasificados.'), 
      imageSrc: "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Phatom%20Station/Skin%20Original/image%20(18).png", 
      targetTab: "phantom" 
    }
  ], [t]);

  const [activeTab, setActiveTab] = useState<"home" | "marketplace" | "phantom" | "can" | "inventory" | "mission">("home");
  const [activeWindow, setActiveWindow] = useState<"home" | "expeditions" | "alliance" | "profile" | "settings">("home");

  const [showFlightsModal, setShowFlightsModal] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('gd_tutorial_completed');
    } catch {
      return false;
    }
  });

  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>(user.avatarUrl || '');
  const [utcTime, setUtcTime] = useState<string>(miningService.getFormattedUtcTime());

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

  const currentUserIdRef = useRef<string | null>(null);
  const refreshNotificationsRef = useRef(refreshNotifications);
  refreshNotificationsRef.current = refreshNotifications;

  // ── 🛡️ AUTO-LOGOUT TRAS 30 MINUTOS DE INACTIVIDAD ──
  useEffect(() => {
    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
    let lastActivityTimestamp = Date.now();

    const recordUserActivity = () => {
      lastActivityTimestamp = Date.now();
    };

    const monitoredEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    monitoredEvents.forEach((evt) => {
      window.addEventListener(evt, recordUserActivity, { passive: true });
    });

    const verifyActivityTimeout = async () => {
      if (Date.now() - lastActivityTimestamp >= INACTIVITY_TIMEOUT_MS) {
        console.warn('[SECURITY] Sesión cerrada automáticamente tras 30 minutos de inactividad.');
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.error('Error al cerrar sesión:', err);
        }
        onLogout();
      }
    };

    const inactivityInterval = setInterval(verifyActivityTimeout, 30000);

    const handleTabVisibility = () => {
      if (document.visibilityState === 'visible') {
        verifyActivityTimeout();
      }
    };
    document.addEventListener('visibilitychange', handleTabVisibility);

    return () => {
      monitoredEvents.forEach((evt) => {
        window.removeEventListener(evt, recordUserActivity);
      });
      clearInterval(inactivityInterval);
      document.removeEventListener('visibilitychange', handleTabVisibility);
    };
  }, [onLogout]);

  const handleTriggerNotification = async (text: string, payloadOrExpId?: any) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newToast: ToastNotification = {
      id,
      text,
      timestamp: new Date().toLocaleTimeString()
    };

    setToasts(prev => [newToast, ...prev].slice(0, 4));

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5500);

    const rawExpId = typeof payloadOrExpId === 'string'
      ? payloadOrExpId
      : payloadOrExpId && typeof payloadOrExpId === 'object'
      ? (payloadOrExpId.expedition_id || payloadOrExpId.expId)
      : null;

    const validExpId = isValidUUID(rawExpId) ? rawExpId : null;
    if (!validExpId) return;

    try {
      const authUserId = currentUserIdRef.current;
      if (!authUserId) return;

      const { data: existingLog } = await supabase
        .from('expedition_logs')
        .select('id')
        .eq('user_id', authUserId)
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
        user_id: authUserId,
        expedition_id: validExpId,
        event_type: eventType,
        title: title,
        message: text,
        rewards_looted: rewardsPayload,
        is_read: false
      }]);

      refreshNotificationsRef.current?.();
    } catch (err: any) {
      console.warn('[NOTIFICATIONS] Error al persistir comunicado oficial:', err?.message || err);
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

  useEffect(() => {
    if (!activeFlights.length) return;
    const authUserId = currentUserIdRef.current;
    if (!authUserId) return;

    const nowMs = Date.now();
    const notifiedSet = getNotifiedExpeditionIds(authUserId);

    activeFlights.forEach((exp) => {
      const returnMs = new Date(exp.estimated_return_time).getTime();
      if (nowMs >= returnMs && !notifiedSet.has(exp.id)) {
        addNotifiedExpeditionId(authUserId, exp.id);

        handleTriggerNotification(
          `🎉 ¡EXPEDICIÓN FINALIZADA! La flota ${exp.fleet_name || 'de expedición'} ha llegado a su destino (${exp.sector_name || 'SC'}). Reclama tus recompensas en Expeditions In Flight.`,
          { expId: exp.id, category: 'EXPEDITION', title: 'EXPEDICIÓN FINALIZADA' }
        );
      }
    });
  }, [utcTime, activeFlights]);

  useEffect(() => {
    let profileChannel: any;
    let logsChannel: any;
    let expeditionsChannel: any;
    let isMounted = true;

    const loadUserProfile = async (userId: string) => {
      let { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile) {
        const { data: profileById } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        profile = profileById;
      }

      if (profile && isMounted) {
        if (profile.avatar_url) {
          const validUrl = resolveAvatarUrl(profile.avatar_url);
          setCurrentAvatarUrl(validUrl);
          try { localStorage.setItem(`user_avatar_${userId}`, validUrl); } catch {}
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
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user;
      if (!authUser || !isMounted) return;

      currentUserIdRef.current = authUser.id;

      const savedAvatar = localStorage.getItem(`user_avatar_${authUser.id}`);
      if (savedAvatar) {
        setCurrentAvatarUrl(savedAvatar);
      }

      await loadUserProfile(authUser.id);
      await loadActiveExpeditions(authUser.id);

      const createSafeChannel = async (channelName: string, options: any, callback: () => void) => {
        const existing = supabase.getChannels().find(ch => ch.topic === channelName || ch.topic === `realtime:${channelName}`);
        if (existing) await supabase.removeChannel(existing);
        return supabase.channel(channelName).on('postgres_changes', options, callback).subscribe();
      };

      profileChannel = await createSafeChannel(
        `economy_hud_stream_${authUser.id}`,
        { event: 'UPDATE', schema: 'public', table: 'user_profiles' },
        () => { if (isMounted) loadUserProfile(authUser.id); }
      );

      expeditionsChannel = await createSafeChannel(
        `active_expeditions_stream_${authUser.id}`,
        { event: '*', schema: 'public', table: 'active_expeditions', filter: `user_id=eq.${authUser.id}` },
        () => { if (isMounted) loadActiveExpeditions(authUser.id); }
      );

      logsChannel = await createSafeChannel(
        `expedition_logs_stream_${authUser.id}`,
        { event: 'INSERT', schema: 'public', table: 'expedition_logs', filter: `user_id=eq.${authUser.id}` },
        () => { if (isMounted) refreshNotificationsRef.current?.(); }
      );

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isMounted) {
          loadUserProfile(authUser.id);
          loadActiveExpeditions(authUser.id);
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
    };

    initEngine();

    return () => {
      isMounted = false;
      if (profileChannel) supabase.removeChannel(profileChannel);
      if (logsChannel) supabase.removeChannel(logsChannel);
      if (expeditionsChannel) supabase.removeChannel(expeditionsChannel);
    };
  }, []);

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

      {/* HEADER PRINCIPAL */}
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
          else if (tab === 'MISSION') { 
            // 🔒 Pestaña bloqueada en el Header
            return; 
          }
        }}
        unreadNotificationsCount={unreadCount}
        onOpenNotifications={() => {
          setShowNotificationsModal(true);
          refreshNotifications();
        }}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenProfile={() => { setActiveTab('home'); setActiveWindow('profile'); }}
      />

      {/* BOTONES ACCESO RÁPIDO */}
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

        <button 
          onClick={() => setShowDownloadModal(true)} 
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-black/80 text-cyan-400 border border-cyan-500/40 rounded-lg cursor-pointer hover:border-cyan-400 transition-all shadow-md"
          title="Descargar Cliente Oficial"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
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
                          <div className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
                            <img
                              src={card.imageSrc}
                              alt={card.title}
                              className="w-full h-full object-cover brightness-50 group-hover:scale-110 group-hover:brightness-70 transition-all duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent group-hover:via-cyan-300 transition-colors duration-300 pointer-events-none" />
                          </div>

                          <div
                            onClick={() => {
                              if (isLocked) return;
                              if (card.targetWindow) { setActiveTab("home"); setActiveWindow(card.targetWindow); }
                              else if (card.targetTab) { setActiveTab(card.targetTab); setActiveWindow("home"); }
                            }}
                            className="relative z-10 h-full w-full flex flex-col justify-between p-2 sm:p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[7px] sm:text-[8px] font-mono font-black text-cyan-500/80 tracking-widest uppercase">
                                {sectorLabels[idx]}
                              </span>
                              <span className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-zinc-600' : 'bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(6,182,212,0.8)]'}`} />
                            </div>

                            <div className="mt-auto">
                              <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest leading-tight group-hover:text-cyan-300 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                                {card.title}
                              </h2>
                              <p className="text-[7px] sm:text-[8.5px] font-mono text-zinc-300/90 leading-snug uppercase mt-1 line-clamp-2 drop-shadow-md">
                                {card.description}
                              </p>

                              {!isLocked && (
                                <div className="mt-2 flex items-center gap-1 text-cyan-400 group-hover:text-cyan-200 transition-colors">
                                  <div className="h-[1px] flex-1 bg-cyan-500/40 group-hover:bg-cyan-400/70 transition-colors" />
                                  <span className="text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-widest">{t('hub.access', 'ACCEDER')}</span>
                                  <div className="h-[1px] w-3 bg-cyan-500/40 group-hover:bg-cyan-400/70 transition-colors" />
                                </div>
                              )}
                            </div>
                          </div>

                          {isLocked && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
                              <motion.div
                                initial={{ opacity: 0, scale: 0.75 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="bg-black/90 border border-cyan-500/40 rounded-lg px-3 py-2 flex flex-col items-center gap-1.5 shadow-[0_0_20px_rgba(6,182,212,0.25)] backdrop-blur-md"
                              >
                                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                                <span className="text-[7.5px] sm:text-[8.5px] font-black text-cyan-300 tracking-widest uppercase">{t('hub.coming_soon', 'PRÓXIMAMENTE')}</span>
                              </motion.div>
                            </div>
                          )}
                        </GalaxyFrame>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="h-6 shrink-0 flex justify-between items-center px-1 font-mono text-[8px] sm:text-[8.5px] text-cyan-400/80 uppercase border-t border-cyan-900/30">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
                    {t('hub.status_online', 'ESTADO: SISTEMA EN LÍNEA')}
                  </span>
                  <span className="font-bold tracking-widest text-zinc-400">
                    {t('hub.sector_label', 'SECTOR: 01 // HUB ALPHA')}
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

      {/* POPUP 1: EXPEDITIONS IN FLIGHT */}
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

      {/* POPUP 2: NOTIFICACIONES */}
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

      {/* POPUP 3: AJUSTES */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
        triggerNotification={handleTriggerNotification}
        onOpenTutorial={() => {
          setShowSettingsModal(false);
          setShowTutorial(true);
        }}
      />

      {/* POPUP 4: DESCARGAS */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        triggerNotification={handleTriggerNotification}
      />

      <TutorialOverlay
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      <ChatSystem userAllianceName={user.allianceName} triggerNotification={handleTriggerNotification} />
    </div>
  );
};

export default Homepage;