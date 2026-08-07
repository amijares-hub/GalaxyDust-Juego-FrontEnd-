import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Shield,
  Swords,
  Award,
  Compass,
  Camera,
  Eye,
  EyeOff,
  Layers,
  Cpu,
  Bot,
  Rocket,
  ShoppingBag,
  TrendingUp,
  Gavel,
  History,
  CheckCircle2,
  Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProfileViewProps {
  onBack: () => void;
  triggerNotification?: (text: string, e?: any) => void;
}

type ProfileTab = 'OVERVIEW' | 'PVP_PVE' | 'ECONOMY' | 'ACHIEVEMENTS';
type EconomyFilter = 'TODOS' | 'COMPRAS' | 'VENTAS' | 'SUBASTADO';
type AuctionSubFilter = 'TODOS' | 'COMPRA' | 'VENTA';

export const ProfileView: React.FC<ProfileViewProps> = ({ onBack, triggerNotification }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [revealCoordinates, setRevealCoordinates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtros y Búsqueda de Log Económico
  const [economyFilter, setEconomyFilter] = useState<EconomyFilter>('TODOS');
  const [auctionSubFilter, setAuctionSubFilter] = useState<AuctionSubFilter>('TODOS');
  const [economySearch, setEconomySearch] = useState<string>('');

  // Estados del Piloto
  const [profileData, setProfileData] = useState({
    username: 'AMIJARES',
    level: 27,
    rankTitle: 'COMANDANTE IMPERIAL',
    faction: 'ALACRAN',
    allianceName: 'SIN ALIANZA',
    allianceRole: 'LÍDER DE ALIANZA',
    currentEP: 48500,
    maxEP: 100000,
    powerScore: 156420,
    totalAssetsCount: 148,
    activeStars: 5,
    expeditionsCount: 142,
    coordinates: 'GC-01 > GALAXY-04 > SC-02 > SYSTEM-09 > PLANET-X',
    winRate: 68,
    totalCombats: 85,
    wins: 58,
    losses: 27,
    kdRatio: 2.15,
    mostUsedShipName: 'PHANTOM MK-IV',
    mostUsedShipImg: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=500&auto=format&fit=crop&q=80',
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400',
    
    // Descubrimientos Galácticos
    discoveries: {
      gc: { discovered: 1, total: 1, pct: 100 },
      galaxies: { discovered: 4, total: 5, pct: 80 },
      starClusters: { discovered: 12, total: 20, pct: 60 },
      starSystems: { discovered: 35, total: 100, pct: 35 },
      planets: { discovered: 90, total: 500, pct: 18 }
    },

    // Desglose de Assets por Categoría
    assetsBreakdown: [
      { id: 'ships', label: 'NAVES', count: 42, icon: Rocket, color: 'text-cyan-400' },
      { id: 'structures', label: 'ESTRUCTURAS', count: 28, icon: Layers, color: 'text-emerald-400' },
      { id: 'tech', label: 'TECNOLOGÍAS', count: 54, icon: Cpu, color: 'text-purple-400' },
      { id: 'astrobots', label: 'ASTROBOTS', count: 24, icon: Bot, color: 'text-amber-400' }
    ],

    // Métrica de Economía / Marketplace
    economyMetrics: {
      totalPurchases: '28 COMPRAS',
      totalPurchasesVal: '42,500 GD',
      totalSales: '19 VENTAS',
      totalSalesVal: '89,200 GD',
      successfulAuctions: '14 ÉXITOS',
      registeredAuctions: '18 SUBASTAS'
    },

    // Log de Actividad Marketplace
    marketplaceLogs: [
      { id: 'TX-901', type: 'COMPRA', asset: 'PACK ACELERADOR DE 8H', commander: 'MERCADO IMPERIAL', amount: '-1,500 GD', date: 'HACE 1 HORA', status: 'COMPLETADO', isAuction: false },
      { id: 'TX-884', type: 'VENTA', asset: 'NAVE DESTROYER CLASS', commander: 'PILOTO_VANGUARD', amount: '+15,000 GD', date: 'HACE 3 HORAS', status: 'COMPLETADO', isAuction: false },
      { id: 'TX-712', type: 'SUBASTA ÉXITO', asset: 'BLUEPRINT CHRONO-IMPERATOR', commander: 'COMANDANTE_KRONOS', amount: '+28,500 GD', date: 'HACE 1 DÍA', status: 'CERRADO', isAuction: true, auctionType: 'VENTA' },
      { id: 'TX-605', type: 'SUBASTA REGISTRADA', asset: 'NÚCLEO INFINITO NIVEL 4', commander: 'SÍNDICO_PRO', amount: '20,000 GD', date: 'HACE 2 DÍAS', status: 'EN CURSO', isAuction: true, auctionType: 'VENTA' },
      { id: 'TX-519', type: 'SUBASTA COMPRA', asset: 'BLUEPRINT TOX-SYNDICATE', commander: 'PILOTO_AETHER', amount: '-250 PH', date: 'HACE 3 DÍAS', status: 'COMPLETADO', isAuction: true, auctionType: 'COMPRA' }
    ]
  });

  // Carga de datos reales desde Supabase
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: dbProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (dbProfile) {
          setProfileData(prev => ({
            ...prev,
            username: dbProfile.name || user.email?.split('@')[0].toUpperCase() || 'AMIJARES',
            powerScore: parseFloat(dbProfile.power_score || prev.powerScore),
            avatarUrl: dbProfile.avatar_url || prev.avatarUrl,
            allianceName: dbProfile.alliance_name || prev.allianceName,
            allianceRole: dbProfile.alliance_role || prev.allianceRole
          }));
        }
      } catch (err) {
        console.error('Error al cargar perfil:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Handler optimizado para subida de avatar a Supabase Storage con upsert y cache-buster
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      if (triggerNotification) triggerNotification("⚠️ EL ARCHIVO EXCEDE 5MB");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const fileExt = file.name.split('.').pop() || 'png';
      const filePath = `${user.id}/avatar.${fileExt}`;

      // 1. Subida directa con upsert: true (sobrescribe automáticamente)
      const { error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true, 
          cacheControl: '0' 
        });

      if (uploadError) throw uploadError;

      // 2. Obtener la URL pública de la imagen
      const { data: { publicUrl } } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Cache-buster para forzar actualización inmediata en la interfaz
      const updatedAvatarUrl = `${publicUrl}?t=${Date.now()}`;

      // 3. Actualizar user_profiles en la base de datos
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: updatedAvatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // 4. Actualizar estado local
      setProfileData(prev => ({ ...prev, avatarUrl: updatedAvatarUrl }));

      if (triggerNotification) triggerNotification("📷 AVATAR ACTUALIZADO Y GUARDADO EN LA BASE DE DATOS");

    } catch (err: any) {
      console.error("Error al procesar el avatar:", err);
      const errorMsg = err?.message || err?.error_description || "Error en el servidor de Storage";
      if (triggerNotification) triggerNotification(`❌ ERROR: ${errorMsg}`);
    }
  };

  // Lógica de Filtrado del Log de Transacciones
  const getFilteredLogs = () => {
    return profileData.marketplaceLogs.filter((log) => {
      if (economyFilter === 'COMPRAS' && (log.type !== 'COMPRA' || log.isAuction)) return false;
      if (economyFilter === 'VENTAS' && (log.type !== 'VENTA' || log.isAuction)) return false;
      if (economyFilter === 'SUBASTADO') {
        if (!log.isAuction) return false;
        if (auctionSubFilter === 'COMPRA' && log.auctionType !== 'COMPRA') return false;
        if (auctionSubFilter === 'VENTA' && log.auctionType !== 'VENTA') return false;
      }

      if (economySearch.trim() !== '') {
        const query = economySearch.toLowerCase();
        const matchesAsset = log.asset.toLowerCase().includes(query);
        const matchesCommander = log.commander.toLowerCase().includes(query);
        if (!matchesAsset && !matchesCommander) return false;
      }

      return true;
    });
  };

  return (
    <div className="w-full h-full bg-black text-white font-sans flex flex-col justify-start items-center p-4 md:p-6 select-none overflow-y-auto">
      
      {/* Input oculto para subida de imagen */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarUpload}
        accept="image/*"
        className="hidden"
      />

      {/* ─── ENCABEZADO SUPERIOR DEL PERFIL ─── */}
      <div className="w-full max-w-7xl flex flex-col gap-4 mb-4">
        
        {/* Banner de Identidad del Comandante */}
        <div className="w-full bg-[#080a0e] border border-cyan-500/30 p-4 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-red-600 shadow-[0_0_10px_#ef4444]" />

          <div className="flex items-center gap-4 z-10">
            {/* Avatar Interactivo con Subida de Imagen */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-16 h-16 rounded border-2 border-cyan-400 bg-neutral-900 overflow-hidden shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.3)] cursor-pointer group"
              title="Haz clic para cambiar tu foto de perfil"
            >
              <img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-cyan-300">
                <Camera className="w-4 h-4 mb-0.5" />
                <span className="text-[6.5px] font-mono uppercase font-bold">SUBIR</span>
              </div>

              <div className="absolute bottom-0 inset-x-0 bg-red-600/90 text-[8px] font-mono font-black text-center text-white py-0.5 uppercase z-10">
                LVL {profileData.level}
              </div>
            </div>

            {/* Nombre y Commander's Total Power */}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-black tracking-widest text-white uppercase font-sans">
                  {profileData.username}
                </h1>
                
                <div className="px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/40 text-amber-300 text-[8.5px] font-mono font-black uppercase rounded flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                  <span>COMMANDER'S TOTAL POWER:</span>
                  <span className="text-emerald-400 font-extrabold">{profileData.powerScore.toLocaleString()} POW</span>
                </div>
              </div>

              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mt-1">
                {profileData.rankTitle} &nbsp;|&nbsp; <span className="text-cyan-400 font-bold">{profileData.allianceRole} - {profileData.allianceName}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Solapas de Navegación del Perfil */}
        <div className="w-full bg-[#05070a] border-b border-cyan-500/30 flex items-center gap-1 overflow-x-auto scrollbar-none font-mono text-[10px] uppercase font-bold tracking-widest">
          {[
            { id: 'OVERVIEW', label: 'OVERVIEW' },
            { id: 'PVP_PVE', label: 'PVP / PVE' },
            { id: 'ECONOMY', label: 'ECONOMY' },
            { id: 'ACHIEVEMENTS', label: 'ACHIEVEMENTS' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ProfileTab)}
              className={`px-6 py-3 transition-all cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300 shadow-[0_4px_12px_rgba(34,211,238,0.15)] font-black'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* ─── CONTENIDO DINÁMICO ─── */}
      <div className="w-full max-w-7xl flex-1">
        <AnimatePresence mode="wait">
          
          {/* 🟢 SOLAPA 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <motion.div
              key="tab-overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4"
            >
              
              {/* 1. CAJA IZQUIERDA: RANK & PROGRESO EP */}
              <div className="lg:col-span-4 bg-[#080a0e] border border-cyan-500/20 p-4 rounded flex flex-col justify-between text-left relative">
                <div>
                  <div className="text-[9px] font-mono text-cyan-400 font-black tracking-widest uppercase mb-3 border-b border-cyan-900/40 pb-1 flex justify-between">
                    <span>RANK & PROGRESO EP</span>
                    <span>LVL {profileData.level}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center py-4 my-2 bg-black/40 border border-cyan-950 rounded">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-red-500/60 flex items-center justify-center bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] mb-2">
                      <span className="text-xl font-black font-sans text-red-400">{profileData.level}</span>
                    </div>
                    <span className="text-[11px] font-black text-white uppercase tracking-widest">{profileData.rankTitle}</span>
                  </div>

                  <div className="space-y-1 my-4 font-mono">
                    <div className="flex justify-between text-[8.5px] uppercase text-zinc-400">
                      <span>EXPERIENCIA DEL COMANDANTE</span>
                      <span className="text-cyan-300 font-bold">{profileData.currentEP.toLocaleString()} / {profileData.maxEP.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-900 border border-cyan-900/50 rounded-full overflow-hidden p-0.5">
                      <div className="h-full bg-gradient-to-r from-cyan-600 to-red-500 rounded-full" style={{ width: `${(profileData.currentEP / profileData.maxEP) * 100}%` }} />
                    </div>
                  </div>

                  <div className="space-y-2.5 mt-4 font-mono text-[8.5px]">
                    <span className="text-zinc-500 tracking-widest uppercase block font-bold border-b border-cyan-950 pb-1">DESCUBRIMIENTOS GALÁCTICOS</span>
                    
                    <div>
                      <div className="flex justify-between text-zinc-300 mb-0.5">
                        <span className="flex items-center gap-1 text-cyan-300 font-bold">GALACTIC CLUSTERS (GC)</span>
                        <span className="text-cyan-400 font-bold">{profileData.discoveries.gc.pct}% ({profileData.discoveries.gc.discovered}/{profileData.discoveries.gc.total})</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-900 rounded overflow-hidden"><div className="h-full bg-cyan-400" style={{ width: `${profileData.discoveries.gc.pct}%` }} /></div>
                    </div>

                    <div>
                      <div className="flex justify-between text-zinc-300 mb-0.5">
                        <span className="flex items-center gap-1 font-bold">GALAXIAS</span>
                        <span className="text-cyan-400 font-bold">{profileData.discoveries.galaxies.pct}% ({profileData.discoveries.galaxies.discovered}/{profileData.discoveries.galaxies.total})</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-900 rounded overflow-hidden"><div className="h-full bg-cyan-500" style={{ width: `${profileData.discoveries.galaxies.pct}%` }} /></div>
                    </div>

                    <div>
                      <div className="flex justify-between text-zinc-300 mb-0.5">
                        <span className="flex items-center gap-1 font-bold">STAR CLUSTERS</span>
                        <span className="text-purple-400 font-bold">{profileData.discoveries.starClusters.pct}% ({profileData.discoveries.starClusters.discovered}/{profileData.discoveries.starClusters.total})</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-900 rounded overflow-hidden"><div className="h-full bg-purple-500" style={{ width: `${profileData.discoveries.starClusters.pct}%` }} /></div>
                    </div>

                    <div>
                      <div className="flex justify-between text-zinc-300 mb-0.5">
                        <span className="flex items-center gap-1 font-bold">STAR SYSTEMS</span>
                        <span className="text-amber-400 font-bold">{profileData.discoveries.starSystems.pct}% ({profileData.discoveries.starSystems.discovered}/{profileData.discoveries.starSystems.total})</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-900 rounded overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${profileData.discoveries.starSystems.pct}%` }} /></div>
                    </div>

                    <div>
                      <div className="flex justify-between text-zinc-300 mb-0.5">
                        <span className="flex items-center gap-1 font-bold">PLANETAS</span>
                        <span className="text-emerald-400 font-bold">{profileData.discoveries.planets.pct}% ({profileData.discoveries.planets.discovered}/{profileData.discoveries.planets.total})</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-900 rounded overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${profileData.discoveries.planets.pct}%` }} /></div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-cyan-950 font-mono text-[8px] text-zinc-500 text-left flex justify-between items-center">
                  <div>
                    <span className="text-cyan-400 font-bold block mb-0.5">COORDENADAS DE C.A.N:</span>
                    <p className={`transition-all font-bold ${revealCoordinates ? 'text-zinc-200 blur-none' : 'text-zinc-600 blur-sm select-none'}`}>
                      {profileData.coordinates}
                    </p>
                  </div>
                  <button
                    onClick={() => setRevealCoordinates(!revealCoordinates)}
                    className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded text-[7.5px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {revealCoordinates ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{revealCoordinates ? 'OCULTAR' : 'REVELAR'}</span>
                  </button>
                </div>
              </div>

              {/* 2. CAJA CENTRAL: MÉTRICAS DE RENDIMIENTO */}
              <div className="lg:col-span-5 bg-[#080a0e] border border-cyan-500/20 p-4 rounded flex flex-col justify-between text-left space-y-4">
                <div>
                  <div className="text-[9px] font-mono text-cyan-400 font-black tracking-widest uppercase mb-3 border-b border-cyan-900/40 pb-1 flex justify-between">
                    <span>MÉTRICAS DE RENDIMIENTO</span>
                    <span>OVERALL ASSETS</span>
                  </div>

                  <div className="text-center py-3 bg-black/40 border border-cyan-950 rounded relative">
                    <span className="text-5xl font-black font-sans text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                      {profileData.totalAssetsCount}
                    </span>
                    <p className="text-[8px] font-mono text-cyan-400 uppercase tracking-widest mt-1 font-bold">
                      TOTAL DE ASSETS ACTUALES
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 font-mono">
                    {profileData.assetsBreakdown.map((item) => {
                      const IconComp = item.icon;
                      return (
                        <div key={item.id} className="bg-black/60 border border-cyan-950 p-2 rounded text-center flex flex-col items-center justify-center">
                          <IconComp className={`w-4 h-4 mb-1 ${item.color}`} />
                          <span className="text-[7px] text-zinc-500 uppercase block font-bold">{item.label}</span>
                          <span className="text-xs font-black text-white mt-0.5">{item.count}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-4 bg-black/40 border border-cyan-950 p-3 rounded mb-3">
                    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-neutral-800" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-red-500" strokeDasharray={`${profileData.winRate}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <span className="absolute text-[10px] font-black font-mono text-white">{profileData.winRate}%</span>
                    </div>
                    <div className="flex flex-col text-left font-mono text-[8.5px]">
                      <span className="text-white font-bold uppercase">PORCENTAJE DE VICTORIAS EN COMBATE</span>
                      <span className="text-zinc-400 mt-0.5">VICTORIAS: <strong className="text-emerald-400">{profileData.wins}</strong> &nbsp;|&nbsp; DERROTAS: <strong className="text-red-400">{profileData.losses}</strong></span>
                      <span className="text-zinc-500 text-[7.5px] mt-1">COMBATES TOTALES: {profileData.totalCombats}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="bg-black/60 border border-cyan-950 p-2 rounded">
                      <span className="text-[7.5px] text-zinc-500 uppercase block font-bold">K/D RATIO</span>
                      <span className="text-sm font-bold text-white">{profileData.kdRatio}</span>
                    </div>
                    <div className="bg-black/60 border border-cyan-950 p-2 rounded">
                      <span className="text-[7.5px] text-zinc-500 uppercase block font-bold">EXPEDICIONES</span>
                      <span className="text-sm font-bold text-cyan-400">{profileData.expeditionsCount}</span>
                    </div>
                    <div className="bg-black/60 border border-cyan-950 p-2 rounded">
                      <span className="text-[7.5px] text-zinc-500 uppercase block font-bold">ESTRELLAS DOM.</span>
                      <span className="text-sm font-bold text-amber-400">{profileData.activeStars}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* 3. CAJA DERECHA: NAVE MÁS USADA & DOG TAGS */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                
                <div className="bg-[#080a0e] border border-cyan-500/20 p-4 rounded flex flex-col items-center justify-between relative min-h-[220px] overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />
                  <img
                    src={profileData.mostUsedShipImg}
                    alt={profileData.mostUsedShipName}
                    className="absolute inset-0 w-full h-full object-cover brightness-75 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="relative z-20 w-full flex justify-between items-center text-[7.5px] font-mono text-cyan-400 uppercase font-bold border-b border-cyan-500/30 pb-1">
                    <span>NAVE MÁS USADA</span>
                    <span className="text-amber-400 font-extrabold">FLAGSHIP</span>
                  </div>
                  <div className="relative z-20 mt-auto text-center font-mono">
                    <span className="text-[9px] bg-black/90 border border-cyan-500/50 text-white px-2.5 py-1 rounded uppercase font-black tracking-widest shadow-md">
                      {profileData.mostUsedShipName}
                    </span>
                  </div>
                </div>

                <div className="bg-[#080a0e] border border-cyan-500/20 p-4 rounded text-left font-mono">
                  <span className="text-[8.5px] text-cyan-400 font-bold uppercase tracking-widest block mb-2 border-b border-cyan-950 pb-1">
                    INSIGNIAS & DOG TAGS
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/60 border border-cyan-900/40 p-2 rounded flex flex-col items-center justify-center text-center">
                      <Award className="w-6 h-6 text-amber-400 mb-1" />
                      <span className="text-[7.5px] text-white font-bold uppercase">{profileData.faction} PRIMUS</span>
                    </div>
                    <div className="bg-black/60 border border-cyan-900/40 p-2 rounded flex flex-col items-center justify-center text-center">
                      <Shield className="w-6 h-6 text-cyan-400 mb-1" />
                      <span className="text-[7.5px] text-white font-bold uppercase">VANGUARD SHIELD</span>
                    </div>
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* 🔴 SOLAPA 2: PVP / PVE */}
          {activeTab === 'PVP_PVE' && (
            <motion.div
              key="tab-pvp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-[#080a0e] border border-cyan-500/20 p-6 rounded text-left font-mono space-y-4"
            >
              <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest border-b border-cyan-900/40 pb-2">
                HISTORIAL DE COMBATES Y REGISTRO DE BATALLAS (PVP / PVE)
              </h3>
              
              <div className="space-y-2">
                {[
                  { id: 'LOG-881', type: 'PVP', target: 'SECTOR ALPHA - STAR Y1', result: 'VICTORIA', date: 'HACE 2 Horas', loot: '+25K METAL' },
                  { id: 'LOG-412', type: 'PVE', target: 'INCURSIÓN ANOMALÍA COLOIDAL', result: 'VICTORIA', date: 'HACE 5 Horas', loot: '+1 BLUEPRINT' },
                  { id: 'LOG-109', type: 'PVP', target: 'DEFENSA DE ESTRELLA O-9', result: 'DERROTA', date: 'HACE 1 Día', loot: '-10K CRISTAL' }
                ].map((log) => (
                  <div key={log.id} className="p-3 bg-black/60 border border-cyan-950 rounded flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${log.result === 'VICTORIA' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                        {log.result}
                      </span>
                      <span className="text-white font-bold">{log.target}</span>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-400 text-[8.5px]">
                      <span>{log.loot}</span>
                      <span>{log.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 🟡 SOLAPA 3: ECONOMY */}
          {activeTab === 'ECONOMY' && (
            <motion.div
              key="tab-economy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-[#080a0e] border border-cyan-500/20 p-6 rounded text-left font-mono space-y-6"
            >
              <div className="flex justify-between items-center border-b border-cyan-900/40 pb-2">
                <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-cyan-400" />
                  RESUMEN FINANCIERO Y ACTIVIDAD EN MARKETPLACE
                </h3>
                <span className="text-[8px] text-zinc-500 uppercase">SINCRO CON INGAME MARKET</span>
              </div>
              
              {/* 4 Cuadros Métricos de Economía */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                
                <div className="bg-black/60 border border-cyan-950 p-4 rounded flex flex-col justify-between items-center relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
                  <div className="flex items-center gap-1.5 text-[8px] text-zinc-400 uppercase mb-2">
                    <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                    <span>TOTAL DE COMPRAS</span>
                  </div>
                  <span className="text-lg font-black text-white">{profileData.economyMetrics.totalPurchases}</span>
                  <span className="text-[8.5px] text-cyan-400 font-bold mt-1">{profileData.economyMetrics.totalPurchasesVal}</span>
                </div>

                <div className="bg-black/60 border border-cyan-950 p-4 rounded flex flex-col justify-between items-center relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center gap-1.5 text-[8px] text-zinc-400 uppercase mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>TOTAL DE VENTAS</span>
                  </div>
                  <span className="text-lg font-black text-white">{profileData.economyMetrics.totalSales}</span>
                  <span className="text-[8.5px] text-emerald-400 font-bold mt-1">{profileData.economyMetrics.totalSalesVal}</span>
                </div>

                <div className="bg-black/60 border border-cyan-950 p-4 rounded flex flex-col justify-between items-center relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center gap-1.5 text-[8px] text-zinc-400 uppercase mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>SUBASTAS CON ÉXITO</span>
                  </div>
                  <span className="text-lg font-black text-white">{profileData.economyMetrics.successfulAuctions}</span>
                  <span className="text-[8.5px] text-amber-400 font-bold mt-1">100% TRANSACCIONADO</span>
                </div>

                <div className="bg-black/60 border border-cyan-950 p-4 rounded flex flex-col justify-between items-center relative overflow-hidden group hover:border-purple-500/40 transition-colors">
                  <div className="flex items-center gap-1.5 text-[8px] text-zinc-400 uppercase mb-2">
                    <Gavel className="w-3.5 h-3.5 text-purple-400" />
                    <span>SUBASTAS REGISTRADAS</span>
                  </div>
                  <span className="text-lg font-black text-white">{profileData.economyMetrics.registeredAuctions}</span>
                  <span className="text-[8.5px] text-purple-400 font-bold mt-1">HISTORIAL JUGADOR</span>
                </div>

              </div>

              {/* ─── LOG DE TRANSMISIONES CON FILTROS Y BUSCADOR ─── */}
              <div className="space-y-3 pt-2">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-cyan-950 pb-2.5">
                  
                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                      <History className="w-3.5 h-3.5 text-cyan-400" />
                      LOG DE COMPRAS, VENTAS Y SUBASTAS REALIZADAS
                    </span>

                    <div className="flex items-center gap-1 bg-black/60 p-0.5 border border-cyan-950 rounded-lg">
                      {(['TODOS', 'COMPRAS', 'VENTAS', 'SUBASTADO'] as EconomyFilter[]).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setEconomyFilter(tab)}
                          className={`px-2.5 py-1 text-[8px] font-mono font-bold uppercase rounded transition-colors cursor-pointer ${
                            economyFilter === tab
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {economyFilter === 'SUBASTADO' && (
                      <div className="flex items-center gap-1 bg-purple-950/30 p-0.5 border border-purple-500/30 rounded-lg animate-fadeIn">
                        <span className="text-[7.5px] text-purple-400 font-mono font-bold px-1.5">MODO:</span>
                        {(['TODOS', 'COMPRA', 'VENTA'] as AuctionSubFilter[]).map((sub) => (
                          <button
                            key={sub}
                            onClick={() => setAuctionSubFilter(sub)}
                            className={`px-2 py-0.5 text-[7.5px] font-mono font-bold uppercase rounded transition-colors cursor-pointer ${
                              auctionSubFilter === sub
                                ? 'bg-purple-600 text-white'
                                : 'text-purple-300 hover:text-white'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative w-full md:w-60 shrink-0">
                    <Search className="absolute left-2.5 top-2 w-3 h-3 text-cyan-500" />
                    <input
                      type="text"
                      placeholder="BUSCAR PILOTO O ASSET..."
                      value={economySearch}
                      onChange={(e) => setEconomySearch(e.target.value)}
                      className="w-full bg-black/80 border border-cyan-950 hover:border-cyan-800 focus:border-cyan-500 rounded pl-8 pr-7 py-1.5 text-[8.5px] font-mono text-cyan-200 placeholder-zinc-600 outline-none uppercase transition-colors"
                    />
                    {economySearch && (
                      <button
                        onClick={() => setEconomySearch('')}
                        className="absolute right-2 top-2 text-zinc-500 hover:text-white text-[9px] font-mono"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                </div>

                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-950">
                  {getFilteredLogs().length === 0 ? (
                    <div className="p-8 text-center text-zinc-600 text-[9px] font-mono uppercase tracking-widest">
                      NO SE ENCONTRARON REGISTROS QUE COINCIDAN CON LOS CRITERIOS
                    </div>
                  ) : (
                    getFilteredLogs().map((log) => (
                      <div key={log.id} className="p-3 bg-black/60 border border-cyan-950 hover:border-cyan-800 rounded flex justify-between items-center text-[9.5px] transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
                            log.type === 'COMPRA' ? 'bg-cyan-950 text-cyan-400 border-cyan-800' :
                            log.type === 'VENTA' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                            log.type === 'SUBASTA ÉXITO' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                            log.type === 'SUBASTA COMPRA' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                            'bg-purple-950 text-purple-400 border-purple-800'
                          }`}>
                            {log.type}
                          </span>
                          <div className="flex flex-col text-left">
                            <span className="text-white font-bold uppercase">{log.asset}</span>
                            <span className="text-[7.5px] text-cyan-500 font-mono">COMANDANTE: {log.commander}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-5 font-mono text-[8.5px]">
                          <span className={`font-bold ${log.amount.startsWith('+') ? 'text-emerald-400' : log.amount.startsWith('-') ? 'text-red-400' : 'text-amber-300'}`}>
                            {log.amount}
                          </span>
                          <span className="text-zinc-500">{log.date}</span>
                          <span className="text-zinc-400 font-bold bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">{log.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>

            </motion.div>
          )}

          {/* 🟣 SOLAPA 4: ACHIEVEMENTS */}
          {activeTab === 'ACHIEVEMENTS' && (
            <motion.div
              key="tab-achievements"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-[#080a0e] border border-cyan-500/20 p-6 rounded text-left font-mono space-y-4"
            >
              <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest border-b border-cyan-900/40 pb-2">
                LOGROS Y RECOMPENSAS LOGRADAS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { title: 'PRIMER SALTO HIPERESPACIAL', desc: 'Completar la primera expedición', status: 'DESBLOQUEADO' },
                  { title: 'DOMINADOR DE SECTORES', desc: 'Conquistar 5 estrellas activas', status: 'DESBLOQUEADO' },
                  { title: 'SEÑOR DE LA GUERRA', desc: 'Destruir 50 naves enemigas', status: 'EN PROGRESO (35/50)' }
                ].map((item, idx) => (
                  <div key={idx} className="bg-black/60 border border-cyan-950 p-3 rounded flex items-center justify-between text-[9px]">
                    <div>
                      <div className="text-white font-bold uppercase">{item.title}</div>
                      <div className="text-zinc-500 text-[8px]">{item.desc}</div>
                    </div>
                    <span className="text-amber-400 font-bold">{item.status}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
};