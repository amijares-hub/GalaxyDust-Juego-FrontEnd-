import React, { useState, useEffect, useMemo } from 'react';
import {
  CornerUpLeft, X, Search, Rocket, Lock, MapPin, Plus, Trash2, 
  Sparkles, AlertTriangle, ShieldCheck, Box, Wrench, Bot, FileText, Package, Check, XCircle, Clock, Pickaxe, Radio
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── ESTRUCTURA DE TIPOS E INTERFACES ───
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
  effect?: string;
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
  progress?: number;
  status: 'LAUNCHED' | 'SUCCESS' | 'FAILED' | 'CLAIMED';
  estimated_return_time: string;
  launch_time: string;
  is_adrift?: boolean;
  type?: 'EXPLORATION' | 'MINING' | 'DOMINATION';
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

export type LeftMenuCategory = 'Fleets' | 'Naves' | 'Astrobots' | 'Tools' | 'Consumibles' | 'Licencia';
export type SelectionStep = 'GC' | 'GAL' | 'SC' | 'SS' | 'PLANETA';

export interface ExpeditionViewProps {
  initialView?: 'selection' | 'flights';
  onBack?: () => void;
  triggerNotification?: (text: string, e?: any) => void;
}

export type ExpeditionsViewProps = ExpeditionViewProps;

// Helpers
const isValidUUID = (str?: string | null): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

const resolveImageUrl = (rawUrl?: string, fallbackId?: string) => {
  if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '') {
    const clean = rawUrl.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/galaxy-assets/${clean.replace(/^\//, '')}`;
  }
  if (fallbackId) {
    return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/render/image/public/galaxy-assets/seed_ships/${fallbackId}.png?width=256&height=256&resize=contain&format=webp&quality=80`;
  }
  return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
};

const formatDuration = (ms: number): string => {
  if (ms <= 0) return '00h 00m 00s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
};

// Normalizadores de categorías
const isShipAsset = (type: string) => ['naves', 'ship', 'ships', 'nave'].includes(type.toLowerCase());
const isToolAsset = (type: string) => ['tools', 'tool', 'herramientas', 'herramienta'].includes(type.toLowerCase());
const isLicenseAsset = (type: string) => ['licencia', 'license', 'licenses'].includes(type.toLowerCase());

// REGLAS TÁCTICAS DE CADA GALAXY CLUSTER (GC)
interface GCRequirement {
  code: string;
  name: string;
  prevGC?: string;
  requiredPrevCount: number;
  requireShip: boolean;
  requireTool: boolean;
  requireLicense: boolean;
  requireNonNFT?: boolean;
  allowedEngines?: ('Impulse' | 'HS')[];
}

const GC_RULES: Record<string, GCRequirement> = {
  "PELA": {
    code: "PELA",
    name: "GC PELA - DERIVA / INICIO",
    requiredPrevCount: 0,
    requireShip: true,
    requireTool: false,
    requireLicense: false,
    requireNonNFT: true
  },
  "GC1": {
    code: "GC1",
    name: "GC1 - INARA ALPHA",
    prevGC: "PELA",
    requiredPrevCount: 0,
    requireShip: true,
    requireTool: true,
    requireLicense: false
  },
  "GC2": {
    code: "GC2",
    name: "GC2 - DUST CLUSTER",
    prevGC: "GC1",
    requiredPrevCount: 200,
    requireShip: true,
    requireTool: true,
    requireLicense: false
  },
  "GC3": {
    code: "GC3",
    name: "GC3 - NEBULA PRIME",
    prevGC: "GC2",
    requiredPrevCount: 300,
    requireShip: true,
    requireTool: true,
    requireLicense: true
  },
  "GC4": {
    code: "GC4",
    name: "GC4 - VOID CLUSTER",
    prevGC: "GC3",
    requiredPrevCount: 400,
    requireShip: true,
    requireTool: true,
    requireLicense: true,
    allowedEngines: ["Impulse", "HS"]
  },
  "GC5": {
    code: "GC5",
    name: "GC5 - TITAN CLUSTER",
    prevGC: "GC4",
    requiredPrevCount: 500,
    requireShip: true,
    requireTool: true,
    requireLicense: true,
    allowedEngines: ["Impulse", "HS"]
  },
  "GC6": {
    code: "GC6",
    name: "GC6 - HYPERION CORE",
    prevGC: "GC5",
    requiredPrevCount: 100,
    requireShip: true,
    requireTool: true,
    requireLicense: true,
    allowedEngines: ["Impulse", "HS"]
  },
  "GC7": {
    code: "GC7",
    name: "GC7 - PHANTOM EDGE",
    prevGC: "GC6",
    requiredPrevCount: 200,
    requireShip: true,
    requireTool: true,
    requireLicense: true,
    allowedEngines: ["HS"]
  },
  "GC8": {
    code: "GC8",
    name: "GC8 - OMEGA NEXUS",
    prevGC: "GC7",
    requiredPrevCount: 300,
    requireShip: true,
    requireTool: true,
    requireLicense: true,
    allowedEngines: ["HS"]
  }
};

const DEFAULT_GC_LIST: { id: string; name: string }[] = [
  { id: "PELA", name: "GC PELA - DERIVA / INICIO" },
  { id: "GC1",  name: "GC1 - INARA ALPHA" },
  { id: "GC2",  name: "GC2 - DUST CLUSTER" },
  { id: "GC3",  name: "GC3 - NEBULA PRIME" },
  { id: "GC4",  name: "GC4 - VOID CLUSTER" },
  { id: "GC5",  name: "GC5 - TITAN CLUSTER" },
  { id: "GC6",  name: "GC6 - HYPERION CORE" },
  { id: "GC7",  name: "GC7 - PHANTOM EDGE" },
  { id: "GC8",  name: "GC8 - OMEGA NEXUS" },
];

export const ExpeditionView: React.FC<ExpeditionViewProps> = ({
  initialView = 'selection',
  onBack,
  triggerNotification
}) => {
  const [currentStep, setCurrentStep] = useState<SelectionStep>('GC');
  const [selectedGC, setSelectedGC] = useState<string | null>(null);
  const [selectedGAL, setSelectedGAL] = useState<string | null>(null);
  const [selectedSC, setSelectedSC] = useState<string | null>(null);
  const [selectedSS, setSelectedSS] = useState<string | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<DiscoveredStar | null>(null);

  const [completedCountsByGC, setCompletedCountsByGC] = useState<Record<string, number>>({});
  
  // ─── ESTADOS DINÁMICOS DE NAVEGACIÓN ESTELAR DESDE SUPABASE ───
  const [gcList, setGcList] = useState<{ id: string; name: string }[]>(DEFAULT_GC_LIST);
  const [dbGalaxies, setDbGalaxies] = useState<{ id: string; name: string }[]>([]);
  const [dbStarClusters, setDbStarClusters] = useState<{ id: string; name: string }[]>([]);
  const [dbStarSystems, setDbStarSystems] = useState<{ id: string; name: string }[]>([]);
  const [dbPlanets, setDbPlanets] = useState<DiscoveredStar[]>([]);

  const [isDispatchPanelActive, setIsDispatchPanelActive] = useState(false);
  const [isAdrift, setIsAdrift] = useState(false);

  // Reloj en tiempo real
  const [now, setNow] = useState<number>(Date.now());

  // Categorías e Inventario Despacho
  const [currentLeftCategory, setCurrentLeftCategory] = useState<LeftMenuCategory>('Naves');
  const [inventoryAssets, setInventoryAssets] = useState<Asset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);

  // Estados Supabase
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);
  const [activeExpeditions, setActiveExpeditions] = useState<Expedition[]>([]);
  const [expeditionLogs, setExpeditionLogs] = useState<Record<string, ExpeditionLog[]>>({});
  const [loading, setLoading] = useState(false);

  // Modales
  const [isStartJourneyOpen, setIsStartJourneyOpen] = useState(false);
  const [activeFlightCategory, setActiveFlightCategory] = useState<string>('ALL');
  const [flightSearchQuery, setFlightSearchQuery] = useState('');
  const [isRewardSummaryOpen, setIsRewardSummaryOpen] = useState(false);
  const [activeRewardTab, setActiveRewardTab] = useState<'ITEMS' | 'CURRENCIES' | 'LTD_CUR'>('ITEMS');
  const [claimingExpeditionId, setClaimingExpeditionId] = useState<string | null>(null);
  const [currentRewardDrop, setCurrentRewardDrop] = useState<MiningDrop | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const leftMenuOptions: LeftMenuCategory[] = ['Fleets', 'Naves', 'Astrobots', 'Tools', 'Licencia', 'Consumibles'];

  const formatBreadcrumbText = () => {
    const galObj = dbGalaxies.find(g => g.id === selectedGAL);
    const scObj = dbStarClusters.find(s => s.id === selectedSC);
    const ssObj = dbStarSystems.find(sys => sys.id === selectedSS);

    const parts = [
      selectedGC, 
      galObj ? galObj.name : (selectedGAL ? 'GAL' : null), 
      scObj ? scObj.name : (selectedSC ? 'SC' : null), 
      ssObj ? ssObj.name : (selectedSS ? 'SS' : null), 
      selectedPlanet?.name
    ].filter(Boolean);
    return parts.join(' > ') || 'SELECCIONA COORDENADAS GALÁCTICAS';
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── CARGA CASCADA EN TIEMPO REAL DESDE SUPABASE ───

  // 1. Cargar Galaxias cuando cambia el Galaxy Cluster
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
      } else {
        setDbGalaxies([]);
      }
    };
    fetchGalaxies();
    setSelectedGAL(null);
    setSelectedSC(null);
    setSelectedSS(null);
    setSelectedPlanet(null);
  }, [selectedGC]);

  // 2. Cargar Star Clusters cuando cambia la Galaxia
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
      } else {
        setDbStarClusters([]);
      }
    };
    fetchStarClusters();
    setSelectedSC(null);
    setSelectedSS(null);
    setSelectedPlanet(null);
  }, [selectedGAL]);

  // 3. Cargar Star Systems cuando cambia el Star Cluster
  useEffect(() => {
    if (!selectedSC) { setDbStarSystems([]); return; }
    const fetchStarSystems = async () => {
      const { data } = await supabase
        .from('seed_star_systems')
        .select('id, name_code')
        .eq('sc_id', selectedSC);

      if (data && data.length > 0) {
        setDbStarSystems(data.map((sys: any) => ({ id: sys.id, name: sys.name_code || `SYS-${sys.id.substring(0, 4)}` })));
      } else {
        setDbStarSystems([]);
      }
    };
    fetchStarSystems();
    setSelectedSS(null);
    setSelectedPlanet(null);
  }, [selectedSC]);

  // 4. Cargar Planetas cuando cambia el Star System
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
          x: 0,
          y: 0,
          duration_hours: (loc.time_minutes || 60) / 60,
          risk_factor: 15
        })));
      } else {
        setDbPlanets([]);
      }
    };
    fetchPlanets();
    setSelectedPlanet(null);
  }, [selectedSS]);

  // ─── CONEXIÓN A INVENTARIO Y EXPEDICIONES REALES DESDE SUPABASE ───
  const syncDatabaseData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'df7832b8-c085-4e05-90c1-541fab1c6c12';

      // 1. Cargar lista real de Galaxy Clusters (id + name desde la BD)
      const { data: realGCs } = await supabase.from('seed_galaxy_clusters').select('id, name');
      if (realGCs && realGCs.length > 0) {
        const gcObjects = realGCs.map((g: any) => ({ id: g.id, name: g.name || g.id }));
        setGcList(gcObjects);
        // Seleccionar el primer GC de la BD si aún no hay selección
        setSelectedGC(prev => prev ?? gcObjects[0].id);
      } else {
        setGcList(DEFAULT_GC_LIST); // Fallback de seguridad
        setSelectedGC(prev => prev ?? DEFAULT_GC_LIST[0].id);
      }

      // 2. Obtener legacy_id del usuario (busca por 'id', columna correcta de user_profiles)
      let legacyUserId = 1623;
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('legacy_id')
          .eq('id', userId) // 'id' es la columna correcta, NO 'user_id'
          .single();

        if (profile?.legacy_id) {
          legacyUserId = profile.legacy_id;
        }
      } catch (errProfile) {
        console.warn('No se pudo obtener legacy_id, usando fallback.', errProfile);
      }

      // 3. Historial de Expediciones Completadas
      const { data: historyRows } = await supabase
        .from('expedition_history')
        .select('galaxy_cluster')
        .eq('user_id', userId);

      const counts: Record<string, number> = {};
      (historyRows || []).forEach((row: any) => {
        const gc = row.galaxy_cluster || 'PELA';
        counts[gc] = (counts[gc] || 0) + 1;
      });
      setCompletedCountsByGC(counts);

      // 4. Helper seguro para cargar inventario
      const loadCategoryAssets = async (
        userTable: string,
        seedTable: string,
        categoryType: Asset['type'],
        fkCol: string,
        seedPkCol: string = 'id',
        nameCols: string[] = ['name', 'title'],
        userFkCol: string = 'user_id',
        userFkVal: any = userId
      ): Promise<Asset[]> => {
        try {
          if (!userFkVal) return [];
          const { data: userRows, error: userErr } = await supabase.from(userTable).select('*').eq(userFkCol, userFkVal);
          if (userErr || !userRows || userRows.length === 0) return [];

          const { data: seedRows } = await supabase.from(seedTable).select('*');
          if (!seedRows || seedRows.length === 0) return [];

          const seedMap = new Map(seedRows.map((s: any) => [s[seedPkCol]?.toString(), s]));
          const assets: Asset[] = [];

          userRows.forEach((row: any) => {
            const targetId = row[fkCol]?.toString();
            if (!targetId) return;

            const seed = seedMap.get(targetId);

            let realName = row.custom_name || row.name_ship || 'ACTIVO';
            if (seed) {
              for (const col of nameCols) {
                if (seed[col]) {
                  realName = seed[col];
                  break;
                }
              }
            }

            const rawImg = seed?.image_url || seed?.avatar_url || seed?.avatar;

            assets.push({
              id: row.id?.toString() || targetId,
              seed_id: targetId,
              name: realName,
              type: categoryType,
              rarity: seed?.rarity || 'Common',
              collection: seed?.company || seed?.collection || 'GD',
              is_nft: seed?.is_nft || false,
              engine: seed?.engine || (realName.includes('HS') ? 'HS' : 'Impulse'),
              image_url: resolveImageUrl(rawImg, targetId),
              quantity: row.quantity || row.amount || 1,
              level: row.current_level || row.level || 1,
              effect: seed?.effect
            });
          });

          return assets;
        } catch (catErr) {
          console.warn(`Error al cargar ${categoryType}:`, catErr);
          return [];
        }
      };

      // 5. Cargar todos los activos (¡NAVES USA EL LEGACY_ID!)
      const [ships, tools, astrobots, consumables, licenses] = await Promise.all([
        loadCategoryAssets('user_ships', 'seed_ships', 'Naves', 'id_ship', 'id_ship', ['name_ship', 'ship_name', 'name'], 'id_user', legacyUserId),
        loadCategoryAssets('user_tools', 'seed_tools', 'Tools', 'tool_id', 'id', ['name', 'title'], 'user_id', userId),
        loadCategoryAssets('user_astrobots', 'seed_astrobots', 'Astrobots', 'astrobot_id', 'id', ['name', 'title'], 'user_id', userId),
        loadCategoryAssets('user_consumibles', 'seed_consumables', 'Consumibles', 'consumable_id', 'id', ['name', 'title'], 'user_id', userId),
        loadCategoryAssets('user_licenses', 'seed_licenses', 'Licencia', 'license_id', 'id', ['name', 'title'], 'user_id', userId)
      ]);

      setInventoryAssets([...ships, ...tools, ...astrobots, ...consumables, ...licenses]);

      // 6. Cargar Flotas
      const { data: fleetData } = await supabase.from('fleets').select('*').eq('user_id', userId);
      if (fleetData) {
        setFleets(fleetData.map((f: any) => ({
          id: f.id?.toString(),
          name: f.name || 'Flota Alpha',
          total_power_score: f.total_power_score || 0,
          ships: f.ships || [],
          tools: f.tools || [],
          licenses: f.licenses || []
        })));
      }

      // 7. Cargar Expediciones Activas
      const { data: expData } = await supabase
        .from('active_expeditions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'LAUNCHED')
        .order('launch_time', { ascending: false });

      if (expData) {
        setActiveExpeditions(expData);
      }

      // 8. Cargar Logs / Eventos Reales
      const { data: logsData } = await supabase
        .from('expedition_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (logsData) {
        const map: Record<string, ExpeditionLog[]> = {};
        logsData.forEach((log: any) => {
          if (!map[log.expedition_id]) map[log.expedition_id] = [];
          map[log.expedition_id].push(log);
        });
        setExpeditionLogs(map);
      }

    } catch (err) {
      console.error("Error al sincronizar inventario real:", err);
      if (triggerNotification) triggerNotification("⚠️ FALLO AL SINCRONIZAR INVENTARIO REAL");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncDatabaseData();
  }, []);

  const checkGCRequirements = (gcCode: string): { allowed: boolean; reason?: string } => {
    const rule = GC_RULES[gcCode];
    if (!rule) return { allowed: true };

    if (rule.prevGC) {
      const prevCount = completedCountsByGC[rule.prevGC] || 0;
      if (prevCount < rule.requiredPrevCount) {
        return {
          allowed: false,
          reason: `REQUIERE ${rule.requiredPrevCount} EXPEDICIONES EN ${rule.prevGC} (${prevCount}/${rule.requiredPrevCount})`
        };
      }
    }
    return { allowed: true };
  };

  const validateFleetComposition = (gcCode: string, assets: Asset[], fleet: Fleet | null): { valid: boolean; error?: string } => {
    const rule = GC_RULES[gcCode] || GC_RULES["PELA"];

    const allShips = [...assets.filter(a => isShipAsset(a.type)), ...(fleet?.ships || [])];
    const allTools = [...assets.filter(a => isToolAsset(a.type)), ...(fleet?.tools || [])];
    const allLicenses = [...assets.filter(a => isLicenseAsset(a.type)), ...(fleet?.licenses || [])];

    if (gcCode === "PELA" || isAdrift) {
      const hasNonNFT = allShips.some(s => s.is_nft === false || !s.is_nft);
      if (!hasNonNFT) {
        return { valid: false, error: "REGLA PELA: La flota debe incluir al menos UNA NAVE NO-NFT." };
      }
    }

    if (rule.requireShip && allShips.length === 0) {
      return { valid: false, error: `REQUISITO ${rule.code}: Debes incluir al menos UNA NAVE.` };
    }

    if (rule.requireTool && allTools.length === 0) {
      return { valid: false, error: `REQUISITO ${rule.code}: Debes incluir al menos UNA HERRAMIENTA (Tool) para extracción.` };
    }

    if (rule.requireLicense && allLicenses.length === 0) {
      return { valid: false, error: `REQUISITO ${rule.code}: Debes incluir una LICENCIA espacial activa.` };
    }

    return { valid: true };
  };

  const toggleAssetSelection = (asset: Asset) => {
    if (selectedAssets.find(a => a.id === asset.id)) {
      setSelectedAssets(prev => prev.filter(a => a.id !== asset.id));
    } else {
      setSelectedAssets(prev => [...prev, asset]);
      if (triggerNotification) triggerNotification(`➕ ${asset.name} AÑADIDO`);
    }
  };

  const handleOpenJourneyModal = () => {
    const gcCode = isAdrift ? "PELA" : (selectedGC || "PELA");
    const compValidation = validateFleetComposition(gcCode, selectedAssets, selectedFleet);

    if (!compValidation.valid) {
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

    const gcCode = isAdrift ? "PELA" : (selectedGC || "PELA");
    const compValidation = validateFleetComposition(gcCode, selectedAssets, selectedFleet);

    if (!compValidation.valid) {
      setLaunchError(compValidation.error || "Validación fallida.");
      if (triggerNotification) triggerNotification(`⛔ ${compValidation.error}`);
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'df7832b8-c085-4e05-90c1-541fab1c6c12';

      const duration = selectedPlanet?.duration_hours || 2;
      const launchTime = new Date();
      const returnTime = new Date(launchTime.getTime() + duration * 3600 * 1000);

      const fleetName = selectedFleet?.name || (selectedAssets.length > 0 ? selectedAssets[0].name : "FLOTA INDEPENDIENTE");
      const sectorName = selectedPlanet ? selectedPlanet.name : "NUEVO SECTOR EN DERIVA";

      const { error } = await supabase
        .from('active_expeditions')
        .insert({
          user_id: userId,
          fleet_id: selectedFleet?.id && isValidUUID(selectedFleet.id) ? selectedFleet.id : null,
          fleet_name: fleetName,
          sector_name: sectorName,
          galaxy_cluster: gcCode,
          star_cluster: selectedSC || "STARCLUSTER GOAL",
          duration_hours: duration,
          risk_factor: isAdrift ? 40 : (selectedPlanet?.risk_factor || 15),
          is_adrift: isAdrift,
          status: 'LAUNCHED',
          launch_time: launchTime.toISOString(),
          estimated_return_time: returnTime.toISOString()
        });

      if (error) throw error;

      setIsStartJourneyOpen(false);
      setSelectedAssets([]);
      setIsDispatchPanelActive(false);
      setCurrentStep('GC');
      setSelectedPlanet(null);

      syncDatabaseData();

      if (triggerNotification) triggerNotification(`🚀 EXPEDICIÓN DESPLEGADA EN ${gcCode}`);
    } catch (err: any) {
      console.error("Error al desplegar expedición:", err);
      setLaunchError(err.message || "Error de comunicación");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimExpeditionRewards = async (exp: Expedition) => {
    setClaimingExpeditionId(exp.id);

    const launchMs = new Date(exp.launch_time).getTime();
    const returnMs = new Date(exp.estimated_return_time).getTime();
    const totalMs = Math.max(1000, returnMs - launchMs);
    const elapsedMs = Math.min(totalMs, Math.max(0, now - launchMs));
    const elapsedHours = elapsedMs / (3600 * 1000);

    const minedMetal = Math.max(500, Math.floor(elapsedHours * 4500));
    const minedCrystal = Math.max(250, Math.floor(elapsedHours * 2200));

    const drop: MiningDrop = {
      name: `METAL: +${minedMetal.toLocaleString()} | CRISTAL: +${minedCrystal.toLocaleString()}`,
      amount: 1,
      rarity: "EPIC",
      icon: "💎"
    };
    setCurrentRewardDrop(drop);
    setIsRewardSummaryOpen(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'df7832b8-c085-4e05-90c1-541fab1c6c12';

      if (isValidUUID(exp.id)) {
        await supabase
          .from('active_expeditions')
          .update({ status: 'CLAIMED' })
          .eq('id', exp.id);

        await supabase.from('expedition_history').insert({
          user_id: userId,
          galaxy_cluster: exp.galaxy_cluster || 'PELA',
          completed_at: new Date().toISOString()
        });

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('metal, crystal')
          .eq('id', userId)
          .single();

        if (profile) {
          const currentMetal = parseFloat(profile.metal || 0);
          const currentCrystal = parseFloat(profile.crystal || 0);

          await supabase
            .from('user_profiles')
            .update({
              metal: currentMetal + minedMetal,
              crystal: currentCrystal + minedCrystal,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        }

        const newStarId = isValidUUID(exp.id) ? exp.id : crypto.randomUUID();
        const planetName = exp.sector_name || "NUEVO PLANETA EXPLORADO";

        await supabase.from('user_discovered_stars').insert({
          star_id: newStarId,
          discoverer_id: userId,
          star_name: planetName,
          sector_coordinates: `${exp.galaxy_cluster || 'PELA'}:${exp.star_cluster || 'SC1'}`,
          resource_richness: { metal: minedMetal, crystal: minedCrystal },
          discovered_at: new Date().toISOString()
        });

        await supabase.from('user_locations').insert({
          user_id: userId,
          location_id: newStarId,
          is_discovered: true,
          created_at: new Date().toISOString()
        });
      }

      if (triggerNotification) {
        triggerNotification(`✅ BILLETERA ACTUALIZADA Y PLANETA ${exp.sector_name.toUpperCase()} REGISTRADO`);
      }

      syncDatabaseData();
    } catch (err) {
      console.error("Error al reclamar recompensas:", err);
    }
  };

  const handleClaimAllExpeditions = async () => {
    const filterList = getFilteredFlights();
    if (filterList.length === 0) return;
    for (const exp of filterList) {
      await handleClaimExpeditionRewards(exp);
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

  const getFilteredFlights = () => {
    return activeExpeditions.filter(exp => {
      const expType = exp.type || 'EXPLORATION';
      if (activeFlightCategory !== 'ALL' && expType !== activeFlightCategory) return false;

      if (flightSearchQuery.trim() !== '') {
        const query = flightSearchQuery.toLowerCase();
        return exp.fleet_name.toLowerCase().includes(query) || exp.sector_name.toLowerCase().includes(query);
      }

      return exp.status === 'LAUNCHED';
    });
  };

  const filteredInventory = inventoryAssets.filter(a => {
    if (currentLeftCategory === 'Fleets') return false;
    return a.type.toLowerCase() === currentLeftCategory.toLowerCase();
  });

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

  const currentGC = isAdrift ? (gcList[0]?.id ?? "PELA") : (selectedGC ?? gcList[0]?.id ?? "PELA");
  const activeRule = GC_RULES[currentGC] ?? GC_RULES[Object.keys(GC_RULES)[0]];
  const hasShipInSelection = selectedAssets.some(a => isShipAsset(a.type)) || (selectedFleet?.ships && selectedFleet.ships.length > 0);
  const hasToolInSelection = selectedAssets.some(a => isToolAsset(a.type)) || (selectedFleet?.tools && selectedFleet.tools.length > 0);
  const hasLicenseInSelection = selectedAssets.some(a => isLicenseAsset(a.type)) || (selectedFleet?.licenses && selectedFleet.licenses.length > 0);

  // ─── RENDERIZADO VISTA VUELOS EN CURSO ───
  if (initialView === 'flights') {
    return (
      <div className="w-full max-w-7xl mx-auto bg-[#080b0e] border border-cyan-500/30 p-5 rounded-2xl shadow-2xl relative overflow-hidden font-mono text-left select-none flex flex-col gap-4 text-white">
        <div className="w-full bg-[#05070a] border border-cyan-500/30 p-3.5 rounded-xl flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" /> EXPEDITIONS IN FLIGHT
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClaimAllExpeditions}
              disabled={getFilteredFlights().length === 0}
              className="px-3 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 disabled:opacity-50 text-white text-[8.5px] font-black uppercase rounded-lg shadow-lg cursor-pointer"
            >
              CLAIM ALL
            </button>
            <button onClick={onBack} className="p-1 text-zinc-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="w-full flex flex-col md:flex-row gap-3.5 items-start">
          <div className="w-full md:w-56 shrink-0 bg-[#05070a] border border-cyan-500/20 p-3 rounded-xl flex flex-col gap-2.5">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-cyan-500" />
              <input
                type="text"
                placeholder="BUSCAR FLOTA..."
                value={flightSearchQuery}
                onChange={(e) => setFlightSearchQuery(e.target.value)}
                className="w-full bg-[#0a0f14] border border-cyan-950 rounded-lg pl-7 pr-2.5 py-1.5 text-[8px] text-cyan-200 placeholder-zinc-600 outline-none uppercase font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              {['ALL', 'EXPLORATION', 'MINING', 'DOMINATION'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFlightCategory(cat)}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-[8px] font-mono font-bold uppercase transition-all cursor-pointer border ${
                    activeFlightCategory === cat ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black' : 'bg-[#0a0f14] text-zinc-400 border-transparent hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1">
            {getFilteredFlights().length === 0 ? (
              <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                NO HAY OPERACIONES EN CURSO REGISTRADAS EN ESTE SECTOR
              </div>
            ) : (
              getFilteredFlights().map((exp) => {
                const launchMs = new Date(exp.launch_time).getTime();
                const returnMs = new Date(exp.estimated_return_time).getTime();
                const totalDurationMs = Math.max(1000, returnMs - launchMs);
                const elapsedMs = Math.max(0, now - launchMs);
                const remainingMs = Math.max(0, returnMs - now);
                const timeLeftInSeconds = Math.max(0, Math.floor(remainingMs / 1000));
                
                const progressPct = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));

                const elapsedHours = elapsedMs / (3600 * 1000);
                const minedMetal = Math.max(500, Math.floor(elapsedHours * 4500));
                const minedCrystal = Math.max(250, Math.floor(elapsedHours * 2200));

                const logsForExp = expeditionLogs[exp.id] || [];

                let phaseLabel = "VIAJANDO AL CLUSTER...";
                let phaseColor = "text-amber-400 border-amber-800 animate-pulse";

                if (remainingMs === 0) {
                  phaseLabel = "MISION FINALIZADA / C.A.N. READY";
                  phaseColor = "bg-emerald-950 text-emerald-400 border-emerald-800";
                } else if (progressPct > 70) {
                  phaseLabel = "RETORNANDO A BASE C.A.N...";
                  phaseColor = "bg-blue-950 text-blue-300 border-blue-800 animate-pulse";
                } else if (progressPct > 35) {
                  phaseLabel = "EXTRACCIÓN ACTIVA / EN ESTRELLA";
                  phaseColor = "bg-purple-950 text-purple-300 border-purple-800 animate-pulse";
                }

                return (
                  <div key={exp.id} className="p-3.5 rounded-xl border border-cyan-500/40 bg-[#050910] shadow-lg flex flex-col justify-between gap-2.5 relative overflow-hidden">
                    
                    {/* OVERLAY TÁCTICO ROJO "TRANSITANDO" */}
                    {remainingMs > 0 && (
                      <div className="absolute top-0 right-0 left-0 bg-red-950/40 border-b border-red-500/40 px-3 py-1 flex items-center justify-between z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-0.5 bg-red-500 animate-[bounce_1.8s_infinite]" />
                          <span className="text-[7.5px] font-black text-red-400 tracking-widest animate-pulse uppercase">
                            TRANSITANDO
                          </span>
                        </div>
                        <span className="text-[7px] text-red-300 font-mono font-bold">{timeLeftInSeconds}s REMAINING</span>
                      </div>
                    )}

                    <div className={`flex justify-between items-start ${remainingMs > 0 ? 'pt-4' : ''}`}>
                      <div className="flex flex-col">
                        <span className="text-[10.5px] font-black text-white uppercase truncate">{exp.fleet_name}</span>
                        <span className="text-[8px] text-cyan-400 font-bold uppercase">{exp.galaxy_cluster} / {exp.sector_name}</span>
                      </div>
                      <span className={`text-[7.5px] font-mono px-2 py-0.5 rounded font-black border ${phaseColor}`}>
                        {phaseLabel}
                      </span>
                    </div>

                    {/* MONITOR TÁCTICO DE VUELO */}
                    <div className="grid grid-cols-2 gap-2 bg-black/60 p-2 rounded-lg border border-cyan-950 text-[8px]">
                      <div className="flex flex-col">
                        <span className="text-zinc-500 uppercase flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-cyan-400" /> Tiempo Transcurrido:
                        </span>
                        <span className="text-cyan-300 font-bold font-mono">{formatDuration(elapsedMs)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 uppercase flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-amber-400" /> Cuenta Regresiva:
                        </span>
                        <span className="text-amber-300 font-bold font-mono">
                          {remainingMs > 0 ? `${timeLeftInSeconds}s (${formatDuration(remainingMs)})` : '00h 00m 00s'}
                        </span>
                      </div>
                    </div>

                    {/* RECURSOS ACUMULADOS EN TIEMPO REAL */}
                    <div className="bg-[#020508] p-2 rounded-lg border border-cyan-950 flex justify-between items-center text-[8px]">
                      <span className="text-zinc-400 uppercase flex items-center gap-1 font-bold">
                        <Pickaxe className="w-3 h-3 text-amber-400" /> Extracción Acumulada:
                      </span>
                      <div className="flex gap-2 font-mono font-bold">
                        <span className="text-zinc-300">Metal: <span className="text-cyan-300">+{minedMetal.toLocaleString()}</span></span>
                        <span className="text-zinc-300">Cristal: <span className="text-purple-300">+{minedCrystal.toLocaleString()}</span></span>
                      </div>
                    </div>

                    {/* EVENTOS REGISTRADOS */}
                    <div className="p-2 bg-black/40 border border-cyan-950 rounded-lg text-[7.5px] space-y-1">
                      <span className="text-cyan-400 font-bold uppercase tracking-wider block">EVENTOS REGISTRADOS EN MISIÓN:</span>
                      {logsForExp.length === 0 ? (
                        <p className="text-zinc-600 uppercase">Sin anomalías ni eventos críticos reportados.</p>
                      ) : (
                        logsForExp.map((log) => (
                          <div key={log.id} className="flex justify-between items-center text-zinc-300">
                            <span className="truncate max-w-[220px]">• {log.title || log.message}</span>
                            <span className="text-amber-400 font-mono">{log.damage_sustained ? `-${log.damage_sustained} HP` : 'OK'}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* BARRA DE PROGRESO */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[7.5px] text-zinc-400">
                        <span className="animate-pulse text-cyan-400 font-bold">
                          {remainingMs > 0 ? "VIAJANDO AL CLUSTER..." : "DESTINO ALCANZADO"}
                        </span>
                        <span className="text-cyan-400 font-bold">{progressPct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-cyan-950">
                        <div className="h-full bg-cyan-400 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>

                    <button onClick={() => handleClaimExpeditionRewards(exp)} className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[9px] uppercase rounded-lg shadow cursor-pointer hover:brightness-110 active:scale-95 transition-all">
                      CLAIM REWARDS
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDERIZADO PRINCIPAL ───
  return (
    <div className="w-full max-w-7xl mx-auto bg-[#080b0e] border border-cyan-500/30 p-2 sm:p-4 rounded-xl shadow-2xl relative font-mono text-left select-none flex flex-col gap-2 my-1 text-white">

      {/* NAVBAR SUPERIOR */}
      <div className="w-full bg-[#05070a] border border-cyan-500/30 p-3 rounded-xl flex justify-between items-center shrink-0">
        <div className="flex flex-col gap-0.5 text-left">
          <h1 className="text-sm font-black tracking-widest text-white uppercase flex items-center gap-2">
            MATRIZ DE EXPEDICIONES DE CLUSTER
          </h1>
          <p className="text-cyan-400 text-[9.5px] tracking-wide font-bold uppercase leading-none">{formatBreadcrumbText()}</p>
        </div>

        <div className="flex items-center gap-2">
          {isDispatchPanelActive && (
            <button
              onClick={() => setIsDispatchPanelActive(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-[9px] font-bold tracking-widest uppercase rounded-lg bg-cyan-950/80 transition-colors cursor-pointer"
            >
              <CornerUpLeft className="w-3.5 h-3.5 text-cyan-400" /> RETORNAR A MAPA
            </button>
          )}
        </div>
      </div>

      {!isDispatchPanelActive ? (
        <div className="w-full flex-1 flex flex-col md:flex-row gap-3.5 overflow-hidden items-stretch">

          {/* SIDEBAR IZQUIERDO */}
          <div className="w-full md:w-[320px] shrink-0 border border-cyan-500/20 bg-[#05070a] rounded-xl p-3 flex flex-col justify-between shadow-2xl h-[480px]">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 border-b border-cyan-950 pb-2 text-left">
                <MapPin className="w-4 h-4 text-cyan-400 animate-bounce" />
                <span className="text-[11px] font-black tracking-widest text-white uppercase">SELECCIONA COORDENADAS GC</span>
              </div>

              <div className="grid grid-cols-5 gap-1 bg-black/60 p-1 rounded-lg border border-cyan-950 text-[8.5px] font-bold text-center uppercase">
                {([
                  { id: 'GC', label: 'GC', isUnlocked: true },
                  { id: 'GAL', label: 'GAL', isUnlocked: selectedGC !== null },
                  { id: 'SC', label: 'SC', isUnlocked: selectedGAL !== null },
                  { id: 'SS', label: 'SS', isUnlocked: selectedSC !== null },
                  { id: 'PLANETA', label: 'PLANETA', isUnlocked: selectedSS !== null }
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    disabled={!tab.isUnlocked}
                    onClick={() => setCurrentStep(tab.id as SelectionStep)}
                    className={`py-1.5 rounded transition-all cursor-pointer flex items-center justify-center gap-0.5 border ${
                      currentStep === tab.id
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black'
                        : tab.isUnlocked ? 'bg-black/40 text-zinc-400' : 'bg-black/20 text-zinc-700 cursor-not-allowed'
                    }`}
                  >
                    {!tab.isUnlocked && <Lock className="w-2.5 h-2.5 text-zinc-700" />}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* 🌐 LISTAS DINÁMICAS DESDE SUPABASE */}
              <div className="p-1 flex flex-col gap-1.5 max-h-[310px] overflow-y-auto pr-1">
                {/* 🌐 GALAXY CLUSTERS DINÁMICOS DESDE SUPABASE */}
                {currentStep === 'GC' && (
                  gcList.length === 0 ? (
                    <div className="p-4 text-center text-zinc-600 text-[9px] uppercase italic">
                      No hay Galaxy Clusters registrados.
                    </div>
                  ) : (
                    gcList.map((gc) => {
                      const reqCheck = checkGCRequirements(gc.id);
                      // GC_RULES se usa SOLO para requisitos tácticos; el nombre viene de la BD
                      const rule = GC_RULES[gc.id];
                      const isSelected = selectedGC === gc.id;

                      return (
                        <div
                          key={gc.id}
                          onClick={() => {
                            if (reqCheck.allowed) {
                              setSelectedGC(gc.id);
                              setCurrentStep('GAL');
                            } else if (triggerNotification) {
                              triggerNotification(`🔒 ${reqCheck.reason}`);
                            }
                          }}
                          className={`w-full p-2.5 rounded-lg border text-[9px] font-bold uppercase transition-all flex flex-col gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-lg'
                              : reqCheck.allowed
                              ? 'bg-[#0a0f14] text-zinc-300 border-cyan-950 hover:border-cyan-800'
                              : 'bg-black/80 text-zinc-600 border-zinc-900 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            {/* Nombre real de la BD — nunca de GC_RULES */}
                            <span className="font-extrabold text-white">{gc.name}</span>
                            {!reqCheck.allowed
                              ? <Lock className="w-3 h-3 text-red-500 shrink-0" />
                              : <span className="text-[7.5px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded font-black">OK</span>
                            }
                          </div>
                          <div className="text-[7px] text-zinc-400 font-mono">
                            {rule?.prevGC && (
                              <p className={reqCheck.allowed ? "text-emerald-400" : "text-amber-400 font-bold"}>
                                • Req: {rule.requiredPrevCount} exp. en {rule.prevGC} ({completedCountsByGC[rule.prevGC] || 0}/{rule.requiredPrevCount})
                              </p>
                            )}
                            <p>• Req: {rule?.requireShip ? 'Nave ' : ''}{rule?.requireTool ? '+ Tool ' : ''}{rule?.requireLicense ? '+ Licencia' : ''}</p>
                            <p className="text-zinc-600">• ID: {gc.id}</p>
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {/* 🌀 GALAXIAS DESDE SUPABASE */}
                {currentStep === 'GAL' && (
                  dbGalaxies.length === 0 ? (
                    <div className="p-4 text-center text-zinc-600 text-[9px] uppercase italic">No hay galaxias en este GC.</div>
                  ) : (
                    dbGalaxies.map((gal) => (
                      <button 
                        key={gal.id} 
                        onClick={() => { setSelectedGAL(gal.id); setCurrentStep('SC'); }} 
                        className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase cursor-pointer ${
                          selectedGAL === gal.id ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-[#0a0f14] border-cyan-950 text-zinc-300 hover:border-cyan-800'
                        }`}
                      >
                        {gal.name}
                      </button>
                    ))
                  )
                )}

                {/* 🌟 STAR CLUSTERS DESDE SUPABASE */}
                {currentStep === 'SC' && (
                  dbStarClusters.length === 0 ? (
                    <div className="p-4 text-center text-zinc-600 text-[9px] uppercase italic">No hay Star Clusters en esta galaxia.</div>
                  ) : (
                    dbStarClusters.map((sc) => (
                      <button 
                        key={sc.id} 
                        onClick={() => { setSelectedSC(sc.id); setCurrentStep('SS'); }} 
                        className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase cursor-pointer ${
                          selectedSC === sc.id ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-[#0a0f14] border-cyan-950 text-zinc-300 hover:border-cyan-800'
                        }`}
                      >
                        {sc.name}
                      </button>
                    ))
                  )
                )}

                {/* 🪐 STAR SYSTEMS DESDE SUPABASE */}
                {currentStep === 'SS' && (
                  dbStarSystems.length === 0 ? (
                    <div className="p-4 text-center text-zinc-600 text-[9px] uppercase italic">No hay sistemas solares en este SC.</div>
                  ) : (
                    dbStarSystems.map((ss) => (
                      <button 
                        key={ss.id} 
                        onClick={() => { setSelectedSS(ss.id); setCurrentStep('PLANETA'); }} 
                        className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase cursor-pointer ${
                          selectedSS === ss.id ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-[#0a0f14] border-cyan-950 text-zinc-300 hover:border-cyan-800'
                        }`}
                      >
                        {ss.name}
                      </button>
                    ))
                  )
                )}

                {/* 🌍 PLANETAS DESDE SUPABASE */}
                {currentStep === 'PLANETA' && (
                  dbPlanets.length === 0 ? (
                    <div className="p-3 bg-cyan-950/20 border border-cyan-900/50 rounded-xl text-center space-y-2">
                      <p className="text-[8px] text-zinc-400 uppercase">Sin planetas registrados. Configurar expedición directa en {selectedGC || "PELA"}.</p>
                      <button onClick={() => { setIsAdrift(true); setIsDispatchPanelActive(true); }} className="w-full py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-black text-[8.5px] uppercase rounded-lg shadow cursor-pointer">
                        <Sparkles className="w-3 h-3 inline mr-1" /> CONFIGURAR FLOTA
                      </button>
                    </div>
                  ) : (
                    dbPlanets.map((planet) => (
                      <div 
                        key={planet.id} 
                        onClick={() => { setSelectedPlanet(planet); setIsAdrift(false); setIsDispatchPanelActive(true); }} 
                        className={`p-2.5 rounded-lg border cursor-pointer text-left space-y-1 transition-all ${
                          selectedPlanet?.id === planet.id ? 'bg-cyan-950 border-cyan-400' : 'bg-[#0a0f14] border-cyan-950 hover:border-cyan-800'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[9.5px] font-extrabold text-white uppercase">{planet.name}</span>
                          <span className="text-[7.5px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded font-bold uppercase">{planet.type}</span>
                        </div>
                        <p className="text-[7.5px] text-zinc-400">⏱️ Tiempo: {planet.duration_hours || 2}h | ⚠️ Riesgo: {planet.risk_factor || 15}%</p>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>

            <div className="p-2 border-t border-cyan-950 bg-black/60 rounded-lg text-[8.5px] text-zinc-500 font-bold uppercase">
              <span>RUTA: {formatBreadcrumbText()}</span>
            </div>
          </div>

          {/* MAPA ESTELAR */}
          <div className="flex-1 border border-cyan-500/30 bg-[#05070a] rounded-xl relative overflow-hidden flex flex-col justify-between shadow-2xl h-[480px]">
            <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center relative bg-cover bg-center">
              <div className="absolute inset-0 bg-[#05070a]/90" />
              <div className="relative z-10 flex flex-col items-center gap-4 max-w-md">
                <span className="text-[9px] text-cyan-400 font-bold uppercase">SECTOR SELECCIONADO: {selectedGC || "PELA"}</span>
                <button
                  onClick={() => { setIsAdrift(false); setIsDispatchPanelActive(true); }}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 border border-cyan-400 text-white text-[10.5px] font-black tracking-widest uppercase rounded-lg shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Rocket className="w-4 h-4" /> DESPLEGAR MISIÓN EN {selectedGC || "PELA"}
                </button>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* VISTA 2: DISPATCH PANEL */
        <div className="w-full flex-1 flex flex-col md:flex-row gap-3.5 overflow-hidden h-[480px]">
          <div className="w-full md:w-[260px] border border-cyan-500/20 bg-[#05070a] rounded-xl shrink-0 p-3 flex flex-col justify-between h-full">
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-bold text-zinc-400 uppercase px-1 pb-1 border-b border-cyan-950">CATEGORÍAS DE ACTIVOS</span>
              {leftMenuOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setCurrentLeftCategory(opt as LeftMenuCategory)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[9.5px] font-bold uppercase border cursor-pointer flex items-center gap-2 ${
                    currentLeftCategory === opt ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black shadow-md' : 'bg-[#0a0f14] text-zinc-400 border-transparent hover:text-zinc-200'
                  }`}
                >
                  {getCategoryIcon(opt as LeftMenuCategory)}
                  <span>{opt}</span>
                  <span className="ml-auto text-[7.5px] font-mono text-zinc-500">
                    ({opt === 'Fleets' ? fleets.length : inventoryAssets.filter(a => a.type.toLowerCase() === opt.toLowerCase()).length})
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={handleOpenJourneyModal}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-black text-[11px] uppercase rounded-lg border border-cyan-400 shadow-lg cursor-pointer mt-auto hover:brightness-110 active:scale-95 transition-all"
            >
              INICIAR DESPLIEGUE
            </button>
          </div>

          <div className="flex-1 border border-cyan-500/20 bg-[#05070a] p-3 rounded-xl flex flex-col justify-between gap-3 h-full overflow-hidden">
            
            {/* INVENTARIO COMPLETO DINÁMICO */}
            <div className="flex flex-col gap-1.5 flex-1 min-h-0">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 overflow-y-auto max-h-[220px] pr-1">
                {currentLeftCategory === 'Fleets' ? (
                  fleets.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-zinc-600 text-[9px] uppercase tracking-widest">
                      NO TIENES FLOTAS REGISTRADAS
                    </div>
                  ) : (
                    fleets.map(fleet => (
                      <div
                        key={fleet.id}
                        onClick={() => setSelectedFleet(fleet)}
                        className={`p-2 rounded-lg border cursor-pointer flex flex-col gap-1 relative overflow-hidden ${
                          selectedFleet?.id === fleet.id ? 'bg-cyan-950/80 border-cyan-400' : 'bg-[#050910] border-cyan-950'
                        }`}
                      >
                        <span className="text-[9px] font-black text-white uppercase truncate">{fleet.name}</span>
                        <span className="text-[7.5px] text-cyan-400 font-mono">POW: {fleet.total_power_score}</span>
                      </div>
                    ))
                  )
                ) : filteredInventory.length === 0 ? (
                  <div className="col-span-full p-8 text-center text-zinc-600 text-[9px] uppercase tracking-widest">
                    NO HAY ACTIVOS REGISTRADOS EN {currentLeftCategory.toUpperCase()}
                  </div>
                ) : (
                  filteredInventory.map(asset => {
                    const isSelected = selectedAssets.some(a => a.id === asset.id);
                    const isAssetInFlight = activeExpeditions.some(exp => exp.status === 'LAUNCHED' && isShipAsset(asset.type));

                    return (
                      <div
                        key={asset.id}
                        onClick={() => {
                          if (!isAssetInFlight) toggleAssetSelection(asset);
                        }}
                        className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-all relative overflow-hidden ${
                          isAssetInFlight 
                            ? 'bg-red-950/70 border-red-500/60 cursor-not-allowed' 
                            : isSelected ? 'bg-cyan-950/60 border-cyan-400 opacity-60' : 'bg-[#050910] border-cyan-950 hover:border-cyan-500'
                        }`}
                      >
                        {/* OVERLAY TÁCTICO ROJO "TRANSITANDO" */}
                        {isAssetInFlight && (
                          <div className="absolute inset-0 bg-red-950/85 backdrop-blur-[1px] border border-red-500 z-20 flex flex-col items-center justify-center p-1 text-center">
                            <div className="w-full h-0.5 bg-red-500 animate-[bounce_1.8s_infinite] mb-1" />
                            <span className="text-[7.5px] font-black text-red-400 tracking-widest animate-pulse uppercase">
                              TRANSITANDO
                            </span>
                          </div>
                        )}

                        <div className="w-8 h-8 rounded bg-black border border-cyan-950 shrink-0 overflow-hidden">
                          <img src={asset.image_url} className="w-full h-full object-cover brightness-90" alt="" />
                        </div>
                        <div className="flex flex-col text-left overflow-hidden">
                          <span className="text-[8.5px] font-black text-white truncate">{asset.name}</span>
                          <span className="text-[7px] text-cyan-400 font-mono uppercase">{asset.rarity}</span>
                        </div>
                        {isSelected ? <Lock className="ml-auto w-3.5 h-3.5 text-cyan-400" /> : <Plus className="ml-auto w-3.5 h-3.5 text-zinc-500 hover:text-cyan-400" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* DIAGNÓSTICO EN TIEMPO REAL */}
            <div className="p-2 bg-black/60 border border-cyan-950 rounded-lg flex flex-wrap gap-3 items-center text-[8px] font-mono shrink-0">
              <span className="text-zinc-500 font-bold uppercase border-r border-cyan-950 pr-2">COMPONENTES {currentGC}:</span>
              
              <div className="flex items-center gap-1">
                <span>NAVE:</span>
                {hasShipInSelection ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5"><Check className="w-3 h-3" /> OK</span>
                ) : (
                  <span className="text-red-400 font-bold flex items-center gap-0.5"><XCircle className="w-3 h-3" /> REQUERIDA</span>
                )}
              </div>

              {activeRule?.requireTool && (
                <div className="flex items-center gap-1">
                  <span>TOOL:</span>
                  {hasToolInSelection ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5"><Check className="w-3 h-3" /> OK</span>
                  ) : (
                    <span className="text-red-400 font-bold flex items-center gap-0.5"><XCircle className="w-3 h-3" /> REQUERIDA</span>
                  )}
                </div>
              )}

              {activeRule?.requireLicense && (
                <div className="flex items-center gap-1">
                  <span>LICENCIA:</span>
                  {hasLicenseInSelection ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5"><Check className="w-3 h-3" /> OK</span>
                  ) : (
                    <span className="text-red-400 font-bold flex items-center gap-0.5"><XCircle className="w-3 h-3" /> REQUERIDA</span>
                  )}
                </div>
              )}
            </div>

            {/* ACTIVOS SELECCIONADOS */}
            <div className="flex-1 border border-cyan-950 bg-[#020305] rounded-lg p-2.5 overflow-y-auto max-h-[140px]">
              {selectedAssets.length === 0 && !selectedFleet ? (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[9px] uppercase tracking-widest font-bold">
                  SELECCIONA ACTIVOS O FLOTAS DEL PANEL SUPERIOR
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedFleet && (
                    <div className="flex items-center justify-between p-2 bg-cyan-950/80 border border-cyan-500/50 rounded-lg">
                      <span className="text-[8.5px] font-black text-cyan-300 uppercase truncate">FLOTA: {selectedFleet.name}</span>
                      <button onClick={() => setSelectedFleet(null)} className="p-1 text-zinc-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  {selectedAssets.map(asset => (
                    <div key={asset.id} className="flex items-center justify-between p-2 bg-[#050910] border border-cyan-500/30 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        {getCategoryIcon(asset.type as LeftMenuCategory)}
                        <span className="text-[8.5px] font-black text-white uppercase truncate">{asset.name}</span>
                      </div>
                      <button onClick={() => toggleAssetSelection(asset)} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN */}
      {isStartJourneyOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-md bg-[#080b0e] border border-cyan-500/40 rounded-2xl p-6 text-center space-y-4">
            <Rocket className="w-12 h-12 text-cyan-400 mx-auto animate-bounce" />
            <h3 className="text-lg font-black text-white uppercase">¿INICIAR EXPEDICIÓN EN {selectedGC || "PELA"}?</h3>
            {launchError && (
              <div className="p-3 bg-red-950/80 border border-red-500 text-red-300 text-[9px] uppercase font-bold rounded-lg flex items-center gap-2 text-left">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{launchError}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <button onClick={executeLaunchTransaction} disabled={loading} className="py-2.5 bg-cyan-950 border border-cyan-500 text-cyan-300 text-[10px] font-black uppercase rounded-lg hover:bg-cyan-900 cursor-pointer">CONFIRMAR VIAJE</button>
              <button onClick={() => setIsStartJourneyOpen(false)} className="py-2.5 bg-black border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase rounded-lg hover:bg-zinc-900 cursor-pointer">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

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
            <button onClick={handleAcceptRewardsClose} className="w-full py-2.5 bg-cyan-950 hover:bg-cyan-900 border-t border-cyan-950 text-cyan-300 text-[11px] font-black uppercase cursor-pointer">ACEPTAR</button>
          </div>
        </div>
      )}

    </div>
  );
};

export const ExpeditionsView = ExpeditionView;
export default ExpeditionView;