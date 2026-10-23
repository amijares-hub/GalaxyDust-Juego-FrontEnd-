import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart2, Globe, AlertTriangle, RefreshCw, X, Sparkles, ChevronRight, ChevronLeft, Shield, Info, Lock, BatteryCharging, Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { CanAssetsModal, CanAssetItem } from './CanAssetsModal';
import { miningService, CANProductionReport } from '../services/miningService';
import {
  SciFiCraftingIcon, SciFiSpeedIcon, SciFiWeaponIcon, SciFiNodeIcon, SciFiAtomIcon, SciFiLaserIcon, SciFiTimerIcon
} from './SciFiIcons';

interface CanViewProps {
  triggerNotification?: (text: string, e?: any) => void;
}

interface ActiveSkillItem {
  id: string;
  source: 'CAN' | 'STRUCTURE' | 'TECH' | 'BADGE';
  assetName: string;
  assetImageUrl?: string;
  level?: number;
  rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  effectTitle: string;
  effectDescription: string;
}

interface DiscoveredStar {
  id: string;
  star_id: string;
  star_name: string;
  cluster: string;
  discovery_order: number;
  reward_details?: {
    gd_coin?: number;
    dark_matter?: number;
    title?: string;
  };
  discovered_at: string;
}

export const GalaxyFrame: React.FC<{ children: React.ReactNode; className?: string; innerPadding?: string }> = ({
  children,
  className = "",
  innerPadding = "p-4"
}) => {
  return (
    <div className={`relative hud-panel hud-corners hud-chamfer-sm transition-all duration-300 ${className}`}>
      {/* Línea de escaneo holográfica sutil superior */}
      <div className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none z-10" />
      <div className={`relative z-20 h-full w-full ${innerPadding}`}>
        {children}
      </div>
    </div>
  );
};

const SKILLS_PER_PAGE = 5;

export const CanView: React.FC<CanViewProps> = ({ triggerNotification }) => {
  const { t } = useTranslation();
  const { playSfx } = useAudioEngine();

  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [canLevel, setCanLevel] = useState<number>(1);
  const [galacticPower, setGalacticPower] = useState<number>(0);
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);
  const [, setLoading] = useState<boolean>(true);

  // Modales
  const [activeModalCategory, setActiveModalCategory] = useState<'Estructuras' | 'Tecnologias' | 'Insignias' | null>(null);
  const [showAmiModal, setShowAmiModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showSkillsModal, setShowSkillsModal] = useState<boolean>(false);
  const [skillsModalFilter, setSkillsModalFilter] = useState<'ALL' | 'CAN' | 'STRUCTURE' | 'TECH' | 'BADGE'>('ALL');
  const [skillsPage, setSkillsPage] = useState<number>(1);

  const [hoveredSkill, setHoveredSkill] = useState<ActiveSkillItem | null>(null);
  const [activeFlightsCount, setActiveFlightsCount] = useState<number>(0);
  const [canAssetsList, setCanAssetsList] = useState<CanAssetItem[]>([]);
  const [totalDiscoveredStars, setTotalDiscoveredStars] = useState<number>(0);
  const [activeSkills, setActiveSkills] = useState<ActiveSkillItem[]>([]);
  const [discoveredStars, setDiscoveredStars] = useState<DiscoveredStar[]>([]);

  // Métricas reales de producción y energía C.A.N.
  const [canMetrics, setCanMetrics] = useState<CANProductionReport>({
    energyProduced: 0,
    energyRequired: 0,
    energyEfficiency: 1.0,
    hourlyProduction: { metal: 0, crystal: 0, deuterium: 0, dark_matter: 0 },
    storageLimits: { metal: 10000, crystal: 5000, deuterium: 2500, dark_matter: 100 }
  });

  const getSkillIcon = (source: string, desc: string = '') => {
    const lower = desc.toLowerCase();
    if (lower.includes('escudo') || lower.includes('defensa') || lower.includes('shield')) {
      return <Shield className="w-3.5 h-3.5 text-cyan-300 filter drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] shrink-0" />;
    }
    if (lower.includes('ataque') || lower.includes('arma') || lower.includes('daño')) {
      return <SciFiWeaponIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (lower.includes('velocidad') || lower.includes('flota') || lower.includes('tránsito')) {
      return <SciFiSpeedIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
    if (lower.includes('extracción') || lower.includes('minado') || lower.includes('metal') || lower.includes('cristal')) {
      return <SciFiCraftingIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
    }
    if (lower.includes('láser') || lower.includes('energía')) {
      return <SciFiLaserIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    }
    if (lower.includes('tiempo')) {
      return <SciFiTimerIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
    }

    switch (source) {
      case 'CAN': return <SciFiNodeIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case 'STRUCTURE': return <SciFiCraftingIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'TECH': return <SciFiAtomIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'BADGE': return <SciFiLaserIcon className="w-3.5 h-3.5 text-cyan-300 shrink-0" />;
      default: return <SciFiNodeIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    }
  };

  const parseSkillsFromSeed = (seed: any, defaultType: string, defaultBonus: number): string[] => {
    if (!seed) return [`Efecto pasivo de ${defaultType} (+${defaultBonus}%)`];

    if (seed.skills) {
      if (Array.isArray(seed.skills) && seed.skills.length > 0) {
        return seed.skills.map(String);
      }
      if (typeof seed.skills === 'object' && seed.skills !== null) {
        const entries = Object.entries(seed.skills);
        if (entries.length > 0) {
          return entries.map(([k, v]) => `${k.toUpperCase().replace(/_/g, ' ')}: +${v}`);
        }
      }
      if (typeof seed.skills === 'string' && seed.skills.trim() !== '') {
        try {
          const parsed = JSON.parse(seed.skills);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(String);
          if (typeof parsed === 'object' && parsed !== null) {
            return Object.entries(parsed).map(([k, v]) => `${k.toUpperCase().replace(/_/g, ' ')}: +${v}`);
          }
        } catch {
          return [seed.skills];
        }
      }
    }

    const bonus = seed.power_score_base || seed.mining_bonus || seed.effect || defaultBonus;
    const desc = seed.description || `Efecto táctico activo en red`;
    return [`${desc} (+${bonus}%)`];
  };

  const fetchCanData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Cargar métricas auditadas de C.A.N.
      const calculatedMetrics = await miningService.calculateUserCANMetrics(user.id);
      setCanMetrics(calculatedMetrics);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const lvl = profile?.level || profile?.can_level || 1;
      setCanLevel(lvl);

      const { count: flights } = await supabase
        .from('active_expeditions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'LAUNCHED');

      setActiveFlightsCount(flights || 0);

      const unifiedAssets: CanAssetItem[] = [];

      const { data: strFallback } = await supabase.from('user_structures').select('*').eq('user_id', user.id);
      const { data: seedStr } = await supabase.from('seed_structures').select('*');
      const seedMap = new Map((seedStr || []).map((s: any) => [String(s.id), s]));
      const rawStructures = (strFallback || []).map((row: any) => ({
        ...row,
        seed_structures: seedMap.get(String(row.structure_id || row.building_id))
      }));

      rawStructures.forEach((s: any) => {
        const seed = s.seed_structures;
        unifiedAssets.push({
          id: String(s.id),
          seed_id: String(s.structure_id || seed?.id || s.id),
          name: seed?.structure_name || seed?.name || `Estructura #${s.id}`,
          type: 'Estructuras',
          description: seed?.description || '',
          effect_bonus: seed?.power_score_base || 10,
          image_url: seed?.image_url,
          is_equipped: s.is_equipped === true,
          level: s.current_level || 1
        });
      });

      const { data: techFallback } = await supabase.from('user_technologies').select('*').eq('user_id', user.id);
      const { data: seedTech } = await supabase.from('seed_technologies').select('*');
      const seedTechMap = new Map((seedTech || []).map((s: any) => [String(s.id), s]));
      const rawTech = (techFallback || []).map((row: any) => ({
        ...row,
        seed_technologies: seedTechMap.get(String(row.technology_id))
      }));

      rawTech.forEach((t: any) => {
        const seed = t.seed_technologies;
        unifiedAssets.push({
          id: String(t.id),
          seed_id: String(t.technology_id || seed?.id || t.id),
          name: seed?.technology_name || seed?.name || `Tecnología #${t.id}`,
          type: 'Tecnologias',
          description: seed?.description || '',
          effect_bonus: seed?.power_score_base || 15,
          image_url: seed?.image_url,
          is_equipped: t.is_equipped === true
        });
      });

      let rawBadges: any[] = [];
      const { data: bUnlockedData, error: bUnlockedErr } = await supabase
        .from('user_badges_unlocked')
        .select('*, seed_badges(*)')
        .eq('user_id', user.id);

      if (!bUnlockedErr && bUnlockedData && bUnlockedData.length > 0) {
        rawBadges = bUnlockedData;
      } else {
        const { data: bData, error: bErr } = await supabase
          .from('user_badges')
          .select('*, seed_badges(*)')
          .eq('user_id', user.id);

        if (!bErr && bData && bData.length > 0) {
          rawBadges = bData;
        } else {
          const { data: bFallback } = await supabase.from('user_badges_unlocked').select('*').eq('user_id', user.id);
          const { data: seedB } = await supabase.from('seed_badges').select('*');
          const seedMap = new Map((seedB || []).map((s: any) => [String(s.id), s]));
          rawBadges = (bFallback || []).map((row: any) => ({
            ...row,
            seed_badges: seedMap.get(String(row.badge_id))
          }));
        }
      }

      rawBadges.forEach((b: any) => {
        const seed = b.seed_badges;
        unifiedAssets.push({
          id: String(b.id),
          seed_id: String(b.badge_id || seed?.id || b.id),
          name: seed?.name || `Insignia #${b.badge_id}`,
          type: 'Insignias',
          description: seed?.description || '',
          effect_bonus: seed?.mining_bonus || 20,
          image_url: seed?.image_url,
          is_equipped: b.is_equipped === true
        });
      });

      setCanAssetsList(unifiedAssets);

      let calculatedPower = lvl * 1000;
      unifiedAssets.filter(a => a.is_equipped).forEach(a => {
        calculatedPower += Number(a.effect_bonus || 150) * 10;
      });
      if (profile?.power_score && profile.power_score > calculatedPower) {
        calculatedPower = profile.power_score;
      }
      setGalacticPower(calculatedPower);

      const { count: starsCount } = await supabase
        .from('user_discovered_stars')
        .select('star_id', { count: 'exact', head: true })
        .eq('discoverer_id', user.id);

      setTotalDiscoveredStars(starsCount || 0);

      const { data: starsData } = await supabase
        .from('user_discovered_stars')
        .select('*')
        .eq('discoverer_id', user.id)
        .order('created_at', { ascending: false });

      if (starsData && starsData.length > 0) {
        setDiscoveredStars(starsData.map((s: any) => ({
          id: s.id,
          star_id: s.star_id || s.id,
          star_name: s.star_name || 'SISTEMA SOLAR',
          cluster: s.cluster || 'INARA',
          discovery_order: Number(s.discovery_order || 1),
          reward_details: s.reward_details || {},
          discovered_at: new Date(s.created_at || Date.now()).toLocaleDateString()
        })));
      } else {
        setDiscoveredStars([]);
      }

      const skillsToParse: ActiveSkillItem[] = [
        { id: 'sk-can-1', source: 'CAN', assetName: 'C.A.N. MATRIX LEVEL', effectTitle: 'Producción Global', effectDescription: `+${lvl * 5}% Producción Diaria de Recursos` },
        { id: 'sk-can-2', source: 'CAN', assetName: 'C.A.N. MATRIX LEVEL', effectTitle: 'Slots Tácticos Adicionales', effectDescription: `+${lvl * 2} Espacios de Almacenamiento Táctico` }
      ];

      rawStructures.filter((s: any) => s.is_equipped === true).forEach((item: any) => {
        const seed = item.seed_structures || {};
        const parsed = parseSkillsFromSeed(seed, 'Estructura', 10);
        parsed.forEach((skText, idx) => {
          skillsToParse.push({
            id: `sk-str-${item.id}-${idx}`,
            source: 'STRUCTURE',
            assetName: seed.structure_name || seed.name || `Estructura #${item.id}`,
            assetImageUrl: seed.image_url,
            rarity: 'EPIC',
            level: item.current_level || 1,
            effectTitle: seed.structure_name || 'Estructura Activa',
            effectDescription: skText
          });
        });
      });

      rawTech.filter((t: any) => t.is_equipped === true).forEach((item: any) => {
        const seed = item.seed_technologies || {};
        const parsed = parseSkillsFromSeed(seed, 'Tecnología', 15);
        parsed.forEach((skText, idx) => {
          skillsToParse.push({
            id: `sk-tech-${item.id}-${idx}`,
            source: 'TECH',
            assetName: seed.technology_name || seed.name || `Tecnología #${item.id}`,
            assetImageUrl: seed.image_url,
            rarity: seed.rarity || 'RARE',
            effectTitle: seed.technology_name || 'Tecnología Activa',
            effectDescription: skText
          });
        });
      });

      rawBadges.filter((b: any) => b.is_equipped === true).forEach((item: any) => {
        const seed = item.seed_badges || {};
        const parsed = parseSkillsFromSeed(seed, 'Insignia', 20);
        parsed.forEach((skText, idx) => {
          skillsToParse.push({
            id: `sk-bdg-${item.id}-${idx}`,
            source: 'BADGE',
            assetName: seed.name || `Insignia #${item.badge_id || item.id}`,
            assetImageUrl: seed.image_url,
            rarity: 'LEGENDARY',
            effectTitle: seed.name || 'Insignia Activa',
            effectDescription: skText
          });
        });
      });

      setActiveSkills(skillsToParse);

    } catch (err) {
      console.error("Error al cargar C.A.N.:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanData();
  }, []);

  const handleUpgradeCan = async () => {
    if (isUpgrading) return;
    setIsUpgrading(true);
    playSfx(880);

    try {
      const { data, error } = await supabase.rpc('upgrade_can_node_secure');

      if (error) throw error;

      playSfx(1200);
      setCanLevel(data.new_level);
      setGalacticPower(data.new_power);

      if (triggerNotification) {
        triggerNotification(`⚡ NODO C.A.N. ELEVADO A NIVEL ${data.new_level} CON ÉXITO`);
      }

      fetchCanData();
    } catch (err: any) {
      console.error("Error al subir nivel C.A.N.:", err);
      playSfx(300);
      if (triggerNotification) {
        triggerNotification(`⛔ ERROR AL ELEVAR NODO: ${err.message}`);
      }
    } finally {
      setIsUpgrading(false);
    }
  };

  const equippedStructuresCount = useMemo(() => {
    return canAssetsList.filter(a => a.type === 'Estructuras' && a.is_equipped).length;
  }, [canAssetsList]);

  const equippedTechCount = useMemo(() => {
    return canAssetsList.filter(a => a.type === 'Tecnologias' && a.is_equipped).length;
  }, [canAssetsList]);

  const equippedBadgesCount = useMemo(() => {
    return canAssetsList.filter(a => a.type === 'Insignias' && a.is_equipped).length;
  }, [canAssetsList]);

  const structSkills = useMemo(() => {
    return activeSkills.filter(s => s.source === 'STRUCTURE' || s.source === 'CAN');
  }, [activeSkills]);

  const techSkills = useMemo(() => {
    return activeSkills.filter(s => s.source === 'TECH');
  }, [activeSkills]);

  const badgeSkills = useMemo(() => {
    return activeSkills.filter(s => s.source === 'BADGE');
  }, [activeSkills]);

  const renderSkillChipsSection = (skillsList: ActiveSkillItem[], emptyMessage: string) => {
    if (skillsList.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center text-[7.5px] text-zinc-600 font-bold uppercase tracking-wider text-center p-2">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5 p-1 pt-1.5 overflow-x-hidden overflow-y-auto max-h-[105px] custom-scrollbar w-full">
        {skillsList.map((sk) => {
          const icon = getSkillIcon(sk.source, sk.effectDescription);
          const isCanon = sk.source === 'CAN';
          const isStruct = sk.source === 'STRUCTURE';
          const isTech = sk.source === 'TECH';

          return (
            <div
              key={sk.id}
              onMouseEnter={() => setHoveredSkill(sk)}
              onClick={() => setHoveredSkill(sk)}
              className={`relative cursor-pointer w-6 h-6 sm:w-7 sm:h-7 rounded-md border flex items-center justify-center transition-all duration-200 shrink-0 ${
                isCanon
                  ? 'bg-cyan-950/80 border-cyan-400/80 shadow-[0_0_6px_rgba(6,182,212,0.3)]'
                  : isStruct
                  ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_6px_rgba(245,158,11,0.2)]'
                  : isTech
                  ? 'bg-purple-950/40 border-purple-500/60 shadow-[0_0_6px_rgba(168,85,247,0.2)]'
                  : 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_6px_rgba(16,185,129,0.2)]'
              } hover:scale-110 active:scale-95`}
            >
              {icon}
            </div>
          );
        })}
      </div>
    );
  };

  const filteredSkillsForModal = useMemo(() => {
    if (skillsModalFilter === 'ALL') return activeSkills;
    return activeSkills.filter(s => s.source === skillsModalFilter);
  }, [activeSkills, skillsModalFilter]);

  const totalSkillsPages = useMemo(() => {
    return Math.ceil(filteredSkillsForModal.length / SKILLS_PER_PAGE) || 1;
  }, [filteredSkillsForModal]);

  const currentSkillsPage = useMemo(() => {
    return Math.min(Math.max(1, skillsPage), totalSkillsPages);
  }, [skillsPage, totalSkillsPages]);

  const paginatedSkillsForModal = useMemo(() => {
    const start = (currentSkillsPage - 1) * SKILLS_PER_PAGE;
    return filteredSkillsForModal.slice(start, start + SKILLS_PER_PAGE);
  }, [filteredSkillsForModal, currentSkillsPage]);

  const handleFilterChange = (tabId: 'ALL' | 'CAN' | 'STRUCTURE' | 'TECH' | 'BADGE') => {
    playSfx(660);
    setSkillsModalFilter(tabId);
    setSkillsPage(1);
  };

  return (
    <GalaxyFrame className="w-full max-w-7xl mx-auto h-full max-h-full font-mono text-left select-none backdrop-blur-md relative overflow-hidden text-white flex flex-col min-h-0" innerPadding="p-3 sm:p-4 h-full flex flex-col justify-between overflow-y-auto custom-scrollbar">
      <div className="space-y-2.5 flex-1 min-h-0 flex flex-col justify-between">
        
        {/* HEADER DE C.A.N. STATION */}
        <div className="flex justify-between items-center border-b border-cyan-900/50 pb-2.5 gap-2 relative z-20">
          <div className="flex items-center gap-2">
            <div>
              <span className="text-[8px] sm:text-[8.5px] font-mono text-cyan-400 tracking-widest block font-bold uppercase">
                {t('can.command_action_node')}
              </span>
              <h2 className="text-sm sm:text-base font-black tracking-widest text-white uppercase">
                {t('can.can_station')}
              </h2>
            </div>
          </div>
        </div>

        {/* BANNER DE RESTRICCIÓN DE VUELO */}
        {activeFlightsCount > 0 && (
          <div className="p-2 bg-red-950/40 border border-red-500/60 rounded-xl flex items-center justify-between gap-2 text-red-300 text-[8px] sm:text-[8.5px] relative z-20">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse shrink-0" />
              <span className="font-bold uppercase tracking-wider truncate">
                {t('can.flight_restriction', { count: activeFlightsCount })}
              </span>
            </div>
            <span className="text-[7px] bg-red-900/80 px-2 py-0.5 rounded font-black border border-red-600 uppercase shrink-0">
              {t('can.locked')}
            </span>
          </div>
        )}

        {/* ESTRUCTURA PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch min-h-[340px] relative z-20">
          
          {/* COLUMNA 1: NIVEL CAN & GALACTIC POWER */}
          <GalaxyFrame className="lg:col-span-3 flex flex-col justify-between" innerPadding="p-4">
            <div className="flex flex-col items-center justify-between text-center gap-2 h-full">
              <span className="text-[9.5px] text-cyan-400 font-bold uppercase tracking-wider">
                {t('can.level')}
              </span>

              <div className="my-2 relative flex items-center justify-center">
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 border-dashed border-cyan-500/40 animate-spin-slow absolute inset-0" />
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-cyan-400 bg-cyan-950/40 flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] relative z-10">
                  {canLevel}
                </div>
              </div>

              <div className="p-2 bg-purple-950/40 border border-purple-800 text-purple-200 text-center w-full rounded-lg mb-1">
                <div className="text-[7px] text-zinc-400 uppercase">{t('can.galactic_power')}</div>
                <div className="text-sm sm:text-base font-black text-white">{galacticPower.toLocaleString()} <span className="text-[10px] font-bold text-purple-300">POW</span></div>
              </div>

              <button
                onClick={handleUpgradeCan}
                disabled={isUpgrading}
                className="w-full py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-110 border border-cyan-400 text-white text-[8.5px] font-black uppercase tracking-widest rounded-lg shadow-lg cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isUpgrading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : t('can.upgrade_node')}
              </button>
            </div>
          </GalaxyFrame>

          {/* COLUMNA 2: ASSETS ACTIVADOS & ACTIVE SKILLS */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            
            <GalaxyFrame className="w-full" innerPadding="p-4">
              <span className="text-[9.5px] text-cyan-400 font-bold uppercase tracking-wider block text-center mb-2 border-b border-cyan-950 pb-1">
                {t('can.activated_assets')}
              </span>

              {/* TRES BOTONES INTERACTIVOS */}
              <div className="grid grid-cols-3 gap-2 items-center">
                
                <button
                  onClick={() => { playSfx(660); setActiveModalCategory('Estructuras'); }}
                  className="bg-[#050910] border border-cyan-900 hover:border-cyan-400 transition-all rounded-lg p-2 text-center flex flex-col items-center justify-center cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-md"
                >
                  <span className="text-xs sm:text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                    {equippedStructuresCount}
                  </span>
                  <span className="text-[7.5px] font-bold text-zinc-300 group-hover:text-cyan-400 uppercase mt-0.5">
                    STRUCTURES
                  </span>
                </button>

                <button
                  onClick={() => { playSfx(660); setActiveModalCategory('Tecnologias'); }}
                  className="bg-[#050910] border border-cyan-900 hover:border-cyan-400 transition-all rounded-lg p-2 text-center flex flex-col items-center justify-center cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-md"
                >
                  <span className="text-xs sm:text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                    {equippedTechCount}
                  </span>
                  <span className="text-[7.5px] font-bold text-zinc-300 group-hover:text-cyan-400 uppercase mt-0.5">
                    TECH
                  </span>
                </button>

                <button
                  onClick={() => { playSfx(660); setActiveModalCategory('Insignias'); }}
                  className="bg-[#050910] border border-cyan-900 hover:border-cyan-400 transition-all rounded-lg p-2 text-center flex flex-col items-center justify-center cursor-pointer hover:scale-[1.02] active:scale-95 group shadow-md"
                >
                  <span className="text-xs sm:text-sm font-black text-cyan-300 group-hover:text-white transition-colors">
                    {equippedBadgesCount} / 5
                  </span>
                  <span className="text-[7.5px] font-bold text-zinc-300 group-hover:text-cyan-400 uppercase mt-0.5">
                    BADGES
                  </span>
                </button>

              </div>
            </GalaxyFrame>

            {/* DASHBOARD DE ACTIVE SKILLS DIVIDIDO EN 3 COLUMNAS */}
            <GalaxyFrame className="flex-1 min-h-[190px] overflow-hidden" innerPadding="p-4">
              <div className="flex flex-col justify-between h-full">
                <div className="flex justify-center items-center mb-1.5 pb-1 border-b border-cyan-950">
                  <span className="text-[9.5px] text-cyan-400 font-bold uppercase tracking-wider text-center">
                    {t('can.skills_dashboard')} ({activeSkills.length})
                  </span>
                </div>

                {/* SECCIÓN TRIPARTITA: ESTRUCTURAS | TECNOLOGÍAS | INSIGNIAS */}
                <div className="grid grid-cols-3 gap-1.5 flex-1 min-h-[110px] overflow-hidden">
                  
                  <div className="bg-[#03060a] border border-amber-500/30 rounded-lg p-1 flex flex-col justify-start overflow-hidden">
                    <div className="text-[7px] font-black text-amber-400 uppercase tracking-wider border-b border-amber-950/60 pb-0.5 mb-0.5 flex items-center justify-between shrink-0">
                      <span>{t('can.structures')}</span>
                      <span className="text-zinc-500 font-bold">({structSkills.length})</span>
                    </div>
                    {renderSkillChipsSection(structSkills, t('can.no_structures'))}
                  </div>

                  <div className="bg-[#03060a] border border-purple-500/30 rounded-lg p-1 flex flex-col justify-start overflow-hidden">
                    <div className="text-[7px] font-black text-purple-400 uppercase tracking-wider border-b border-purple-950/60 pb-0.5 mb-0.5 flex items-center justify-between shrink-0">
                      <span>{t('can.tech')}</span>
                      <span className="text-zinc-500 font-bold">({techSkills.length})</span>
                    </div>
                    {renderSkillChipsSection(techSkills, t('can.no_tech'))}
                  </div>

                  <div className="bg-[#03060a] border border-emerald-500/30 rounded-lg p-1 flex flex-col justify-start overflow-hidden">
                    <div className="text-[7px] font-black text-emerald-400 uppercase tracking-wider border-b border-emerald-950/60 pb-0.5 mb-0.5 flex items-center justify-between shrink-0">
                      <span>{t('can.badges')}</span>
                      <span className="text-zinc-500 font-bold">({badgeSkills.length})</span>
                    </div>
                    {renderSkillChipsSection(badgeSkills, t('can.no_badges'))}
                  </div>

                </div>

                {/* BARRA TICKER HUD MUESTRA HABILIDAD EN TIEMPO REAL */}
                <div className="mt-1.5 bg-[#020408] border border-cyan-950 p-1.5 rounded-lg flex items-center gap-1.5 text-[7.5px] font-mono shrink-0">
                  <Info className="w-3 h-3 text-cyan-400 shrink-0" />
                  {hoveredSkill ? (
                    <span className="text-cyan-200 font-bold uppercase truncate">
                      <strong className="text-white">{hoveredSkill.assetName}:</strong> {hoveredSkill.effectDescription}
                    </span>
                  ) : (
                    <span className="text-zinc-500 uppercase truncate">
                      {t('can.hover_skill_hint')}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => { playSfx(660); setSkillsPage(1); setShowSkillsModal(true); }}
                  className="mt-1.5 w-full py-1.5 bg-gradient-to-r from-cyan-950 to-cyan-900 hover:from-cyan-900 border border-cyan-500/60 text-cyan-200 text-[8px] font-black uppercase tracking-widest rounded-lg cursor-pointer transition-colors shadow-inner flex items-center justify-center gap-1 shrink-0"
                >
                  {t('can.full_skills_btn')}
                </button>
              </div>
            </GalaxyFrame>

          </div>

          {/* COLUMNA 3: A.M.I. & STATS */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-3">
            
            <GalaxyFrame className="flex-1 min-h-[100px] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group" innerPadding="p-4">
              <div onClick={() => { playSfx(660); setShowAmiModal(true); }} className="w-full h-full flex flex-col items-center justify-center text-center gap-1">
                <Globe className="w-6 h-6 text-cyan-400 animate-pulse group-hover:scale-110 transition-transform" />
                <div className="text-xs font-black text-white uppercase tracking-widest">A.M.I.</div>
                <div className="text-xs font-bold text-cyan-300 mt-0.5">
                  {totalDiscoveredStars.toLocaleString()} <span className="text-[7.5px] text-cyan-500 uppercase">{t('can.mapped_stars')}</span>
                </div>
              </div>
            </GalaxyFrame>

            <GalaxyFrame className="flex-1 min-h-[100px] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group" innerPadding="p-4">
              <div onClick={() => { playSfx(660); setShowStatsModal(true); }} className="w-full h-full flex flex-col items-center justify-center text-center gap-1">
                <BarChart2 className="w-6 h-6 text-purple-400 animate-pulse group-hover:scale-110 transition-transform" />
                <div className="text-[10.5px] font-black text-white uppercase tracking-wider">{t('can.stats_title')}</div>
              </div>
            </GalaxyFrame>

          </div>

        </div>

        {/* MODAL DESPLEGABLE DE ASSETS (ESTRUCTURAS, TECH, BADGES) */}
        <CanAssetsModal
          isOpen={activeModalCategory !== null}
          onClose={() => setActiveModalCategory(null)}
          category={activeModalCategory}
          assets={canAssetsList}
          userId={currentUserId}
          onRefresh={fetchCanData}
          triggerNotification={triggerNotification}
        />

        {/* MODAL 1: A.M.I. */}
        {showAmiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm">
            <div className="w-full max-w-xl sm:max-w-2xl max-h-[88dvh] flex flex-col hud-panel hud-corners border border-cyan-500/40 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.25)] overflow-hidden font-mono text-white">
              
              {/* CABECERA (shrink-0) */}
              <div className="shrink-0 px-3 py-2 border-b border-cyan-500/30 flex items-center justify-between bg-[#080d14]">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Globe className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
                  <span className="text-cyan-400 text-xs sm:text-sm font-bold tracking-wider uppercase truncate">
                    {t('can.ami_modal.title')}
                  </span>
                </div>
                <button
                  onClick={() => { playSfx(440); setShowAmiModal(false); }}
                  className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-500/20 text-sm font-bold transition-colors cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              <div className="shrink-0 px-3 py-1.5 border-b border-cyan-500/20 bg-[#060a10] text-[7.5px] sm:text-[8px] text-zinc-400 uppercase">
                {t('can.ami_modal.subtitle')}
              </div>

              {/* CONTENIDO CON SCROLL EXCLUSIVO */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 overscroll-contain grid grid-cols-1 sm:grid-cols-2 gap-2 custom-scrollbar">
                {discoveredStars.length === 0 ? (
                  <div className="col-span-full my-auto text-center text-zinc-600 text-[9px] py-10 uppercase font-bold bg-black/40 rounded-xl border border-cyan-950">
                    {t('can.ami_modal.empty')}
                  </div>
                ) : (
                  discoveredStars.map((star) => {
                    const rank = star.discovery_order;
                    const reward = star.reward_details || {};
                    const coinReward = Number(reward.gd_coin || 0);
                    const dynamicTitle = reward.title || t('can.ami_modal.native_record', { rank });

                    let badgeColor = "bg-cyan-950/80 text-cyan-300 border-cyan-800";
                    let badgeIcon = "📡";

                    if (rank === 1) {
                      badgeColor = "bg-amber-950/80 text-amber-300 border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.2)]";
                      badgeIcon = "🥇";
                    } else if (rank === 2) {
                      badgeColor = "bg-slate-900/80 text-slate-200 border-slate-400/80";
                      badgeIcon = "🥈";
                    } else if (rank === 3) {
                      badgeColor = "bg-amber-950/50 text-amber-500 border-amber-700/80";
                      badgeIcon = "🥉";
                    }

                    return (
                      <div 
                        key={star.id} 
                        className="bg-[#050910] border border-cyan-500/30 rounded-lg p-2.5 flex flex-col justify-between gap-1.5 shadow-md relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start gap-1">
                          <div className="flex flex-col text-left overflow-hidden">
                            <span className="text-[9px] font-black text-white uppercase truncate" title={star.star_name}>
                              {star.star_name}
                            </span>
                            <span className="text-[7px] text-cyan-400 font-bold uppercase truncate">
                              {t('can.ami_modal.cluster')}: {star.cluster}
                            </span>
                          </div>
                          <span className="text-[6.5px] text-zinc-500 font-mono shrink-0">
                            {star.discovered_at}
                          </span>
                        </div>

                        <div className={`px-2 py-1 rounded border flex items-center justify-between text-[7.5px] font-bold ${badgeColor}`}>
                          <span className="flex items-center gap-1 uppercase truncate">
                            <span>{badgeIcon}</span>
                            <span className="truncate">{dynamicTitle}</span>
                          </span>
                        </div>

                        <div className="bg-black/60 px-2 py-1 rounded border border-cyan-950 text-[7px] font-mono flex justify-between items-center">
                          <span className="text-zinc-400 uppercase">{t('can.ami_modal.loot_recorded')}</span>
                          {coinReward > 0 ? (
                            <span className="text-amber-400 font-bold">
                              +{coinReward.toLocaleString()} GD
                            </span>
                          ) : (
                            <span className="text-zinc-600 uppercase font-bold">{t('can.ami_modal.no_extra_loot')}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* PIE (shrink-0) */}
              <div className="shrink-0 p-2 border-t border-cyan-500/30 bg-[#080d14] flex justify-end">
                <button
                  onClick={() => { playSfx(440); setShowAmiModal(false); }}
                  className="px-4 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-white text-[8.5px] font-bold uppercase rounded-lg cursor-pointer transition-colors"
                >
                  {t('can.ami_modal.accept')}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* MODAL 2: ESTADÍSTICAS Y PRODUCCIÓN DIARIA AUDITADA C.A.N. */}
        {showStatsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm">
            <div className="w-full max-w-lg max-h-[88dvh] flex flex-col hud-panel hud-corners border border-cyan-500/40 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.25)] overflow-hidden font-mono text-white">
              
              {/* CABECERA (shrink-0) */}
              <div className="shrink-0 px-3 py-2 border-b border-cyan-500/30 flex items-center justify-between bg-[#080d14]">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-purple-400 animate-pulse shrink-0" />
                  <span className="text-cyan-400 text-xs font-black uppercase tracking-widest truncate">
                    {t('can.stats_modal.title')}
                  </span>
                </div>
                <button
                  onClick={() => { playSfx(440); setShowStatsModal(false); }}
                  className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-500/20 text-sm font-bold transition-colors cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* CONTENIDO SCROLLABLE (flex-1) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 text-[8.5px] sm:text-[9px] overscroll-contain custom-scrollbar">
                
                {/* RED DE ENERGÍA SOLAR */}
                <div className={`p-2.5 bg-black/80 border rounded-xl space-y-1 ${canMetrics.energyRequired > 0 && canMetrics.energyProduced === 0 ? 'border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.3)]' : 'border-cyan-900/60'}`}>
                  <div className="flex justify-between items-center text-cyan-400 font-bold uppercase">
                    <span className="flex items-center gap-1.5">
                      <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      {t('can.stats_modal.solar_supply')}
                    </span>
                    <span className="text-white font-mono font-black">{canMetrics.energyProduced} / {canMetrics.energyRequired} {t('can.stats_modal.units')}</span>
                  </div>

                  {canMetrics.energyRequired > 0 && canMetrics.energyProduced === 0 ? (
                    <p className="text-[7.5px] text-red-400 font-bold uppercase flex items-center gap-1 pt-1">
                      <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                      {t('can.stats_modal.solar_offline')}
                    </p>
                  ) : (
                    <div className="flex justify-between items-center text-[7.5px] text-zinc-400 pt-0.5 font-mono">
                      <span>{t('can.stats_modal.efficiency')}</span>
                      <span className="text-emerald-400 font-black text-[8.5px]">{(canMetrics.energyEfficiency * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>

                <span className="text-cyan-400 font-bold uppercase block border-b border-purple-950 pb-1">
                  {t('can.stats_modal.extraction_capacity')}
                </span>

                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2.5 bg-black/60 border border-purple-950 rounded-lg flex flex-col justify-between gap-1">
                    <span className="text-zinc-400 uppercase font-bold">{t('can.stats_modal.metal')}</span>
                    <span className="text-cyan-300 font-black text-[10px]">+{canMetrics.hourlyProduction.metal.toLocaleString()} <span className="text-[7px] text-zinc-500">{t('can.stats_modal.per_hour')}</span></span>
                    <span className="text-[7px] text-zinc-400 border-t border-purple-950/60 pt-0.5">{t('can.stats_modal.storage')}: {canMetrics.storageLimits.metal.toLocaleString()}</span>
                  </div>

                  <div className="p-2.5 bg-black/60 border border-purple-950 rounded-lg flex flex-col justify-between gap-1">
                    <span className="text-zinc-400 uppercase font-bold">{t('can.stats_modal.crystal')}</span>
                    <span className="text-purple-300 font-black text-[10px]">+{canMetrics.hourlyProduction.crystal.toLocaleString()} <span className="text-[7px] text-zinc-500">{t('can.stats_modal.per_hour')}</span></span>
                    <span className="text-[7px] text-zinc-400 border-t border-purple-950/60 pt-0.5">{t('can.stats_modal.storage')}: {canMetrics.storageLimits.crystal.toLocaleString()}</span>
                  </div>

                  <div className="p-2.5 bg-black/60 border border-purple-950 rounded-lg flex flex-col justify-between gap-1">
                    <span className="text-zinc-400 uppercase font-bold">{t('can.stats_modal.deuterium')}</span>
                    <span className="text-blue-300 font-black text-[10px]">+{canMetrics.hourlyProduction.deuterium.toLocaleString()} <span className="text-[7px] text-zinc-500">{t('can.stats_modal.per_hour')}</span></span>
                    <span className="text-[7px] text-zinc-400 border-t border-purple-950/60 pt-0.5">{t('can.stats_modal.storage')}: {canMetrics.storageLimits.deuterium.toLocaleString()}</span>
                  </div>

                  <div className="p-2.5 bg-black/60 border border-purple-950 rounded-lg flex flex-col justify-between gap-1">
                    <span className="text-zinc-400 uppercase font-bold">{t('can.stats_modal.dark_matter')}</span>
                    <span className="text-emerald-400 font-black text-[10px]">+{canMetrics.hourlyProduction.dark_matter.toLocaleString()} <span className="text-[7px] text-zinc-500">{t('can.stats_modal.per_hour')}</span></span>
                    <span className="text-[7px] text-zinc-400 border-t border-purple-950/60 pt-0.5">{t('can.stats_modal.storage')}: {canMetrics.storageLimits.dark_matter.toLocaleString()}</span>
                  </div>
                </div>

              </div>

              {/* PIE (shrink-0) */}
              <div className="shrink-0 p-2 border-t border-cyan-500/30 bg-[#080d14] flex justify-end">
                <button
                  onClick={() => { playSfx(440); setShowStatsModal(false); }}
                  className="px-4 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 text-[8.5px] font-bold uppercase rounded-lg cursor-pointer transition-colors"
                >
                  {t('can.stats_modal.accept')}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* MODAL 3: ACTIVE SKILLS DETALLADAS */}
        {showSkillsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm">
            {/* Caja del Modal con altura dinámica y contención estricta */}
            <div className="w-full max-w-4xl max-h-[88dvh] flex flex-col hud-panel hud-corners border border-cyan-500/40 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.25)] overflow-hidden font-mono text-white">
              
              {/* 1. CABECERA SIEMPRE VISIBLE (shrink-0) */}
              <div className="shrink-0 px-3 py-2 border-b border-cyan-500/30 flex items-center justify-between bg-[#080d14]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
                  <span className="text-cyan-400 text-xs sm:text-sm font-bold tracking-wider uppercase">
                    {t('skills.modal_title')} ({filteredSkillsForModal.length})
                  </span>
                </div>
                <button 
                  onClick={() => { playSfx(440); setShowSkillsModal(false); }}
                  className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-500/20 text-sm font-bold transition-colors cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* 2. FILTROS/CATEGORÍAS SIEMPRE VISIBLES (shrink-0) */}
              <div className="shrink-0 px-3 py-1.5 border-b border-cyan-500/20 flex gap-1.5 overflow-x-auto no-scrollbar bg-[#060a10]">
                {[
                  { id: 'ALL', label: `${t('skills.filter_all')} (${activeSkills.length})` },
                  { id: 'CAN', label: `${t('skills.filter_node')} (${activeSkills.filter(s => s.source === 'CAN').length})` },
                  { id: 'STRUCTURE', label: `${t('skills.filter_structures')} (${activeSkills.filter(s => s.source === 'STRUCTURE').length})` },
                  { id: 'TECH', label: `${t('skills.filter_tech')} (${activeSkills.filter(s => s.source === 'TECH').length})` },
                  { id: 'BADGE', label: `${t('skills.filter_badges')} (${activeSkills.filter(s => s.source === 'BADGE').length})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleFilterChange(tab.id as any)}
                    className={`text-[10px] py-0.5 px-2 rounded font-bold uppercase transition-all border whitespace-nowrap cursor-pointer shrink-0 ${
                      skillsModalFilter === tab.id
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                        : 'bg-black/60 text-zinc-400 border-cyan-950 hover:text-white hover:border-cyan-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 3. ÚNICO CONTENEDOR CON SCROLL (flex-1 overflow-y-auto) */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 overscroll-contain custom-scrollbar">
                {paginatedSkillsForModal.length === 0 ? (
                  <div className="w-full my-auto text-center py-6 text-zinc-600 text-[9px] uppercase tracking-widest font-bold bg-black/40 rounded-xl border border-cyan-950">
                    {t('can.no_skills_category')}
                  </div>
                ) : (
                  paginatedSkillsForModal.map((sk) => {
                    const isCanon = sk.source === 'CAN';
                    const isStruct = sk.source === 'STRUCTURE';
                    const isTech = sk.source === 'TECH';

                    return (
                      <div
                        key={sk.id}
                        className={`p-1.5 sm:p-2 rounded-lg border flex items-center gap-2.5 transition-all shrink-0 ${
                          isCanon
                            ? 'bg-cyan-950/30 border-cyan-500/60 text-cyan-200'
                            : isStruct
                            ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                            : isTech
                            ? 'bg-purple-950/20 border-purple-500/40 text-purple-200'
                            : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-md bg-black border border-cyan-950 overflow-hidden shrink-0 flex items-center justify-center p-0.5 relative">
                          {sk.assetImageUrl ? (
                            <img src={sk.assetImageUrl} alt={sk.assetName} className="w-full h-full object-contain" />
                          ) : (
                            getSkillIcon(sk.source, sk.effectDescription)
                          )}
                        </div>

                        <div className="flex-1 flex flex-col gap-0.5 text-left overflow-hidden">
                          <div className="flex justify-between items-center border-b border-cyan-950/80 pb-0.5">
                            <span className="font-black text-white text-[9px] sm:text-[10px] uppercase truncate">{sk.assetName}</span>
                            <span className="text-[7px] font-black uppercase px-1.5 py-0.2 rounded border bg-black/60 border-cyan-900 text-cyan-400 shrink-0">
                              {sk.source} {sk.level ? `• LVL ${sk.level}` : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 pt-0.5">
                            <ChevronRight className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="text-[10px] font-bold text-zinc-200 leading-tight truncate">{sk.effectDescription}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* CONTROLES DE PAGINACIÓN (shrink-0) */}
              <div className="shrink-0 flex items-center justify-between bg-[#080d14] border-t border-cyan-500/30 p-2 text-[8px] sm:text-[8.5px]">
                <button
                  disabled={currentSkillsPage === 1}
                  onClick={() => { playSfx(660); setSkillsPage(p => Math.max(1, p - 1)); }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950 border border-cyan-500/50 hover:border-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-cyan-300 font-bold uppercase rounded-md cursor-pointer transition-all shrink-0"
                >
                  <ChevronLeft className="w-3 h-3" /> {t('can.prev')}
                </button>

                <span className="font-mono font-black text-cyan-400 uppercase tracking-widest text-[8px]">
                  {t('can.page')} <span className="text-white">{currentSkillsPage}</span> {t('can.of')} <span className="text-white">{totalSkillsPages}</span>
                </span>

                <button
                  disabled={currentSkillsPage >= totalSkillsPages}
                  onClick={() => { playSfx(660); setSkillsPage(p => Math.min(totalSkillsPages, p + 1)); }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950 border border-cyan-500/50 hover:border-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-cyan-300 font-bold uppercase rounded-md cursor-pointer transition-all shrink-0"
                >
                  {t('can.next')} <ChevronRight className="w-3 h-3" />
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </GalaxyFrame>
  );
};

export default CanView;