import React, { useState, useEffect } from 'react';
import {
  Eye, CornerUpLeft, X, Search, ChevronDown, ArrowLeft, ArrowRight,
  Check, AlertCircle, Filter, CheckCheck, Clock, Shield, Compass,
  Gift, Rocket, Pickaxe, Swords, ExternalLink, Lock, Radio, MapPin,
  Plus, Trash2, Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validateExpeditionDispatch, FleetAsset } from '../utils/expeditionValidator';
import { miningService, MiningDrop } from '../services/miningService';

// ─── INTERFACES CANÓNICAS ───
interface Asset {
  id: string;
  name: string;
  type: string;
  rarity: string;
  collection: string;
  size?: string;
  hp?: number;
  shield?: number;
  defense?: number;
  combat_speed?: number;
  image_url?: string;
  fleet_space?: number;
  kinetic_attack?: number;
  laser_attack?: number;
  plasma_attack?: number;
  is_nft?: string;
  engine?: string;
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
  type?: 'EXPLORATION' | 'MINING' | 'DOMINATION';
}

type LeftMenuCategory = 'Fleets' | 'Naves' | 'Astrobots' | 'Tools' | 'Consumibles';
type SelectionStep = 'GC' | 'GAL' | 'SC' | 'SS' | 'PLANETA';

interface ExpeditionsViewProps {
  initialView?: 'selection' | 'flights';
  onBack?: () => void;
  triggerNotification?: (text: string, e?: any) => void;
}

// 🌐 BASE DE DATOS DUAL DE COORDENADAS
const GC_LIST = ["INARA ALPHA", "DUST CLUSTER", "NEBULA PRIME", "VOID CLUSTER"];

const GAL_DATA: Record<string, string[]> = {
  "INARA ALPHA": ["GALAXY FOUR", "GALAXY FIVE", "GALAXY HELIOS"],
  "DUST CLUSTER": ["GALAXY DUST-01", "GALAXY DUST-02"],
  "NEBULA PRIME": ["GALAXY NEBULA-A"],
  "VOID CLUSTER": ["GALAXY VOID-X"]
};

const SC_DATA: Record<string, string[]> = {
  "GALAXY FOUR": ["STARCLUSTER GOAL", "STARCLUSTER MACHINE", "STARCLUSTER ATTACK"],
  "GALAXY FIVE": ["STARCLUSTER PHANTOM", "STARCLUSTER NOVA"],
  "GALAXY HELIOS": ["STARCLUSTER SOLAR"],
  "GALAXY DUST-01": ["STARCLUSTER DUST-ALPHA"]
};

const SS_DATA: Record<string, string[]> = {
  "STARCLUSTER GOAL": ["SISTEMA ALFA-01", "SISTEMA OMEGA-09", "SISTEMA CENTAURI"],
  "STARCLUSTER MACHINE": ["SISTEMA CYBORG-X"],
  "STARCLUSTER ATTACK": ["SISTEMA VANGUARD-01"]
};

const PLANET_DATA: Record<string, DiscoveredStar[]> = {
  "SISTEMA ALFA-01": [
    { id: 'p1', name: "STAR YELLOW STAR - USUALLY", type: 'YELLOW', status: 'EXP', x: 75, y: 38 },
    { id: 'p2', name: "PLANETA TITÁN ROJO", type: 'RED', status: 'EXP', x: 25, y: 45 },
    { id: 'p3', name: "PLANETA ANOMALÍA COLOIDAL", type: 'BLUE', status: 'EXP', x: 50, y: 65 }
  ],
  "SISTEMA OMEGA-09": [
    { id: 'p4', name: "PLANETA OMEGA PRIME", type: 'YELLOW', status: 'EXP', x: 30, y: 30 },
    { id: 'p5', name: "PLANETA GIGANTE GASEOSO", type: 'BLUE', status: 'EXP', x: 80, y: 60 }
  ],
  "SISTEMA CENTAURI": [
    { id: 'p6', name: "PLANETA CENTAURI SECUNDARIO", type: 'YELLOW', status: 'EXP', x: 60, y: 40 }
  ]
};

export const ExpeditionsView: React.FC<ExpeditionsViewProps> = ({
  initialView = 'selection',
  onBack,
  triggerNotification
}) => {
  // ─── DECLARACIÓN DE TODOS LOS HOOKS AL INICIO ───
  const [currentStep, setCurrentStep] = useState<SelectionStep>('GC');
  const [selectedGC, setSelectedGC] = useState<string | null>(null);
  const [selectedGAL, setSelectedGAL] = useState<string | null>(null);
  const [selectedSC, setSelectedSC] = useState<string | null>(null);
  const [selectedSS, setSelectedSS] = useState<string | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<DiscoveredStar | null>(null);

  const [isDispatchPanelActive, setIsDispatchPanelActive] = useState(false);
  const [isAdrift, setIsAdrift] = useState(false);

  // Categorías e Inventario Despacho (Sin 'Estructuras')
  const [currentLeftCategory, setCurrentLeftCategory] = useState<LeftMenuCategory>('Fleets');
  const [inventoryAssets, setInventoryAssets] = useState<Asset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);

  // Estados Supabase y Flotas
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);
  const [activeExpeditions, setActiveExpeditions] = useState<Expedition[]>([]);
  const [loading, setLoading] = useState(false);

  // Modales
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [isStartJourneyOpen, setIsStartJourneyOpen] = useState(false);

  // Modal / Vista Expediciones en Vuelo
  const [isFlightsModalOpen, setIsFlightsModalOpen] = useState(initialView === 'flights');
  const [activeFlightCategory, setActiveFlightCategory] = useState<string>('ALL');
  const [flightSearchQuery, setFlightSearchQuery] = useState('');
  const [isRewardSummaryOpen, setIsRewardSummaryOpen] = useState(false);
  const [activeRewardTab, setActiveRewardTab] = useState<'ITEMS' | 'CURRENCIES' | 'LTD_CUR'>('ITEMS');
  const [claimingExpeditionId, setClaimingExpeditionId] = useState<string | null>(null);
  const [currentRewardDrop, setCurrentRewardDrop] = useState<MiningDrop | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  useEffect(() => {
    setIsFlightsModalOpen(initialView === 'flights');
  }, [initialView]);

  const leftMenuOptions: LeftMenuCategory[] = ['Fleets', 'Naves', 'Astrobots', 'Tools', 'Consumibles'];

  const formatBreadcrumbText = () => {
    const parts = [selectedGC, selectedGAL, selectedSC, selectedSS, selectedPlanet?.name].filter(Boolean);
    return parts.join(' > ') || 'SELECCIONA COORDENADAS';
  };

  // ─── LECTURA INTEGRADA SUPABASE ───
  const syncDatabaseData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    setInventoryAssets([
      { id: 's1', name: "FRAGATA BONES MK-I", type: "Naves", rarity: "HALLOWEEN", collection: "2023", hp: 6000, shield: 1000, image_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200" },
      { id: 's2', name: "CAZADOR MALEVOLENT", type: "Naves", rarity: "RARE", collection: "Nova", hp: 2000, shield: 500, image_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200" },
      { id: 't1', name: "HERRAMIENTA EXTRACTORA OMEGA", type: "Tools", rarity: "EPIC", collection: "Standard", image_url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=200" },
      { id: 'a1', name: "ASTROBOT DE EXTRACCIÓN V4", type: "Astrobots", rarity: "COMMON", collection: "Gen 1", image_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=200" }
    ]);

    if (!user) return;

    const { data: fleetData } = await supabase.from('sasori_fleets').select('*').eq('user_id', user.id);
    if (fleetData) {
      setFleets(fleetData.map((f: any) => ({
        ...f,
        ships: f.ships || [],
        astrobots: f.astrobots || [],
        tools: f.tools || []
      })));
    }

    const { data: expData } = await supabase.from('active_expeditions').select('*').eq('user_id', user.id).eq('status', 'LAUNCHED');
    if (expData) {
      if (expData.length === 0) {
        setActiveExpeditions([
          { id: 'mock-4600', fleet_name: "PRUEBA", sector_name: "STELARBODY FOR STAR YELLOW STAR - OFF", galaxy_cluster: "INARA ALPHA", star_cluster: "STARCLUSTER GOAL", status: 'LAUNCHED', launch_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), estimated_return_time: new Date(Date.now() - 10 * 1000).toISOString(), progress: 100, type: 'EXPLORATION' }
        ]);
      } else {
        setActiveExpeditions(expData.map((e: any) => ({ ...e, progress: e.progress || 0 })));
      }
    }
  };

  useEffect(() => {
    syncDatabaseData();
  }, []);

  // Cronómetro de Progreso
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

  const toggleAssetSelection = (asset: Asset) => {
    if (selectedAssets.find(a => a.id === asset.id)) {
      setSelectedAssets(prev => prev.filter(a => a.id !== asset.id));
    } else {
      setSelectedAssets(prev => [...prev, asset]);
      if (triggerNotification) triggerNotification(`➕ ${asset.name} AÑADIDO A LA MISIÓN`);
    }
  };

  const executeLaunchTransaction = async () => {
    if (loading) return;
    setLaunchError(null);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión caducada.");

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

      const mappedTools: FleetAsset[] = (selectedFleet?.tools || []).map(t => ({
        id: t.id, name: t.name, type: 'tool' as const, is_nft: false, hp: 1000, max_hp: 1000
      }));

      const validation = validateExpeditionDispatch(selectedGC || 'INARA ALPHA', {
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
        sector_name: selectedPlanet ? selectedPlanet.name : "DEEP SPACE DRIFT",
        galaxy_cluster: selectedGC || "INARA ALPHA",
        star_cluster: selectedSC || "STARCLUSTER GOAL",
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
      setSelectedAssets([]);
      setIsDispatchPanelActive(false);
      setCurrentStep('GC');
      setSelectedGC(null);
      setSelectedGAL(null);
      setSelectedSC(null);
      setSelectedSS(null);
      setSelectedPlanet(null);

      if (triggerNotification) triggerNotification("🚀 VIAJE HIPERESPACIAL INICIADO CORRECTAMENTE");
    } catch (err: any) {
      alert(`Error en lanzamiento hiperespacial: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimExpeditionRewards = async (id: string) => {
    setClaimingExpeditionId(id);
    const drop = miningService.calculateMiningDrop();
    setCurrentRewardDrop(drop);
    setIsRewardSummaryOpen(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (id !== 'mock-4600') {
        await supabase.from('active_expeditions').update({ status: 'CLAIMED' }).eq('id', id);
      }
      await supabase.rpc('increment_player_resource', { user_uuid: user.id, resource_col: 'metal', increment_amount: 10000 });
      await supabase.rpc('increment_player_resource', { user_uuid: user.id, resource_col: 'crystal', increment_amount: 10000 });
      
      if (triggerNotification) {
        triggerNotification(`⛏️ EXTRACCIÓN COMPLETADA: Recompensas ${drop.amount} (${drop.name}) añadidas a tu Vault.`);
      }
    } catch (err) {
      console.error("Error al asimilar loot:", err);
    }
  };

  const handleClaimAllExpeditions = async () => {
    const filterList = getFilteredFlights();
    if (filterList.length === 0) return;
    for (const exp of filterList) {
      await handleClaimExpeditionRewards(exp.id);
    }
  };

  const handleAcceptRewardsClose = () => {
    setIsRewardSummaryOpen(false);
    setCurrentRewardDrop(null);
    if (claimingExpeditionId) {
      setActiveExpeditions(prev => prev.filter(e => e.id !== claimingExpeditionId));
      setClaimingExpeditionId(null);
    }
  };

  const handleCloseFlights = () => {
    if (onBack) onBack();
  };

  const getFilteredFlights = () => {
    return activeExpeditions.filter(exp => {
      const expType = exp.type || (exp.sector_name.includes('MINE') ? 'MINING' : exp.sector_name.includes('DOMINATE') ? 'DOMINATION' : 'EXPLORATION');
      if (activeFlightCategory !== 'ALL' && expType !== activeFlightCategory) return false;

      if (flightSearchQuery.trim() !== '') {
        const query = flightSearchQuery.toLowerCase();
        const matchesFleet = exp.fleet_name.toLowerCase().includes(query);
        const matchesSector = exp.sector_name.toLowerCase().includes(query);
        if (!matchesFleet && !matchesSector) return false;
      }

      return exp.status === 'LAUNCHED';
    });
  };

  const handleSelectGC = (gc: string) => {
    setSelectedGC(gc);
    setSelectedGAL(null);
    setSelectedSC(null);
    setSelectedSS(null);
    setSelectedPlanet(null);
    setCurrentStep('GAL');
  };

  const handleSelectGAL = (gal: string) => {
    setSelectedGAL(gal);
    setSelectedSC(null);
    setSelectedSS(null);
    setSelectedPlanet(null);
    setCurrentStep('SC');
  };

  const handleSelectSC = (sc: string) => {
    setSelectedSC(sc);
    setSelectedSS(null);
    setSelectedPlanet(null);
    setCurrentStep('SS');
  };

  const handleSelectSS = (ss: string) => {
    setSelectedSS(ss);
    setSelectedPlanet(null);
    setCurrentStep('PLANETA');
  };

  const handleSelectPlanet = (planet: DiscoveredStar) => {
    setSelectedPlanet(planet);
  };

  const currentGalaxies = selectedGC ? GAL_DATA[selectedGC] || ["GALAXY FOUR", "GALAXY FIVE"] : [];
  const currentStarClusters = selectedGAL ? SC_DATA[selectedGAL] || ["STARCLUSTER GOAL"] : [];
  const currentStarSystems = selectedSC ? SS_DATA[selectedSC] || ["SISTEMA ALFA-01"] : [];
  const currentPlanets = selectedSS ? PLANET_DATA[selectedSS] || PLANET_DATA["SISTEMA ALFA-01"] : [];

  const filteredInventory = inventoryAssets.filter(a => 
    (currentLeftCategory === 'Fleets' ? true : a.type === currentLeftCategory)
  );

  // ─────────────────────────────────────────────────────────────
  // ─── RENDERIZADO EXCLUSIVO INDEPENDIENTE PARA "EXPEDITIONS IN FLIGHT" ───
  // ─────────────────────────────────────────────────────────────
  if (initialView === 'flights') {
    return (
      <div className="w-full max-w-7xl mx-auto bg-[#080b0e] border border-cyan-500/30 p-5 rounded-2xl shadow-2xl relative overflow-hidden font-mono text-left select-none flex flex-col gap-4">
        
        {/* ENCABEZADO SÓLIDO */}
        <div className="w-full bg-[#05070a] border border-cyan-500/30 p-3.5 rounded-xl flex flex-row justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded-lg">
              <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            </div>
            <div className="text-left">
              <span className="text-[7.5px] text-cyan-400 font-bold uppercase tracking-widest block leading-none">
                TELEMETRÍA TÁCTICA DE FLOTAS
              </span>
              <h1 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mt-0.5">
                EXPEDITIONS IN FLIGHT
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClaimAllExpeditions}
              disabled={getFilteredFlights().length === 0}
              className="px-3 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 disabled:opacity-50 text-white text-[8.5px] font-black uppercase rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(234,88,12,0.4)] shrink-0"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>CLAIM ALL</span>
            </button>

            <button
              onClick={handleCloseFlights}
              className="p-1 text-neutral-400 hover:text-white hover:bg-red-950/40 border border-transparent hover:border-red-500/30 rounded-lg transition-colors cursor-pointer"
              title="Cerrar Expediciones en Vuelo"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* CONTENIDO 2 COLUMNAS */}
        <div className="w-full flex flex-col md:flex-row gap-3.5 items-start">
          
          {/* SIDEBAR IZQUIERDO: BÚSQUEDA Y CATEGORÍAS */}
          <div className="w-full md:w-56 shrink-0 bg-[#05070a] border border-cyan-500/20 p-3 rounded-xl flex flex-col gap-2.5">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-cyan-500" />
              <input
                type="text"
                placeholder="BUSCAR FLOTA O SECTOR..."
                value={flightSearchQuery}
                onChange={(e) => setFlightSearchQuery(e.target.value)}
                className="w-full bg-[#0a0f14] border border-cyan-950 rounded-lg pl-7 pr-2.5 py-1.5 text-[8px] text-cyan-200 placeholder-zinc-600 outline-none uppercase font-mono focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="h-[1px] w-full bg-cyan-950/80 my-0.5" />

            <div className="flex flex-col gap-1 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-950">
              {[
                { id: 'ALL', label: 'TODAS LAS FLOTAS', icon: Rocket },
                { id: 'EXPLORATION', label: 'EXPLORATION', icon: Compass },
                { id: 'MINING', label: 'MINING', icon: Pickaxe },
                { id: 'DOMINATION', label: 'DOMINATION', icon: Swords }
              ].map((cat) => {
                const isSelected = activeFlightCategory === cat.id;
                const count = activeExpeditions.filter(e => {
                  const expType = e.type || (e.sector_name.includes('MINE') ? 'MINING' : e.sector_name.includes('DOMINATE') ? 'DOMINATION' : 'EXPLORATION');
                  return cat.id === 'ALL' || expType === cat.id;
                }).length;

                const IconComp = cat.icon;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveFlightCategory(cat.id)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-[8px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center justify-between border ${
                      isSelected
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.2)] font-black'
                        : 'bg-[#0a0f14] text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-[#0e1620]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <IconComp className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </div>
                    <span className={`text-[7.5px] px-1.5 py-0.2 rounded font-black ${
                      isSelected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-black text-zinc-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LADO DERECHO: GRID CATÁLOGO */}
          <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-cyan-950">
            {getFilteredFlights().length === 0 ? (
              <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                THERE ARE NO FLIGHTS IN PROGRESS IN THIS CATEGORY
              </div>
            ) : (
              getFilteredFlights().map((exp) => (
                <div
                  key={exp.id}
                  className="p-3.5 rounded-xl border border-cyan-500/40 bg-[#050910] shadow-[0_0_12px_rgba(6,182,212,0.12)] flex flex-col justify-between gap-2.5 relative group min-h-[140px]"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-black tracking-wider text-white uppercase truncate max-w-[200px]">
                        EXPEDITION #{exp.id.replace('exp-', '').replace('mock-', '').toUpperCase()} [{exp.fleet_name}]
                      </span>
                      <span className="text-[7.5px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black px-1.5 py-0.5 rounded uppercase shrink-0">
                        CP
                      </span>
                    </div>

                    <span className="text-[7.5px] text-zinc-500 font-mono shrink-0">
                      {exp.progress && exp.progress >= 100 ? 'COMPLETADO' : 'EN VUELO'}
                    </span>
                  </div>

                  <div className="flex flex-col text-left font-mono">
                    <span className="text-[9px] text-cyan-300 font-bold uppercase tracking-wide truncate">
                      STELAR: {exp.galaxy_cluster} / {exp.sector_name.replace('STELARBODY FOR ', '')}
                    </span>
                    <span className="text-[7.5px] text-zinc-500 uppercase mt-0.5">
                      TIPO: {exp.type || (exp.sector_name.includes('MINE') ? 'MINING' : exp.sector_name.includes('DOMINATE') ? 'DOMINATION' : 'EXPLORATION')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[7.5px] font-mono text-zinc-400">
                      <span>PROGRESO DE TELEMETRÍA</span>
                      <span className="text-cyan-400 font-bold">{exp.progress || 100}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-cyan-950">
                      <div
                        className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                        style={{ width: `${exp.progress || 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1 mt-auto">
                    <button
                      onClick={() => handleClaimExpeditionRewards(exp.id)}
                      className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black text-[9px] uppercase rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>CLAIM REWARDS</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* FOOTER SÓLIDO */}
        <div className="w-full bg-[#05070a] border border-cyan-500/30 p-2.5 rounded-xl flex justify-between items-center shrink-0">
          <button
            onClick={handleCloseFlights}
            className="px-4 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[8.5px] font-bold tracking-widest uppercase rounded-lg cursor-pointer transition-colors"
          >
            BACK / VOLVER
          </button>
        </div>

        {/* SUB-MODAL RECOMPENSAS */}
        {isRewardSummaryOpen && (
          <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 font-mono">
            <div className="w-[480px] bg-[#080b0e] border border-cyan-500/40 rounded-xl flex flex-col overflow-hidden shadow-2xl h-[320px]">
              <div className="w-full grid grid-cols-3 bg-[#05070a] border-b border-cyan-950 text-center text-[10px] font-black uppercase">
                <button onClick={() => setActiveRewardTab('ITEMS')} className={`py-2.5 ${activeRewardTab === 'ITEMS' ? 'bg-[#0a0f14] text-cyan-400' : 'text-zinc-500'}`}>ITEMS (1)</button>
                <button onClick={() => setActiveRewardTab('CURRENCIES')} className={`py-2.5 ${activeRewardTab === 'CURRENCIES' ? 'bg-cyan-500 text-black font-black' : 'text-zinc-500'}`}>RECURSOS</button>
                <button onClick={() => setActiveRewardTab('LTD_CUR')} className={`py-2.5 ${activeRewardTab === 'LTD_CUR' ? 'bg-[#0a0f14] text-cyan-400' : 'text-zinc-500'}`}>LTD</button>
              </div>
              <div className="flex-1 p-6 flex items-center justify-center bg-black/40">
                {activeRewardTab === 'ITEMS' && (
                  <div className="w-36 h-36 border border-cyan-500/40 bg-[#05070a] rounded-xl flex flex-col justify-between items-center p-3 text-center">
                    <span className="text-[8.5px] font-black text-cyan-400 uppercase">{currentRewardDrop ? currentRewardDrop.rarity : 'RARE'}</span>
                    <div className="text-3xl">{currentRewardDrop ? currentRewardDrop.icon : '📄'}</div>
                    <span className="text-[9px] font-bold text-white uppercase truncate">{currentRewardDrop ? currentRewardDrop.name : 'BLUEPRINT'}</span>
                  </div>
                )}
              </div>
              <button onClick={handleAcceptRewardsClose} className="w-full py-2.5 bg-cyan-950 hover:bg-cyan-900 border-t border-cyan-950 text-cyan-300 text-[11px] font-black uppercase cursor-pointer">ACCEPT</button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ─── RENDERIZADO REGULAR: SELECCIÓN DE COORDENADAS Y MAPA ───
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-7xl mx-auto bg-[#080b0e] border border-cyan-500/30 p-5 rounded-2xl shadow-2xl relative overflow-hidden font-mono text-left select-none flex flex-col gap-3 min-h-[580px]">

      {/* ─── NAVBAR SUPERIOR DE EXPLORACIÓN SÓLIDO ─── */}
      <div className="w-full bg-[#05070a] border border-cyan-500/30 p-3 rounded-xl flex justify-between items-center shrink-0">
        <div className="flex flex-col gap-0.5 text-left">
          <h1 className="text-sm font-black tracking-widest text-white uppercase flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            EXPLORATION TELEMETRY
          </h1>
          <p className="text-cyan-400 text-[9.5px] tracking-wide font-bold uppercase leading-none">{formatBreadcrumbText()}</p>
        </div>

        {isDispatchPanelActive && (
          <button
            onClick={() => setIsDispatchPanelActive(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-[9px] font-bold tracking-widest uppercase rounded-lg bg-cyan-950/80 transition-colors cursor-pointer"
          >
            <CornerUpLeft className="w-3.5 h-3.5 text-cyan-400" /> RETORNAR A MAPA
          </button>
        )}
      </div>

      {/* ─── VISTA 1: SELECCIÓN DE COORDENADAS Y MAPA ESTELAR ─── */}
      {!isDispatchPanelActive ? (
        <div className="w-full flex-1 flex flex-col md:flex-row gap-3.5 overflow-hidden items-stretch">

          {/* ─── 1. SIDEBAR IZQUIERDO ─── */}
          <div className="w-full md:w-[300px] shrink-0 border border-cyan-500/20 bg-[#05070a] rounded-xl p-3 flex flex-col justify-between shadow-2xl h-[480px]">
            <div className="flex flex-col gap-2">
              
              <div className="flex items-center gap-2 border-b border-cyan-950 pb-2 text-left">
                <MapPin className="w-4 h-4 text-cyan-400 animate-bounce" />
                <span className="text-[11px] font-black tracking-widest text-white uppercase">
                  SELECCIONA A DÓNDE IR
                </span>
              </div>

              {/* Botonera de Pasos */}
              <div className="grid grid-cols-5 gap-1 bg-black/60 p-1 rounded-lg border border-cyan-950 text-[8.5px] font-bold text-center uppercase">
                {([
                  { id: 'GC', label: 'GC', isUnlocked: true },
                  { id: 'GAL', label: 'GAL', isUnlocked: selectedGC !== null },
                  { id: 'SC', label: 'SC', isUnlocked: selectedGAL !== null },
                  { id: 'SS', label: 'SS', isUnlocked: selectedSC !== null },
                  { id: 'PLANETA', label: 'PLANETA', isUnlocked: selectedSS !== null }
                ] as const).map((tab) => {
                  const isActive = currentStep === tab.id;
                  const isUnlocked = tab.isUnlocked;

                  return (
                    <button
                      key={tab.id}
                      disabled={!isUnlocked}
                      onClick={() => setCurrentStep(tab.id as SelectionStep)}
                      className={`py-1.5 rounded transition-all cursor-pointer flex items-center justify-center gap-0.5 border ${
                        isActive
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                          : isUnlocked
                          ? 'bg-black/40 text-zinc-400 border-transparent hover:text-white'
                          : 'bg-black/20 text-zinc-700 border-transparent cursor-not-allowed'
                      }`}
                    >
                      {!isUnlocked && <Lock className="w-2.5 h-2.5 text-zinc-700" />}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-paso Activo */}
              <div className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest text-left px-1">
                {currentStep === 'GC' && '1. SELECCIONA CLUSTER GALÁCTICO (GC)'}
                {currentStep === 'GAL' && '2. SELECCIONA GALAXIA (GAL)'}
                {currentStep === 'SC' && '3. SELECCIONA CÚMULO ESTELAR (SC)'}
                {currentStep === 'SS' && '4. SELECCIONA SISTEMA ESTELAR (SS)'}
                {currentStep === 'PLANETA' && '5. SELECCIONA PLANETA DE DESTINO'}
              </div>

              {/* Lista Dinámica */}
              <div className="p-1 flex flex-col gap-1.5 max-h-[310px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-950">
                {currentStep === 'GC' && GC_LIST.map((gc) => (
                  <button
                    key={gc}
                    onClick={() => handleSelectGC(gc)}
                    className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase transition-all flex items-center justify-between cursor-pointer ${
                      selectedGC === gc
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-[#0a0f14] text-zinc-300 border-cyan-950 hover:border-cyan-800'
                    }`}
                  >
                    <span>{gc}</span>
                    <span className="text-[7.5px] bg-cyan-950 border border-cyan-800 text-cyan-400 px-1.5 py-0.5 rounded font-black">GC</span>
                  </button>
                ))}

                {currentStep === 'GAL' && currentGalaxies.map((gal) => (
                  <button
                    key={gal}
                    onClick={() => handleSelectGAL(gal)}
                    className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase transition-all flex items-center justify-between cursor-pointer ${
                      selectedGAL === gal
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-[#0a0f14] text-zinc-300 border-cyan-950 hover:border-cyan-800'
                    }`}
                  >
                    <span>{gal}</span>
                    <span className="text-[7.5px] bg-cyan-950 border border-cyan-800 text-cyan-400 px-1.5 py-0.5 rounded font-black">GAL</span>
                  </button>
                ))}

                {currentStep === 'SC' && currentStarClusters.map((sc) => (
                  <button
                    key={sc}
                    onClick={() => handleSelectSC(sc)}
                    className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase transition-all flex items-center justify-between cursor-pointer ${
                      selectedSC === sc
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-[#0a0f14] text-zinc-300 border-cyan-950 hover:border-cyan-800'
                    }`}
                  >
                    <span>{sc}</span>
                    <span className="text-[7.5px] bg-cyan-950 border border-cyan-800 text-cyan-400 px-1.5 py-0.5 rounded font-black">SC</span>
                  </button>
                ))}

                {currentStep === 'SS' && currentStarSystems.map((ss) => (
                  <button
                    key={ss}
                    onClick={() => handleSelectSS(ss)}
                    className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase transition-all flex items-center justify-between cursor-pointer ${
                      selectedSS === ss
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-[#0a0f14] text-zinc-300 border-cyan-950 hover:border-cyan-800'
                    }`}
                  >
                    <span>{ss}</span>
                    <span className="text-[7.5px] bg-cyan-950 border border-cyan-800 text-cyan-400 px-1.5 py-0.5 rounded font-black">SS</span>
                  </button>
                ))}

                {currentStep === 'PLANETA' && currentPlanets.map((planet) => (
                  <button
                    key={planet.id}
                    onClick={() => handleSelectPlanet(planet)}
                    className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase transition-all flex items-center justify-between cursor-pointer ${
                      selectedPlanet?.id === planet.id
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-[#0a0f14] text-zinc-300 border-cyan-950 hover:border-cyan-800'
                    }`}
                  >
                    <span className="truncate max-w-[190px]">{planet.name}</span>
                    <span className="text-[7.5px] bg-blue-950 border border-blue-800 text-blue-300 px-1.5 py-0.5 rounded font-black">EXP</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2 border-t border-cyan-950 bg-black/60 rounded-lg flex justify-between items-center text-[8.5px] text-zinc-500 font-bold uppercase">
              <span>RUTA:</span>
              <span className="text-cyan-400 font-mono font-bold truncate max-w-[200px]">
                {selectedGC || '...'} {selectedGAL ? `> ${selectedGAL}` : ''} {selectedSC ? `> ${selectedSC}` : ''}
              </span>
            </div>
          </div>

          {/* ─── 2. PANEL DERECHO: MAPA ESTELAR SÓLIDO O STANDBY ─── */}
          <div className="flex-1 border border-cyan-500/30 bg-[#05070a] rounded-xl relative overflow-hidden flex flex-col justify-between shadow-2xl h-[480px]">
            {currentStep !== 'PLANETA' ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center relative bg-[url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1200')] bg-cover bg-center">
                <div className="absolute inset-0 bg-[#05070a]/90" />
                
                <div className="relative z-10 flex flex-col items-center gap-4 max-w-md">
                  <div className="w-20 h-20 rounded-full border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center animate-pulse">
                    <Compass className="w-10 h-10 text-cyan-400 animate-spin-slow" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-cyan-400 font-bold tracking-widest uppercase">
                      TELEMETRÍA ESTELAR EN STANDBY
                    </span>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      SELECCIONA HASTA LLEGAR AL PASO PLANETA
                    </h3>
                  </div>

                  <p className="text-[9.5px] text-zinc-400 font-sans leading-relaxed">
                    Completa la selección de coordenadas en el panel izquierdo para desplegar el mapa estelar y habilitar los vectores de expedición.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-full flex-1 relative bg-[url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1200')] bg-cover bg-center">
                  <div className="absolute inset-0 bg-black/50 mix-blend-overlay" />

                  {currentPlanets.map(planet => (
                    <div
                      key={planet.id}
                      style={{ left: `${planet.x}%`, top: `${planet.y}%` }}
                      onClick={() => setSelectedPlanet(planet)}
                      className={`absolute w-3 h-3 rounded-full cursor-pointer transition-all transform -translate-x-1/2 -translate-y-1/2 ${
                        selectedPlanet?.id === planet.id
                          ? 'bg-cyan-300 ring-4 ring-cyan-500/50 scale-125 shadow-[0_0_15px_#22d3ee]'
                          : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] hover:scale-150'
                      }`}
                    />
                  ))}

                  {selectedPlanet && (
                    <div
                      className="absolute flex flex-col items-center justify-center transition-all duration-500 ease-out z-10 pointer-events-none"
                      style={{ left: `${selectedPlanet.x}%`, top: `${selectedPlanet.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className="w-20 h-20 bg-blue-500/30 rounded-full shadow-[0_0_40px_rgba(59,130,246,0.8)] relative animate-pulse flex items-center justify-center border border-cyan-400/50">
                        <div className="w-[85%] h-[85%] rounded-full bg-cyan-300/40 mix-blend-overlay" />
                      </div>
                      <span className="mt-2 text-white text-[10px] font-bold tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
                        {selectedPlanet.name}
                      </span>
                    </div>
                  )}
                </div>

                <div className="h-16 border-t border-cyan-500/30 bg-[#05070a] flex items-center justify-center gap-6 px-6 shrink-0">
                  {selectedPlanet ? (
                    <>
                      <button
                        onClick={() => { setIsAdrift(false); setIsDispatchPanelActive(true); }}
                        className="flex-1 max-w-[180px] py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-[11px] font-black tracking-widest uppercase transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)] rounded-lg"
                      >
                        MINE
                      </button>
                      <button
                        onClick={() => { setIsAdrift(false); setIsDispatchPanelActive(true); }}
                        className="flex-1 max-w-[180px] py-2 bg-purple-950 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-[11px] font-black tracking-widest uppercase transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.2)] rounded-lg"
                      >
                        DOMINATE
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setIsAdrift(true); setIsDispatchPanelActive(true); }}
                      className="flex-1 max-w-[320px] py-2 bg-black/80 hover:bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[10.5px] font-black tracking-widest uppercase transition-all cursor-pointer rounded-lg"
                    >
                      NUEVA EXPLORACIÓN ADRIFT
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      ) : (
        /* ─── VISTA 2: DISPATCH PANEL SÓLIDO ─── */
        <div className="w-full flex-1 flex flex-col md:flex-row gap-3.5 overflow-hidden h-[480px]">
          
          {/* SIDEBAR IZQUIERDO SÓLIDO */}
          <div className="w-full md:w-[260px] border border-cyan-500/20 bg-[#05070a] rounded-xl shrink-0 p-3 flex flex-col justify-between h-full">
            <div className="flex flex-col gap-1.5">
              {leftMenuOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setCurrentLeftCategory(opt as LeftMenuCategory)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[9.5px] font-mono font-bold uppercase transition-all border cursor-pointer ${
                    currentLeftCategory === opt 
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-lg font-black' 
                      : 'bg-[#0a0f14] text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-[#0e1620]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                if (selectedAssets.length === 0 && !selectedFleet) {
                  if (triggerNotification) triggerNotification("⚠️ DEBES SELECCIONAR AL MENOS UN ACTIVO O FLOTA");
                  return;
                }
                setIsStartJourneyOpen(true);
              }}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-black text-[11px] uppercase rounded-lg border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer mt-auto"
            >
              TRAVEL / INICIAR
            </button>
          </div>

          {/* CONTENIDO DERECHO SÓLIDO */}
          <div className="flex-1 border border-cyan-500/20 bg-[#05070a] p-3 rounded-xl flex flex-col justify-between gap-3 h-full overflow-hidden">
            
            {/* 1. BROWSER DE INVENTARIO */}
            <div className="flex flex-col gap-1.5 flex-1 min-h-0">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-950 max-h-[220px]">
                {filteredInventory.map(asset => {
                  const isSelected = selectedAssets.some(a => a.id === asset.id);
                  return (
                    <div 
                      key={asset.id}
                      onClick={() => toggleAssetSelection(asset)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer group flex items-center gap-2.5 ${
                        isSelected ? 'bg-cyan-950/60 border-cyan-400 opacity-60' : 'bg-[#050910] border-cyan-950 hover:border-cyan-500'
                      }`}
                    >
                      <div className="w-9 h-9 bg-black rounded border border-cyan-950 shrink-0 overflow-hidden">
                        <img src={asset.image_url} className="w-full h-full object-cover brightness-75" alt="" />
                      </div>
                      <div className="flex flex-col text-left overflow-hidden">
                        <span className="text-[8.5px] font-black text-white truncate">{asset.name}</span>
                        <span className="text-[7px] text-cyan-400 font-bold uppercase">{asset.rarity}</span>
                      </div>
                      {isSelected ? <Lock className="ml-auto w-3.5 h-3.5 text-cyan-400" /> : <Plus className="ml-auto w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. FLOTA / ASSETS SELECCIONADOS */}
            <div className="flex flex-col gap-1.5 flex-1 min-h-[160px]">
              <div className="flex-1 border border-cyan-950 bg-[#020305] rounded-lg p-2.5 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-950">
                {selectedAssets.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[9.5px] uppercase tracking-widest font-bold">
                    SISTEMA LISTO // SELECCIONA ACTIVOS DEL PANEL SUPERIOR
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedAssets.map(asset => (
                      <div key={asset.id} className="flex items-center gap-2.5 p-2 bg-[#050910] border border-cyan-500/30 rounded-lg">
                        <div className="w-7 h-7 rounded bg-black border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0">
                          <Rocket className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col text-left overflow-hidden">
                          <span className="text-[8.5px] font-black text-white uppercase truncate">{asset.name}</span>
                          <span className="text-[6.5px] text-zinc-500 uppercase">TELEMETRÍA OK // 100%</span>
                        </div>
                        <button
                          onClick={() => toggleAssetSelection(asset)}
                          className="ml-auto p-1 hover:bg-red-950 rounded text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* BARRA DE ESTADÍSTICAS */}
            <div className="w-full border-t border-cyan-950 pt-2 grid grid-cols-4 gap-2 text-[8.5px] font-bold text-zinc-500 uppercase shrink-0">
              <div className="flex justify-between"><span>POWER:</span><span className="text-cyan-400 font-black">12.5k</span></div>
              <div className="flex justify-between"><span>HEALTH:</span><span className="text-cyan-400 font-black">8.2k</span></div>
              <div className="flex justify-between"><span>SHIELD:</span><span className="text-cyan-400 font-black">15.0k</span></div>
              <div className="flex justify-between"><span>SPEED:</span><span className="text-cyan-400 font-black">75.0</span></div>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL DE EXPEDICIONES EN FLIGHT ─── */}
      {isFlightsModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-5xl bg-[#080b0e] border border-cyan-500/40 rounded-xl shadow-2xl flex flex-col overflow-hidden text-left max-h-[90vh]">
            <div className="w-full bg-[#05070a] border-b border-cyan-500/30 p-3 flex justify-between items-center gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                <h1 className="text-sm font-black text-white uppercase tracking-widest">EXPEDITIONS IN FLIGHT</h1>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleClaimAllExpeditions} disabled={getFilteredFlights().length === 0} className="px-3 py-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 disabled:opacity-50 text-white text-[8.5px] font-black uppercase rounded shadow-lg cursor-pointer">
                  CLAIM ALL
                </button>
                <button onClick={handleCloseFlights} className="p-1 text-zinc-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="w-full flex flex-col md:flex-row gap-3 p-3 overflow-hidden">
              <div className="w-full md:w-56 shrink-0 bg-[#05070a] border border-cyan-500/20 p-2.5 rounded-xl flex flex-col gap-2">
                <div className="relative w-full">
                  <Search className="absolute left-2 top-2 w-3 h-3 text-cyan-500" />
                  <input type="text" placeholder="BUSCAR FLOTA..." value={flightSearchQuery} onChange={(e) => setFlightSearchQuery(e.target.value)} className="w-full bg-black border border-cyan-950 rounded pl-7 pr-2 py-1 text-[8px] text-cyan-200 outline-none uppercase" />
                </div>
                <div className="flex flex-col gap-1">
                  {['ALL', 'EXPLORATION', 'MINING', 'DOMINATION'].map((cat) => (
                    <button key={cat} onClick={() => setActiveFlightCategory(cat)} className={`w-full px-2 py-1.5 rounded text-[8px] font-bold uppercase transition-colors text-left border ${activeFlightCategory === cat ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-zinc-500 border-transparent hover:text-white'}`}>{cat}</button>
                  ))}
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-2.5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-950">
                {getFilteredFlights().map((exp) => (
                  <div key={exp.id} className="p-3 bg-[#050910] border border-cyan-500/40 rounded-xl flex flex-col justify-between gap-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-white uppercase">{exp.fleet_name}</span>
                      <span className="text-[7.5px] bg-cyan-950 border border-cyan-800 text-cyan-300 px-1.5 py-0.5 rounded font-black">{exp.progress || 100}%</span>
                    </div>
                    <span className="text-[8.5px] text-cyan-400 uppercase truncate">{exp.galaxy_cluster} / {exp.sector_name}</span>
                    <button onClick={() => handleClaimExpeditionRewards(exp.id)} className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black text-[8.5px] uppercase rounded shadow cursor-pointer">
                      CLAIM REWARDS
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SUB-MODAL RECOMPENSAS ─── */}
      {isRewardSummaryOpen && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 font-mono">
          <div className="w-[480px] bg-[#080b0e] border border-cyan-500/40 rounded-xl flex flex-col overflow-hidden shadow-2xl h-[320px]">
            <div className="w-full grid grid-cols-3 bg-[#05070a] border-b border-cyan-950 text-center text-[10px] font-black uppercase">
              <button onClick={() => setActiveRewardTab('ITEMS')} className={`py-2.5 ${activeRewardTab === 'ITEMS' ? 'bg-[#0a0f14] text-cyan-400' : 'text-zinc-500'}`}>ITEMS (1)</button>
              <button onClick={() => setActiveRewardTab('CURRENCIES')} className={`py-2.5 ${activeRewardTab === 'CURRENCIES' ? 'bg-cyan-500 text-black font-black' : 'text-zinc-500'}`}>RECURSOS</button>
              <button onClick={() => setActiveRewardTab('LTD_CUR')} className={`py-2.5 ${activeRewardTab === 'LTD_CUR' ? 'bg-[#0a0f14] text-cyan-400' : 'text-zinc-500'}`}>LTD</button>
            </div>
            <div className="flex-1 p-6 flex items-center justify-center bg-black/40">
              {activeRewardTab === 'ITEMS' && (
                <div className="w-36 h-36 border border-cyan-500/40 bg-[#05070a] rounded-xl flex flex-col justify-between items-center p-3 text-center">
                  <span className="text-[8.5px] font-black text-cyan-400 uppercase">{currentRewardDrop ? currentRewardDrop.rarity : 'RARE'}</span>
                  <div className="text-3xl">{currentRewardDrop ? currentRewardDrop.icon : '📄'}</div>
                  <span className="text-[9px] font-bold text-white uppercase truncate">{currentRewardDrop ? currentRewardDrop.name : 'BLUEPRINT'}</span>
                </div>
              )}
            </div>
            <button onClick={handleAcceptRewardsClose} className="w-full py-2.5 bg-cyan-950 hover:bg-cyan-900 border-t border-cyan-950 text-cyan-300 text-[11px] font-black uppercase cursor-pointer">ACCEPT</button>
          </div>
        </div>
      )}

      {/* ─── MODAL CONFIRMACIÓN DE VIAJE ─── */}
      {isStartJourneyOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-md bg-[#080b0e] border border-cyan-500/40 rounded-2xl p-6 text-center space-y-4">
            <Rocket className="w-12 h-12 text-cyan-400 mx-auto animate-bounce" />
            <h3 className="text-lg font-black text-white uppercase">¿INICIAR EXPEDICIÓN?</h3>
            <p className="text-[10px] text-zinc-400 uppercase">
              Llevarás {selectedAssets.length > 0 ? `${selectedAssets.length} activos seleccionados` : selectedFleet?.name || '1 Flota'} al sector {selectedPlanet?.name || 'Deep Space'}.
            </p>
            {launchError && <div className="p-2 bg-red-950/60 border border-red-800 text-red-300 text-[9px] uppercase">{launchError}</div>}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <button onClick={executeLaunchTransaction} disabled={loading} className="py-2.5 bg-cyan-950 border border-cyan-500 text-cyan-300 text-[10px] font-black uppercase rounded-lg hover:bg-cyan-900 cursor-pointer">CONFIRMAR VIAJE</button>
              <button onClick={() => setIsStartJourneyOpen(false)} className="py-2.5 bg-black border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase rounded-lg hover:bg-zinc-900 cursor-pointer">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL INSPECCIÓN DE FLOTA ─── */}
      {isFleetModalOpen && selectedFleet && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-2xl bg-neutral-950 border border-cyan-900 p-6 rounded-2xl max-h-[80vh] overflow-y-auto relative">
            <button onClick={() => setIsFleetModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            <h2 className="text-[14px] font-black tracking-widest uppercase border-b border-cyan-950 pb-2 mb-4 text-left">{selectedFleet.name}</h2>
            {selectedFleet.ships.map((ship, idx) => (
              <div key={idx} className="p-3 border border-cyan-950 bg-black/60 mb-2 flex justify-between items-center rounded-lg">
                <span className="text-[11px] font-bold text-white uppercase">{ship.name || "NAVE DE GUERRA"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};