import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CornerUpLeft, X, Search, Lock, MapPin, Wrench, Bot, FileText, Package, 
  Pickaxe, Radio, Box, Check, Trash2, Rocket, Sparkles, ChevronDown, ChevronUp, Layers,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { GalaxyFrame } from './CanView';

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
  attack?: number;
  defense?: number;
  cargo_capacity?: number;
  speed?: number;
  fuel_consumption?: number;
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
  seed_ships?: any;
  seed_data?: any;
  raw_data?: any;
  seed?: any;
  tactical_stats?: any;
  laser_attack?: number;
  plasma_attack?: number;
  ion_attack?: number;
  graviton_attack?: number;
  health?: number;
  shield?: number;
  cargo?: number;
  production?: number;
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

const resolveImageUrl = (rawUrl?: string) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
  }
  const clean = rawUrl.trim();
  if (clean === '' || clean.includes('global_hud_config') || clean.includes('undefined') || clean.includes('[object Object]')) {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
  }
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  if (clean.includes('.') || clean.includes('/')) {
    return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/galaxy-assets/${clean.replace(/^\//, '')}`;
  }
  return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
};

const formatSeconds = (totalSec: number): string => {
  if (totalSec <= 0) return '00:00';
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const isShipAsset = (type: string) => ['naves', 'ship', 'ships', 'nave'].includes(String(type || '').toLowerCase());
const isToolAsset = (type: string) => ['tools', 'tool', 'herramientas', 'herramienta'].includes(String(type || '').toLowerCase());
const isLicenseAsset = (type: string) => ['licencia', 'license', 'licenses'].includes(String(type || '').toLowerCase());

// ── COMPONENTE DE CARRUSEL DE 3 CASILLAS CON FLECHAS DE NAVEGACIÓN ──
const MiniSlotCarousel: React.FC<{
  title: string;
  icon: React.ReactNode;
  items: Asset[];
  colorScheme: { border: string; bgHeader: string; text: string; badge: string };
  onRemove: (asset: Asset) => void;
  fleetItem?: Fleet | null;
  onRemoveFleet?: () => void;
}> = ({ title, icon, items, colorScheme, onRemove, fleetItem, onRemoveFleet }) => {
  const [startIndex, setStartIndex] = useState(0);

  const allEntries: Array<{ type: 'fleet'; data: Fleet } | { type: 'asset'; data: Asset }> = [
    ...(fleetItem ? [{ type: 'fleet' as const, data: fleetItem }] : []),
    ...items.map(a => ({ type: 'asset' as const, data: a }))
  ];

  const totalCount = allEntries.length;

  useEffect(() => {
    if (startIndex > 0 && startIndex >= totalCount) {
      setStartIndex(Math.max(0, totalCount - 3));
    }
  }, [totalCount, startIndex]);

  const maxStart = Math.max(0, totalCount - 3);
  const canPrev = startIndex > 0;
  const canNext = startIndex < maxStart;

  const visibleEntries = allEntries.slice(startIndex, startIndex + 3);

  return (
    <div className={`flex-1 min-h-0 flex flex-col bg-[#05080c]/90 border ${colorScheme.border} rounded-lg overflow-hidden shadow-inner`}>
      {/* Cabecera */}
      <div className={`shrink-0 flex items-center justify-between px-2 py-0.5 ${colorScheme.bgHeader} border-b ${colorScheme.border}`}>
        <span className={`text-[7.5px] sm:text-[8px] font-mono font-bold ${colorScheme.text} uppercase flex items-center gap-1 truncate`}>
          {icon}
          <span>{title}</span>
        </span>
        <span className={`text-[7px] font-mono font-black px-1.5 py-0.2 rounded ${colorScheme.badge}`}>
          {totalCount}
        </span>
      </div>

      {/* Cuerpo: Botón Izquierda | 3 Slots de Imágenes | Botón Derecha */}
      <div className="flex-1 min-h-0 flex items-center justify-between px-1 py-1 bg-black/40 gap-1">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => setStartIndex(p => Math.max(0, p - 1))}
          className="w-4 h-full flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-1.5 h-full">
          {[0, 1, 2].map((slotIdx) => {
            const entry = visibleEntries[slotIdx];

            if (!entry) {
              return (
                <div
                  key={`empty-${slotIdx}`}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded border border-dashed border-cyan-950/60 bg-black/30 flex items-center justify-center"
                >
                  <span className="text-[6.5px] text-zinc-700 font-mono">--</span>
                </div>
              );
            }

            if (entry.type === 'fleet') {
              return (
                <div
                  key="slot-fleet-entry"
                  title={entry.data.name}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-[#0a0614] border border-purple-500/80 p-0.5 relative group shadow-sm flex items-center justify-center"
                >
                  <span className="text-[8px] font-black font-mono text-purple-300">FLT</span>
                  {onRemoveFleet && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRemoveFleet(); }}
                      className="absolute -top-1 -right-1 bg-red-950 border border-red-500 text-red-300 rounded-full w-3.5 h-3.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-800 cursor-pointer"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  )}
                </div>
              );
            }

            const asset = entry.data;
            return (
              <div
                key={`slot-${asset.id}`}
                title={`${asset.name} (${asset.rarity || asset.type})`}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-[#05080c] border border-cyan-500/50 hover:border-cyan-300 p-0.5 relative group shadow-sm flex items-center justify-center transition-all cursor-pointer"
              >
                <img
                  src={asset.image_url}
                  alt={asset.name}
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(asset); }}
                  className="absolute -top-1 -right-1 bg-red-950 border border-red-500 text-red-300 rounded-full w-3.5 h-3.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-800 cursor-pointer"
                >
                  <X className="w-2 h-2" />
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!canNext}
          onClick={() => setStartIndex(p => Math.min(maxStart, p + 1))}
          className="w-4 h-full flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const ExpeditionView: React.FC<ExpeditionViewProps> = ({
  initialView = 'selection',
  onBack,
  triggerNotification
}) => {
  const { t } = useTranslation();
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
  const [, setUserCanLevel] = useState<number>(1);
  const [, setSkillUnlockCrystal] = useState<boolean>(false);

  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);
  const [activeExpeditions, setActiveExpeditions] = useState<Expedition[]>([]);
  const [, setExpeditionLogs] = useState<Record<string, ExpeditionLog[]>>({});
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
    });
    return { busyToolIds: toolIds, busyShipIds: shipIds, busyAssetIds: allIds };
  }, [activeExpeditions]);

  const activeGcObject = useMemo(() => {
    return gcList.find(g => g.id === selectedGC) || null;
  }, [gcList, selectedGC]);

  const isInaraSelected = useMemo(() => Boolean(selectedGC), [selectedGC]);

  const totalExpeditionProbability = useMemo(() => {
    const baseClusterRate = activeGcObject?.ss_discovery_rate !== undefined 
      ? Number(activeGcObject.ss_discovery_rate) 
      : 0.5;

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

  // Consolidado de Atributos Tácticos de Flota
  const fleetTotalStats = useMemo(() => {
    return (selectedAssets || []).reduce(
      (acc, item: any) => {
        const raw = item.seed_ships || item.seed_data || item.raw_data || item || {};
        const stats = item.tactical_stats || {};
        const qty = Number(item.quantity || 1);

        const baseAtk = Number(raw.attack ?? item.attack ?? stats.attack ?? stats.kinetic_attack ?? 0);
        const laser = Number(raw.laser_attack ?? raw.laserAttack ?? item.laser_attack ?? stats.laser_attack ?? 0);
        const plasma = Number(raw.plasma_attack ?? raw.plasmaAttack ?? item.plasma_attack ?? stats.plasma_attack ?? 0);
        const ion = Number(raw.ion_attack ?? raw.ionAttack ?? item.ion_attack ?? stats.ionic_attack ?? 0);
        const graviton = Number(raw.graviton_attack ?? raw.gravitonAttack ?? item.graviton_attack ?? stats.graviton_attack ?? 0);

        const hp = Number(raw.health ?? item.health ?? raw.hp ?? stats.hp ?? 0);
        const shd = Number(raw.shield ?? item.shield ?? stats.shield ?? 0);
        const def = Number(raw.defense ?? item.defense ?? stats.defense ?? 0);
        const spd = Number(raw.speed ?? item.speed ?? stats.speed ?? 0);

        const crg = Number(raw.cargo ?? raw.cargo_capacity ?? item.cargo ?? item.cargo_capacity ?? stats.cargo ?? 0);
        const prod = Number(raw.production ?? item.production ?? stats.production ?? 0);

        return {
          attack: acc.attack + (baseAtk * qty),
          laserAttack: acc.laserAttack + (laser * qty),
          plasmaAttack: acc.plasmaAttack + (plasma * qty),
          ionAttack: acc.ionAttack + (ion * qty),
          gravitonAttack: acc.gravitonAttack + (graviton * qty),

          health: acc.health + (hp * qty),
          shield: acc.shield + (shd * qty),
          defense: acc.defense + (def * qty),
          speed: acc.speed === 0 ? spd : (spd > 0 ? Math.min(acc.speed, spd) : acc.speed),

          cargo: acc.cargo + (crg * qty),
          production: acc.production + (prod * qty),
        };
      },
      {
        attack: 0,
        laserAttack: 0,
        plasmaAttack: 0,
        ionAttack: 0,
        gravitonAttack: 0,
        health: 0,
        shield: 0,
        defense: 0,
        speed: 0,
        cargo: 0,
        production: 0,
      }
    );
  }, [selectedAssets]);

  // Filtros de Activos Seleccionados para los 3 Carruseles
  const selectedShips = useMemo(() => {
    return selectedAssets.filter(a => isShipAsset(a.type));
  }, [selectedAssets]);

  const selectedAstrobots = useMemo(() => {
    return selectedAssets.filter(a => String(a.type || '').toLowerCase().includes('astrobot'));
  }, [selectedAssets]);

  const selectedToolsAndOthers = useMemo(() => {
    return selectedAssets.filter(a => {
      const t = String(a.type || '').toLowerCase();
      return !isShipAsset(a.type) && !t.includes('astrobot');
    });
  }, [selectedAssets]);

  const selectedTool = useMemo(() => {
    return (
      selectedAssets.find(a => isToolAsset(a.type))
      ?? (selectedFleet?.tools?.[0] as Asset | undefined)
      ?? null
    );
  }, [selectedAssets, selectedFleet]);

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

    const hasSoloMetalSkill = allTools.some(t => (t.skills || []).includes('TOOL_SOLO_METAL'));
    const hasSoloCrystalSkill = allTools.some(t => (t.skills || []).includes('TOOL_SOLO_CRYSTAL'));

    return {
      minMetal: hasSoloCrystalSkill && !hasSoloMetalSkill ? 0 : Math.max(100, Math.floor(minMetal * modifierMult)),
      maxMetal: hasSoloCrystalSkill && !hasSoloMetalSkill ? 0 : Math.max(300, Math.floor(maxMetal * modifierMult)),
      minCrystal: hasSoloMetalSkill && !hasSoloCrystalSkill ? 0 : Math.max(50, Math.floor(minCrystal * modifierMult)),
      maxCrystal: hasSoloMetalSkill && !hasSoloCrystalSkill ? 0 : Math.max(150, Math.floor(maxCrystal * modifierMult)),
      canMineMetal: !(hasSoloCrystalSkill && !hasSoloMetalSkill),
      canMineCrystal: !(hasSoloMetalSkill && !hasSoloCrystalSkill)
    };
  }, [activeGcObject, selectedAssets, selectedFleet, totalExpeditionProbability]);

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
    const timer = setInterval(() => setNow(Date.now()), 1000);
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
          ss_discovery_rate: g.ss_discovery_rate ?? 0.5
        }));
        setGcList(gcObjects);
        setSelectedGC(prev => prev ?? gcObjects[0].id);
      }

      let legacyUserId: number | null = null;
      if (profile?.legacy_id) legacyUserId = Number(profile.legacy_id);

      const [
        { data: historyRows },
        { data: claimedExpeditions }
      ] = await Promise.all([
        supabase.from('expedition_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('active_expeditions').select('*').eq('user_id', userId).in('status', ['CLAIMED', 'SUCCESS']).order('launch_time', { ascending: false })
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
        });
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
              if (k !== undefined && k !== null) seedMap.set(k.toString(), s);
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
            const finalImg = resolveImageUrl(rawImg);

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
              attack: Number(seed?.attack || row.attack || 0),
              defense: Number(seed?.defense || row.defense || 0),
              cargo_capacity: Number(seed?.cargo_capacity || seed?.cargo || row.cargo || 0),
              speed: Number(seed?.speed || row.speed || 0),
              min_metal_capacity: seed?.min_metal_capacity,
              max_metal_capacity: seed?.max_metal_capacity,
              min_crystal_capacity: seed?.min_crystal_capacity,
              max_crystal_capacity: seed?.max_crystal_capacity,
              seed_ships: seed,
              seed_data: seed,
              raw_data: { ...seed, ...row },
              laser_attack: Number(seed?.laser_attack ?? row.laser_attack ?? 0),
              plasma_attack: Number(seed?.plasma_attack ?? row.plasma_attack ?? 0),
              ion_attack: Number(seed?.ion_attack ?? row.ion_attack ?? 0),
              graviton_attack: Number(seed?.graviton_attack ?? row.graviton_attack ?? 0),
              health: Number(seed?.health ?? seed?.hp ?? row.health ?? 0),
              shield: Number(seed?.shield ?? row.shield ?? 0),
              cargo: Number(seed?.cargo ?? seed?.cargo_capacity ?? row.cargo ?? 0),
              production: Number(seed?.production ?? row.production ?? 0),
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

      const rawAssets = [...ships, ...tools, ...astrobots, ...consumables, ...licenses];
      const deduplicatedAssets = Array.from(new Map(rawAssets.map(item => [item.id, item])).values());
      setInventoryAssets(deduplicatedAssets);

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
      if (triggerNotification) triggerNotification("⛔ ESTE ACTIVO SE ENCUENTRA EN VUELO");
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
      console.warn('Validación de expedición fallida:', compValidation);
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
      console.warn('Validación de expedición fallida en lanzamiento:', compValidation);
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
        p_cluster_id: activeGcObject?.name || selectedGC || 'INARA',
        p_ship_ids: launchShipIds.map(String),
        p_tool_id: launchTool ? String(launchTool.seed_id || launchTool.id) : null
      });

      if (error) throw error;

      if (rpcData && rpcData.success === false) {
        throw new Error(rpcData.error || rpcData.message || 'Error al iniciar expedición');
      }

      setIsStartJourneyOpen(false);
      setSelectedAssets([]);
      setIsDispatchPanelActive(false);
      setCurrentStep('GC');
      setSelectedPlanet(null);

      syncDatabaseData();
      if (triggerNotification) triggerNotification(`🚀 EXPEDICIÓN DESPLEGADA`);
    } catch (err: any) {
      console.error("Error al desplegar expedición:", err);
      setLaunchError(err.message || "Error de comunicación");
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="w-full h-full max-h-full flex flex-col overflow-hidden" id="swgoh-expedition-screen">
      <GalaxyFrame className="w-full max-w-7xl mx-auto h-full max-h-full flex flex-col min-h-0 font-mono text-left select-none text-white" innerPadding="p-1.5 sm:p-2 h-full flex flex-col min-h-0 overflow-hidden">
        <div className="flex flex-col gap-1.5 h-full min-h-0 flex-1 overflow-hidden">
          
          {/* BARRA SUPERIOR DE BREADCRUMBS */}
          <div className="w-full bg-[#05070a] border border-cyan-500/30 p-2 rounded-xl flex justify-between items-center shrink-0">
            <div className="flex flex-col gap-0.5 text-left">
              <h1 className="text-xs sm:text-sm font-black tracking-widest text-white uppercase flex items-center gap-2 leading-none">
                MATRIZ DE EXPEDICIONES DE CLUSTER
              </h1>
              <p className="text-cyan-400 text-[8px] sm:text-[9px] tracking-wide font-bold uppercase leading-none mt-0.5">{formatBreadcrumbText()}</p>
            </div>

            <div className="flex items-center gap-2">
              {isDispatchPanelActive && (
                <button
                  onClick={() => { playSfx(660); setIsDispatchPanelActive(false); }}
                  className="flex items-center gap-1 px-2 py-1 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-[8px] font-bold tracking-widest uppercase rounded bg-cyan-950/80 transition-colors cursor-pointer"
                >
                  <CornerUpLeft className="w-3 h-3 text-cyan-400" /> RETORNAR A MAPA
                </button>
              )}
            </div>
          </div>

          {!isDispatchPanelActive ? (
            /* VISTA DE SELECCIÓN DE COORDENADAS GC/GAL/SC/SS */
            <div className="w-full flex-1 flex flex-col sm:flex-row gap-2 overflow-hidden items-stretch min-h-0">
              <div className="w-full sm:w-[300px] shrink-0 border border-cyan-500/20 bg-[#05070a] rounded-xl p-2 flex flex-col justify-between shadow-2xl h-auto">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-cyan-950 pb-2 text-left">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-cyan-400 animate-bounce" />
                      <span className="text-[11px] font-black tracking-widest text-white uppercase">COORDENADAS GC</span>
                    </div>

                    {(selectedGC || selectedGAL || selectedSC || selectedSS || selectedPlanet) && (
                      <button
                        onClick={handleStepBack}
                        className="flex items-center gap-1 px-2 py-0.5 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-[8px] font-extrabold uppercase rounded bg-cyan-950/80 transition-all cursor-pointer"
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
                      { id: 'SS', label: 'SS', isUnlocked: selectedSC !== null, isSelected: selectedSS !== null },
                      { id: 'PLANETA', label: 'PLANETA', isUnlocked: selectedSS !== null && dbPlanets.length > 0, isSelected: selectedPlanet !== null }
                    ] as const).map((tab) => (
                      <button
                        key={tab.id}
                        disabled={!tab.isUnlocked}
                        onClick={() => { playSfx(660); setCurrentStep(tab.id as SelectionStep); }}
                        className={`py-1 rounded text-[8px] font-bold uppercase transition-all flex items-center justify-center gap-0.5 border ${
                          currentStep === tab.id
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
                    ))}
                  </div>

                  <div className="p-1 flex flex-col gap-1 max-h-[40vh] sm:max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                    {currentStep === 'GC' && (
                      gcList.map((gc) => {
                        const reqCheck = checkGCRequirements(gc);
                        const isSelected = selectedGC === gc.id;
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
                              setCurrentStep('GAL');
                            }}
                            className={`w-full p-2 rounded-lg border text-[8.5px] font-bold uppercase transition-all cursor-pointer ${
                              isSelected ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80' : 'bg-[#0a0f14] text-zinc-300 border-cyan-950 hover:border-cyan-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-white">{gc.name}</span>
                              {reqCheck.allowed && <span className="text-[7px] bg-cyan-950 text-cyan-400 px-1 py-0.5 rounded font-black">OK</span>}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="p-1.5 border-t border-cyan-950 bg-black/60 rounded text-[8px] text-zinc-500 font-bold uppercase">
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
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  )}
                </div>
                <div className="shrink-0 w-full border-t border-cyan-500/30 flex items-center justify-center p-3 bg-[#020508]/80">
                  <button
                    onClick={() => { playSfx(880); setIsDispatchPanelActive(true); }}
                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 border border-cyan-400 text-white text-[10px] font-black uppercase rounded shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                  >
                    ARMAR FLOTA
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* VISTA DE ARMADO DE EXPEDICIÓN (GRID 12 COLUMNAS) */
            <div className="h-full max-h-full grid grid-cols-12 gap-1.5 sm:gap-2 overflow-hidden flex-1 min-h-0">
              
              {/* COLUMNA IZQUIERDA: CATEGORÍAS Y CONFIRMACIÓN */}
              <div className="col-span-4 sm:col-span-3 h-full flex flex-col justify-between overflow-hidden bg-[#05080c]/80 border border-cyan-500/30 p-1.5 sm:p-2 rounded">
                <div className="flex flex-col gap-1 shrink-0 overflow-y-auto">
                  <span className="text-[7.5px] sm:text-[8px] font-bold text-zinc-400 uppercase px-1 pb-0.5 border-b border-cyan-950">
                    SELECCIONAR CATEGORÍA
                  </span>
                  {leftMenuOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { playSfx(660); setCurrentLeftCategory(opt as LeftMenuCategory); }}
                      className={`w-full text-left px-2 py-1 rounded text-[10px] sm:text-[11px] font-bold uppercase border cursor-pointer flex items-center gap-1.5 ${
                        currentLeftCategory === opt ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black' : 'bg-[#0a0f14] text-zinc-400 border-transparent hover:text-zinc-200'
                      }`}
                    >
                      {getCategoryIcon(opt as LeftMenuCategory)}
                      <span className="truncate">{opt}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-auto space-y-1 shrink-0 pt-1 border-t border-cyan-950/60">
                  <div className="bg-[#020508] py-1 px-1.5 rounded border border-cyan-900/50 flex flex-col gap-0.5 text-[8.5px] sm:text-[9.5px] font-mono">
                    <span className="text-cyan-400 font-bold uppercase text-[8px] sm:text-[8.5px]">RANGO ESTIMADO DE EXTRACCIÓN</span>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Metal:</span>
                      <span className="text-cyan-300 font-bold">[{dynamicMiningRanges.minMetal.toLocaleString()} ~ {dynamicMiningRanges.maxMetal.toLocaleString()}]</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Cristal:</span>
                      <span className="text-purple-300 font-bold">[{dynamicMiningRanges.minCrystal.toLocaleString()} ~ {dynamicMiningRanges.maxCrystal.toLocaleString()}]</span>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenJourneyModal}
                    className="shrink-0 w-full py-1.5 text-[10px] sm:text-xs font-bold hud-chamfer-sm bg-gradient-to-r from-cyan-600 to-teal-600 text-white uppercase rounded border border-cyan-400 shadow cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                  >
                    CONFIRMAR RECONOCIMIENTO ({totalExpeditionProbability}%)
                  </button>
                </div>
              </div>

              {/* COLUMNA DERECHA: CATÁLOGO DISPONIBLE + 3 CARRUSELES DE SELECCIÓN */}
              <div className="col-span-8 sm:col-span-9 h-full min-h-0 flex flex-col gap-1.5 overflow-hidden p-1.5 sm:p-2 bg-[#05080c]/70 border border-cyan-500/30 rounded-xl">
                
                {/* 1. CATÁLOGO DISPONIBLE (FLEX-1) */}
                <div className="flex-1 min-h-0 flex flex-col bg-[#03060a]/80 border border-cyan-900/50 rounded-lg p-1.5 overflow-hidden">
                  <div className="shrink-0 flex items-center justify-between pb-1 mb-1 border-b border-cyan-950">
                    <span className="text-[10px] sm:text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider truncate">
                      DISPONIBLES: {currentLeftCategory.toUpperCase()} ({filteredInventory.length})
                    </span>
                    {currentLeftCategory !== 'Fleets' && (
                      <div className="relative w-40 sm:w-48">
                        <Search className="absolute left-1.5 top-1.5 w-3 h-3 text-cyan-500" />
                        <input
                          type="text"
                          placeholder="BUSCAR POR NOMBRE..."
                          value={assetSearchQuery}
                          onChange={(e) => setAssetSearchQuery(e.target.value)}
                          className="w-full h-5 sm:h-6 text-[9px] sm:text-[10px] bg-black/70 border border-cyan-500/30 pl-5 pr-5 rounded font-mono text-cyan-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 uppercase"
                        />
                        {assetSearchQuery && (
                          <button onClick={() => setAssetSearchQuery('')} className="absolute right-1 top-1 text-zinc-500 hover:text-white">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 grid grid-cols-2 md:grid-cols-4 gap-1.5 custom-scrollbar content-start">
                    {filteredInventory.length === 0 ? (
                      <div className="col-span-full p-4 text-center text-zinc-600 text-[8.5px] uppercase tracking-widest font-mono">
                        SIN ACTIVOS EN ESTA CATEGORÍA
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

                        return (
                          <div
                            key={asset.id}
                            onClick={() => { if (!isInFlight) toggleAssetSelection(asset); }}
                            className={`p-1 sm:p-1.5 rounded border flex items-center gap-1.5 transition-all relative ${
                              isInFlight 
                                ? 'bg-red-950/20 border-red-900/60 opacity-50 pointer-events-none' 
                                : isSelected 
                                ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)] cursor-pointer' 
                                : 'bg-[#050910] border-cyan-950 hover:border-cyan-800 cursor-pointer'
                            }`}
                          >
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-black border border-cyan-950 shrink-0 overflow-hidden relative">
                              <img src={asset.image_url} className={`w-full h-full object-cover ${isInFlight ? 'grayscale' : ''}`} alt={asset.name} />
                              {isSelected && !isInFlight && (
                                <div className="absolute inset-0 bg-cyan-500/30 flex items-center justify-center">
                                  <Check className="w-3 h-3 text-cyan-300 stroke-[3]" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col text-left overflow-hidden flex-1 leading-tight">
                              <span className="text-[7.5px] sm:text-[8px] font-black text-white truncate">{asset.name}</span>
                              <span className="text-[6.5px] text-zinc-500 font-mono uppercase">{asset.rarity}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. BANDEJA DE DESPLIEGUE: 3 CARRUSELES (3 SLOTS C/U) + STATS + PIE */}
                <div className="shrink-0 h-[175px] sm:h-[190px] max-h-[54%] flex flex-col justify-between bg-[#03060a]/95 border border-cyan-900/50 rounded-lg p-1.5 overflow-hidden">
                  
                  {/* Header de la Bandeja */}
                  <div className="shrink-0 flex items-center justify-between pb-0.5 border-b border-cyan-950 text-[9px] font-mono font-bold">
                    <span className="text-amber-400 uppercase tracking-wider">
                      ACTIVOS SELECCIONADOS ({selectedAssets.length + (selectedFleet ? 1 : 0)})
                    </span>
                    {(selectedAssets.length > 0 || selectedFleet) && (
                      <button
                        onClick={() => {
                          playSfx(440);
                          setSelectedAssets([]);
                          setSelectedFleet(null);
                        }}
                        className="text-[8px] text-red-400 hover:text-red-300 font-bold uppercase cursor-pointer flex items-center gap-0.5"
                      >
                        <Trash2 className="w-2.5 h-2.5" /> [🗑 LIMPIAR SELECCIÓN]
                      </button>
                    )}
                  </div>

                  {/* ── 3 CARRUSELES TÁCTICOS CON 3 CASILLAS Y FLECHAS < > ── */}
                  <div className="flex-1 min-h-0 grid grid-cols-3 gap-1.5 my-1 overflow-hidden">
                    
                    {/* CARRUSEL 1: NAVES */}
                    <MiniSlotCarousel
                      title="NAVES"
                      icon={<Rocket className="w-2.5 h-2.5 text-cyan-400" />}
                      items={selectedShips}
                      colorScheme={{
                        border: 'border-cyan-500/30',
                        bgHeader: 'bg-cyan-950/40',
                        text: 'text-cyan-300',
                        badge: 'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
                      }}
                      onRemove={toggleAssetSelection}
                      fleetItem={selectedFleet}
                      onRemoveFleet={() => setSelectedFleet(null)}
                    />

                    {/* CARRUSEL 2: ASTROBOTS */}
                    <MiniSlotCarousel
                      title="ASTROBOTS"
                      icon={<Bot className="w-2.5 h-2.5 text-emerald-400" />}
                      items={selectedAstrobots}
                      colorScheme={{
                        border: 'border-emerald-500/30',
                        bgHeader: 'bg-emerald-950/40',
                        text: 'text-emerald-300',
                        badge: 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                      }}
                      onRemove={toggleAssetSelection}
                    />

                    {/* CARRUSEL 3: TOOLS / LICENCIAS / CONSUMIBLES */}
                    <MiniSlotCarousel
                      title="TOOLS / ETC"
                      icon={<Wrench className="w-2.5 h-2.5 text-amber-400" />}
                      items={selectedToolsAndOthers}
                      colorScheme={{
                        border: 'border-amber-500/30',
                        bgHeader: 'bg-amber-950/40',
                        text: 'text-amber-300',
                        badge: 'bg-amber-950 text-amber-300 border border-amber-700/60'
                      }}
                      onRemove={toggleAssetSelection}
                    />

                  </div>

                  {/* 3. CONSOLIDADO TÁCTICO DE ESTADÍSTICAS (DEFENSIVO) */}
                  <div className="shrink-0 w-full py-1 px-1 bg-[#020509] border border-cyan-500/25 rounded flex items-center justify-between gap-1 overflow-x-auto no-scrollbar font-mono text-[7.5px] sm:text-[8.5px] select-none">
                    
                    {/* GRUPO OFENSIVA */}
                    <div className="flex items-center gap-1 shrink-0 bg-red-950/30 border border-red-500/30 px-1.5 py-0.5 rounded">
                      <span className="text-red-400 font-bold uppercase text-[7px] border-r border-red-900/60 pr-1">OFENSIVA</span>
                      <span className="text-white font-bold">⚔ {fleetTotalStats.attack}</span>
                      {fleetTotalStats.laserAttack > 0 && <span className="text-cyan-300 font-bold">⚡ {fleetTotalStats.laserAttack}</span>}
                      {fleetTotalStats.plasmaAttack > 0 && <span className="text-purple-300 font-bold">🟣 {fleetTotalStats.plasmaAttack}</span>}
                      {fleetTotalStats.ionAttack > 0 && <span className="text-blue-300 font-bold">🔷 {fleetTotalStats.ionAttack}</span>}
                      {fleetTotalStats.gravitonAttack > 0 && <span className="text-emerald-300 font-bold">🌀 {fleetTotalStats.gravitonAttack}</span>}
                    </div>

                    {/* GRUPO DEFENSIVO (ANTERIORMENTE CINEMÁTICA) */}
                    <div className="flex items-center gap-1 shrink-0 bg-cyan-950/30 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                      <span className="text-cyan-400 font-bold uppercase text-[7px] border-r border-cyan-900/60 pr-1">DEFENSIVO</span>
                      <span className="text-white font-bold" title="Casco / HP">💚 {fleetTotalStats.health}</span>
                      <span className="text-purple-400 font-bold" title="Escudos">🛡 {fleetTotalStats.shield}</span>
                      <span className="text-cyan-300 font-bold" title="Defensa">🔰 {fleetTotalStats.defense}</span>
                      <span className="text-amber-400 font-bold" title="Velocidad de Flota">🚀 {fleetTotalStats.speed}</span>
                    </div>

                    {/* GRUPO LOGÍSTICA */}
                    <div className="flex items-center gap-1 shrink-0 bg-amber-950/30 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      <span className="text-amber-400 font-bold uppercase text-[7px] border-r border-amber-900/60 pr-1">LOGÍSTICA</span>
                      <span className="text-amber-300 font-bold">📦 {fleetTotalStats.cargo.toLocaleString()} U</span>
                      {fleetTotalStats.production > 0 && <span className="text-emerald-400 font-bold">+{fleetTotalStats.production}%</span>}
                    </div>

                  </div>

                  {/* 4. PIE DE PÁGINA (PROBABILIDAD SS) */}
                  <div className="shrink-0 pt-0.5 border-t border-cyan-950 flex items-center justify-between text-[7.5px] sm:text-[8px] font-mono leading-none">
                    <span className="text-zinc-400 font-bold uppercase truncate">
                      PROBABILIDAD DESCUBRIMIENTO SS:
                    </span>
                    <span className={`font-black ${totalExpeditionProbability >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                      {totalExpeditionProbability}%
                    </span>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

        {/* MODAL: HERRAMIENTA REQUERIDA */}
        {showToolRequiredModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4 font-mono">
            <div className="w-full max-w-md bg-[#080b0e] border-2 border-cyan-500/80 rounded-2xl p-6 text-center space-y-4 shadow-[0_0_35px_rgba(6,182,212,0.3)]">
              <h3 className="text-sm font-black text-white uppercase tracking-widest pt-2">
                {t('expeditions.tool_required_title', 'HERRAMIENTA REQUERIDA')}
              </h3>
              
              <p className="text-[9.5px] text-zinc-300 leading-relaxed font-sans normal-case bg-black/50 p-3 rounded-xl border border-cyan-950">
                {t('expeditions.tool_requirement', 'Para iniciar una expedición en este sector es obligatorio equipar al menos una Herramienta de extracción en tu escuadrón.')}
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
                  {t('expeditions.select_tool', 'SELECCIONAR HERRAMIENTA')}
                </button>
                <button
                  onClick={() => {
                    playSfx(440);
                    setShowToolRequiredModal(false);
                  }}
                  className="py-2.5 bg-black border border-zinc-800 text-zinc-400 text-[9px] font-bold uppercase rounded-lg hover:text-white cursor-pointer"
                >
                  {t('expeditions.understood', 'ENTENDIDO')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CONFIRMACIÓN DE LANZAMIENTO */}
        {isStartJourneyOpen && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 font-mono">
            <div className="w-full max-w-md bg-[#080b0e] border border-cyan-500/40 rounded-2xl p-6 text-center space-y-4 shadow-[0_0_40px_rgba(6,182,212,0.3)]">
              <h3 className="text-lg font-black text-white uppercase">{t('expeditions.launch_title', 'CONFIRMAR DESPLIEGUE')}</h3>
              <p className="text-xs text-amber-400 font-bold">
                {selectedPlanet ? "MODIFICADOR NETO:" : "PROBABILIDAD ESTIMADA:"} {totalExpeditionProbability}%
              </p>
              
              {launchError && (
                <div className="p-3 bg-red-950/80 border border-red-500 text-red-300 text-[9px] uppercase font-bold rounded-lg">
                  {launchError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={executeLaunchTransaction}
                  disabled={loading}
                  className="py-2.5 bg-cyan-950 border border-cyan-500 text-cyan-300 text-[10px] font-black uppercase rounded-lg hover:bg-cyan-900 cursor-pointer disabled:opacity-40"
                >
                  {loading ? 'DESPLEGANDO...' : t('expeditions.confirm_journey', 'INICIAR EXPEDICIÓN')}
                </button>
                <button
                  onClick={() => { playSfx(440); setIsStartJourneyOpen(false); }}
                  className="py-2.5 bg-black border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase rounded-lg hover:bg-zinc-900 cursor-pointer"
                >
                  {t('expeditions.cancel', 'CANCELAR')}
                </button>
              </div>
            </div>
          </div>
        )}
      </GalaxyFrame>
    </div>
  );
};

export const ExpeditionsView = ExpeditionView;
export default ExpeditionView;