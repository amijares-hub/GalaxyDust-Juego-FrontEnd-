import React, { useState, useEffect, useMemo } from 'react';
import {
  CornerUpLeft, X, Search, Lock, MapPin, 
  Wrench, Bot, FileText, Package, Clock, Pickaxe, Radio, Compass, Box, Check, Trash2, Rocket, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAudioEngine } from '../hooks/useAudioEngine';

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
  effect?: number;
  skill_bonus?: number;
  
  min_metal_capacity?: number;
  max_metal_capacity?: number;
  min_crystal_capacity?: number;
  max_crystal_capacity?: number;
  
  can_mine_metal?: boolean;
  can_mine_crystal?: boolean;
  min_metal_bonus?: number;
  max_metal_bonus?: number;
  min_crystal_bonus?: number;
  max_crystal_bonus?: number;
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
  sc_id?: string;
  applied_success_rate?: number;
  progress?: number;
  status: 'LAUNCHED' | 'SUCCESS' | 'FAILED' | 'CLAIMED';
  estimated_return_time: string;
  launch_time: string;
  is_adrift?: boolean;
  type?: 'EXPLORATION' | 'MINING' | 'DOMINATION';
  
  equipped_assets?: Asset[];
  calculated_min_metal?: number;
  calculated_max_metal?: number;
  calculated_min_crystal?: number;
  calculated_max_crystal?: number;
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

export interface GCEntryRequirements {
  require_ship?: boolean;
  require_tool?: boolean;
  require_license?: boolean;
  require_non_nft?: boolean;
  prev_gc?: string | null;
  required_prev_count?: number;
}

export interface GCClusterData {
  id: string;
  name: string;
  entry_requirements?: GCEntryRequirements;
  min_metal?: number;
  max_metal?: number;
  min_crystal?: number;
  max_crystal?: number;
}

export type LeftMenuCategory = 'Fleets' | 'Naves' | 'Astrobots' | 'Tools' | 'Consumibles' | 'Licencia';
export type SelectionStep = 'GC' | 'GAL' | 'SC' | 'SS' | 'PLANETA';

export interface ExpeditionViewProps {
  initialView?: 'selection' | 'flights';
  onBack?: () => void;
  triggerNotification?: (text: string, e?: any) => void;
}

export type ExpeditionsViewProps = ExpeditionViewProps;

const isValidUUID = (str?: string | null): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

const resolveImageUrl = (rawUrl?: string, fallbackId?: string) => {
  if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '') {
    const clean = rawUrl.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (clean.includes('.') || clean.includes('/')) {
      return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/galaxy-assets/${clean.replace(/^\//, '')}`;
    }
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

const isShipAsset = (type: string) => ['naves', 'ship', 'ships', 'nave'].includes(type.toLowerCase());
const isToolAsset = (type: string) => ['tools', 'tool', 'herramientas', 'herramienta'].includes(type.toLowerCase());
const isLicenseAsset = (type: string) => ['licencia', 'license', 'licenses'].includes(type.toLowerCase());

export const ExpeditionView: React.FC<ExpeditionViewProps> = ({
  initialView = 'selection',
  onBack,
  triggerNotification
}) => {
  const { playSfx } = useAudioEngine();

  const [currentStep, setCurrentStep] = useState<SelectionStep>('GC');
  const [selectedGC, setSelectedGC] = useState<string | null>(null);
  const [selectedGAL, setSelectedGAL] = useState<string | null>(null);
  const [selectedSC, setSelectedSC] = useState<string | null>(null);
  const [selectedSS, setSelectedSS] = useState<string | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<DiscoveredStar | null>(null);

  const [completedCountsByGC, setCompletedCountsByGC] = useState<Record<string, number>>({});
  
  const [gcList, setGcList] = useState<GCClusterData[]>([]);
  const [dbGalaxies, setDbGalaxies] = useState<{ id: string; name: string }[]>([]);
  const [dbStarClusters, setDbStarClusters] = useState<{ id: string; name: string }[]>([]);
  const [dbStarSystems, setDbStarSystems] = useState<{ id: string; name: string }[]>([]);
  const [dbPlanets, setDbPlanets] = useState<DiscoveredStar[]>([]);

  const [isDispatchPanelActive, setIsDispatchPanelActive] = useState(false);
  const [isAdrift, setIsAdrift] = useState(false);

  const [now, setNow] = useState<number>(Date.now());

  const [currentLeftCategory, setCurrentLeftCategory] = useState<LeftMenuCategory>('Naves');
  const [inventoryAssets, setInventoryAssets] = useState<Asset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');
  
  const [globalPassiveBonus, setGlobalPassiveBonus] = useState<number>(0);
  const [userCanLevel, setUserCanLevel] = useState<number>(1);
  const [skillUnlockCrystal, setSkillUnlockCrystal] = useState<boolean>(false);

  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);
  const [activeExpeditions, setActiveExpeditions] = useState<Expedition[]>([]);
  const [expeditionLogs, setExpeditionLogs] = useState<Record<string, ExpeditionLog[]>>({});
  const [loading, setLoading] = useState(false);

  const [isStartJourneyOpen, setIsStartJourneyOpen] = useState(false);
  const [activeFlightCategory, setActiveFlightCategory] = useState<string>('ALL');
  const [flightSearchQuery, setFlightSearchQuery] = useState('');
  const [isRewardSummaryOpen, setIsRewardSummaryOpen] = useState(false);
  const [activeRewardTab, setActiveRewardTab] = useState<'ITEMS' | 'CURRENCIES' | 'LTD_CUR'>('ITEMS');
  const [claimingExpeditionId, setClaimingExpeditionId] = useState<string | null>(null);
  const [currentRewardDrop, setCurrentRewardDrop] = useState<MiningDrop | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const [showToolRequiredModal, setShowToolRequiredModal] = useState<boolean>(false);

  const leftMenuOptions: LeftMenuCategory[] = ['Fleets', 'Naves', 'Astrobots', 'Tools', 'Licencia', 'Consumibles'];

  // 🛡️ DETECTAR ACTIVOS EN VUELO PARA BLOQUEAR SU SELECCIÓN
  const inFlightAssetIds = useMemo(() => {
    const ids = new Set<string>();
    activeExpeditions.forEach((exp: any) => {
      const assets = exp.equipped_assets || exp.assets || exp.ships || [];
      if (Array.isArray(assets)) {
        assets.forEach((a: any) => {
          if (a.id) ids.add(a.id.toString());
        });
      }
      if (exp.fleet_id) {
        const fleet = fleets.find(f => f.id === exp.fleet_id);
        if (fleet) {
          (fleet.ships || []).forEach(s => ids.add(s.id.toString()));
          (fleet.tools || []).forEach(t => ids.add(t.id.toString()));
          (fleet.licenses || []).forEach(l => ids.add(l.id.toString()));
        }
      }
    });
    return ids;
  }, [activeExpeditions, fleets]);

  // 🎯 CÁLCULO DEL MODIFICADOR NETO
  const totalExpeditionProbability = useMemo(() => {
    let modifierSum = (userCanLevel * 5) + globalPassiveBonus;

    selectedAssets.forEach((asset: Asset) => {
      const effectVal = asset.effect !== undefined ? Number(asset.effect) : Number(asset.skill_bonus || 0);
      modifierSum += effectVal;
    });

    if (selectedFleet) {
      (selectedFleet.ships || []).forEach((s: any) => {
        modifierSum += Number(s.effect || s.mining_bonus || 0);
      });
      (selectedFleet.tools || []).forEach((t: any) => {
        modifierSum += Number(t.effect || t.mining_bonus || 0);
      });
    }

    return Number(modifierSum.toFixed(2));
  }, [selectedAssets, selectedFleet, globalPassiveBonus, userCanLevel]);

  const activeGcObject = useMemo(() => {
    return gcList.find(g => g.id === selectedGC) || null;
  }, [gcList, selectedGC]);

  const dynamicMiningRanges = useMemo(() => {
    if (!activeGcObject) return { minMetal: 0, maxMetal: 0, minCrystal: 0, maxCrystal: 0, canMineMetal: false, canMineCrystal: false };

    let minMetal = Number(activeGcObject.min_metal || 300);
    let maxMetal = Number(activeGcObject.max_metal || 1200);
    let minCrystal = Number(activeGcObject.min_crystal || 150);
    let maxCrystal = Number(activeGcObject.max_crystal || 600);

    let canMineMetal = true; 
    let canMineCrystal = skillUnlockCrystal;

    const allShips = [...selectedAssets.filter(a => isShipAsset(a.type)), ...(selectedFleet?.ships || [])];
    const allTools = [...selectedAssets.filter(a => isToolAsset(a.type)), ...(selectedFleet?.tools || [])];

    allShips.forEach(ship => {
      minMetal += Number(ship.min_metal_capacity || 0);
      maxMetal += Number(ship.max_metal_capacity || 0);
      minCrystal += Number(ship.min_crystal_capacity || 0);
      maxCrystal += Number(ship.max_crystal_capacity || 0);
    });

    if (allTools.length > 0) {
      const mainTool = allTools[0];
      canMineMetal = Boolean(mainTool.can_mine_metal !== false);
      if (mainTool.can_mine_crystal) canMineCrystal = true;

      minMetal += Number(mainTool.min_metal_bonus || 0);
      maxMetal += Number(mainTool.max_metal_bonus || 0);
      minCrystal += Number(mainTool.min_crystal_bonus || 0);
      maxCrystal += Number(mainTool.max_crystal_bonus || 0);
    }

    const modifierMult = 1.0 + (totalExpeditionProbability / 100.0);

    return {
      minMetal: canMineMetal ? Math.floor(minMetal * modifierMult) : 0,
      maxMetal: canMineMetal ? Math.floor(maxMetal * modifierMult) : 0,
      minCrystal: canMineCrystal ? Math.floor(minCrystal * modifierMult) : 0,
      maxCrystal: canMineCrystal ? Math.floor(maxCrystal * modifierMult) : 0,
      canMineMetal,
      canMineCrystal
    };
  }, [activeGcObject, selectedAssets, selectedFleet, totalExpeditionProbability, skillUnlockCrystal]);

  const formatBreadcrumbText = () => {
    const galObj = dbGalaxies.find(g => g.id === selectedGAL);
    const scObj = dbStarClusters.find(s => s.id === selectedSC);
    const ssObj = dbStarSystems.find(sys => sys.id === selectedSS);

    const parts = [
      activeGcObject?.name || selectedGC, 
      galObj ? galObj.name : (selectedGAL ? 'GAL' : null), 
      scObj ? scObj.name : (selectedSC ? 'SC' : null), 
      ssObj ? ssObj.name : (selectedSS ? 'SS' : null), 
      selectedPlanet?.name
    ].filter(Boolean);
    return parts.join(' > ') || 'SELECCIONA COORDENADAS GALÁCTICAS';
  };

  // Función para apilar activos duplicados con contador (x2, x3)
  const stackAssets = (rawAssets: Asset[]) => {
    const map = new Map<string, { asset: Asset; count: number }>();
    rawAssets.forEach(a => {
      const key = a.name || a.id;
      if (map.has(key)) {
        map.get(key)!.count += 1;
      } else {
        map.set(key, { asset: a, count: 1 });
      }
    });
    return Array.from(map.values());
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      } else { setDbGalaxies([]); }
    };
    fetchGalaxies();
    setSelectedGAL(null); setSelectedSC(null); setSelectedSS(null); setSelectedPlanet(null);
  }, [selectedGC]);

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
      } else { setDbStarClusters([]); }
    };
    fetchStarClusters();
    setSelectedSC(null); setSelectedSS(null); setSelectedPlanet(null);
  }, [selectedGAL]);

  useEffect(() => {
    if (!selectedSC) { setDbStarSystems([]); return; }
    const fetchDiscoveredStarSystems = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setDbStarSystems([]); return; }

      const { data: userDiscoveries } = await supabase
        .from('user_discovered_stars')
        .select('star_id')
        .eq('discoverer_id', user.id);

      const discoveredIds = (userDiscoveries || []).map((d: any) => d.star_id);

      if (discoveredIds.length === 0) { setDbStarSystems([]); return; }

      const { data } = await supabase
        .from('seed_star_systems')
        .select('id, name_code')
        .eq('sc_id', selectedSC)
        .in('id', discoveredIds);

      if (data && data.length > 0) {
        setDbStarSystems(data.map((sys: any) => ({ id: sys.id, name: sys.name_code || `SYS-${sys.id.substring(0, 4)}` })));
      } else { setDbStarSystems([]); }
    };

    fetchDiscoveredStarSystems();
    setSelectedSS(null); setSelectedPlanet(null);
  }, [selectedSC]);

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
          x: 0, y: 0,
          duration_hours: (loc.time_minutes || 60) / 60,
          risk_factor: 15
        })));
      } else { setDbPlanets([]); }
    };
    fetchPlanets();
    setSelectedPlanet(null);
  }, [selectedSS]);

  const syncDatabaseData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setInventoryAssets([]); setGcList([]); setLoading(false); return;
      }
      const userId = user.id;

      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle();
      if (profile) {
        setUserCanLevel(profile.level || profile.can_level || 1);
      }

      const { data: realGCs } = await supabase.from('seed_galaxy_clusters').select('*');
      if (realGCs && realGCs.length > 0) {
        const gcObjects: GCClusterData[] = realGCs.map((g: any) => ({
          id: g.id,
          name: g.name || g.id,
          entry_requirements: g.entry_requirements || {},
          min_metal: g.min_metal ?? 300,
          max_metal: g.max_metal ?? 1200,
          min_crystal: g.min_crystal ?? 150,
          max_crystal: g.max_crystal ?? 600
        }));
        setGcList(gcObjects);
        setSelectedGC(prev => prev ?? gcObjects[0].id);
      } else {
        setGcList([]);
      }

      let legacyUserId: number | null = null;
      if (profile?.legacy_id) legacyUserId = Number(profile.legacy_id);

      const { data: historyRows } = await supabase.from('expedition_history').select('*').eq('user_id', userId);
      const counts: Record<string, number> = {};
      (historyRows || []).forEach((row: any) => {
        const gc = row.galaxy_cluster || 'PELA';
        counts[gc] = (counts[gc] || 0) + 1;
      });
      setCompletedCountsByGC(counts);

      let globalNetBonus = 0;
      let hasCrystalUnlock = false;

      const { data: uStructs } = await supabase.from('user_structures').select('*, seed_structures(*)').eq('user_id', userId);
      (uStructs || []).forEach((s: any) => {
        const item = s.seed_structures;
        if (item) {
          globalNetBonus += Number(item.mining_bonus || item.effect || item.skill_bonus || 0);
          if (JSON.stringify(item.skills || {}).includes('crystal') || JSON.stringify(item.skills || {}).includes('cristal')) {
            hasCrystalUnlock = true;
          }
        }
      });

      const { data: uTech } = await supabase.from('user_technologies').select('*, seed_technologies(*)').eq('user_id', userId);
      (uTech || []).forEach((t: any) => {
        const item = t.seed_technologies;
        if (item) {
          globalNetBonus += Number(item.mining_bonus || item.effect || item.skill_bonus || 0);
          if (JSON.stringify(item.skills || {}).includes('crystal') || JSON.stringify(item.skills || {}).includes('cristal')) {
            hasCrystalUnlock = true;
          }
        }
      });

      const { data: uBadges } = await supabase.from('user_badges_unlocked').select('*, seed_badges(*)').eq('user_id', userId);
      (uBadges || []).forEach((b: any) => {
        const item = b.seed_badges;
        if (item) {
          globalNetBonus += Number(item.mining_bonus || item.effect || item.skill_bonus || 0);
          if (JSON.stringify(item.skills || {}).includes('crystal') || JSON.stringify(item.skills || {}).includes('cristal')) {
            hasCrystalUnlock = true;
          }
        }
      });

      setGlobalPassiveBonus(globalNetBonus);
      setSkillUnlockCrystal(hasCrystalUnlock);

      const loadCategoryAssets = async (
        userTable: string,
        seedTable: string,
        categoryType: Asset['type'],
        possibleFkCols: string[],
        nameCols: string[] = ['ship_name', 'name_ship', 'name', 'title']
      ): Promise<Asset[]> => {
        try {
          let query = supabase.from(userTable).select('*');
          if (userTable === 'user_ships') {
            if (legacyUserId !== null) {
              query = query.or(`user_id.eq.${userId},id_user.eq.${legacyUserId}`);
            } else {
              query = query.eq('user_id', userId);
            }
          } else {
            query = query.eq('user_id', userId);
          }

          const { data: userRows } = await query;
          if (!userRows || userRows.length === 0) return [];

          const { data: seedRows } = await supabase.from(seedTable).select('*');
          if (!seedRows || seedRows.length === 0) return [];

          const seedMap = new Map<string, any>();
          seedRows.forEach((s: any) => {
            const keysToRegister = [
              s.id, s.ship_id, s.id_ship, s.tool_id, s.astrobot_id,
              s.license_id, s.consumable_id, s.structure_id, s.technology_id
            ];
            keysToRegister.forEach(k => {
              if (k !== undefined && k !== null) {
                seedMap.set(k.toString(), s);
              }
            });
          });

          const assets: Asset[] = [];

          userRows.forEach((row: any) => {
            let targetId: string | null = null;
            for (const col of possibleFkCols) {
              if (row[col] !== undefined && row[col] !== null) {
                targetId = row[col].toString();
                break;
              }
            }

            if (!targetId) return;

            const seed = seedMap.get(targetId);

            let realName = row.custom_name || row.name_ship || row.name;
            if (seed) {
              for (const col of nameCols) {
                if (seed[col]) { realName = seed[col]; break; }
              }
            }
            if (!realName || realName === 'ACTIVO') {
              realName = `${categoryType} #${targetId}`;
            }

            const rawImg = seed?.image_url || seed?.avatar_url || seed?.avatar || seed?.image || row.image_url;
            const finalImg = resolveImageUrl(rawImg, targetId);

            const rawBonus = seed?.mining_bonus ?? seed?.expedition_bonus ?? seed?.success_bonus ?? seed?.effect ?? seed?.skill_bonus ?? 0;
            const realBonus = typeof rawBonus === 'number' ? rawBonus : (parseFloat(rawBonus) || 0);

            assets.push({
              id: row.id?.toString() || targetId,
              seed_id: targetId,
              name: realName,
              type: categoryType,
              rarity: seed?.rarity || 'Common',
              collection: seed?.company || seed?.collection || seed?.faction || 'GD',
              is_nft: seed?.is_nft || false,
              engine: seed?.engine || (realName.includes('HS') ? 'HS' : 'Impulse'),
              image_url: finalImg,
              quantity: row.quantity || row.amount || 1,
              level: row.current_level || row.level || 1,
              effect: realBonus,
              min_metal_capacity: seed?.min_metal_capacity,
              max_metal_capacity: seed?.max_metal_capacity,
              min_crystal_capacity: seed?.min_crystal_capacity,
              max_crystal_capacity: seed?.max_crystal_capacity,
              can_mine_metal: seed?.can_mine_metal,
              can_mine_crystal: seed?.can_mine_crystal,
              min_metal_bonus: seed?.min_metal_bonus,
              max_metal_bonus: seed?.max_metal_bonus,
              min_crystal_bonus: seed?.min_crystal_bonus,
              max_crystal_bonus: seed?.max_crystal_bonus
            });
          });

          return assets;
        } catch (catErr) {
          console.error(`Error cargando categoría ${categoryType}:`, catErr);
          return [];
        }
      };

      const [ships, tools, astrobots, consumables, licenses] = await Promise.all([
        loadCategoryAssets('user_ships', 'seed_ships', 'Naves', ['id_ship', 'ship_id', 'id']),
        loadCategoryAssets('user_tools', 'seed_tools', 'Tools', ['tool_id', 'id']),
        loadCategoryAssets('user_astrobots', 'seed_astrobots', 'Astrobots', ['astrobot_id', 'id']),
        loadCategoryAssets('user_consumibles', 'seed_consumables', 'Consumibles', ['consumable_id', 'id']),
        loadCategoryAssets('user_licenses', 'seed_licenses', 'Licencia', ['license_id', 'id'])
      ]);

      setInventoryAssets([...ships, ...tools, ...astrobots, ...consumables, ...licenses]);

      const { data: fleetData } = await supabase.from('fleets').select('*').eq('user_id', userId);
      if (fleetData) {
        setFleets(fleetData.map((f: any) => ({
          id: f.id?.toString(), name: f.name || 'Flota Alpha',
          total_power_score: f.total_power_score || 0,
          ships: f.ships || [], tools: f.tools || [], licenses: f.licenses || []
        })));
      }

      const { data: expData } = await supabase
        .from('active_expeditions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'LAUNCHED')
        .order('launch_time', { ascending: false });

      if (expData) setActiveExpeditions(expData);

      const { data: logsData } = await supabase.from('expedition_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (logsData) {
        const map: Record<string, ExpeditionLog[]> = {};
        logsData.forEach((log: any) => {
          if (!map[log.expedition_id]) map[log.expedition_id] = [];
          map[log.expedition_id].push(log);
        });
        setExpeditionLogs(map);
      }
    } catch (err) {
      if (triggerNotification) triggerNotification("⚠️ FALLO AL SINCRONIZAR INVENTARIO REAL");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncDatabaseData();
  }, []);

  const checkGCRequirements = (gcObj: GCClusterData): { allowed: boolean; reason?: string } => {
    const reqs = gcObj.entry_requirements || {};
    if (reqs.prev_gc) {
      const requiredCount = reqs.required_prev_count || 0;
      const prevCount = completedCountsByGC[reqs.prev_gc] || 0;
      if (prevCount < requiredCount) {
        return { allowed: false, reason: `REQUIERE ${requiredCount} EXPEDICIONES EN ${reqs.prev_gc} (${prevCount}/${requiredCount})` };
      }
    }
    return { allowed: true };
  };

  const validateFleetComposition = (gcObj: GCClusterData | null, assets: Asset[], fleet: Fleet | null): { valid: boolean; error?: string; missingTool?: boolean } => {
    const reqs = gcObj?.entry_requirements || {};
    const allShips = [...assets.filter(a => isShipAsset(a.type)), ...(fleet?.ships || [])];
    const allTools = [...assets.filter(a => isToolAsset(a.type)), ...(fleet?.tools || [])];
    const allLicenses = [...assets.filter(a => isLicenseAsset(a.type)), ...(fleet?.licenses || [])];

    if (reqs.require_non_nft || isAdrift) {
      const hasNonNFT = allShips.some(s => s.is_nft === false || !s.is_nft);
      if (!hasNonNFT) return { valid: false, error: "REQUISITO: La flota debe incluir al menos UNA NAVE NO-NFT." };
    }
    if (reqs.require_ship && allShips.length === 0) return { valid: false, error: `REQUISITO: Debes incluir al menos UNA NAVE.` };
    if (reqs.require_tool && allTools.length === 0) return { valid: false, error: `REQUISITO DE EXTRACCIÓN: Se requiere al menos una Herramienta (Tool) para extracción.`, missingTool: true };
    if (reqs.require_license && allLicenses.length === 0) return { valid: false, error: `REQUISITO: Debes incluir una LICENCIA espacial activa.` };
    return { valid: true };
  };

  // 🛡️ BLOQUEO DE SELECCIÓN SI EL ACTIVO ESTÁ EN VUELO
  const toggleAssetSelection = (asset: Asset) => {
    if (inFlightAssetIds.has(asset.id)) {
      playSfx(300);
      if (triggerNotification) triggerNotification("⛔ ESTE ACTIVO SE ENCUENTRA EN VUELO Y NO SE PUEDE SELECCIONAR");
      return;
    }

    playSfx(660);
    if (selectedAssets.find(a => a.id === asset.id)) {
      setSelectedAssets(prev => prev.filter(a => a.id !== asset.id));
    } else {
      setSelectedAssets(prev => [...prev, asset]);
      if (triggerNotification) triggerNotification(`➕ ${asset.name} AÑADIDO`);
    }
  };

  const handleOpenJourneyModal = () => {
    playSfx(880);
    const compValidation = validateFleetComposition(activeGcObject, selectedAssets, selectedFleet);
    if (!compValidation.valid) {
      if (compValidation.missingTool) {
        playSfx(300);
        setShowToolRequiredModal(true);
        return;
      }
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
    playSfx(1200);

    const compValidation = validateFleetComposition(activeGcObject, selectedAssets, selectedFleet);
    if (!compValidation.valid) {
      if (compValidation.missingTool) {
        setIsStartJourneyOpen(false);
        setShowToolRequiredModal(true);
        return;
      }
      setLaunchError(compValidation.error || "Validación fallida.");
      if (triggerNotification) triggerNotification(`⛔ ${compValidation.error}`);
      return;
    }

    setLoading(true);

    try {
      const duration = selectedPlanet?.duration_hours || 2;
      const scObj = dbStarClusters.find(s => s.id === selectedSC);
      const fleetName = selectedFleet?.name || (selectedAssets.length > 0 ? selectedAssets[0].name : "FLOTA INDEPENDIENTE");
      const sectorName = selectedPlanet ? selectedPlanet.name : (scObj ? `EXPEDICIÓN SC: ${scObj.name}` : "NUEVO SECTOR EN DERIVA");

      const deployedAssets: Asset[] = [...selectedAssets];
      if (selectedFleet) {
        if (selectedFleet.ships) deployedAssets.push(...selectedFleet.ships);
        if (selectedFleet.tools) deployedAssets.push(...selectedFleet.tools);
        if (selectedFleet.licenses) deployedAssets.push(...selectedFleet.licenses);
      }

      const payload = {
        fleet_id: selectedFleet?.id || null,
        fleet_name: fleetName,
        sector_name: sectorName,
        galaxy_cluster: selectedGC || "INARA",
        star_cluster: scObj?.name || selectedSC || "STARCLUSTER GOAL",
        sc_id: selectedSC || null,
        applied_success_rate: totalExpeditionProbability,
        duration_hours: duration,
        risk_factor: isAdrift ? 40 : (selectedPlanet?.risk_factor || 15),
        is_adrift: isAdrift,
        
        calculated_min_metal: dynamicMiningRanges.minMetal,
        calculated_max_metal: dynamicMiningRanges.maxMetal,
        calculated_min_crystal: dynamicMiningRanges.minCrystal,
        calculated_max_crystal: dynamicMiningRanges.maxCrystal,

        equipped_assets: deployedAssets.map(a => ({
          id: a.id,
          name: a.name,
          image_url: a.image_url,
          type: a.type,
          rarity: a.rarity
        }))
      };

      const { error } = await supabase.rpc('launch_expedition_secure', {
        p_payload: payload
      });

      if (error) throw error;

      setIsStartJourneyOpen(false);
      setSelectedAssets([]);
      setIsDispatchPanelActive(false);
      setCurrentStep('GC');
      setSelectedPlanet(null);

      syncDatabaseData();
      if (triggerNotification) triggerNotification(`🚀 EXPEDICIÓN DESPLEGADA (${totalExpeditionProbability}% NETO)`);
    } catch (err: any) {
      console.error("Error al desplegar expedición:", err);
      setLaunchError(err.message || "Error de comunicación");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimExpeditionRewards = async (exp: Expedition) => {
    const returnMs = new Date(exp.estimated_return_time).getTime();
    if (now < returnMs) {
      playSfx(300);
      if (triggerNotification) triggerNotification("⛔ REQUISITO: La expedición aún no ha finalizado su tiempo de tránsito.");
      return;
    }

    setClaimingExpeditionId(exp.id);
    playSfx(880);

    try {
      if (isValidUUID(exp.id)) {
        const { data, error } = await supabase.rpc('claim_expedition_secure', {
          p_expedition_id: exp.id
        });

        if (error) throw error;

        playSfx(1200);

        const drop: MiningDrop = {
          name: `METAL: +${data.metal_mined.toLocaleString()} | CRISTAL: +${data.crystal_mined.toLocaleString()}`,
          amount: 1,
          rarity: "EPIC",
          icon: "💎"
        };
        setCurrentRewardDrop(drop);
        setIsRewardSummaryOpen(true);

        if (triggerNotification) {
          triggerNotification(`✅ BILLETERA ACTUALIZADA Y PLANETA ${exp.sector_name.toUpperCase()} REGISTRADO`);
        }
      }

      syncDatabaseData();
    } catch (err: any) {
      console.error("Error al reclamar recompensas:", err);
      if (triggerNotification) triggerNotification(`⛔ ERROR AL RECLAMAR: ${err.message}`);
      setClaimingExpeditionId(null);
    }
  };

  const handleClaimAllExpeditions = async () => {
    const finishedFlights = getFilteredFlights().filter(exp => {
      const returnMs = new Date(exp.estimated_return_time).getTime();
      return now >= returnMs;
    });

    if (finishedFlights.length === 0) {
      if (triggerNotification) triggerNotification("⚠️ NO HAY EXPEDICIONES FINALIZADAS PARA RECLAMAR");
      return;
    }

    for (const exp of finishedFlights) {
      await handleClaimExpeditionRewards(exp);
    }
  };

  const handleAcceptRewardsClose = () => {
    playSfx(440);
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

  const hasFinishedFlights = useMemo(() => {
    return getFilteredFlights().some(exp => new Date(exp.estimated_return_time).getTime() <= now);
  }, [activeExpeditions, activeFlightCategory, flightSearchQuery, now]);

  const filteredInventory = useMemo(() => {
    if (currentLeftCategory === 'Fleets') return [];
    return inventoryAssets.filter(a => {
      const matchesCategory = a.type.toLowerCase() === currentLeftCategory.toLowerCase();
      const matchesSearch = assetSearchQuery.trim() === '' || a.name.toLowerCase().includes(assetSearchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [inventoryAssets, currentLeftCategory, assetSearchQuery]);

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
              disabled={!hasFinishedFlights}
              className="px-3 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[8.5px] font-black uppercase rounded-lg shadow-lg cursor-pointer transition-all"
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
                  onClick={() => { playSfx(660); setActiveFlightCategory(cat); }}
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

                const isFlightFinished = remainingMs === 0;
                const deployedAssets = exp.equipped_assets || [];

                return (
                  <div key={exp.id} className="p-3.5 rounded-xl border border-cyan-500/40 bg-[#050910] shadow-lg flex flex-col justify-between gap-2.5 relative overflow-hidden">
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

                    {/* MUESTRA DE ACTIVOS EQUIPADOS STACKEADOS (x2, x3) */}
                    {deployedAssets.length > 0 && (
                      <div className="bg-[#020508] p-2 rounded-lg border border-cyan-950 flex flex-col gap-1">
                        <span className="text-[7px] font-bold text-zinc-400 uppercase">ACTIVIDAD Y COMPOSICIÓN DE FLOTA:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {stackAssets(deployedAssets).map(({ asset, count }) => (
                            <div key={asset.id || asset.name} className="relative bg-black/80 border border-cyan-900 rounded p-1 flex items-center gap-1">
                              <img src={asset.image_url} alt={asset.name} className="w-5 h-5 object-cover rounded" />
                              <span className="text-[7px] font-bold text-white truncate max-w-[80px]">{asset.name}</span>
                              {count > 1 && (
                                <span className="bg-cyan-950 border border-cyan-500 text-cyan-300 text-[6.5px] font-black px-1 rounded-full">
                                  x{count}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-[#020508] p-2 rounded-lg border border-cyan-950 flex justify-between items-center text-[8px]">
                      <span className="text-zinc-400 uppercase flex items-center gap-1 font-bold">
                        <Pickaxe className="w-3 h-3 text-amber-400" /> RANGO VISUAL DE MINADO:
                      </span>
                      <div className="flex flex-col gap-0.5 font-mono font-bold text-[7px] text-right">
                        {exp.calculated_max_metal && exp.calculated_max_metal > 0 ? (
                           <span className="text-zinc-300">Metal: <span className="text-cyan-300">[{exp.calculated_min_metal?.toLocaleString()} ~ {exp.calculated_max_metal?.toLocaleString()}]</span></span>
                        ) : <span className="text-zinc-500 line-through">Metal NO APTO</span>}
                        
                        {exp.calculated_max_crystal && exp.calculated_max_crystal > 0 ? (
                           <span className="text-zinc-300">Cristal: <span className="text-purple-300">[{exp.calculated_min_crystal?.toLocaleString()} ~ {exp.calculated_max_crystal?.toLocaleString()}]</span></span>
                        ) : <span className="text-zinc-500 line-through">Cristal NO APTO</span>}
                      </div>
                    </div>

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

                    <button 
                      onClick={() => handleClaimExpeditionRewards(exp)} 
                      disabled={!isFlightFinished || claimingExpeditionId === exp.id}
                      className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[9px] uppercase rounded-lg shadow cursor-pointer hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-emerald-500/50"
                    >
                      {!isFlightFinished 
                        ? 'TRANSITANDO (BLOQUEADO)' 
                        : claimingExpeditionId === exp.id 
                          ? 'VERIFICANDO RED...' 
                          : 'CLAIM REWARDS'}
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
              onClick={() => { playSfx(660); setIsDispatchPanelActive(false); }}
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
                  { id: 'SS', label: 'SS', isUnlocked: selectedSC !== null && dbStarSystems.length > 0 },
                  { id: 'PLANETA', label: 'PLANETA', isUnlocked: selectedSS !== null && dbPlanets.length > 0 }
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    disabled={!tab.isUnlocked}
                    onClick={() => { playSfx(660); setCurrentStep(tab.id as SelectionStep); }}
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

              <div className="p-1 flex flex-col gap-1.5 max-h-[310px] overflow-y-auto pr-1">
                {/* GALAXY CLUSTERS */}
                {currentStep === 'GC' && (
                  gcList.length === 0 ? (
                    <div className="p-8 text-center text-zinc-600 text-[9px] uppercase italic">
                      {loading ? 'Cargando Clústeres...' : 'No hay Galaxy Clusters registrados.'}
                    </div>
                  ) : (
                    gcList.map((gc) => {
                      const reqCheck = checkGCRequirements(gc);
                      const isSelected = selectedGC === gc.id;
                      const reqs = gc.entry_requirements || {};

                      return (
                        <div
                          key={gc.id}
                          onClick={() => {
                            if (reqCheck.allowed) {
                              playSfx(880);
                              setSelectedGC(gc.id);
                              setCurrentStep('GAL');
                            } else if (triggerNotification) {
                              playSfx(300);
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
                            <span className="font-extrabold text-white">{gc.name}</span>
                            {!reqCheck.allowed
                              ? <Lock className="w-3 h-3 text-red-500 shrink-0" />
                              : <span className="text-[7.5px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded font-black">OK</span>
                            }
                          </div>
                          <div className="text-[7px] text-zinc-400 font-mono space-y-0.5">
                            {reqs.prev_gc && (
                              <p className={reqCheck.allowed ? "text-emerald-400" : "text-amber-400 font-bold"}>
                                • Req: {reqs.required_prev_count || 0} exp. en {reqs.prev_gc} ({completedCountsByGC[reqs.prev_gc] || 0}/{reqs.required_prev_count || 0})
                              </p>
                            )}
                            <p>
                              • Req: {reqs.require_ship ? 'Nave ' : ''}
                              {reqs.require_tool ? '+ Tool ' : ''}
                              {reqs.require_license ? '+ Licencia ' : ''}
                              {reqs.require_non_nft ? '+ Nave NO-NFT' : ''}
                            </p>
                            <p className="text-zinc-600">• ID: {gc.id}</p>
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {/* GALAXIAS */}
                {currentStep === 'GAL' && (
                  dbGalaxies.length === 0 ? (
                    <div className="p-4 text-center text-zinc-600 text-[9px] uppercase italic">No hay galaxias en este GC.</div>
                  ) : (
                    dbGalaxies.map((gal) => (
                      <button 
                        key={gal.id} 
                        onClick={() => { playSfx(880); setSelectedGAL(gal.id); setCurrentStep('SC'); }} 
                        className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase cursor-pointer text-left ${
                          selectedGAL === gal.id ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-[#0a0f14] border-cyan-950 text-zinc-300 hover:border-cyan-800'
                        }`}
                      >
                        {gal.name}
                      </button>
                    ))
                  )
                )}

                {/* STAR CLUSTERS */}
                {currentStep === 'SC' && (
                  dbStarClusters.length === 0 ? (
                    <div className="p-4 text-center text-zinc-600 text-[9px] uppercase italic">No hay Star Clusters en esta galaxia.</div>
                  ) : (
                    dbStarClusters.map((sc) => {
                      const isSelected = selectedSC === sc.id;
                      return (
                        <button 
                          key={sc.id} 
                          onClick={() => {
                            playSfx(880);
                            setSelectedSC(sc.id);
                          }} 
                          className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase cursor-pointer text-left transition-all ${
                            isSelected ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-md' : 'bg-[#0a0f14] border-cyan-950 text-zinc-300 hover:border-cyan-800'
                          }`}
                        >
                          {sc.name}
                        </button>
                      );
                    })
                  )
                )}

                {/* PANEL DE ACCIONES AL SELECCIONAR UN SC */}
                {currentStep === 'SC' && selectedSC && (
                  <div className="bg-[#05070a] border border-cyan-500/40 p-3 rounded-xl flex flex-col items-center gap-2 mt-1">
                    <div className="text-center">
                      <p className="text-[10px] text-amber-400 font-bold">
                        🎯 PROBABILIDAD DE DESCUBRIMIENTO DE SS: {totalExpeditionProbability}%
                      </p>
                      <p className="text-[7.5px] text-zinc-500 mt-0.5">
                        (CAN: +{userCanLevel * 5}% | Pasivo: {globalPassiveBonus >= 0 ? `+${globalPassiveBonus}` : globalPassiveBonus}%)
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        playSfx(880);
                        setIsAdrift(false);
                        setIsDispatchPanelActive(true);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-cyan-600 to-teal-600 border border-cyan-400 text-white text-[9.5px] font-black uppercase rounded-lg shadow-lg cursor-pointer hover:brightness-110 flex items-center justify-center gap-1.5"
                    >
                      <Compass className="w-3.5 h-3.5" /> LANZAR MISIÓN RECONOCIMIENTO AL SC
                    </button>

                    {dbStarSystems.length > 0 && (
                      <button
                        onClick={() => { playSfx(660); setCurrentStep('SS'); }}
                        className="w-full py-1.5 bg-[#0a0f18] border border-cyan-800 text-cyan-300 text-[8.5px] font-bold uppercase rounded-lg hover:border-cyan-500 cursor-pointer"
                      >
                        🔎 VER SISTEMAS SOLARES DESCUBIERTOS ({dbStarSystems.length})
                      </button>
                    )}
                  </div>
                )}

                {/* STAR SYSTEMS */}
                {currentStep === 'SS' && (
                  dbStarSystems.length === 0 ? (
                    <div className="p-4 text-center text-zinc-600 text-[9px] uppercase italic space-y-2">
                      <p>No se han descubierto sistemas solares en este SC.</p>
                      <button
                        onClick={() => { playSfx(660); setCurrentStep('SC'); }}
                        className="px-3 py-1 bg-cyan-950 border border-cyan-800 text-cyan-300 text-[8px] font-bold rounded cursor-pointer"
                      >
                        ← Volver a SC y Enviar Misión de Reconocimiento
                      </button>
                    </div>
                  ) : (
                    dbStarSystems.map((ss) => (
                      <button 
                        key={ss.id} 
                        onClick={() => { playSfx(880); setSelectedSS(ss.id); setCurrentStep('PLANETA'); }} 
                        className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase cursor-pointer text-left ${
                          selectedSS === ss.id ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-[#0a0f14] border-cyan-950 text-zinc-300 hover:border-cyan-800'
                        }`}
                      >
                        {ss.name}
                      </button>
                    ))
                  )
                )}

                {/* PLANETAS */}
                {currentStep === 'PLANETA' && (
                  dbPlanets.length === 0 ? (
                    <div className="p-3 bg-cyan-950/20 border border-cyan-900/50 rounded-xl text-center space-y-2">
                      <p className="text-[8px] text-zinc-400 uppercase">Sin planetas registrados en este sistema.</p>
                      <button onClick={() => { playSfx(880); setIsAdrift(true); setIsDispatchPanelActive(true); }} className="w-full py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-black text-[8.5px] uppercase rounded-lg shadow cursor-pointer">
                        CONFIGURAR FLOTA EN DERIVA
                      </button>
                    </div>
                  ) : (
                    dbPlanets.map((planet) => (
                      <div 
                        key={planet.id} 
                        onClick={() => { playSfx(880); setSelectedPlanet(planet); setIsAdrift(false); setIsDispatchPanelActive(true); }} 
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
          <div className="flex-1 border border-cyan-500/30 bg-[#05070a] rounded-xl relative overflow-hidden flex flex-col justify-center items-center shadow-2xl h-full p-6 text-center">
            {selectedSC ? (
              <div className="flex flex-col items-center gap-4 max-w-md bg-[#0a0f18] p-6 border border-cyan-500/40 rounded-2xl shadow-xl">
                <div>
                  <h3 className="text-sm font-black text-white uppercase">
                    DESTINO: {selectedPlanet ? selectedPlanet.name : `STAR CLUSTER [${dbStarClusters.find(s => s.id === selectedSC)?.name || selectedSC}]`}
                  </h3>
                  <p className="text-[11px] text-amber-400 font-extrabold mt-2">
                    🎯 {selectedPlanet ? "EFICIENCIA DE EXTRACCIÓN DE MINADO:" : "PROBABILIDAD DE DESCUBRIMIENTO DE SS:"} {totalExpeditionProbability}%
                  </p>
                  <p className="text-[8.5px] text-zinc-500 mt-0.5">
                    (CAN Nivel {userCanLevel}: +{userCanLevel * 5}% | Pasivo: {globalPassiveBonus >= 0 ? `+${globalPassiveBonus}` : globalPassiveBonus}%)
                  </p>
                </div>

                <button
                  onClick={() => { playSfx(880); setIsDispatchPanelActive(true); }}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 border border-cyan-400 text-white text-[11px] font-black uppercase rounded-lg shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                >
                  EQUIPAR Y DESPLEGAR MISIÓN
                </button>
              </div>
            ) : (
              <div className="text-zinc-600 text-xs font-bold uppercase tracking-widest">
                SELECCIONA UN STAR CLUSTER (SC) PARA PREPARAR LA MISIÓN
              </div>
            )}
          </div>

        </div>
      ) : (
        /* VISTA DISPATCH PANEL (EQUIPAR ACTIVOS) */
        <div className="w-full flex-1 flex flex-col md:flex-row gap-3.5 h-[480px]">
          {/* SIDEBAR DE CATEGORÍAS */}
          <div className="w-full md:w-[240px] border border-cyan-500/20 bg-[#05070a] rounded-xl shrink-0 p-3 flex flex-col justify-between h-full">
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-bold text-zinc-400 uppercase px-1 pb-1 border-b border-cyan-950">
                SELECCIONAR CATEGORÍA
              </span>
              {leftMenuOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { playSfx(660); setCurrentLeftCategory(opt as LeftMenuCategory); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[9.5px] font-bold uppercase border cursor-pointer flex items-center gap-2 ${
                    currentLeftCategory === opt ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black' : 'bg-[#0a0f14] text-zinc-400 border-transparent hover:text-zinc-200'
                  }`}
                >
                  {getCategoryIcon(opt as LeftMenuCategory)}
                  <span>{opt}</span>
                </button>
              ))}
            </div>

            <div className="mt-auto space-y-2">
               {/* PREVISUALIZACIÓN DE RANGOS DE EXTRACCIÓN */}
               <div className="bg-[#020508] p-2 rounded-lg border border-cyan-900/50 flex flex-col gap-1 text-[7px] font-mono">
                 <span className="text-cyan-400 font-bold uppercase mb-0.5">Rango Estimado de Extracción:</span>
                 {dynamicMiningRanges.canMineMetal ? (
                   <div className="flex justify-between">
                     <span className="text-zinc-400">Metal:</span>
                     <span className="text-cyan-300 font-bold">[{dynamicMiningRanges.minMetal.toLocaleString()} ~ {dynamicMiningRanges.maxMetal.toLocaleString()}]</span>
                   </div>
                 ) : (
                   <div className="flex justify-between">
                     <span className="text-zinc-500 line-through">Metal:</span>
                     <span className="text-zinc-600">No apto</span>
                   </div>
                 )}
                 {dynamicMiningRanges.canMineCrystal ? (
                   <div className="flex justify-between">
                     <span className="text-zinc-400">Cristal:</span>
                     <span className="text-purple-300 font-bold">[{dynamicMiningRanges.minCrystal.toLocaleString()} ~ {dynamicMiningRanges.maxCrystal.toLocaleString()}]</span>
                   </div>
                 ) : (
                   <div className="flex justify-between">
                     <span className="text-zinc-500 line-through">Cristal:</span>
                     <span className="text-zinc-600">No apto</span>
                   </div>
                 )}
               </div>

              <button
                onClick={handleOpenJourneyModal}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-black text-[10px] uppercase rounded-lg border border-cyan-400 shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all"
              >
                {selectedPlanet ? "CONFIRMAR MINADO" : "CONFIRMAR RECONOCIMIENTO"} ({totalExpeditionProbability}%)
              </button>
            </div>
          </div>

          {/* CONTENEDOR PRINCIPAL: BÚSQUEDA + GRID DISPONIBLE (2x4) + GRID SELECCIONADO */}
          <div className="flex-1 border border-cyan-500/20 bg-[#05070a] p-3 rounded-xl flex flex-col justify-between gap-2.5 h-full overflow-hidden">
            
            {/* 1. SECCIÓN SUPERIOR: HEADER (TEXTO LIMPIO SIN ICONO) + BARRA DE BÚSQUEDA */}
            <div className="flex items-center justify-between gap-2 bg-[#020508] p-2 rounded-lg border border-cyan-950 shrink-0">
              <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">
                DISPONIBLES: {currentLeftCategory.toUpperCase()} ({filteredInventory.length})
              </span>

              {currentLeftCategory !== 'Fleets' && (
                <div className="relative w-52">
                  <Search className="absolute left-2.5 top-2 w-3 h-3 text-cyan-500" />
                  <input
                    type="text"
                    placeholder="BUSCAR POR NOMBRE..."
                    value={assetSearchQuery}
                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                    className="w-full bg-[#0a0f14] border border-cyan-900 rounded-md pl-7 pr-2 py-1 text-[8px] text-cyan-200 placeholder-zinc-600 outline-none uppercase font-mono focus:border-cyan-500 transition-colors"
                  />
                  {assetSearchQuery && (
                    <button onClick={() => setAssetSearchQuery('')} className="absolute right-2 top-1.5 text-zinc-500 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. COMPONENTE DISPONIBLES: GRID 2 FILAS x 4 COLUMNAS CON SCROLL INTERNO Y BLOQUEO EN VUELO */}
            <div className="flex-1 border border-cyan-950/60 bg-black/40 rounded-xl p-1.5 overflow-hidden flex flex-col">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 overflow-y-auto max-h-[145px] pr-1 custom-scrollbar">
                {currentLeftCategory === 'Fleets' ? (
                  fleets.length === 0 ? (
                    <div className="col-span-full p-6 text-center text-zinc-600 text-[8.5px] uppercase tracking-widest">
                      NO HAY FLOTAS REGISTRADAS EN TU PERFIL
                    </div>
                  ) : (
                    fleets.map(fleet => {
                      const isSelected = selectedFleet?.id === fleet.id;
                      return (
                        <div
                          key={fleet.id}
                          onClick={() => {
                            playSfx(880);
                            setSelectedFleet(isSelected ? null : fleet);
                          }}
                          className={`p-2 rounded-lg border cursor-pointer flex flex-col justify-between transition-all ${
                            isSelected ? 'bg-cyan-950/90 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : 'bg-[#050910] border-cyan-950 hover:border-cyan-800'
                          }`}
                        >
                          <span className="text-[8.5px] font-black text-white uppercase truncate">{fleet.name}</span>
                          <span className="text-[7px] text-cyan-400 font-mono mt-1">PODER: {fleet.total_power_score} POW</span>
                        </div>
                      );
                    })
                  )
                ) : filteredInventory.length === 0 ? (
                  <div className="col-span-full p-6 text-center text-zinc-600 text-[8.5px] uppercase tracking-widest">
                    {assetSearchQuery ? `SIN COINCIDENCIAS PARA "${assetSearchQuery.toUpperCase()}"` : `SIN ACTIVOS EN [${currentLeftCategory.toUpperCase()}]`}
                  </div>
                ) : (
                  filteredInventory.map(asset => {
                    const isSelected = selectedAssets.some(a => a.id === asset.id);
                    const isInFlight = inFlightAssetIds.has(asset.id);
                    const effectVal = asset.effect || 0;

                    return (
                      <div
                        key={asset.id}
                        onClick={() => toggleAssetSelection(asset)}
                        className={`p-1.5 rounded-lg border flex items-center gap-2 transition-all ${
                          isInFlight 
                            ? 'bg-red-950/20 border-red-900/60 opacity-60 cursor-not-allowed' 
                            : isSelected 
                            ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)] cursor-pointer' 
                            : 'bg-[#050910] border-cyan-950 hover:border-cyan-800 cursor-pointer'
                        }`}
                      >
                        <div className="w-8 h-8 rounded bg-black border border-cyan-950 shrink-0 overflow-hidden relative">
                          <img src={asset.image_url} className={`w-full h-full object-cover ${isInFlight ? 'grayscale' : ''}`} alt={asset.name} />
                          {isSelected && !isInFlight && (
                            <div className="absolute inset-0 bg-cyan-500/30 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-cyan-300 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col text-left overflow-hidden flex-1 leading-tight">
                          <span className="text-[8px] font-black text-white truncate">{asset.name}</span>
                          {isInFlight ? (
                            <span className="text-[6.5px] text-red-400 font-mono font-black uppercase">EN VUELO</span>
                          ) : effectVal !== 0 ? (
                            <span className={`text-[6.5px] font-mono font-bold ${effectVal > 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                              {effectVal > 0 ? `+${effectVal.toFixed(1)}%` : `${effectVal.toFixed(1)}%`}
                            </span>
                          ) : (
                            <span className="text-[6.5px] text-zinc-500 font-mono uppercase">{asset.rarity}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 3. COMPONENTE DE ACTIVOS SELECCIONADOS (TEXTO LIMPIO SIN ICONO) */}
            <div className="border border-cyan-500/40 bg-black/60 rounded-xl p-2 flex flex-col gap-1.5 shrink-0">
              <div className="flex justify-between items-center px-1">
                <span className="text-[8.5px] font-black text-amber-400 uppercase tracking-wider">
                  ACTIVOS SELECCIONADOS PARA DESPLIEGUE ({selectedAssets.length + (selectedFleet ? 1 : 0)})
                </span>
                {(selectedAssets.length > 0 || selectedFleet) && (
                  <button
                    onClick={() => {
                      playSfx(440);
                      setSelectedAssets([]);
                      setSelectedFleet(null);
                    }}
                    className="text-[7.5px] text-red-400 hover:text-red-300 font-bold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-2.5 h-2.5" /> LIMPIAR SELECCIÓN
                  </button>
                )}
              </div>

              {/* GRID 2 FILAS x 4 COLUMNAS CON SCROLL INTERNO SI SUPERA 8 TARJETAS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[145px] overflow-y-auto pr-1 custom-scrollbar p-1 bg-[#020508] rounded-lg border border-cyan-950">
                {selectedFleet && (
                  <div
                    onClick={() => { playSfx(440); setSelectedFleet(null); }}
                    className="p-1.5 rounded-lg border border-purple-500/60 bg-purple-950/40 cursor-pointer flex items-center gap-2 hover:border-purple-400 transition-all"
                  >
                    <div className="w-8 h-8 rounded bg-purple-900/60 border border-purple-800 shrink-0 flex items-center justify-center font-black text-purple-200 text-[10px]">
                      FLT
                    </div>
                    <div className="flex flex-col text-left overflow-hidden flex-1 leading-tight">
                      <span className="text-[8px] font-black text-white truncate">{selectedFleet.name}</span>
                      <span className="text-[6.5px] text-purple-300 font-mono font-bold">FLOTA EQUIPADA</span>
                    </div>
                  </div>
                )}

                {selectedAssets.length === 0 && !selectedFleet ? (
                  <div className="col-span-full py-4 text-center text-zinc-600 text-[8px] uppercase italic">
                    HAZ CLIC EN LOS ACTIVOS DE ARRIBA PARA AÑADIRLOS A ESTA EXPEDICIÓN
                  </div>
                ) : (
                  selectedAssets.map(asset => {
                    const effectVal = asset.effect || 0;
                    return (
                      <div
                        key={`selected-${asset.id}`}
                        onClick={() => toggleAssetSelection(asset)}
                        className="p-1.5 rounded-lg border border-cyan-500/60 bg-cyan-950/60 cursor-pointer flex items-center gap-2 hover:border-cyan-300 transition-all relative group"
                      >
                        <div className="w-8 h-8 rounded bg-black border border-cyan-900 shrink-0 overflow-hidden">
                          <img src={asset.image_url} className="w-full h-full object-cover" alt={asset.name} />
                        </div>
                        <div className="flex flex-col text-left overflow-hidden flex-1 leading-tight">
                          <span className="text-[8px] font-black text-white truncate">{asset.name}</span>
                          {effectVal !== 0 ? (
                            <span className={`text-[6.5px] font-mono font-bold ${effectVal > 0 ? 'text-cyan-300' : 'text-red-300'}`}>
                              {effectVal > 0 ? `+${effectVal.toFixed(1)}%` : `${effectVal.toFixed(1)}%`}
                            </span>
                          ) : (
                            <span className="text-[6.5px] text-cyan-400/70 font-mono uppercase">{asset.type}</span>
                          )}
                        </div>
                        <div className="absolute -top-1 -right-1 bg-red-950 border border-red-500 text-red-300 rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 4. BARRA DE ESTADO INFERIOR CON MÉTRICA DISTINGUIDA */}
            <div className="p-2.5 bg-[#020508] border border-cyan-950 rounded-lg flex justify-between items-center text-[9.5px] shrink-0">
              <span className="text-zinc-400 font-bold uppercase">
                {selectedPlanet ? "EFICIENCIA DE EXTRACCIÓN APLICADA:" : "PROBABILIDAD DE DESCUBRIMIENTO DE SS:"}
              </span>
              <span className={`font-black text-xs ${totalExpeditionProbability >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                {totalExpeditionProbability}%
              </span>
            </div>

          </div>
        </div>
      )}

      {/* 🛠️ POP-UP DEDICADO DE REQUISITO DE TOOL */}
      {showToolRequiredModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-md bg-[#080b0e] border-2 border-cyan-500/80 rounded-2xl p-6 text-center space-y-4 shadow-[0_0_35px_rgba(6,182,212,0.3)]">
            <h3 className="text-sm font-black text-white uppercase tracking-widest pt-2">
              HERRAMIENTA (TOOL) REQUERIDA
            </h3>
            
            <p className="text-[9.5px] text-zinc-300 leading-relaxed font-sans normal-case bg-black/50 p-3 rounded-xl border border-cyan-950">
              Para desplegar esta expedición en el clúster es obligatorio equipar al menos una <strong className="text-cyan-400">Herramienta (Tool)</strong> de extracción en la flota.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => {
                  playSfx(880);
                  setShowToolRequiredModal(false);
                  setCurrentLeftCategory('Tools');
                }}
                className="py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-[9px] font-black uppercase rounded-lg border border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)] cursor-pointer hover:brightness-110 active:scale-95 transition-all"
              >
                SELECCIONAR TOOL
              </button>
              <button
                onClick={() => {
                  playSfx(440);
                  setShowToolRequiredModal(false);
                }}
                className="py-2.5 bg-black border border-zinc-800 text-zinc-400 text-[9px] font-bold uppercase rounded-lg hover:text-white cursor-pointer"
              >
                ENTENDIDO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FINAL DE CONFIRMACIÓN */}
      {isStartJourneyOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-md bg-[#080b0e] border border-cyan-500/40 rounded-2xl p-6 text-center space-y-4">
            <h3 className="text-lg font-black text-white uppercase">¿INICIAR EXPEDICIÓN EN STAR CLUSTER?</h3>
            <p className="text-xs text-amber-400 font-bold">
              {selectedPlanet ? "MODIFICADOR NETO:" : "PROBABILIDAD ESTIMADA:"} {totalExpeditionProbability}%
            </p>
            
            {launchError && (
              <div className="p-3 bg-red-950/80 border border-red-500 text-red-300 text-[9px] uppercase font-bold rounded-lg">
                {launchError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={executeLaunchTransaction} disabled={loading} className="py-2.5 bg-cyan-950 border border-cyan-500 text-cyan-300 text-[10px] font-black uppercase rounded-lg hover:bg-cyan-900 cursor-pointer">CONFIRMAR VIAJE</button>
              <button onClick={() => { playSfx(440); setIsStartJourneyOpen(false); }} className="py-2.5 bg-black border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase rounded-lg hover:bg-zinc-900 cursor-pointer">CANCELAR</button>
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
                <div className="w-64 border border-cyan-500/40 bg-[#05070a] rounded-xl flex flex-col items-center p-4 text-center gap-3">
                  <span className="text-[10px] font-black text-cyan-400 uppercase">{currentRewardDrop ? currentRewardDrop.rarity : 'RARE'}</span>
                  <div className="text-4xl">{currentRewardDrop ? currentRewardDrop.icon : '💎'}</div>
                  <span className="text-[10px] font-bold text-white uppercase">{currentRewardDrop ? currentRewardDrop.name : 'BOTÍN OBTENIDO'}</span>
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