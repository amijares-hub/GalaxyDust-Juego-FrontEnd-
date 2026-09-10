import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CornerUpLeft, X, Search, Lock, MapPin, Wrench, Bot, FileText, Package, Clock, 
  Pickaxe, Radio, Box, Check, Trash2, Rocket, Sparkles, RotateCcw, ShieldAlert, ChevronDown, ChevronUp, Layers
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
  skills?: string[];
  min_metal_capacity?: number;
  max_metal_capacity?: number;
  min_crystal_capacity?: number;
  max_crystal_capacity?: number;
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
  status: 'LAUNCHED' | 'IN_TRANSIT' | 'RETURNING' | 'SUCCESS' | 'FAILED' | 'CLAIMED';
  estimated_return_time: string;
  launch_time: string;
  is_adrift?: boolean;
  type?: 'EXPLORATION' | 'MINING' | 'DOMINATION';
  equipped_assets?: Asset[];
  calculated_min_metal?: number;
  calculated_max_metal?: number;
  calculated_min_crystal?: number;
  calculated_max_crystal?: number;
  expedition_snapshot?: any;
  fleet_id?: string;
  ship_ids?: string[];
  tool_id?: string;
}

export interface ExpeditionHistoryRecord {
  id: string;
  fleet_name: string;
  galaxy_cluster: string;
  sector_name?: string;
  star_cluster?: string;
  sc_id?: string;
  status: string;
  metal_mined?: number;
  crystal_mined?: number;
  dark_matter_mined?: number;
  created_at: string;
  equipped_assets?: Asset[];
  expedition_snapshot?: any;
  ship_ids?: string[];
  tool_id?: string;
  fleet_id?: string;
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
  ss_discovery_rate?: number;
}

export type LeftMenuCategory = 'Fleets' | 'Naves' | 'Astrobots' | 'Tools' | 'Consumibles' | 'Licencia';
export type SelectionStep = 'GC' | 'GAL' | 'SC' | 'SS' | 'PLANETA';

export interface ExpeditionViewProps {
  initialView?: 'selection' | 'flights';
  onBack?: () => void;
  triggerNotification?: (text: string, payload?: any) => void;
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

const formatSeconds = (totalSec: number): string => {
  if (totalSec <= 0) return '00:00';
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
  const [completedHistory, setCompletedHistory] = useState<ExpeditionHistoryRecord[]>([]);
  
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
  const [recallingExpeditionId, setRecallingExpeditionId] = useState<string | null>(null);
  const [currentRewardDrop, setCurrentRewardDrop] = useState<MiningDrop | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const [showToolRequiredModal, setShowToolRequiredModal] = useState<boolean>(false);
  const [expandedExpeditionId, setExpandedExpeditionId] = useState<string | null>(null);

  const leftMenuOptions: LeftMenuCategory[] = ['Fleets', 'Naves', 'Astrobots', 'Tools', 'Licencia', 'Consumibles'];

  const { busyToolIds, busyShipIds, busyAssetIds } = useMemo(() => {
    const toolIds = new Set<string>();
    const shipIds = new Set<string>();
    const allIds = new Set<string>();
    
    activeExpeditions.forEach((exp: any) => {
      if (exp.status === 'CLAIMED') return;
      
      let snap: any = {};
      try {
        if (typeof exp.expedition_snapshot === 'string') snap = JSON.parse(exp.expedition_snapshot);
        else if (exp.expedition_snapshot) snap = exp.expedition_snapshot;
      } catch (e) {}

      const rawShipIds: string[] = exp.ship_ids ? (Array.isArray(exp.ship_ids) ? exp.ship_ids : [exp.ship_ids]) : (exp.ship_id ? [exp.ship_id] : snap.ship_ids || []);
      const rawToolId: string | null = exp.tool_id || snap.tool_id || null;

      rawShipIds.forEach(id => {
        if (id) {
          allIds.add(id.toString());
          shipIds.add(id.toString());
        }
      });
      if (rawToolId) {
        allIds.add(rawToolId.toString());
        toolIds.add(rawToolId.toString());
      }

      const assets = exp.equipped_assets || exp.assets || exp.ships || [];
      if (Array.isArray(assets)) {
        assets.forEach((a: any) => {
          if (a.id) allIds.add(a.id.toString());
          if (a.seed_id) allIds.add(a.seed_id.toString());
          
          if (a.type && isShipAsset(a.type)) {
            if (a.id) shipIds.add(a.id.toString());
            if (a.seed_id) shipIds.add(a.seed_id.toString());
          }
          if (a.type && isToolAsset(a.type)) {
            if (a.id) toolIds.add(a.id.toString());
            if (a.seed_id) toolIds.add(a.seed_id.toString());
          }
        });
      }
      if (exp.fleet_id) {
        const fleet = fleets.find(f => f.id === exp.fleet_id);
        if (fleet) {
          (fleet.ships || []).forEach(s => {
            if (s.id) { allIds.add(s.id.toString()); shipIds.add(s.id.toString()); }
            if (s.seed_id) { allIds.add(s.seed_id.toString()); shipIds.add(s.seed_id.toString()); }
          });
          (fleet.tools || []).forEach(t => {
            if (t.id) { allIds.add(t.id.toString()); toolIds.add(t.id.toString()); }
            if (t.seed_id) { allIds.add(t.seed_id.toString()); toolIds.add(t.seed_id.toString()); }
          });
          (fleet.licenses || []).forEach(l => {
            if (l.id) allIds.add(l.id.toString());
            if (l.seed_id) allIds.add(l.seed_id.toString());
          });
        }
      }
    });
    return { busyToolIds: toolIds, busyShipIds: shipIds, busyAssetIds: allIds };
  }, [activeExpeditions, fleets]);

  const activeGcObject = useMemo(() => {
    return gcList.find(g => g.id === selectedGC) || null;
  }, [gcList, selectedGC]);

  const isInaraSelected = useMemo(() => {
    return Boolean(selectedGC);
  }, [selectedGC]);

  const totalExpeditionProbability = useMemo(() => {
    const baseClusterRate = activeGcObject?.ss_discovery_rate !== undefined 
      ? Number(activeGcObject.ss_discovery_rate) 
      : 5;

    let modifierSum = baseClusterRate + globalPassiveBonus;

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
  }, [activeGcObject, selectedAssets, selectedFleet, globalPassiveBonus]);

  const selectedTool = useMemo(() => {
    return (
      selectedAssets.find(a => isToolAsset(a.type))
      ?? (selectedFleet?.tools?.[0] as Asset | undefined)
      ?? null
    );
  }, [selectedAssets, selectedFleet]);

  const toolSkills = useMemo(() => {
    return selectedTool?.skills || [];
  }, [selectedTool]);

  const isSoloMetal = toolSkills.includes('TOOL_SOLO_METAL') || String(selectedTool?.name || '').toLowerCase().includes('metal');
  const isSoloCrystal = toolSkills.includes('TOOL_SOLO_CRYSTAL') || String(selectedTool?.name || '').toLowerCase().includes('crystal') || String(selectedTool?.name || '').toLowerCase().includes('cristal');

  const dynamicMiningRanges = useMemo(() => {
    let minMetal = Number(activeGcObject?.min_metal || 300);
    let maxMetal = Number(activeGcObject?.max_metal || 1200);
    let minCrystal = Number(activeGcObject?.min_crystal || 150);
    let maxCrystal = Number(activeGcObject?.max_crystal || 600);

    const allShips = [...selectedAssets.filter(a => isShipAsset(a.type)), ...(selectedFleet?.ships || [])];
    const allTools = [...selectedAssets.filter(a => isToolAsset(a.type)), ...(selectedFleet?.tools || [])];

    allShips.forEach(ship => {
      minMetal += Number(ship.min_metal_capacity || 0);
      maxMetal += Number(ship.max_metal_capacity || 0);
      minCrystal += Number(ship.min_crystal_capacity || 0);
      maxCrystal += Number(ship.max_crystal_capacity || 0);
    });

    allTools.forEach(tool => {
      minMetal += Number(tool.min_metal_bonus || 0);
      maxMetal += Number(tool.max_metal_bonus || 0);
      minCrystal += Number(tool.min_crystal_bonus || 0);
      maxCrystal += Number(tool.max_crystal_bonus || 0);
    });

    const modifierMult = 1.0 + (totalExpeditionProbability / 100.0);

    const isSoloMetalGlobal = isSoloMetal || allTools.some(t => (t.skills || []).includes('TOOL_SOLO_METAL') || String(t.name).toLowerCase().includes('metal'));
    const isSoloCrystalGlobal = isSoloCrystal || allTools.some(t => (t.skills || []).includes('TOOL_SOLO_CRYSTAL') || String(t.name).toLowerCase().includes('crystal'));

    return {
      minMetal: isSoloCrystalGlobal ? 0 : Math.floor(minMetal * modifierMult),
      maxMetal: isSoloCrystalGlobal ? 0 : Math.floor(maxMetal * modifierMult),
      minCrystal: isSoloMetalGlobal ? 0 : Math.floor(minCrystal * modifierMult),
      maxCrystal: isSoloMetalGlobal ? 0 : Math.floor(maxCrystal * modifierMult),
      canMineMetal: !isSoloCrystalGlobal,
      canMineCrystal: !isSoloMetalGlobal
    };
  }, [activeGcObject, selectedAssets, selectedFleet, totalExpeditionProbability, isSoloMetal, isSoloCrystal]);

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

  const resolveExpeditionAssets = (exp: Expedition | ExpeditionHistoryRecord): Asset[] => {
    let snap: any = {};
    try {
      if (typeof exp.expedition_snapshot === 'string') snap = JSON.parse(exp.expedition_snapshot);
      else if (exp.expedition_snapshot) snap = exp.expedition_snapshot;
    } catch (e) {}

    const rawEquipped = exp.equipped_assets || (exp as any).assets || snap.equipped_assets || snap.assets;
    if (Array.isArray(rawEquipped) && rawEquipped.length > 0) {
      return rawEquipped.map(a => {
        const found = inventoryAssets.find(inv => String(inv.id) === String(a.id) || String(inv.seed_id) === String(a.seed_id));
        return found || {
          id: String(a.id || Math.random()),
          name: a.name || a.title || a.ship_name || a.custom_name || 'Activo de Flota',
          type: a.type || 'Naves',
          rarity: a.rarity || 'Common',
          collection: a.collection || 'GD',
          image_url: resolveImageUrl(a.image_url || a.avatar_url)
        };
      });
    }

    const resolvedList: Asset[] = [];
    const shipIds: string[] = exp.ship_ids ? (Array.isArray(exp.ship_ids) ? exp.ship_ids : [exp.ship_ids]) : (snap.ship_ids || []);
    const toolId: string | null = exp.tool_id || snap.tool_id || null;

    shipIds.forEach(id => {
      if (!id) return;
      const found = inventoryAssets.find(inv => String(inv.id) === String(id) || String(inv.seed_id) === String(id));
      if (found) {
        resolvedList.push(found);
      } else {
        resolvedList.push({
          id: String(id),
          name: `Nave #${String(id).slice(0, 4)}`,
          type: 'Naves',
          rarity: 'Common',
          collection: 'GD',
          image_url: resolveImageUrl(undefined)
        });
      }
    });

    if (toolId) {
      const found = inventoryAssets.find(inv => String(inv.id) === String(toolId) || String(inv.seed_id) === String(toolId));
      if (found) {
        resolvedList.push(found);
      } else {
        resolvedList.push({
          id: String(toolId),
          name: `Tool #${String(toolId).slice(0, 4)}`,
          type: 'Tools',
          rarity: 'Common',
          collection: 'GD',
          image_url: resolveImageUrl(undefined)
        });
      }
    }

    if (exp.fleet_id && fleets.length > 0) {
      const fleet = fleets.find(f => String(f.id) === String(exp.fleet_id));
      if (fleet) {
        if (fleet.ships) resolvedList.push(...fleet.ships);
        if (fleet.tools) resolvedList.push(...fleet.tools);
      }
    }

    if (resolvedList.length === 0 && snap) {
      if (snap.tool_specs) {
        resolvedList.push({
          id: String(snap.tool_specs.id || Math.random()),
          name: snap.tool_specs.name || 'Herramienta de Extracción',
          type: 'Tools',
          rarity: snap.tool_specs.rarity || 'Common',
          collection: 'GD',
          image_url: resolveImageUrl(snap.tool_specs.image_url || snap.tool_specs.avatar_url)
        });
      }
      if (snap.ships_specs && Array.isArray(snap.ships_specs)) {
        snap.ships_specs.forEach((s: any) => {
          resolvedList.push({
            id: String(s.id || Math.random()),
            name: s.name || s.ship_name || 'Nave de Combate',
            type: 'Naves',
            rarity: s.rarity || 'Common',
            collection: 'GD',
            image_url: resolveImageUrl(s.image_url || s.avatar_url)
          });
        });
      }
    }

    return resolvedList;
  };

  const handleStepBack = () => {
    playSfx(660);
    if (selectedPlanet || currentStep === 'PLANETA') {
      setSelectedPlanet(null);
      setCurrentStep('SS');
    } else if (selectedSS || currentStep === 'SS') {
      setSelectedSS(null);
      setCurrentStep('SC');
    } else if (selectedSC || currentStep === 'SC') {
      setSelectedSC(null);
      setCurrentStep('GAL');
    } else if (selectedGAL || currentStep === 'GAL') {
      setSelectedGAL(null);
      setCurrentStep('GC');
    } else if (selectedGC || currentStep === 'GC') {
      setSelectedGC(null);
      setCurrentStep('GC');
    }
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
          max_crystal: g.max_crystal ?? 600,
          ss_discovery_rate: g.ss_discovery_rate ?? 5
        }));
        setGcList(gcObjects);
        setSelectedGC(prev => prev ?? gcObjects[0].id);
      } else {
        setGcList([]);
      }

      let legacyUserId: number | null = null;
      if (profile?.legacy_id) legacyUserId = Number(profile.legacy_id);

      const [
        { data: historyRows },
        { data: claimedExpeditions },
        { data: rewardLogs }
      ] = await Promise.all([
        supabase.from('expedition_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('active_expeditions').select('*').eq('user_id', userId).in('status', ['CLAIMED', 'SUCCESS']).order('launch_time', { ascending: false }),
        supabase.from('expedition_logs').select('*').eq('user_id', userId).not('rewards_looted', 'is', null).order('created_at', { ascending: false })
      ]);

      const unifiedHistoryMap = new Map<string, ExpeditionHistoryRecord>();

      (historyRows || []).forEach((row: any) => {
        const key = String(row.id || row.expedition_id || Math.random());
        unifiedHistoryMap.set(key, {
          id: key,
          fleet_name: row.fleet_name || 'FLOTA IMPERIAL',
          galaxy_cluster: row.galaxy_cluster || 'INARA',
          sector_name: row.sector_name || 'SECTOR MINERO',
          sc_id: row.sc_id || row.sector_name,
          status: row.status || 'CLAIMED',
          metal_mined: Number(row.metal_mined || row.metal || 0),
          crystal_mined: Number(row.crystal_mined || row.crystal || 0),
          dark_matter_mined: Number(row.dark_matter_mined || row.dark_matter || 0),
          created_at: row.created_at || new Date().toISOString(),
          equipped_assets: row.equipped_assets,
          expedition_snapshot: row.expedition_snapshot,
          ship_ids: row.ship_ids,
          tool_id: row.tool_id,
          fleet_id: row.fleet_id
        });
      });

      (claimedExpeditions || []).forEach((exp: any) => {
        const key = String(exp.id);
        if (!unifiedHistoryMap.has(key)) {
          unifiedHistoryMap.set(key, {
            id: key,
            fleet_name: exp.fleet_name || 'FLOTA IMPERIAL',
            galaxy_cluster: exp.galaxy_cluster || 'INARA',
            sector_name: exp.sector_name || 'SECTOR MINERO',
            sc_id: exp.sc_id || exp.sector_name,
            status: exp.status || 'CLAIMED',
            metal_mined: Number(exp.calculated_min_metal || 300),
            crystal_mined: Number(exp.calculated_min_crystal || 150),
            dark_matter_mined: 0,
            created_at: exp.launch_time || exp.created_at || new Date().toISOString(),
            equipped_assets: exp.equipped_assets,
            expedition_snapshot: exp.expedition_snapshot,
            ship_ids: exp.ship_ids,
            tool_id: exp.tool_id,
            fleet_id: exp.fleet_id
          });
        }
      });

      (rewardLogs || []).forEach((log: any) => {
        const key = String(log.expedition_id || log.id);
        const rewards = log.rewards_looted || {};
        const metal = Number(rewards.metal || 0);
        const crystal = Number(rewards.crystal || 0);
        const darkMatter = Number(rewards.dark_matter || 0);

        if (metal > 0 || crystal > 0 || darkMatter > 0) {
          if (!unifiedHistoryMap.has(key)) {
            unifiedHistoryMap.set(key, {
              id: key,
              fleet_name: log.title || 'MISION COMPLETADA',
              galaxy_cluster: 'INARA',
              sector_name: log.message?.includes('EN ') ? log.message.split('EN ')[1]?.split(':')[0] : 'SECTOR EXPLORADO',
              sc_id: log.message?.includes('EN ') ? log.message.split('EN ')[1]?.split(':')[0] : 'SECTOR EXPLORADO',
              status: 'CLAIMED',
              metal_mined: metal,
              crystal_mined: crystal,
              dark_matter_mined: darkMatter,
              created_at: log.created_at || new Date().toISOString(),
              equipped_assets: log.equipped_assets,
              expedition_snapshot: log.expedition_snapshot,
              ship_ids: log.ship_ids,
              tool_id: log.tool_id,
              fleet_id: log.fleet_id
            });
          } else {
            const existing = unifiedHistoryMap.get(key)!;
            if (metal > 0) existing.metal_mined = metal;
            if (crystal > 0) existing.crystal_mined = crystal;
            if (darkMatter > 0) existing.dark_matter_mined = darkMatter;
            if (log.equipped_assets && !existing.equipped_assets) existing.equipped_assets = log.equipped_assets;
            if (log.expedition_snapshot && !existing.expedition_snapshot) existing.expedition_snapshot = log.expedition_snapshot;
          }
        }
      });

      const combinedList = Array.from(unifiedHistoryMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const counts: Record<string, number> = {};
      combinedList.forEach((row) => {
        const gc = row.galaxy_cluster || 'PELA';
        counts[gc] = (counts[gc] || 0) + 1;
      });

      setCompletedCountsByGC(counts);
      setCompletedHistory(combinedList.slice(0, 10));

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

            let parsedSkills: string[] = [];
            if (seed?.skills) {
              if (Array.isArray(seed.skills)) {
                parsedSkills = seed.skills.map(String);
              } else if (typeof seed.skills === 'object') {
                parsedSkills = Object.keys(seed.skills);
              } else if (typeof seed.skills === 'string') {
                try { parsedSkills = JSON.parse(seed.skills); } catch { parsedSkills = [seed.skills]; }
              }
            }

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
              skills: parsedSkills,
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
        .neq('status', 'CLAIMED')
        .order('launch_time', { ascending: false });

      if (expData) setActiveExpeditions(expData);

      const { data: logsData } = await supabase.from('expedition_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (logsData) {
        const map: Record<string, ExpeditionLog[]> = {};
        logsData.forEach((log: any) => {
          const key = String(log.expedition_id || '');
          if (key) {
            if (!map[key]) map[key] = [];
            map[key].push(log);
          }
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

    let logsChannel: any;
    const initLogsChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channelName = `expedition_logs_realtime_${user.id}`;
      supabase.removeChannel(supabase.channel(channelName));

      logsChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'expedition_logs', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const newLog = payload.new as ExpeditionLog;
            const expKey = String(newLog.expedition_id || '');
            if (expKey) {
              setExpeditionLogs(prev => ({
                ...prev,
                [expKey]: [newLog, ...(prev[expKey] || [])]
              }));
            }
          }
        )
        .subscribe();
    };

    initLogsChannel();

    return () => {
      if (logsChannel) supabase.removeChannel(logsChannel);
    };
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

  const toggleAssetSelection = (asset: Asset) => {
    const isShip = isShipAsset(asset.type);
    const isTool = isToolAsset(asset.type);
    const isInFlight = busyAssetIds.has(asset.id) || 
      (asset.seed_id && (
        (isShip && busyShipIds.has(asset.seed_id)) || 
        (isTool && busyToolIds.has(asset.seed_id))
      ));

    if (isInFlight) {
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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Usuario no autenticado');

      const deployedAssets: Asset[] = [...selectedAssets];
      if (selectedFleet) {
        if (selectedFleet.ships) deployedAssets.push(...selectedFleet.ships);
        if (selectedFleet.tools) deployedAssets.push(...selectedFleet.tools);
        if (selectedFleet.licenses) deployedAssets.push(...selectedFleet.licenses);
      }

      const launchTool = selectedAssets.find(a => isToolAsset(a.type))
        ?? (selectedFleet?.tools?.[0] as Asset | undefined)
        ?? null;

      const launchShipIds = deployedAssets
        .filter(a => isShipAsset(a.type))
        .map(a => a.id)
        .filter(Boolean);

      const { data: rpcData, error } = await supabase.rpc('launch_expedition_master_audit', {
        p_user_id: currentUser.id,
        p_cluster_id: selectedGC ?? 'STAR CLUSTER',
        p_ship_ids: launchShipIds,
        p_tool_id: launchTool?.seed_id ?? launchTool?.id ?? null
      });

      if (error) throw error;

      if (rpcData && rpcData.success === false) {
        throw new Error(rpcData.error || rpcData.message || 'Error al iniciar la expedición. Revisa los requisitos del clúster.');
      }

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

  const handleRecallExpedition = async (expeditionId: string) => {
    if (recallingExpeditionId) return;
    setRecallingExpeditionId(expeditionId);
    playSfx(880);

    try {
      const { data, error } = await supabase.rpc('cancel_recall_expedition', {
        p_expedition_id: expeditionId
      });

      if (error) throw error;

      if (data?.success) {
        playSfx(1200);
        if (triggerNotification) {
          triggerNotification("🚨 RETORNO TRANSMITIDO: La flota volverá a la base C.A.N. en 5 minutos.");
        }
        await syncDatabaseData();
      } else {
        throw new Error(data?.error || "Falló la orden de retorno.");
      }
    } catch (err: any) {
      console.error("Error al retornar expedición:", err);
      playSfx(300);
      if (triggerNotification) {
        triggerNotification(`⛔ ERROR: ${err.message}`);
      }
    } finally {
      setRecallingExpeditionId(null);
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

        if (data && data.success) {
          playSfx(1200);

          const metalMined = Number(data.metal_mined || 0);
          const crystalMined = Number(data.crystal_mined || 0);
          const darkMatterMined = Number(data.dark_matter_mined || 0);

          const dropText = `METAL: +${metalMined.toLocaleString()} | CRISTAL: +${crystalMined.toLocaleString()}${darkMatterMined > 0 ? ` | M.O.: +${darkMatterMined.toLocaleString()}` : ''}`;

          const drop: MiningDrop = {
            name: dropText,
            amount: 1,
            rarity: "EPIC",
            icon: "💎"
          };
          setCurrentRewardDrop(drop);
          setIsRewardSummaryOpen(true);

          const notificationMsg = `🎉 BOTÍN EXTRAÍDO EN ${exp.sector_name.toUpperCase()}: +${metalMined.toLocaleString()} Metal, +${crystalMined.toLocaleString()} Cristal${darkMatterMined > 0 ? `, +${darkMatterMined.toLocaleString()} Materia Oscura` : ''}`;

          if (triggerNotification) {
            triggerNotification(notificationMsg, {
              expId: exp.id,
              rewards: {
                metal: metalMined,
                crystal: crystalMined,
                dark_matter: darkMatterMined
              }
            });
          }
        } else {
          throw new Error(data?.error || 'Falló el reclamo');
        }
      }

      await syncDatabaseData();
    } catch (err: any) {
      console.error("Error al reclamar recompensas:", err);
      if (triggerNotification) triggerNotification(`⛔ ERROR AL RECLAMAR: ${err.message}`);
    } finally {
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

  const toggleMoreInfo = (id: string) => {
    playSfx(660);
    setExpandedExpeditionId(prev => prev === id ? null : id);
  };

  const getFilteredFlights = () => {
    return activeExpeditions.filter(exp => {
      if (exp.status === 'CLAIMED') return false;

      const expType = exp.type || 'EXPLORATION';
      if (activeFlightCategory !== 'ALL' && activeFlightCategory !== 'HISTORIAL' && expType !== activeFlightCategory) return false;

      if (flightSearchQuery.trim() !== '') {
        const query = flightSearchQuery.toLowerCase();
        return exp.fleet_name.toLowerCase().includes(query) || exp.sector_name.toLowerCase().includes(query);
      }
      return true;
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

  // 🎯 VISTA 1: FLEET IN FLIGHT (CON MENÚ SUPERIOR HORIZONTAL)
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
              className="px-4 py-1.5 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 hover:from-amber-500 hover:to-orange-400 disabled:opacity-40 border border-amber-300/80 text-white text-[9.5px] font-black uppercase tracking-widest rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
              <span>CLAIM ALL</span>
            </button>
            <button onClick={onBack} className="p-1 text-zinc-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* 🎯 NAVEGACIÓN Y FILTROS EN MENÚ SUPERIOR HORIZONTAL */}
        <div className="w-full bg-[#05070a] border border-cyan-500/20 p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-cyan-500" />
            <input
              type="text"
              placeholder="BUSCAR FLOTA..."
              value={flightSearchQuery}
              onChange={(e) => setFlightSearchQuery(e.target.value)}
              className="w-full bg-[#0a0f14] border border-cyan-950 rounded-lg pl-7 pr-2.5 py-1.5 text-[8px] text-cyan-200 placeholder-zinc-600 outline-none uppercase font-mono focus:border-cyan-500/60 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5 max-w-full">
            {['ALL', 'EXPLORATION', 'MINING', 'DOMINATION', 'HISTORIAL'].map((cat) => (
              <button
                key={cat}
                onClick={() => { playSfx(660); setActiveFlightCategory(cat); }}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-mono font-bold uppercase transition-all cursor-pointer border whitespace-nowrap ${
                  activeFlightCategory === cat ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black shadow-[0_0_8px_rgba(6,182,212,0.3)]' : 'bg-[#0a0f14] text-zinc-400 border-transparent hover:text-white'
                }`}
              >
                {cat === 'HISTORIAL' ? 'HISTORIAL (ÚLTIMAS 10)' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* LISTADO DE FLOTAS */}
        <div className="flex-1 w-full flex flex-col gap-2.5 max-h-[440px] overflow-y-auto pr-1 font-mono custom-scrollbar">
          {activeFlightCategory === 'HISTORIAL' ? (
            completedHistory.length === 0 ? (
              <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                NO HAY HISTORIAL DE EXPEDICIONES REGISTRADO
              </div>
            ) : (
              completedHistory.map((exp) => {
                const isExpanded = expandedExpeditionId === exp.id;
                const deployedAssets = resolveExpeditionAssets(exp);

                let shipCount = 0;
                let toolCount = 0;
                let astrobotCount = 0;
                let fleetCount = exp.fleet_id ? 1 : 0;

                deployedAssets.forEach((a) => {
                  if (isShipAsset(a.type || '')) shipCount++;
                  if (isToolAsset(a.type || '')) toolCount++;
                  if (String(a.type || '').toLowerCase().includes('astrobot')) astrobotCount++;
                });

                return (
                  <div
                    key={exp.id}
                    className="w-full bg-[#0a121d] border border-cyan-500/40 rounded-xl p-2.5 flex flex-col gap-2 shadow-[0_0_12px_rgba(6,182,212,0.1)] text-white text-[10px] font-mono tracking-wider transition-all"
                  >
                    {/* FILA 1: HEADER & STATUS */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/50 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-emerald-500 text-black font-black text-[8.5px] rounded uppercase shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                          CLAIMED
                        </span>
                        <span className="font-extrabold text-white text-[11px]">
                          EXPEDITION #{exp.id.substring(0, 4)} {exp.sc_id || exp.sector_name || 'SECTOR 1'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[9px]">
                        <span className="text-zinc-500 text-[8px]">
                          REGISTRADO: {new Date(exp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[7.5px] font-mono px-2 py-0.5 rounded font-black border bg-emerald-950 text-emerald-400 border-emerald-800">
                          FINALIZADO Y RECLAMADO
                        </span>
                      </div>
                    </div>

                    {/* FILA 2: RESUMEN Y BOTÓN MORE INFO */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <div className="text-[9.5px] font-bold text-cyan-200 uppercase tracking-widest">
                        Fleets: <span className="text-white">{fleetCount}</span> | Ships: <span className="text-cyan-300">{shipCount}</span> | Astrobots: <span className="text-emerald-400">{astrobotCount}</span> | Tools: <span className="text-amber-400">{toolCount}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleMoreInfo(exp.id)}
                          className="px-3 py-1 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-500 font-black text-[9px] uppercase tracking-wider rounded flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                        >
                          <span>MORE INFO</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* ACORDEÓN DROPDOWN: BOTÍN FINAL Y ACTIVOS UTILIZADOS */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="w-full bg-[#04080f] border-t border-cyan-900/60 p-3 mt-1 rounded-b-xl flex flex-col gap-3"
                        >
                          {/* RECURSOS EXTRAÍDOS */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" /> BOTÍN EXTRAÍDO Y REGISTRADO
                            </span>
                            <div className="grid grid-cols-3 gap-2 font-mono text-[8.5px] text-center">
                              <div className="bg-black/60 border border-cyan-950 p-2 rounded flex flex-col">
                                <span className="text-zinc-500">METAL</span>
                                <span className="text-cyan-300 font-black text-[10px]">+{Number(exp.metal_mined || 0).toLocaleString()}</span>
                              </div>
                              <div className="bg-black/60 border border-cyan-950 p-2 rounded flex flex-col">
                                <span className="text-zinc-500">CRISTAL</span>
                                <span className="text-purple-300 font-black text-[10px]">+{Number(exp.crystal_mined || 0).toLocaleString()}</span>
                              </div>
                              <div className="bg-black/60 border border-cyan-950 p-2 rounded flex flex-col">
                                <span className="text-zinc-500">MATERIA OSCURA</span>
                                <span className="text-emerald-400 font-black text-[10px]">+{Number(exp.dark_matter_mined || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* ACTIVOS Y EQUIPAMIENTO EN FLOTA */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                              <Layers className="w-3 h-3 text-cyan-400" /> ACTIVOS Y EQUIPAMIENTO UTILIZADO ({deployedAssets.length})
                            </span>

                            {deployedAssets.length === 0 ? (
                              <span className="text-[7.5px] text-zinc-600 uppercase italic p-2 bg-black/40 rounded">
                                SIN ACTIVOS DETALLADOS EN EL HISTORIAL
                              </span>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {deployedAssets.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-black/70 border border-cyan-900/60 p-1.5 rounded-lg flex flex-col items-center text-center gap-1 relative"
                                  >
                                    <div className="w-8 h-8 rounded bg-cyan-950/40 border border-cyan-800 overflow-hidden">
                                      <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <span className="text-[7.5px] font-bold text-white uppercase truncate w-full">
                                      {item.name}
                                    </span>
                                    <span className="text-[6.5px] text-cyan-400 uppercase font-mono">
                                      {item.type}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )
          ) : getFilteredFlights().length === 0 ? (
            <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
              NO HAY OPERACIONES EN CURSO REGISTRADAS EN ESTE SECTOR
            </div>
          ) : (
            getFilteredFlights().map((exp) => {
              const launchMs = new Date(exp.launch_time).getTime();
              const returnMs = new Date(exp.estimated_return_time).getTime();
              const totalDurationMs = Math.max(1000, returnMs - launchMs);
              const destinationMs = launchMs + (totalDurationMs / 2);

              const destRemainingSec = Math.max(0, Math.floor((destinationMs - now) / 1000));
              const baseRemainingSec = Math.max(0, Math.floor((returnMs - now) / 1000));
              const elapsedSec = Math.max(0, Math.floor((now - launchMs) / 1000));

              const isFlightFinished = baseRemainingSec === 0;

              let snap: any = {};
              try {
                if (typeof exp.expedition_snapshot === 'string') snap = JSON.parse(exp.expedition_snapshot);
                else if (exp.expedition_snapshot) snap = exp.expedition_snapshot;
              } catch (e) {}

              const isReturning = exp.status === 'RETURNING' || Boolean(snap.recalled_at);

              const deployedAssets = resolveExpeditionAssets(exp);

              let shipCount = 0;
              let toolCount = 0;
              let astrobotCount = 0;
              let fleetCount = exp.fleet_id ? 1 : 0;

              deployedAssets.forEach((a) => {
                if (isShipAsset(a.type || '')) shipCount++;
                if (isToolAsset(a.type || '')) toolCount++;
                if (String(a.type || '').toLowerCase().includes('astrobot')) astrobotCount++;
              });

              const isExpanded = expandedExpeditionId === exp.id;

              const equippedTool = deployedAssets.find(a => isToolAsset(a.type)) || null;
              const toolSkills = equippedTool?.skills || [];
              const toolName = (equippedTool?.name || '').toLowerCase();

              const isSoloMetal = toolSkills.includes('TOOL_SOLO_METAL') || toolName.includes('metal');
              const isSoloCrystal = toolSkills.includes('TOOL_SOLO_CRYSTAL') || toolName.includes('crystal') || toolName.includes('cristal');
              const canMineDarkMatter = toolSkills.includes('MINE_DARK_MATTER') || toolName.includes('dark') || toolName.includes('oscura');

              const canMetal = !isSoloCrystal;
              const canCrystal = !isSoloMetal;

              const maxMetal = exp.calculated_max_metal || 1200;
              const maxCrystal = exp.calculated_max_crystal || 600;
              const progressPct = Math.min(100, (elapsedSec / (totalDurationMs / 1000)) * 100);

              const liveMetal = canMetal ? Math.floor((progressPct / 100) * maxMetal) : 0;
              const liveCrystal = canCrystal ? Math.floor((progressPct / 100) * maxCrystal) : 0;
              const liveDarkMatter = canMineDarkMatter ? Math.floor((progressPct / 100) * 15) : 0;

              return (
                <div
                  key={exp.id}
                  className="w-full bg-[#0a121d] border border-cyan-500/40 rounded-xl p-2.5 flex flex-col gap-2 shadow-[0_0_12px_rgba(6,182,212,0.1)] text-white text-[10px] font-mono tracking-wider transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/50 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 text-black font-black text-[8.5px] rounded uppercase ${isReturning ? 'bg-amber-400' : 'bg-yellow-400'}`}>
                        {isReturning ? 'RET' : 'DEP'}
                      </span>
                      <span className="font-extrabold text-white text-[11px]">
                        EXPEDITION #{exp.id.substring(0, 4)} {exp.sc_id || exp.sector_name || 'SECTOR 1'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-[9px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400 font-bold uppercase">ARRIVAL DESTINATION:</span>
                        <span className="text-white font-bold">{formatSeconds(destRemainingSec)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400 font-bold uppercase">ARRIVAL TO BASE:</span>
                        <span className="text-white font-bold">{formatSeconds(baseRemainingSec)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <div className="text-[12px] font-black text-white min-w-[50px]">
                      {formatSeconds(elapsedSec)}
                    </div>

                    <div className="text-[9.5px] font-bold text-cyan-200 uppercase tracking-widest">
                      Fleets: <span className="text-white">{fleetCount}</span> | Ships: <span className="text-cyan-300">{shipCount}</span> | Astrobots: <span className="text-emerald-400">{astrobotCount}</span> | Tools: <span className="text-amber-400">{toolCount}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isFlightFinished && (
                        <button
                          onClick={() => handleClaimExpeditionRewards(exp)}
                          disabled={claimingExpeditionId === exp.id}
                          className="px-4 py-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-[9px] uppercase tracking-wider rounded border border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)] cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                        >
                          {claimingExpeditionId === exp.id ? 'CLAIMING...' : 'CLAIM'}
                        </button>
                      )}

                      {!isFlightFinished && !isReturning && (
                        <button
                          onClick={() => handleRecallExpedition(exp.id)}
                          disabled={recallingExpeditionId === exp.id}
                          className="px-4 py-1 bg-red-600 hover:bg-red-500 text-white font-black text-[9px] uppercase tracking-wider rounded border border-red-400 shadow cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                        >
                          {recallingExpeditionId === exp.id ? 'RETURNING...' : 'RETURN'}
                        </button>
                      )}

                      <button
                        onClick={() => toggleMoreInfo(exp.id)}
                        className="px-3 py-1 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-500 font-black text-[9px] uppercase tracking-wider rounded flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <span>MORE INFO</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full bg-[#04080f] border-t border-cyan-900/60 p-3 mt-1 rounded-b-xl flex flex-col gap-3"
                      >
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                            <Pickaxe className="w-3 h-3 text-amber-400" /> RECURSOS EXTRAÍDOS EN TIEMPO REAL
                          </span>
                          <div className="grid grid-cols-3 gap-2 font-mono text-[8.5px] text-center">
                            <div className="bg-black/60 border border-cyan-950 p-2 rounded flex flex-col">
                              <span className="text-zinc-500">METAL</span>
                              {canMetal ? (
                                <span className="text-cyan-300 font-black text-[10px]">+{liveMetal.toLocaleString()}</span>
                              ) : (
                                <span className="text-red-500 font-black text-[7px] uppercase mt-1">NO COMPATIBLE</span>
                              )}
                            </div>
                            <div className="bg-black/60 border border-cyan-950 p-2 rounded flex flex-col">
                              <span className="text-zinc-500">CRISTAL</span>
                              {canCrystal ? (
                                <span className="text-purple-300 font-black text-[10px]">+{liveCrystal.toLocaleString()}</span>
                              ) : (
                                <span className="text-red-500 font-black text-[7px] uppercase mt-1">NO COMPATIBLE</span>
                              )}
                            </div>
                            <div className="bg-black/60 border border-cyan-950 p-2 rounded flex flex-col">
                              <span className="text-zinc-500">MATERIA OSCURA</span>
                              {canMineDarkMatter ? (
                                <span className="text-emerald-400 font-black text-[10px]">+{liveDarkMatter.toLocaleString()}</span>
                              ) : (
                                <span className="text-red-500 font-black text-[7px] uppercase mt-1">NO COMPATIBLE</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                            <Layers className="w-3 h-3 text-cyan-400" /> ACTIVOS Y EQUIPAMIENTO EN FLOTA ({deployedAssets.length})
                          </span>

                          {deployedAssets.length === 0 ? (
                            <span className="text-[7.5px] text-zinc-600 uppercase italic p-2 bg-black/40 rounded">
                              SIN ACTIVOS DETALLADOS EN REGISTRO
                            </span>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                              {deployedAssets.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="bg-black/70 border border-cyan-900/60 p-1.5 rounded-lg flex flex-col items-center text-center gap-1 relative"
                                >
                                  <div className="w-8 h-8 rounded bg-cyan-950/40 border border-cyan-800 overflow-hidden">
                                    <img
                                      src={item.image_url}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <span className="text-[7.5px] font-bold text-white uppercase truncate w-full">
                                    {item.name}
                                  </span>
                                  <span className="text-[6.5px] text-cyan-400 uppercase font-mono">
                                    {item.type}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {isRewardSummaryOpen && currentRewardDrop && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 font-mono">
            <div className="w-full max-w-sm bg-[#080b0e] border border-cyan-500/40 rounded-xl p-5 text-center space-y-4">
              <h3 className="text-xs font-black text-white uppercase tracking-widest">BOTÍN RECLAMADO CON ÉXITO</h3>
              <div className="p-3 bg-black/60 border border-cyan-950 rounded-lg text-[9px] text-cyan-300 font-bold">
                {currentRewardDrop.name}
              </div>
              <button
                onClick={() => setIsRewardSummaryOpen(false)}
                className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[9px] uppercase rounded-lg cursor-pointer"
              >
                ENTENDIDO
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 🎯 VISTA 2: MAPA ORIGINAL DE SELECCIÓN Y CONFIGURACIÓN
  return (
    <div className="w-full max-w-7xl mx-auto bg-[#080b0e] border border-cyan-500/30 p-2 sm:p-4 rounded-xl shadow-2xl relative font-mono text-left select-none flex flex-col gap-2 my-1 text-white">

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

          <div className="w-full md:w-[320px] shrink-0 border border-cyan-500/20 bg-[#05070a] rounded-xl p-3 flex flex-col justify-between shadow-2xl h-[480px]">
            <div className="flex flex-col gap-2">
              
              <div className="flex items-center justify-between border-b border-cyan-950 pb-2 text-left">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400 animate-bounce" />
                  <span className="text-[11px] font-black tracking-widest text-white uppercase">SELECCIONA COORDENADAS GC</span>
                </div>

                {(selectedGC || selectedGAL || selectedSC || selectedSS || selectedPlanet) && (
                  <button
                    onClick={handleStepBack}
                    className="flex items-center gap-1 px-2.5 py-1 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-[8px] font-extrabold tracking-widest uppercase rounded-lg bg-cyan-950/80 hover:bg-cyan-900/90 transition-all cursor-pointer shadow-md"
                  >
                    <CornerUpLeft className="w-3 h-3 text-cyan-400" /> VOLVER
                  </button>
                )}
              </div>

              <div className="grid grid-cols-5 gap-1 bg-black/60 p-1 rounded-lg border border-cyan-950 text-[8.5px] font-bold text-center uppercase">
                {([
                  { id: 'GC', label: 'GC', isUnlocked: true, isSelected: selectedGC !== null },
                  { id: 'GAL', label: 'GAL', isUnlocked: selectedGC !== null, isSelected: selectedGAL !== null },
                  { id: 'SC', label: 'SC', isUnlocked: selectedGAL !== null, isSelected: selectedSC !== null },
                  { id: 'SS', label: 'SS', isUnlocked: selectedSC !== null && dbStarSystems.length > 0, isSelected: selectedSS !== null },
                  { id: 'PLANETA', label: 'PLANETA', isUnlocked: selectedSS !== null && dbPlanets.length > 0, isSelected: selectedPlanet !== null }
                ] as const).map((tab) => {
                  const isCurrent = currentStep === tab.id;
                  return (
                    <button
                      key={tab.id}
                      disabled={!tab.isUnlocked}
                      onClick={() => {
                        playSfx(660);
                        setCurrentStep(tab.id as SelectionStep);
                      }}
                      className={`py-1.5 rounded transition-all cursor-pointer flex items-center justify-center gap-0.5 border ${
                        isCurrent
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80 font-black shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                          : tab.isSelected
                          ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/60 font-bold'
                          : tab.isUnlocked
                          ? 'bg-black/40 text-zinc-400 border-cyan-950/80 hover:border-cyan-800/60'
                          : 'bg-black/20 text-zinc-700 border-zinc-900 cursor-not-allowed'
                      }`}
                    >
                      {!tab.isUnlocked && <Lock className="w-2.5 h-2.5 text-zinc-700" />}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-1 flex flex-col gap-1.5 max-h-[310px] overflow-y-auto pr-1 custom-scrollbar">
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
                            if (!reqCheck.allowed) {
                              playSfx(300);
                              if (triggerNotification) triggerNotification(`🔒 ${reqCheck.reason}`);
                              return;
                            }
                            playSfx(880);
                            setSelectedGC(gc.id);
                            setSelectedGAL(null);
                            setSelectedSC(null);
                            setSelectedSS(null);
                            setSelectedPlanet(null);
                            setCurrentStep('GAL');
                          }}
                          className={`w-full p-2.5 rounded-lg border text-[9px] font-bold uppercase transition-all flex flex-col gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80 shadow-lg'
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

                {currentStep === 'GAL' && (
                  dbGalaxies.length === 0 ? (
                    <div className="p-4 text-center text-zinc-600 text-[9px] uppercase italic">No hay galaxias en este GC.</div>
                  ) : (
                    dbGalaxies.map((gal) => {
                      const isSelected = selectedGAL === gal.id;
                      return (
                        <button 
                          key={gal.id} 
                          onClick={() => {
                            playSfx(880);
                            setSelectedGAL(gal.id);
                            setSelectedSC(null);
                            setSelectedSS(null);
                            setSelectedPlanet(null);
                            setCurrentStep('SC');
                          }} 
                          className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase cursor-pointer text-left transition-all ${
                            isSelected ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-md' : 'bg-[#0a0f14] border-cyan-950 text-zinc-300 hover:border-cyan-800'
                          }`}
                        >
                          {gal.name}
                        </button>
                      );
                    })
                  )
                )}

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
                    dbStarSystems.map((ss) => {
                      const isSelected = selectedSS === ss.id;
                      return (
                        <button 
                          key={ss.id} 
                          onClick={() => {
                            playSfx(880);
                            setSelectedSS(ss.id);
                            setCurrentStep('PLANETA');
                          }} 
                          className={`w-full p-2.5 rounded-lg border text-[9.5px] font-bold uppercase cursor-pointer text-left ${
                            isSelected ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-[#0a0f14] border-cyan-950 text-zinc-300 hover:border-cyan-800'
                          }`}
                        >
                          {ss.name}
                        </button>
                      );
                    })
                  )
                )}

                {currentStep === 'PLANETA' && (
                  dbPlanets.length === 0 ? (
                    <div className="p-3 bg-cyan-950/20 border border-cyan-900/50 rounded-xl text-center space-y-2">
                      <p className="text-[8px] text-zinc-400 uppercase">Sin planetas registrados en este sistema.</p>
                      <button onClick={() => { playSfx(880); setIsAdrift(true); setIsDispatchPanelActive(true); }} className="w-full py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-black text-[8.5px] uppercase rounded-lg shadow cursor-pointer">
                        CONFIGURAR FLOTA EN DERIVA
                      </button>
                    </div>
                  ) : (
                    dbPlanets.map((planet) => {
                      const isSelected = selectedPlanet?.id === planet.id;
                      return (
                        <div 
                          key={planet.id} 
                          onClick={() => {
                            playSfx(880);
                            setSelectedPlanet(planet);
                            setIsAdrift(false);
                            setIsDispatchPanelActive(true);
                          }} 
                          className={`p-2.5 rounded-lg border cursor-pointer text-left space-y-1 transition-all ${
                            isSelected ? 'bg-cyan-950 border-cyan-400' : 'bg-[#0a0f14] border-cyan-950 hover:border-cyan-800'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[9.5px] font-extrabold text-white uppercase">{planet.name}</span>
                            <span className="text-[7.5px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded font-bold uppercase">{planet.type}</span>
                          </div>
                          <p className="text-[7.5px] text-zinc-400">⏱️ Tiempo: {planet.duration_hours || 2}h | ⚠️ Riesgo: {planet.risk_factor || 15}%</p>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>

            <div className="p-2 border-t border-cyan-950 bg-black/60 rounded-lg text-[8.5px] text-zinc-500 font-bold uppercase">
              <span>RUTA: {formatBreadcrumbText()}</span>
            </div>
          </div>

          <div className="flex-1 border border-cyan-500/30 bg-[#05070a] rounded-xl overflow-hidden flex flex-col h-full shadow-2xl">
            
            <div className="h-[70%] w-full relative overflow-hidden flex items-center justify-center bg-black/40">
              {isInaraSelected && (
                <video
                  key="gc-presentation-video-top"
                  src="https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/GCs,Galaxias%20y%20demas/GC1.webm"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover pointer-events-none border-0 outline-none"
                />
              )}
            </div>

            <div className="h-[30%] w-full border-t border-cyan-500/30 flex items-center justify-center p-4 bg-[#020508]/80">
              {selectedSC && (
                <button
                  onClick={() => { playSfx(880); setIsDispatchPanelActive(true); }}
                  className="px-8 py-3.5 bg-gradient-to-r from-cyan-600 to-teal-600 border border-cyan-400 text-white text-[11px] font-black uppercase rounded-lg shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                >
                  EQUIPAR Y DESPLEGAR MISIÓN
                </button>
              )}
            </div>

          </div>

        </div>
      ) : (
        <div className="w-full flex-1 flex flex-col md:flex-row gap-3.5 h-[480px]">
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
               <div className="bg-[#020508] p-2 rounded-lg border border-cyan-900/50 flex flex-col gap-1 text-[7px] font-mono">
                 <div className="flex items-center justify-between mb-0.5">
                   <span className="text-cyan-400 font-bold uppercase">Rango Estimado de Extracción:</span>
                   {isSoloMetal && (
                     <span className="text-[6px] bg-amber-950 text-amber-400 border border-amber-800 px-1 py-0.5 rounded font-black uppercase">SOLO METAL</span>
                   )}
                   {isSoloCrystal && (
                     <span className="text-[6px] bg-purple-950 text-purple-400 border border-purple-800 px-1 py-0.5 rounded font-black uppercase">SOLO CRISTAL</span>
                   )}
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-zinc-400">Metal:</span>
                   {isSoloCrystal ? (
                     <span className="text-red-500 font-black text-[6px] uppercase tracking-wide">DESACTIVADO POR TOOL</span>
                   ) : (
                     <span className="text-cyan-300 font-bold">[{dynamicMiningRanges.minMetal.toLocaleString()} ~ {dynamicMiningRanges.maxMetal.toLocaleString()}]</span>
                   )}
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-zinc-400">Cristal:</span>
                   {isSoloMetal ? (
                     <span className="text-red-500 font-black text-[6px] uppercase tracking-wide">DESACTIVADO POR TOOL</span>
                   ) : (
                     <span className="text-purple-300 font-bold">[{dynamicMiningRanges.minCrystal.toLocaleString()} ~ {dynamicMiningRanges.maxCrystal.toLocaleString()}]</span>
                   )}
                 </div>
               </div>

              <button
                onClick={handleOpenJourneyModal}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-black text-[10px] uppercase rounded-lg border border-cyan-400 shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all"
              >
                {selectedPlanet ? "CONFIRMAR MINADO" : "CONFIRMAR RECONOCIMIENTO"} ({totalExpeditionProbability}%)
              </button>
            </div>
          </div>

          <div className="flex-1 border border-cyan-500/20 bg-[#05070a] p-3 rounded-xl flex flex-col justify-between gap-2.5 h-full overflow-hidden">
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
                    
                    const isShip = isShipAsset(asset.type);
                    const isTool = isToolAsset(asset.type);
                    const isInFlight = busyAssetIds.has(asset.id) || 
                      (asset.seed_id && (
                        (isShip && busyShipIds.has(asset.seed_id)) || 
                        (isTool && busyToolIds.has(asset.seed_id))
                      ));

                    const effectVal = asset.effect || 0;

                    return (
                      <div
                        key={asset.id}
                        onClick={() => {
                          if (!isInFlight) toggleAssetSelection(asset);
                        }}
                        className={`p-1.5 rounded-lg border flex items-center gap-2 transition-all relative ${
                          isInFlight 
                            ? 'bg-red-950/20 border-red-900/60 opacity-50 pointer-events-none' 
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
                          {isInFlight && (
                            <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center backdrop-blur-[1px]">
                              <span className="text-[5px] text-white font-black uppercase text-center leading-tight shadow-black drop-shadow-md">
                                EN MISIÓN
                              </span>
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
                <div className="w-80 border border-cyan-500/40 bg-[#05070a] rounded-xl flex flex-col items-center p-4 text-center gap-3">
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