import React, { useState, useEffect } from 'react';
import { Eye, CornerUpLeft, X, Search, ChevronDown, ArrowLeft, ArrowRight, Home, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validateExpeditionDispatch, FleetAsset } from '../utils/expeditionValidator';

// ─── INTERFACES DE CONTROL DE DATOS CANÓNICOS ───
interface Asset {
  id: string;
  name: string;
  type: string;
  rarity: string;
  collection: string;
  size?: string;
  production?: number;
  engine?: string;
  cargo_capacity?: number;
  speed_boost?: number;
  fleet_space?: number;
  hp?: number;
  shield?: number;
  defense?: number;
  combat_speed?: number;
  travel_speed?: number;
  kinetic_attack?: number;
  laser_attack?: number;
  plasma_attack?: number;
  ionic_attack?: number;
  graviton_attack?: number;
  company?: string;
  series?: string;
  is_nft?: string;
  level?: number;
  exp?: number;
}

interface Fleet {
  id: string;
  name: string;
  total_power_score: number;
  ships: Asset[];
  astrobots: Asset[];
  tools: Asset[];
  consumables: Asset[];
}

interface DiscoveredStar {
  id: string;
  name: string;
  type: string;
  status: 'ALL' | 'EXP' | 'UND' | 'DOM';
  x: number;
  y: number;
}

interface Expedition {
  id: string;
  fleet_name: string;
  sector_name: string;
  galaxy_cluster: string;
  star_cluster?: string;
  progress?: number;
  status: 'LAUNCHED' | 'SUCCESS' | 'FAILED' | 'CLAIMED';
  estimated_return_time: string;
  launch_time: string;
  is_adrift?: boolean;
}

type LeftMenuCategory = 'Fleets' | 'Naves' | 'Estructuras' | 'Tecnologias' | 'Astrobots' | 'Tools' | 'Consumibles';

export const ExpeditionsView: React.FC = () => {
  // Motores de Navegación Global (5 Fases Secuenciales de Hangar)
  const [viewMode, setViewMode] = useState<'CLUSTER_SELECT' | 'GALAXY_SELECT' | 'STARCLUSTER_SELECT' | 'STAR_SELECT' | 'DISPATCH_PANEL'>('CLUSTER_SELECT');
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [selectedGalaxy, setSelectedGalaxy] = useState<string | null>(null);
  const [selectedStarCluster, setSelectedStarCluster] = useState<string | null>(null);
  const [selectedStar, setSelectedStar] = useState<DiscoveredStar | null>(null);
  const [isAdrift, setIsAdrift] = useState(false);

  // Control Dropdown Izquierdo
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [currentLeftCategory, setCurrentLeftCategory] = useState<LeftMenuCategory>('Fleets');

  // Estados de Base de Datos
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);
  const [activeTabRight, setActiveTabRight] = useState<'ALL' | 'FLEETS' | 'SHIPS' | 'ASTROBOTS' | 'TOOLS'>('ALL');
  const [activeExpeditions, setActiveExpeditions] = useState<Expedition[]>([]);
  const [searchPage, setSearchPage] = useState('');
  const [filterStarTab, setFilterStarTab] = useState<'ALL' | 'EXP' | 'UND' | 'DOM'>('ALL');
  const [loading, setLoading] = useState(false);

  // Modales de Inspección Modulares
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [deepAssetItem, setDeepAssetItem] = useState<Asset | null>(null);
  const [activeAssetTab, setActiveAssetTab] = useState<'STATS' | 'SKILLS' | 'MODULES' | 'MAESTERIES'>('STATS');
  const [isStartJourneyOpen, setIsStartJourneyOpen] = useState(false);

  // ─── NUEVOS ESTADOS: EXPEDITIONS IN FLIGHT ───
  const [isFlightsModalOpen, setIsFlightsModalOpen] = useState(false);
  const [activeFlightTab, setActiveFlightTab] = useState<'EXPLORATION' | 'MINING' | 'DOMINATION'>('EXPLORATION');
  const [isRewardSummaryOpen, setIsRewardSummaryOpen] = useState(false);
  const [activeRewardTab, setActiveRewardTab] = useState<'ITEMS' | 'CURRENCIES' | 'LTD_CUR'>('ITEMS');
  const [claimingExpeditionId, setClaimingExpeditionId] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Mocks Estelares de Referencia
  const clusters = [{ id: 1, name: "INARA ALPHA" }, { id: 2, name: "DUST" }, { id: 3, name: "DUST" }, { id: 4, name: "DUST" }];
  const galaxiesData: Record<string, string[]> = { "INARA ALPHA": ["GALAXY FOUR", "GALAXY FIVE"] };
  const starClustersData: Record<string, string[]> = { "GALAXY FOUR": ["STARCLUSTER GOAL", "STARCLUSTER MACHINE", "STARCLUSTER ATTACK"] };
  const discoveredStarsMock: DiscoveredStar[] = [
    { id: '1', name: "STAR YELLOW STAR - USUALLY", type: 'YELLOW', status: 'EXP', x: 75, y: 38 },
    { id: '2', name: "STAR YELLOW STAR - USUALLY", type: 'YELLOW', status: 'EXP', x: 25, y: 45 },
    { id: '3', name: "STAR RED STAR - ONE", type: 'RED', status: 'EXP', x: 40, y: 65 },
    { id: '4', name: "STAR YELLOW STAR - USUALLY", type: 'YELLOW', status: 'EXP', x: 15, y: 20 },
    { id: '5', name: "STAR YELLOW STAR - USUALLY", type: 'YELLOW', status: 'EXP', x: 85, y: 70 },
  ];

  const currentGalaxies = selectedCluster ? galaxiesData[selectedCluster] || ["ALPHA DUST"] : [];
  const currentStarClusters = selectedGalaxy ? starClustersData[selectedGalaxy] || ["STARCLUSTER GOAL"] : [];
  const filteredStars = discoveredStarsMock.filter(s => filterStarTab === 'ALL' || s.status === filterStarTab);
  const leftMenuOptions: LeftMenuCategory[] = ['Fleets', 'Naves', 'Estructuras', 'Tecnologias', 'Astrobots', 'Tools', 'Consumibles'];

  // Filtrado de expediciones activas por pestaña
  const filteredExpeditionsByTab = activeExpeditions.filter(exp => {
    if (activeFlightTab === 'MINING') return exp.status === 'LAUNCHED' && !exp.is_adrift && exp.sector_name.includes('MINE');
    if (activeFlightTab === 'DOMINATION') return exp.status === 'LAUNCHED' && !exp.is_adrift && exp.sector_name.includes('DOMINATE');
    return exp.status === 'LAUNCHED';
  });

  // Breadcrumb dinámico de navegación
  const formatBreadcrumbText = () => {
    const parts: string[] = [];
    if (selectedCluster) parts.push(selectedCluster);
    if (selectedGalaxy) parts.push(selectedGalaxy);
    if (selectedStarCluster) parts.push(selectedStarCluster);
    if (selectedStar) parts.push(selectedStar.name);
    return parts.join(' > ') || 'SELECT CLUSTER';
  };

  // ─── LECTURA INTEGRADA SUPABASE ───
  const syncDatabaseData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: fleetData } = await supabase.from('sasori_fleets').select('*').eq('user_id', user.id);
    if (fleetData) {
      setFleets(fleetData.map((f: any) => ({
        ...f,
        ships: f.ships || [
          { id: 's1', name: "BONES", type: "ship", rarity: "HALLOWEEN", collection: "Halloween 23", size: "Frigate", cargo_capacity: 750, speed_boost: 10, fleet_space: 2, shield: 6000, defense: 80, combat_speed: 36, laser_attack: 5, plasma_attack: 25, kinetic_attack: 0, ionic_attack: 0, graviton_attack: 0 },
          { id: 's2', name: "MALEVOLENT", type: "ship", rarity: "RARE", collection: "Nova", size: "Fighter", cargo_capacity: 150, speed_boost: 5, fleet_space: 1, shield: 2000, defense: 40, combat_speed: 45, laser_attack: 15, plasma_attack: 0, kinetic_attack: 10, ionic_attack: 0, graviton_attack: 0 },
          { id: 's3', name: "MARE OF NIGHT", type: "ship", rarity: "EPIC", collection: "Halloween 23", size: "Frigate", cargo_capacity: 600, speed_boost: 8, fleet_space: 2, shield: 5000, defense: 70, combat_speed: 32, laser_attack: 0, plasma_attack: 20, kinetic_attack: 0, ionic_attack: 15, graviton_attack: 0 }
        ],
        astrobots: f.astrobots || [],
        tools: f.tools || [{ id: 't1', name: "Booster Tool", type: "tool", rarity: "COMMON", collection: "Standard" }],
        consumables: f.consumables || []
      })));
    }

    const { data: expData } = await supabase.from('active_expeditions').select('*').eq('user_id', user.id).eq('status', 'LAUNCHED');
    if (expData) {
      if (expData.length === 0) {
        setActiveExpeditions([
          { id: 'mock-4600', fleet_name: "PRUEBA", sector_name: "STELARBODY FOR STAR YELLOW STAR - OFF", galaxy_cluster: "INARA ALPHA", star_cluster: "STARCLUSTER GOAL", status: 'LAUNCHED', launch_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), estimated_return_time: new Date(Date.now() - 10 * 1000).toISOString(), progress: 100 }
        ]);
      } else {
        setActiveExpeditions(expData.map((e: any) => ({ ...e, progress: e.progress || 0 })));
      }
    }
  };

  useEffect(() => {
    syncDatabaseData();
    const channel = supabase.channel('expeditions_global_stream').on('postgres_changes', { event: '*', schema: 'public', table: 'active_expeditions' }, () => {
      syncDatabaseData();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [viewMode]);

  // Cronómetro de Progreso de Telemetría Dinámica
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveExpeditions(prev => prev.map(exp => {
        if (exp.id === 'mock-4600') return { ...exp, progress: 100 };
        const total = new Date(exp.estimated_return_time).getTime() - new Date(exp.launch_time).getTime();
        const elapsed = Date.now() - new Date(exp.launch_time).getTime();
        const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
        return { ...exp, progress: parseFloat(progress.toFixed(1)) };
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeExpeditions.length]);

  function calculateFleetStats(_fleet: Fleet | null) {
    return { cargo: 780, shield: 6650, hp: 6750, defense: 135, travel_speed: 55, combat_speed: 55.33, speed_boost: 7.5, kinetic: 0, laser: 5, plasma: 25, ionic: 0, graviton: 0, space_occupied: 26, power: 9, total_ships: 3, total_astrobots: 0, total_tools: 1 };
  }
  const fleetStats = calculateFleetStats(selectedFleet);

  // ─── API TRANSACTION: LANZAMIENTO ───
  const executeLaunchTransaction = async () => {
    if (loading) return;
    setLaunchError(null);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión caducada.");

      // ─── EVALUACIÓN DE SALUD CRÍTICA ANTES DEL SALTO ───
      const mappedShips: FleetAsset[] = (selectedFleet?.ships || []).map(s => ({
        id: s.id,
        name: s.name,
        type: 'ship' as const,
        is_nft: s.is_nft === 'true',
        hp: s.hp || 1000,
        max_hp: s.hp || 1000,
        fleet_space: s.fleet_space,
        engine_type: s.engine as FleetAsset['engine_type'],
        is_armed: ((s.kinetic_attack || 0) + (s.laser_attack || 0) + (s.plasma_attack || 0)) > 0
      }));

      mappedShips.forEach(ship => {
        const healthPercentage = ship.hp / ship.max_hp;
        if (healthPercentage < 0.10) {
          if (!ship.is_nft) {
            console.log(`💥 Alerta de colisión: El activo No-NFT ${ship.name} tenía menos del 10% de vida y se ha desintegrado.`);
            // supabase: eliminar nave del inventario del jugador
          } else {
            console.log(`🛰️ El activo Quantum ${ship.name} se ha averiado críticamente. Ha quedado flotando a la deriva en el hiperespacio.`);
            // supabase: actualizar estado de la nave a "LOST_IN_SPACE"
          }
        }
      });

      // ─── VALIDACIÓN DE REGLAS DE NEGOCIO ───
      const mappedTools: FleetAsset[] = (selectedFleet?.tools || []).map(t => ({
        id: t.id, name: t.name, type: 'tool' as const, is_nft: false, hp: 1000, max_hp: 1000
      }));

      const validation = validateExpeditionDispatch(selectedCluster || '', {
        fleet: { ships: mappedShips, astrobots: [], tools: mappedTools },
        completedExpeditionsByGC: {},
        hasStorageDeposits: false,
        activeFlightsCount: activeExpeditions.length
      });

      if (!validation.canLaunch) {
        setLaunchError(validation.reason || 'Validación de despacho fallida.');
        return;
      }

      const duration = 2;
      const payload = {
        user_id: user.id,
        fleet_id: selectedFleet?.id || null,
        fleet_name: selectedFleet?.name || "PRUEBA",
        sector_name: selectedStar ? selectedStar.name : "DEEP SPACE DRIFT",
        galaxy_cluster: selectedCluster || "INARA ALPHA",
        star_cluster: selectedStarCluster || "STARCLUSTER GOAL",
        duration_hours: duration,
        risk_factor: isAdrift ? 0.40 : 0.20,
        is_adrift: isAdrift,
        status: 'LAUNCHED',
        launch_time: new Date().toISOString(),
        estimated_return_time: new Date(Date.now() + duration * 60 * 60 * 1000).toISOString()
      };

      const { error } = await supabase.from('active_expeditions').insert(payload);
      if (error) throw error;

      setIsStartJourneyOpen(false);
      setLaunchError(null);
      setSelectedFleet(null);
      setSelectedStar(null);
      setViewMode('CLUSTER_SELECT');
    } catch (err: any) {
      alert(`Error en lanzamiento hiporespacial: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── CLAIM ENGINE ───
  const handleClaimExpeditionRewards = async (id: string) => {
    setClaimingExpeditionId(id);
    setIsRewardSummaryOpen(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (id !== 'mock-4600') {
        await supabase.from('active_expeditions').update({ status: 'CLAIMED' }).eq('id', id);
      }
      await supabase.rpc('increment_player_resource', { user_uuid: user.id, resource_col: 'metal', increment_amount: 10000 });
      await supabase.rpc('increment_player_resource', { user_uuid: user.id, resource_col: 'crystal', increment_amount: 10000 });
    } catch (err) {
      console.error("Error al asimilar loot:", err);
    }
  };

  const handleAcceptRewardsClose = () => {
    setIsRewardSummaryOpen(false);
    setDeepAssetItem(null);
    setClaimingExpeditionId(null);
    setActiveExpeditions(prev => prev.filter(e => e.id !== claimingExpeditionId));
  };

  return (
    <div className="w-full h-full bg-black text-white font-sans flex flex-col justify-start items-start px-12 pt-6 select-none overflow-hidden relative">

      {/* ─── NAVBAR DE BREADCRUMBS ─── */}
      <div className="w-full flex justify-between items-start mb-4 flex-shrink-0 bg-black">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[17px] font-bold tracking-widest text-white uppercase">EXPLORATION</h1>
          <p className="text-cyan-400 text-[11px] tracking-wide font-medium font-mono">{formatBreadcrumbText()}</p>
        </div>
        <div className="flex items-center gap-3">
          {viewMode !== 'CLUSTER_SELECT' && (
            <button
              onClick={() => {
                if (viewMode === 'DISPATCH_PANEL') setViewMode('STAR_SELECT');
                else if (viewMode === 'STAR_SELECT') { setViewMode('STARCLUSTER_SELECT'); setSelectedStar(null); }
                else if (viewMode === 'STARCLUSTER_SELECT') { setViewMode('GALAXY_SELECT'); setSelectedGalaxy(null); }
                else if (viewMode === 'GALAXY_SELECT') { setViewMode('CLUSTER_SELECT'); setSelectedCluster(null); }
              }}
              className="flex items-center gap-2 px-4 py-0.5 border border-red-600 hover:border-red-500 text-cyan-400 text-[11px] font-bold tracking-widest uppercase rounded-[2px] bg-black cursor-pointer transition-colors"
            >
              <CornerUpLeft className="w-3.5 h-3.5 text-red-500 stroke-[3]" /> BACK
            </button>
          )}
          <button
            onClick={() => setIsFlightsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-0.5 border border-cyan-500/40 text-cyan-400 text-[10px] font-bold tracking-widest uppercase rounded-[2px] bg-black hover:border-cyan-400 cursor-pointer transition-colors"
          >
            <Eye className="w-3 h-3" /> EXPEDITIONS IN FLIGHT
          </button>
        </div>
      </div>

      {/* ─── FASE 1: CLUSTER SELECT ─── */}
      {viewMode === 'CLUSTER_SELECT' && (
        <div className="flex items-center gap-5 mt-2 flex-wrap">
          {clusters.map(c => (
            <div key={c.id} onClick={() => { setSelectedCluster(c.name); setViewMode('GALAXY_SELECT'); }} className="w-[236px] h-[380px] border border-neutral-800 bg-neutral-950 rounded-[2px] flex flex-col items-center pt-10 cursor-pointer hover:border-neutral-700 transition-colors">
              <h2 className="text-[16px] font-bold tracking-widest text-white uppercase">{c.name}</h2>
            </div>
          ))}
        </div>
      )}

      {/* ─── FASE 2: GALAXY SELECT ─── */}
      {viewMode === 'GALAXY_SELECT' && (
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 mt-2">
          {currentGalaxies.map((g, idx) => (
            <div key={idx} onClick={() => { setSelectedGalaxy(g); setViewMode('STARCLUSTER_SELECT'); }} className="aspect-square border border-cyan-500/30 bg-gradient-to-b from-neutral-900/60 to-black hover:border-cyan-400 rounded-[2px] flex items-center justify-center p-4 cursor-pointer transition-colors">
              <span className="text-[12px] font-bold tracking-widest text-white text-center uppercase">{g}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── FASE 3: STARCLUSTER SELECT ─── */}
      {viewMode === 'STARCLUSTER_SELECT' && (
        <div className="flex items-center gap-5 mt-2 flex-wrap">
          {currentStarClusters.map((sc, idx) => (
            <div key={idx} onClick={() => { setSelectedStarCluster(sc); setViewMode('STAR_SELECT'); }} className="w-[236px] h-[380px] border border-cyan-500/30 bg-gradient-to-b from-neutral-900/40 via-neutral-950 to-black rounded-[2px] flex flex-col items-center justify-center p-4 cursor-pointer hover:border-cyan-400 transition-colors">
              <span className="text-[15px] font-bold tracking-widest text-white text-center uppercase leading-tight">{sc}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── FASE 4: STAR SELECT — MAPA DE NEBULOSA ENRIQUECIDO ─── */}
      {viewMode === 'STAR_SELECT' && (
        <div className="w-full flex-1 flex gap-5 overflow-hidden pb-4">

          {/* PANEL IZQUIERDO: LISTA DE ESTRELLAS */}
          <div className="w-[330px] border border-cyan-500/50 bg-neutral-950 flex flex-col justify-between rounded-[2px] flex-shrink-0">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center border-b border-cyan-500/30 p-3 bg-cyan-950/20">
                <div className="w-8 h-8 rounded-full border border-cyan-400/50 flex items-center justify-center overflow-hidden bg-black/50">
                  <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=100')] bg-cover" />
                </div>
                <span className="text-[13px] font-bold tracking-widest text-white uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">DISCOVERED STARS</span>
                <div className="w-8 h-8 border border-neutral-700 rounded-[2px] flex items-center justify-center bg-black/40 relative">
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]" />
                  <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=50" className="w-full h-full object-cover mix-blend-screen" alt="badge" />
                </div>
              </div>

              {/* Tabs de filtrado */}
              <div className="flex justify-center gap-4 py-4 border-b border-cyan-500/20">
                {(['ALL', 'EXP', 'UND', 'DOM'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterStarTab(t)}
                    className={`px-3 py-1 text-[10px] font-black uppercase rounded-[2px] tracking-widest ${filterStarTab === t ? (t === 'EXP' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(34,211,238,0.5)]') : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Lista de estrellas */}
              <div className="p-3 flex flex-col gap-2 max-h-[350px] overflow-y-auto">
                {filteredStars.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStar(s)}
                    className={`p-2 border flex justify-between items-center cursor-pointer transition-colors text-[10px] font-bold font-mono uppercase tracking-wide ${selectedStar?.id === s.id ? 'border-cyan-400 bg-cyan-950/30 text-white' : 'border-cyan-500/30 bg-black text-neutral-300 hover:border-cyan-400/60'}`}
                  >
                    <span>{s.name}</span>
                    <div className="flex gap-2">
                      <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded-[1px] text-[8px] font-black">EXP</span>
                      <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">!</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Paginación */}
            <div className="h-12 border-t border-cyan-500/30 flex justify-between items-center px-6 bg-cyan-950/20">
              <ArrowLeft className="w-5 h-5 text-neutral-400 cursor-pointer hover:text-white" />
              <div className="bg-cyan-400 text-black px-4 py-0.5 font-black text-[12px]">1</div>
              <ArrowRight className="w-5 h-5 text-neutral-400 cursor-pointer hover:text-white" />
            </div>
          </div>

          {/* PANEL DERECHO: MAPA ESPACIAL CON NEBULOSA */}
          <div className="flex-1 border border-cyan-500/50 bg-black rounded-[2px] relative overflow-hidden flex flex-col">

            <div className="w-full flex-1 relative bg-[url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1200')] bg-cover bg-center">
              <div className="absolute inset-0 bg-black/40 mix-blend-overlay" />

              {/* Botón RETURN arriba derecha */}
              <button
                onClick={() => { setSelectedStar(null); setViewMode('STARCLUSTER_SELECT'); }}
                className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 border border-pink-500/50 text-pink-400 bg-black/60 hover:bg-pink-950/40 text-[11px] font-black tracking-widest uppercase rounded-[2px] z-20 transition-colors"
              >
                <X className="w-3.5 h-3.5 stroke-[3]" /> RETURN
              </button>

              {/* Puntos de estrellas sin seleccionar */}
              {discoveredStarsMock.map(s => (
                <div
                  key={s.id}
                  style={{ left: `${s.x}%`, top: `${s.y}%` }}
                  onClick={() => setSelectedStar(s)}
                  className={`absolute w-1.5 h-1.5 rounded-full cursor-pointer transition-all ${selectedStar?.id === s.id ? 'bg-transparent' : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] hover:scale-150'}`}
                />
              ))}

              {/* Estrella seleccionada gigante con efecto planeta */}
              {selectedStar && (
                <div
                  className="absolute flex flex-col items-center justify-center transition-all duration-500 ease-out z-10 pointer-events-none"
                  style={{ left: `${selectedStar.x}%`, top: `${selectedStar.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="w-24 h-24 bg-blue-500 rounded-full shadow-[0_0_60px_rgba(59,130,246,0.8),inset_0_0_20px_rgba(255,255,255,0.8)] relative animate-pulse flex items-center justify-center">
                    <div className="w-full h-full rounded-full border-2 border-dashed border-white/50 animate-spin absolute" style={{ animationDuration: '8s' }} />
                    <div className="w-[90%] h-[90%] rounded-full bg-cyan-300 mix-blend-overlay" />
                  </div>
                  <span className="mt-4 text-white text-[11px] font-sans font-medium tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{selectedStar.name}</span>
                </div>
              )}
            </div>

            {/* Panel inferior: MINE / DOMINATE o NUEVA EXPLORACIÓN */}
            <div className="h-16 border-t border-cyan-500/50 bg-black/80 flex items-center justify-center gap-12 px-8">
              {selectedStar ? (
                <>
                  <button
                    onClick={() => { setIsAdrift(false); setViewMode('DISPATCH_PANEL'); }}
                    className="flex-1 max-w-[200px] py-2 bg-neutral-500/20 border-b-2 border-cyan-400 text-cyan-400 text-[14px] font-black tracking-widest uppercase hover:bg-cyan-950/40 transition-colors"
                  >
                    MINE
                  </button>
                  <button
                    onClick={() => { setIsAdrift(false); setViewMode('DISPATCH_PANEL'); }}
                    className="flex-1 max-w-[200px] py-2 bg-neutral-500/20 border-b-2 border-cyan-400 text-cyan-400 text-[14px] font-black tracking-widest uppercase hover:bg-cyan-950/40 transition-colors"
                  >
                    DOMINATE
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setIsAdrift(true); setViewMode('DISPATCH_PANEL'); }}
                  className="flex-1 max-w-[400px] py-2 bg-neutral-500/20 border border-cyan-500/40 text-cyan-400 text-[12px] font-black tracking-widest uppercase hover:bg-cyan-950/40 transition-colors"
                >
                  NUEVA EXPLORACIÓN ADRIFT
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ─── FASE 5: DISPATCH PANEL ─── */}
      {viewMode === 'DISPATCH_PANEL' && (
        <div className="w-full flex-1 flex gap-6 overflow-hidden pb-2 bg-black">
          <div className="w-[320px] border border-neutral-800 bg-black flex flex-col justify-between rounded-[1px] flex-shrink-0 relative">
            <div>
              <div className="relative w-full">
                <div onClick={() => setIsLeftMenuOpen(!isLeftMenuOpen)} className="p-3 border-b border-neutral-950 flex justify-between items-center bg-neutral-950/40 cursor-pointer">
                  <span className="text-cyan-400 text-[13px] font-bold tracking-widest uppercase">{currentLeftCategory}</span>
                  <ChevronDown className="w-4 h-4 text-neutral-500" />
                </div>
                {isLeftMenuOpen && (
                  <div className="absolute top-full inset-x-0 bg-neutral-950 border border-neutral-800 z-50 flex flex-col">
                    {leftMenuOptions.map(opt => (
                      <button key={opt} onClick={() => { setCurrentLeftCategory(opt); setIsLeftMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-[11px] font-mono uppercase ${currentLeftCategory === opt ? 'text-cyan-400 font-bold bg-neutral-900' : 'text-neutral-400'}`}>{opt}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-3 grid grid-cols-3 gap-2.5 max-h-[350px] overflow-y-auto">
                {currentLeftCategory === 'Fleets' && fleets.map((f, idx) => (
                  <div key={f.id || idx} onClick={() => setSelectedFleet(f)} className={`aspect-square border flex flex-col items-center justify-center p-2 cursor-pointer rounded-[2px] ${selectedFleet?.id === f.id ? 'border-cyan-400 bg-cyan-950/20' : 'border-neutral-900 bg-neutral-950'}`}>
                    <div className="w-10 h-10 rounded-full border border-orange-500/40 flex items-center justify-center text-[10px] text-orange-400 font-mono font-bold">30</div>
                    <span className="text-[9px] font-mono text-neutral-400 mt-2 uppercase truncate w-full text-center">{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 border-t border-neutral-950 bg-neutral-950/20">
              <input type="text" placeholder="Page to search" value={searchPage} onChange={(e) => setSearchPage(e.target.value)} className="w-full bg-black border border-neutral-900 rounded-[2px] text-[10px] pl-3 py-1 text-neutral-400 mb-3" />
              <button onClick={() => setIsStartJourneyOpen(true)} disabled={!selectedFleet} className={`w-full py-3 text-[14px] font-black tracking-widest uppercase border ${selectedFleet ? 'bg-black border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]' : 'bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed'}`}>TRAVEL</button>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            <div className="w-full flex flex-col gap-4">
              <div className="grid grid-cols-5 gap-2 text-[11px] font-bold text-center flex-shrink-0">
                {(['ALL', 'FLEETS', 'SHIPS', 'ASTROBOTS', 'TOOLS'] as const).map(t => (
                  <button key={t} onClick={() => setActiveTabRight(t)} className={`py-1.5 border rounded-[1px] ${activeTabRight === t ? 'border-cyan-500 bg-cyan-950/20 text-white' : 'border-neutral-900 bg-neutral-950 text-neutral-400'}`}>{t}</button>
                ))}
              </div>
              <div className="w-full flex justify-end gap-3 text-[10px] font-bold uppercase flex-shrink-0">
                <button className="px-4 py-1.5 border border-neutral-800 bg-neutral-950 text-neutral-400">CREATE FLEET</button>
                <button className="px-4 py-1.5 border border-neutral-800 bg-neutral-900 text-green-400 font-bold">CLEAN ALL</button>
              </div>
              <div>
                <h3 className="text-cyan-400 font-bold text-[12px] uppercase mb-3">FLEETS</h3>
                {selectedFleet ? (
                  <div className="w-full border border-cyan-500/30 bg-black p-4 flex gap-6 rounded-[2px]">
                    <div className="w-24 h-24 border border-neutral-800 bg-neutral-950 flex items-center justify-center p-2"><img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200" className="w-full h-full object-contain brightness-75" alt="fleet" /></div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3"><span className="text-[15px] font-black uppercase text-white">{selectedFleet.name}</span></div>
                          <div className="grid grid-cols-3 gap-x-8 gap-y-1 text-[10px] font-mono text-neutral-400 mt-2 uppercase">
                            <div>RARITY: <span className="text-white font-bold">N/A</span></div>
                            <div>SPACE: <span className="text-cyan-400 font-bold">26</span></div>
                            <div>SHIPS: <span className="text-white font-bold">3</span></div>
                            <div>COLLECTIONS: <span className="text-white font-bold">FLEET GROUP</span></div>
                            <div>STATUS: <span className="text-cyan-400 font-bold">ACTIVE</span></div>
                            <div>ASTROBOTS: <span className="text-white font-bold">0</span></div>
                          </div>
                        </div>
                        <button onClick={() => setIsFleetModalOpen(true)} className="p-1 border border-neutral-800 text-neutral-400 hover:text-white"><Eye className="w-4 h-4" /></button>
                      </div>
                      <div className="flex items-center gap-4 border-t border-neutral-950 pt-2.5 mt-2">
                        <button onClick={() => setSelectedFleet(null)} className="px-3 py-0.5 bg-red-600 text-white text-[9px] font-black uppercase">UNEQUIP</button>
                        <div className="flex gap-0.5 items-center">{Array(11).fill(0).map((_, i) => <div key={i} className="w-4 h-3.5 bg-green-500" />)}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full py-12 flex items-center justify-center text-neutral-500 border border-neutral-900 bg-neutral-950/40 text-[12px]">You have not selected any Fleet</div>
                )}
              </div>
            </div>

            <div className="w-full border border-cyan-500/30 bg-black rounded-[1px] mt-auto">
              <div className="p-3 grid grid-cols-4 gap-4 text-center border-b border-neutral-950 font-mono text-[11px] font-bold text-neutral-500">
                <div>Expedición Cap: <span className="text-red-500 font-bold">4,3/10</span></div>
                <div>Exploración Limit: <span className="text-white">0/10</span></div>
                <div>Expedición Tot.Lim: <span className="text-white">0/30</span></div>
                <div>Max Sector: <span className="text-white">0/5</span></div>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-2 font-mono text-[11px] text-neutral-400">
                <div className="flex justify-between"><span>Total Health:</span><span className="text-cyan-400">{fleetStats.hp}</span></div>
                <div className="flex justify-between"><span>Defense:</span><span className="text-cyan-400">{fleetStats.defense}</span></div>
                <div className="flex justify-between"><span>Shield:</span><span className="text-cyan-400">{fleetStats.shield}</span></div>
                <div className="flex justify-between"><span>Combat Speed:</span><span className="text-cyan-400">{fleetStats.combat_speed}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: EXPEDITIONS IN FLIGHT ─── */}
      {isFlightsModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-[880px] bg-neutral-950 border border-cyan-500/30 rounded-[2px] flex flex-col overflow-hidden shadow-2xl h-[520px]">

            {/* Pestañas superiores */}
            <div className="w-full grid grid-cols-3 bg-black border-b border-neutral-900 text-center text-[12px] font-black tracking-widest uppercase">
              {(['EXPLORATION', 'MINING', 'DOMINATION'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveFlightTab(tab)}
                  className={`py-3.5 border-r border-neutral-900 transition-colors cursor-pointer ${activeFlightTab === tab ? 'bg-cyan-500 text-black font-black shadow-inner' : 'bg-neutral-900/60 text-neutral-400 hover:text-white'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Cuerpo del radar de vuelos */}
            <div className="flex-1 p-6 flex flex-col justify-start relative bg-black/40 overflow-y-auto">
              {filteredExpeditionsByTab.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <span className="text-[14px] font-bold tracking-[0.25em] text-white font-sans uppercase">
                    THERE ARE NO FLIGHTS IN PROGRESS
                  </span>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-4">
                  <div className="w-full flex justify-end">
                    <button className="px-5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-black tracking-widest uppercase rounded-[2px] transition-colors cursor-pointer">
                      CLAIM ALL
                    </button>
                  </div>
                  {filteredExpeditionsByTab.map((exp) => (
                    <div key={exp.id} className="w-full border border-cyan-500/40 bg-black/60 p-4 rounded-[2px] flex justify-between items-center">
                      <div className="flex flex-col gap-1.5 text-left">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[12px] font-black tracking-wider text-white">EXPEDITION #{exp.id.replace('exp-', '').replace('mock-', '').toUpperCase()} [{exp.fleet_name}]</span>
                          <span className="text-[8px] bg-green-500 text-black font-black px-1 py-0.5 rounded-[1px]">CP</span>
                        </div>
                        <span className="text-[10px] text-green-400 font-mono font-bold tracking-wide uppercase">STELAR: {exp.galaxy_cluster} / {exp.sector_name.replace('STELARBODY FOR ', '')}</span>
                      </div>
                      <button
                        onClick={() => handleClaimExpeditionRewards(exp.id)}
                        className="px-6 py-1.5 bg-green-600 hover:bg-green-500 text-white font-mono text-[12px] font-black tracking-widest uppercase rounded-[1px] cursor-pointer transition-colors"
                      >
                        CLAIM
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Barra inferior */}
            <div className="w-full bg-neutral-950 border-t border-neutral-900 p-3.5 flex justify-between items-center flex-shrink-0">
              {filteredExpeditionsByTab.length === 0 ? (
                <div className="flex gap-2">
                  <button className="px-4 py-1 bg-orange-600 text-white text-[10px] font-bold uppercase rounded-[1px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> REWARDS
                  </button>
                  <button className="px-4 py-1 bg-neutral-800 text-neutral-400 text-[10px] font-bold uppercase rounded-[1px]">RETURN ALL</button>
                </div>
              ) : (
                <button
                  onClick={() => setIsFlightsModalOpen(false)}
                  className="px-5 py-1 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white text-[11px] font-bold tracking-widest uppercase rounded-[1px]"
                >
                  BACK
                </button>
              )}
              <div className="flex items-center gap-4 font-mono text-[11px] font-bold text-neutral-500">
                <span className="cursor-pointer">&lt;</span>
                <span className="bg-cyan-400 text-black px-2 py-0.5 text-[10px] font-black">1</span>
                <span className="cursor-pointer">&gt;</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── SUB-MODAL: RECOMPENSAS ─── */}
      {isRewardSummaryOpen && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
          <div className="w-[520px] bg-neutral-950 border border-cyan-500/40 rounded-[2px] flex flex-col overflow-hidden shadow-2xl h-[360px]">

            <div className="w-full grid grid-cols-3 bg-black border-b border-neutral-900 text-center text-[11px] font-black tracking-widest uppercase">
              <button onClick={() => setActiveRewardTab('ITEMS')} className={`py-3 transition-colors ${activeRewardTab === 'ITEMS' ? 'bg-neutral-900 text-cyan-400' : 'bg-neutral-950 text-neutral-500'}`}>ITEMS (1)</button>
              <button onClick={() => setActiveRewardTab('CURRENCIES')} className={`py-3 transition-colors ${activeRewardTab === 'CURRENCIES' ? 'bg-cyan-500 text-black font-black' : 'bg-neutral-950 text-neutral-500'}`}>CURRENCIES (2)</button>
              <button onClick={() => setActiveRewardTab('LTD_CUR')} className={`py-3 transition-colors ${activeRewardTab === 'LTD_CUR' ? 'bg-neutral-900 text-cyan-400' : 'bg-neutral-950 text-neutral-500'}`}>LTD CUR (0)</button>
            </div>

            <div className="flex-1 p-8 flex items-center justify-center bg-black/20">
              {activeRewardTab === 'ITEMS' && (
                <div className="w-32 h-36 border border-cyan-500/30 bg-neutral-950/80 rounded-[2px] flex flex-col justify-between items-center p-3">
                  <span className="text-[9px] font-black tracking-widest text-neutral-400 font-mono">BLUEPRINT</span>
                  <div className="w-14 h-14 bg-cyan-950/20 border border-cyan-500/20 rounded-[1px] flex items-center justify-center text-cyan-400 text-xl">📄</div>
                  <span className="text-[12px] font-mono font-bold text-white">x1</span>
                </div>
              )}
              {activeRewardTab === 'CURRENCIES' && (
                <div className="flex items-center gap-6">
                  <div className="w-28 h-36 border border-cyan-500/30 bg-neutral-950/80 rounded-[2px] flex flex-col justify-between items-center p-3">
                    <span className="text-[9px] font-black tracking-widest text-neutral-400 font-mono">METAL</span>
                    <div className="w-12 h-12 flex items-center justify-center text-2xl">⚙️</div>
                    <span className="text-[12px] font-sans font-black text-white">10k</span>
                  </div>
                  <div className="w-28 h-36 border border-cyan-500/30 bg-neutral-950/80 rounded-[2px] flex flex-col justify-between items-center p-3">
                    <span className="text-[9px] font-black tracking-widest text-neutral-400 font-mono">CRYSTAL</span>
                    <div className="w-12 h-12 flex items-center justify-center text-2xl">💎</div>
                    <span className="text-[12px] font-sans font-black text-white">10k</span>
                  </div>
                </div>
              )}
              {activeRewardTab === 'LTD_CUR' && (
                <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Silo vacío</span>
              )}
            </div>

            <div className="w-full border-t border-neutral-900 h-14 bg-black">
              <button
                onClick={handleAcceptRewardsClose}
                className="w-full h-full bg-black hover:bg-cyan-950/10 text-cyan-400 font-sans text-[13px] font-black tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Check className="w-4 h-4 stroke-[3]" /> ACCEPT
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL: CONFIRMACIÓN START JOURNEY ─── */}
      {isStartJourneyOpen && selectedFleet && (
        <div className="fixed inset-0 bg-black/75 z-[60] flex items-center justify-center p-4">
          <div className="w-[520px] bg-neutral-950 border border-cyan-500/40 rounded-[2px] flex flex-col overflow-hidden relative">
            <div className="w-full bg-black border-b border-neutral-900 p-4 flex items-center justify-center gap-3">
              <span className="text-[15px] font-black tracking-widest text-cyan-400 uppercase">START JOURNEY</span>
            </div>
            <div className="p-8 flex flex-col items-center justify-center gap-6 text-center">
              <h3 className="text-[17px] font-bold tracking-widest text-white uppercase">DO YOU WANT TO START A NEW JOURNEY?</h3>
              {launchError && (
                <div className="w-full px-4 py-2.5 bg-red-950/60 border border-red-500/50 rounded-[2px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-[10px] font-mono text-red-300 uppercase tracking-wide text-left">{launchError}</span>
                </div>
              )}
              <p className="text-[12px] text-neutral-400 font-mono">
                Find Star: <span className="text-cyan-400">10% - 20%</span>
              </p>
              <p className="text-[11px] text-neutral-500 font-mono">
                Fleets: <span className="text-white font-bold">1</span> &nbsp;|&nbsp; Ships: <span className="text-white font-bold">3</span> &nbsp;|&nbsp; Astrobots: <span className="text-white font-bold">0</span> &nbsp;|&nbsp; Tools: <span className="text-white font-bold">1</span>
              </p>
            </div>
            <div className="grid grid-cols-2 h-14 border-t border-neutral-900 font-sans text-[13px] font-black uppercase">
              <button onClick={executeLaunchTransaction} disabled={loading} className="w-full h-full bg-black text-cyan-400 flex items-center justify-center gap-2 border-r border-neutral-900 hover:bg-cyan-950/10 transition-colors disabled:opacity-50">
                <Check className="w-4 h-4" /> {loading ? 'LAUNCHING...' : 'CONFIRM'}
              </button>
              <button onClick={() => { setIsStartJourneyOpen(false); setLaunchError(null); }} className="w-full h-full bg-black text-cyan-400 flex items-center justify-center gap-2 hover:bg-red-950/10 transition-colors">
                <X className="w-4 h-4" /> CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: INSPECCIÓN DE FLOTA ─── */}
      {isFleetModalOpen && selectedFleet && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-900 p-6 rounded-[2px] max-h-[80vh] overflow-y-auto relative">
            <button onClick={() => setIsFleetModalOpen(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
            <h2 className="text-[16px] font-bold tracking-widest uppercase border-b border-neutral-900 pb-2 mb-4">{selectedFleet.name}</h2>
            {selectedFleet.ships.map((ship, idx) => (
              <div key={idx} className="p-3 border border-neutral-900 bg-black mb-2 flex justify-between items-center">
                <span className="text-[11px] font-bold text-white uppercase">{ship.name || "O.R.T"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};