import React, { useState, useEffect } from 'react';
import {
  User, ShieldCheck, Zap, Swords, Coins, Database, Compass,
  MapPin, BarChart2, CheckCircle2, Lock, ArrowLeft, Layers, Box, Sparkles, X, Edit3, Award
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProfileViewProps {
  onBack?: () => void;
  triggerNotification?: (text: string, e?: any) => void;
  onProfileUpdate?: (updatedFields: { avatar_url?: string; badge_name?: string; badge_image?: string }) => void;
}

// 🌐 LISTA DE AVATARES HABILITADOS POR EL JUEGO
const GAME_AVATARS = [
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares/1.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares/2.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares/3.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares/4.png",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300",
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=300",
  "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=300",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=300"
];

// 🎖️ CATÁLOGO DE INSIGNIAS HABILITADAS POR EL JUEGO
const GAME_BADGES = [
  {
    id: "badge_1",
    name: "INSIGNIA SUPREMA",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600"
  },
  {
    id: "badge_2",
    name: "COMANDANTE DE SECTOR",
    image: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=600"
  },
  {
    id: "badge_3",
    name: "VANGUARDIA GALÁCTICA",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600"
  },
  {
    id: "badge_4",
    name: "ALIANZA DE LA CORONA",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600"
  },
  {
    id: "badge_5",
    name: "NEXUS CÓSMICO",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600"
  },
  {
    id: "badge_6",
    name: "GUARDIÁN DEL VACÍO",
    image: "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600"
  }
];

export const ProfileView: React.FC<ProfileViewProps> = ({ onBack, triggerNotification, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState<'STATS' | 'PVP-PVE' | 'ECONOMY' | 'ACHIEVEMENTS'>('STATS');
  const [loading, setLoading] = useState(true);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);

  // ─── ESTADOS DE DATOS REALES DE SUPABASE ───
  const [profileData, setProfileData] = useState<any>({
    username: 'COMANDANTE',
    avatar_url: '',
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
    badge_name: 'INSIGNIA SUPREMA',
    badge_image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600',
    created_at: ''
  });

  const [expeditionStats, setExpeditionStats] = useState({
    completed: 0,
    active: 0,
    historyByCluster: {} as Record<string, number>
  });

  const [assetCounts, setAssetStats] = useState({
    ships: 0,
    tools: 0,
    fleets: 0,
    discoveredStars: 0
  });

  const [battleLogs, setBattleLogs] = useState<any[]>([]);

  // ─── CONSULTA DE DATOS REALES DESDE SUPABASE ───
  const fetchRealUserData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '9abc737e-9c3d-4349-a976-59af24f51f4d';

      // 1. Cargar Perfil de Usuario
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        setProfileData({
          username: profile.username || profile.name || user?.email?.split('@')[0] || 'PILOTO IMPERIAL',
          avatar_url: profile.avatar_url || profile.avatarUrl || GAME_AVATARS[0],
          level: profile.level || 1,
          ep: profile.exp_points || profile.ep || 0,
          max_ep: (profile.level || 1) * 1000,
          power_score: parseFloat(profile.power_score || 0),
          metal: parseFloat(profile.metal || 0),
          crystal: parseFloat(profile.crystal || 0),
          deuterium: parseFloat(profile.deuterium || 0),
          dark_matter: parseFloat(profile.dark_matter || 0),
          gd_coin: parseFloat(profile.gd_coin || 0),
          quantum_credit: parseFloat(profile.quantum_credit || 0),
          phantom_coin: parseFloat(profile.phantom_coin || 0),
          badge_name: profile.badge_name || GAME_BADGES[0].name,
          badge_image: profile.badge_image || GAME_BADGES[0].image,
          created_at: profile.created_at || new Date().toISOString()
        });
      }

      // 2. Cargar Estadísticas de Expediciones
      const { data: historyRows, count: completedCount } = await supabase
        .from('expedition_history')
        .select('galaxy_cluster', { count: 'exact' })
        .eq('user_id', userId);

      const { count: activeCount } = await supabase
        .from('active_expeditions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'LAUNCHED');

      const clusterMap: Record<string, number> = {};
      (historyRows || []).forEach((row: any) => {
        const gc = row.galaxy_cluster || 'PELA';
        clusterMap[gc] = (clusterMap[gc] || 0) + 1;
      });

      setExpeditionStats({
        completed: completedCount || 0,
        active: activeCount || 0,
        historyByCluster: clusterMap
      });

      // 3. Cargar Activos
      const { count: shipsCount } = await supabase
        .from('user_ships')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: toolsCount } = await supabase
        .from('user_tools')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: fleetsCount } = await supabase
        .from('fleets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: starsCount } = await supabase
        .from('user_discovered_stars')
        .select('id', { count: 'exact', head: true })
        .eq('discoverer_id', userId);

      setAssetStats({
        ships: shipsCount || 0,
        tools: toolsCount || 0,
        fleets: fleetsCount || 0,
        discoveredStars: starsCount || 0
      });

      // 4. Logs
      const { data: logs } = await supabase
        .from('expedition_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (logs) {
        setBattleLogs(logs);
      }

    } catch (err) {
      console.error("Error al cargar perfil real:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealUserData();
  }, []);

  // ─── CAMBIAR AVATAR INSTANTÁNEAMENTE Y PERSISTIR EN SUPABASE ───
  const handleSelectAvatar = async (avatarUrl: string) => {
    // 1. Actualización Inmediata en el estado local de ProfileView
    setProfileData((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
    setIsAvatarModalOpen(false);

    // 2. Notificar inmediatamente a Homepage para actualizar el HEADER en tiempo real
    if (onProfileUpdate) {
      onProfileUpdate({ avatar_url: avatarUrl });
    }

    // 3. Persistir en la base de datos Supabase en segundo plano
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id);
      }

      if (triggerNotification) {
        triggerNotification("✅ AVATAR CAMBIADO Y GUARDADO");
      }
    } catch (err) {
      console.error("Error al guardar avatar en Supabase:", err);
    }
  };

  // ─── CAMBIAR INSIGNIA INSTANTÁNEAMENTE Y PERSISTIR EN SUPABASE ───
  const handleSelectBadge = async (badge: { name: string; image: string }) => {
    // 1. Actualización Inmediata en el estado local de ProfileView
    setProfileData((prev: any) => ({
      ...prev,
      badge_name: badge.name,
      badge_image: badge.image
    }));
    setIsBadgeModalOpen(false);

    // 2. Notificar a Homepage si requiere actualización de estado global
    if (onProfileUpdate) {
      onProfileUpdate({ badge_name: badge.name, badge_image: badge.image });
    }

    // 3. Persistir en la base de datos Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_profiles')
          .update({
            badge_name: badge.name,
            badge_image: badge.image
          })
          .eq('id', user.id);
      }

      if (triggerNotification) {
        triggerNotification(`✅ INSIGNIA CAMBIADA Y GUARDADA: ${badge.name}`);
      }
    } catch (err) {
      console.error("Error al guardar la insignia en Supabase:", err);
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
    <div className="w-full max-w-7xl mx-auto bg-[#080b0e] border border-cyan-500/30 p-4 sm:p-6 rounded-2xl shadow-2xl relative font-mono text-left select-none flex flex-col gap-4 text-white">
      
      {/* ─── BARRA SUPERIOR ─── */}
      <div className="w-full bg-[#05070a] border border-cyan-500/30 p-3 rounded-xl flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-lg transition-colors cursor-pointer"
              title="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex flex-col text-left">
            <h1 className="text-sm font-black tracking-widest text-white uppercase flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              PERFIL DE COMANDO IMPERIAL
            </h1>
          </div>
        </div>
      </div>

      {/* ─── TARJETA PRINCIPAL DE PERFIL ─── */}
      <div className="w-full bg-[#05070a] border border-cyan-500/30 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4 w-full md:w-auto">
          
          {/* AVATAR CLICKABLE PARA CAMBIAR DENTRO DEL JUEGO */}
          <div 
            onClick={() => setIsAvatarModalOpen(true)}
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-black border-2 border-cyan-400/80 hover:border-cyan-300 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.3)] cursor-pointer group transition-all"
            title="Cambiar Avatar"
          >
            {profileData.avatar_url ? (
              <img src={profileData.avatar_url} alt="Avatar" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            ) : (
              <User className="w-8 h-8 text-cyan-400" />
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Edit3 className="w-5 h-5 text-cyan-300" />
            </div>
          </div>

          <div className="flex flex-col text-left gap-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                {profileData.username}
              </h2>
              <span className="text-[8px] font-black bg-cyan-950 border border-cyan-500/60 text-cyan-300 px-2 py-0.5 rounded uppercase">
                LVL {profileData.level}
              </span>
            </div>

            {/* BARRA DE EXPERIENCIA (EP) */}
            <div className="w-full max-w-xs space-y-1">
              <div className="flex justify-between text-[7.5px] text-zinc-400 font-mono">
                <span>PUNTOS DE EXPERIENCIA (EP)</span>
                <span className="text-cyan-400 font-bold">{profileData.ep} / {profileData.max_ep}</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-cyan-950">
                <div className="h-full bg-cyan-400 rounded-full transition-all duration-300" style={{ width: `${epPercentage}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── TARJETA DE INSIGNIA REGISTRADA + BOTÓN AZUL "CAMBIAR" ─── */}
        <div 
          className="relative w-full md:w-64 h-16 rounded-xl border border-cyan-500/50 bg-cover bg-center overflow-hidden flex items-center justify-between p-3 shadow-lg shrink-0 group"
          style={{ backgroundImage: `url('${profileData.badge_image}')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/90" />
          
          <span className="relative z-10 text-[10px] font-black text-cyan-300 uppercase tracking-widest truncate max-w-[140px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {profileData.badge_name}
          </span>

          {/* BOTÓN AZUL CAMBIAR */}
          <button
            onClick={() => setIsBadgeModalOpen(true)}
            className="relative z-10 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border border-cyan-400/80 text-white text-[8px] font-black tracking-widest uppercase rounded shadow-[0_0_8px_rgba(34,211,238,0.4)] active:scale-95 transition-all cursor-pointer"
          >
            CAMBIAR
          </button>
        </div>

      </div>

      {/* ─── PESTAÑAS SUB-MENÚ ─── */}
      <div className="w-full grid grid-cols-4 gap-1.5 bg-black/60 p-1 rounded-lg border border-cyan-950 text-[9px] font-bold text-center uppercase">
        {(['STATS', 'PVP-PVE', 'ECONOMY', 'ACHIEVEMENTS'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 rounded transition-all cursor-pointer border ${
              activeTab === tab
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black shadow-md'
                : 'bg-black/40 text-zinc-400 border-transparent hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── PESTAÑA 1: STATS ─── */}
      {activeTab === 'STATS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#050910] border border-cyan-500/30 p-4 rounded-xl flex flex-col justify-between gap-2 shadow-lg">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">DOMINACIÓN ACTIVA</span>
                <MapPin className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">{assetCounts.discoveredStars}</div>
              <span className="text-[7.5px] text-zinc-500 uppercase">Estrellas / Sectores Descubiertos</span>
            </div>

            <div className="bg-[#050910] border border-cyan-500/30 p-4 rounded-xl flex flex-col justify-between gap-2 shadow-lg">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">EXPEDICIONES</span>
                <Compass className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex justify-between items-baseline font-mono">
                <span className="text-2xl font-black text-white">{expeditionStats.completed}</span>
                <span className="text-[9px] text-amber-400 font-bold">{expeditionStats.active} EN VUELO</span>
              </div>
              <span className="text-[7.5px] text-zinc-500 uppercase">Completadas con éxito</span>
            </div>

            <div className="bg-[#050910] border border-cyan-500/30 p-4 rounded-xl flex flex-col justify-between gap-2 shadow-lg">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">PODER TOTAL</span>
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-cyan-300 font-mono">{profileData.power_score.toLocaleString()} POW</div>
              <span className="text-[7.5px] text-zinc-500 uppercase">Score acumulado de armada</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#05070a] border border-cyan-950 p-3 rounded-xl text-[8.5px] font-mono">
            <div className="flex flex-col p-2 bg-black/40 rounded border border-cyan-950">
              <span className="text-zinc-500 uppercase">Naves en Hangar:</span>
              <span className="text-white font-black text-sm">{assetCounts.ships}</span>
            </div>
            <div className="flex flex-col p-2 bg-black/40 rounded border border-cyan-950">
              <span className="text-zinc-500 uppercase">Herramientas:</span>
              <span className="text-amber-400 font-black text-sm">{assetCounts.tools}</span>
            </div>
            <div className="flex flex-col p-2 bg-black/40 rounded border border-cyan-950">
              <span className="text-zinc-500 uppercase">Flotas Creadas:</span>
              <span className="text-cyan-300 font-black text-sm">{assetCounts.fleets}</span>
            </div>
            <div className="flex flex-col p-2 bg-black/40 rounded border border-cyan-950">
              <span className="text-zinc-500 uppercase">Sectores Mapeados:</span>
              <span className="text-emerald-400 font-black text-sm">{assetCounts.discoveredStars}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 2: PVP - PVE ─── */}
      {activeTab === 'PVP-PVE' && (
        <div className="space-y-3">
          <div className="bg-[#05070a] border border-cyan-950 p-3 rounded-xl text-[9px] uppercase font-bold text-cyan-400 flex justify-between items-center">
            <span>REGISTRO DE OPERACIONES Y MISIONES RECIENTES</span>
            <Swords className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {battleLogs.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 text-[9px] uppercase tracking-widest bg-black/40 border border-cyan-950 rounded-xl">
                NO HAY REGISTROS DE BATALLA O INCIDENTES REPORTADOS
              </div>
            ) : (
              battleLogs.map((log) => (
                <div key={log.id} className="p-3 bg-[#050910] border border-cyan-950 rounded-lg flex justify-between items-center text-[8.5px] font-mono">
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-white uppercase">{log.title || 'MISION COMPLETADA'}</span>
                    <span className="text-zinc-400 text-[7.5px]">{log.message}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-400 font-bold block">{log.damage_sustained ? `-${log.damage_sustained} HP` : 'OK'}</span>
                    <span className="text-zinc-600 text-[7px]">{new Date(log.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 3: ECONOMY ─── */}
      {activeTab === 'ECONOMY' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-[#05070a] border border-cyan-950 p-4 rounded-xl space-y-2.5 text-left">
            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest block border-b border-cyan-950 pb-1">
              RESERVA DE RECURSOS BÁSICOS
            </span>
            <div className="space-y-2 text-[9px] font-mono">
              <div className="flex justify-between items-center p-2 bg-black/50 rounded border border-cyan-950">
                <span className="text-zinc-400 flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-cyan-400" /> METAL:</span>
                <span className="text-cyan-200 font-bold">{profileData.metal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-black/50 rounded border border-purple-950">
                <span className="text-zinc-400 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-purple-400" /> CRISTAL:</span>
                <span className="text-purple-200 font-bold">{profileData.crystal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-black/50 rounded border border-blue-950">
                <span className="text-zinc-400 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-blue-400" /> DEUTERIO:</span>
                <span className="text-blue-200 font-bold">{profileData.deuterium.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-black/50 rounded border border-indigo-950">
                <span className="text-zinc-400 flex items-center gap-1.5"><Box className="w-3.5 h-3.5 text-indigo-400" /> MATERIA OSCURA:</span>
                <span className="text-indigo-300 font-bold">{profileData.dark_matter.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#05070a] border border-cyan-950 p-4 rounded-xl space-y-2.5 text-left">
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block border-b border-amber-950 pb-1">
              SALDO DE MONEDAS Y DIVISAS
            </span>
            <div className="space-y-2 text-[9px] font-mono">
              <div className="flex justify-between items-center p-2 bg-black/50 rounded border border-amber-950">
                <span className="text-zinc-400 flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-amber-400" /> GD COIN:</span>
                <span className="text-amber-300 font-bold">{profileData.gd_coin.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-black/50 rounded border border-cyan-950">
                <span className="text-zinc-400 flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5 text-cyan-400" /> QUANTUM CREDIT:</span>
                <span className="text-cyan-300 font-bold">{profileData.quantum_credit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-black/50 rounded border border-purple-950">
                <span className="text-zinc-400 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-purple-400" /> PHANTOM COIN:</span>
                <span className="text-purple-300 font-bold">{profileData.phantom_coin.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 4: ACHIEVEMENTS ─── */}
      {activeTab === 'ACHIEVEMENTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {realAchievements.map((ach, idx) => (
            <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between text-left font-mono ${
              ach.done ? 'bg-cyan-950/40 border-cyan-500/60' : 'bg-black/60 border-cyan-950 opacity-50'
            }`}>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9.5px] font-black text-white uppercase">{ach.title}</span>
                <span className="text-[7.5px] text-zinc-400 normal-case">{ach.desc}</span>
              </div>
              {ach.done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-zinc-600 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── MODAL 1: SELECCIÓN DE AVATAR DEL JUEGO ─── */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-md bg-[#080b0e] border border-cyan-500/50 rounded-2xl p-5 text-left space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-cyan-950 pb-3">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" /> SELECCIONAR AVATAR IMPERIAL
              </h3>
              <button 
                onClick={() => setIsAvatarModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[8.5px] text-zinc-400 uppercase">
              Selecciona un avatar. La imagen se actualizará automáticamente en todo el centro de mando.
            </p>

            <div className="grid grid-cols-4 gap-3 py-2 max-h-[260px] overflow-y-auto custom-scrollbar">
              {GAME_AVATARS.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectAvatar(url)}
                  className={`w-full aspect-square rounded-xl bg-black border-2 cursor-pointer overflow-hidden transition-all hover:scale-105 ${
                    profileData.avatar_url === url 
                      ? 'border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]' 
                      : 'border-cyan-950 hover:border-cyan-600'
                  }`}
                >
                  <img src={url} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-cyan-950 flex justify-end">
              <button
                onClick={() => setIsAvatarModalOpen(false)}
                className="px-4 py-2 bg-black border border-zinc-800 text-zinc-400 hover:text-white text-[9px] font-bold uppercase rounded-lg cursor-pointer"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: CATÁLOGO DE INSIGNIAS HABILITADAS ─── */}
      {isBadgeModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-lg bg-[#080b0e] border border-cyan-500/50 rounded-2xl p-5 text-left space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-cyan-950 pb-3">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" /> CATÁLOGO DE INSIGNIAS HABILITADAS
              </h3>
              <button 
                onClick={() => setIsBadgeModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[8.5px] text-zinc-400 uppercase">
              Selecciona una insignia activa para guardarla automáticamente en tu tarjeta de comando.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {GAME_BADGES.map((badge) => (
                <div
                  key={badge.id}
                  onClick={() => handleSelectBadge(badge)}
                  className={`relative h-20 rounded-xl border-2 cursor-pointer overflow-hidden flex items-center justify-center p-3 transition-all hover:scale-102 ${
                    profileData.badge_name === badge.name
                      ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]'
                      : 'border-cyan-950 hover:border-cyan-600'
                  }`}
                  style={{ backgroundImage: `url('${badge.image}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/90" />
                  <span className="relative z-10 text-[9.5px] font-black text-cyan-300 uppercase tracking-widest text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {badge.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-cyan-950 flex justify-end">
              <button
                onClick={() => setIsBadgeModalOpen(false)}
                className="px-4 py-2 bg-black border border-zinc-800 text-zinc-400 hover:text-white text-[9px] font-bold uppercase rounded-lg cursor-pointer"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfileView;