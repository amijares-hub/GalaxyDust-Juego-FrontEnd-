import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu, Zap, ChevronRight, BarChart2,
  Globe, AlertTriangle, RefreshCw, X, Sparkles, Target, Building, Award, FlaskConical, CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CanViewProps {
  triggerNotification?: (text: string, e?: any) => void;
}

// Interfaz para Skills reales
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
  star_name: string;
  cluster: string;
  discovered_at: string;
}

export const CanView: React.FC<CanViewProps> = ({ triggerNotification }) => {
  const [canLevel, setCanLevel] = useState<number>(1);
  const [galacticPower, setGalacticPower] = useState<number>(0);
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Modales
  const [showAmiModal, setShowAmiModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showSkillsModal, setShowSkillsModal] = useState<boolean>(false);

  // Vuelos activos y restricciones
  const [activeFlightsCount, setActiveFlightsCount] = useState<number>(0);

  // Conteo de Assets Activados Reales
  const [assetCounts, setAssetCounts] = useState({
    structures: 0,
    tech: 0,
    badges: 0,
    totalDiscoveredStars: 0,
    maxBadgeSlots: 5
  });

  // Habilidades Activas Jerarquizadas Reales
  const [activeSkills, setActiveSkills] = useState<ActiveSkillItem[]>([]);

  // Historial Cartográfico A.M.I.
  const [discoveredStars, setDiscoveredStars] = useState<DiscoveredStar[]>([]);

  // Estadísticas de Producción Estimada Diaria Reales
  const [dailyProduction, setDailyProduction] = useState({
    metal: 0,
    crystal: 0,
    deuterium: 0,
    darkMatter: 0,
    fleetPowerMod: 0,
    defenseShieldMod: 0
  });

  // Iconos por categoría de Skill
  const getSkillIcon = (source: string) => {
    switch (source) {
      case 'CAN': return <Cpu className="w-4 h-4 text-cyan-400" />;
      case 'STRUCTURE': return <Building className="w-4 h-4 text-amber-400" />;
      case 'TECH': return <FlaskConical className="w-4 h-4 text-purple-400" />;
      case 'BADGE': return <Award className="w-4 h-4 text-cyan-400" />;
      default: return <Target className="w-4 h-4 text-zinc-500" />;
    }
  };

  // Cálculo de producción basado en estructuras del usuario en Supabase
  const calculateRealProduction = async (user_id: string, current_can_level: number) => {
    const { data: userStructures } = await supabase
      .from('user_structures')
      .select(`
        id, 
        current_level,
        seed_structures (
          structure_name,
          structure_type,
          power_score_base
        )
      `)
      .eq('user_id', user_id);

    let baseMetal = 0;
    let baseCrystal = 0;
    let baseDeuterium = 0;
    let baseDM = 0;

    const canMod = 1 + (current_can_level * 0.05);

    if (userStructures && userStructures.length > 0) {
      userStructures.forEach((item: any) => {
        if (!item.seed_structures) return;
        const type = item.seed_structures.structure_type || '';
        const scoreBase = item.seed_structures.power_score_base || 1000;
        const dailyProd = (item.current_level || 1) * (scoreBase * 2.5);

        if (type.includes('metal')) baseMetal += dailyProd;
        else if (type.includes('cristal')) baseCrystal += dailyProd;
        else if (type.includes('deuterio')) baseDeuterium += dailyProd;
        else if (type.includes('mo')) baseDM += ((item.current_level || 1) * 5);
      });
    }

    setDailyProduction({
      metal: Math.round((baseMetal || 24000) * canMod),
      crystal: Math.round((baseCrystal || 12000) * canMod),
      deuterium: Math.round((baseDeuterium || 4800) * canMod),
      darkMatter: Math.round((baseDM || 150) * canMod),
      fleetPowerMod: 10 + current_can_level * 2,
      defenseShieldMod: 8 + current_can_level * 2
    });
  };

  // Carga de datos reales desde Supabase
  const fetchCanData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Perfil y Nivel CAN Real
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setCanLevel(profile.level || profile.can_level || 1);
        setGalacticPower(profile.power_score || profile.galactic_power_score || 0);
        calculateRealProduction(user.id, profile.level || profile.can_level || 1);
      }

      // 2. Expediciones activas
      const { count: flights } = await supabase
        .from('active_expeditions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'LAUNCHED');

      setActiveFlightsCount(flights || 0);

      // 3. Conteo de Assets
      const { count: strCount } = await supabase.from('user_structures').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      const { count: techCount } = await supabase.from('user_technologies').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      const { count: bdgCount } = await supabase.from('user_badges_unlocked').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      
      const { count: starsCount } = await supabase
        .from('user_discovered_stars')
        .select('id', { count: 'exact', head: true })
        .eq('discoverer_id', user.id);

      setAssetCounts({
        structures: strCount || 0,
        tech: techCount || 0,
        badges: bdgCount || 0,
        totalDiscoveredStars: starsCount || 0,
        maxBadgeSlots: 5
      });

      // 4. Estrellas Cartografiadas A.M.I.
      const { data: starsData } = await supabase
        .from('user_discovered_stars')
        .select('*')
        .eq('discoverer_id', user.id)
        .order('created_at', { ascending: false });

      if (starsData && starsData.length > 0) {
        setDiscoveredStars(starsData.map((s: any) => ({
          id: s.id,
          star_name: s.star_name || s.name || 'SECTOR ANÓNIMO',
          cluster: s.galaxy_cluster || s.cluster || 'ALPHA',
          discovered_at: new Date(s.created_at || Date.now()).toLocaleDateString()
        })));
      }

      // 5. Cargar Skills Reales de Assets Equipados
      const skillsToParse: ActiveSkillItem[] = [
        { id: 'sk-can-1', source: 'CAN', assetName: 'C.A.N. MATRIX LEVEL', effectTitle: 'Velocidad Procesamiento', effectDescription: `+${canLevel * 5}% Velocidad de Procesamiento de Nodos` },
        { id: 'sk-can-2', source: 'CAN', assetName: 'C.A.N. MATRIX LEVEL', effectTitle: 'Slots Tácticos Adicionales', effectDescription: `+${canLevel * 2} Espacios de Almacenamiento Táctico` }
      ];

      const { data: structuresWithSkills } = await supabase
        .from('user_structures')
        .select(`current_level, seed_structures (structure_name, image_url, skills)`)
        .eq('user_id', user.id);

      if (structuresWithSkills) {
        structuresWithSkills.forEach((item: any) => {
          if (!item.seed_structures || !item.seed_structures.skills) return;
          const skillsArray = Array.isArray(item.seed_structures.skills) ? item.seed_structures.skills : [];
          
          skillsArray.forEach((sk: any, idx: number) => {
            skillsToParse.push({
              id: `sk-str-${item.structure_id || 'id'}-${idx}`,
              source: 'STRUCTURE',
              assetName: item.seed_structures.structure_name || 'ESTRUCTURA TÁCTICA',
              assetImageUrl: item.seed_structures.image_url,
              rarity: 'EPIC',
              level: item.current_level,
              effectTitle: typeof sk === 'string' ? sk.substring(0, 20) + '...' : 'Efecto de Estructura',
              effectDescription: typeof sk === 'string' ? sk : JSON.stringify(sk)
            });
          });
        });
      }

      const { data: techWithSkills } = await supabase
        .from('user_technologies')
        .select(`seed_technologies (technology_name, image_url, skills, rarity)`)
        .eq('user_id', user.id);

      if (techWithSkills) {
        techWithSkills.forEach((item: any) => {
          if (!item.seed_technologies || !item.seed_technologies.skills) return;
          const skillsArray = Array.isArray(item.seed_technologies.skills) ? item.seed_technologies.skills : [];
          
          skillsArray.forEach((sk: any, idx: number) => {
            skillsToParse.push({
              id: `sk-tech-${item.technology_id || 'id'}-${idx}`,
              source: 'TECH',
              assetName: item.seed_technologies.technology_name || 'TECNOLOGÍA AVANZADA',
              assetImageUrl: item.seed_technologies.image_url,
              rarity: item.seed_technologies.rarity || 'RARE',
              effectTitle: typeof sk === 'string' ? sk.substring(0, 20) + '...' : 'Efecto Tecnológico',
              effectDescription: typeof sk === 'string' ? sk : JSON.stringify(sk)
            });
          });
        });
      }

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
    setIsUpgrading(true);
    const newLevel = canLevel + 1;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ level: newLevel, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }

      setCanLevel(newLevel);

      if (triggerNotification) {
        triggerNotification(`⚡ NODO C.A.N. ELEVADO A NIVEL ${newLevel} CON ÉXITO`);
      }
    } catch (err) {
      console.error("Error al subir nivel C.A.N.:", err);
    } finally {
      setIsUpgrading(false);
    }
  };

  // Iconos interactivos con Tooltips para la grilla
  const skillGridItems = useMemo(() => {
    return activeSkills.map((sk) => (
      <div key={sk.id} className="relative group cursor-pointer aspect-square rounded-lg border border-cyan-900/60 bg-[#050910] hover:border-cyan-400 transition-all p-1 flex items-center justify-center overflow-hidden">
        <div className={`absolute inset-0.5 rounded-full border ${
          sk.rarity === 'LEGENDARY' ? 'border-amber-500' :
          sk.rarity === 'EPIC' ? 'border-purple-500' :
          sk.rarity === 'RARE' ? 'border-sky-500' :
          'border-cyan-500/30'
        }`} />
        
        {sk.assetImageUrl ? (
          <img src={sk.assetImageUrl} alt={sk.assetName} className="w-full h-full object-contain brightness-90 group-hover:scale-110 transition-transform p-0.5" />
        ) : (
          getSkillIcon(sk.source)
        )}

        {/* TOOLTIP EMERGENTE */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#0a0f13] border border-cyan-500/70 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none font-mono text-[8px] text-left">
          <div className="flex justify-between items-center border-b border-cyan-950 pb-0.5 mb-1">
            <span className="font-black text-cyan-400 uppercase truncate">{sk.assetName}</span>
            {sk.level && <span className="text-white text-[7px]">LVL {sk.level}</span>}
          </div>
          <p className="text-zinc-200 leading-tight">{sk.effectDescription}</p>
        </div>
      </div>
    ));
  }, [activeSkills]);

  return (
    <div className="w-full max-w-7xl mx-auto bg-[#080b0e] border border-cyan-500/30 p-4 sm:p-6 rounded-2xl shadow-2xl font-mono text-left select-none space-y-4 backdrop-blur-md relative overflow-hidden text-white">
      
      {/* HEADER DE C.A.N. STATION */}
      <div className="flex justify-between items-center border-b border-cyan-900/50 pb-3 gap-3">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[8.5px] font-mono text-cyan-400 tracking-widest block font-bold uppercase">
              COMMAND ACTION NODE
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-widest text-white uppercase">
              C.A.N. STATION
            </h2>
          </div>
        </div>
      </div>

      {/* BANNER DE RESTRICCION DE VUELO */}
      {activeFlightsCount > 0 && (
        <div className="p-2.5 bg-red-950/40 border border-red-500/60 rounded-xl flex items-center justify-between gap-2 text-red-300 text-[8px] sm:text-[9px]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse shrink-0" />
            <span className="font-bold uppercase tracking-wider">
              RESTRICCION ACTIVA: {activeFlightsCount} FLOTA(S) EN VUELO. SE PROHÍBE ALTERAR O REEMPLAZAR TECNOLOGÍAS Y ESTRUCTURAS.
            </span>
          </div>
          <span className="text-[7.5px] bg-red-900/80 px-2 py-0.5 rounded font-black border border-red-600 uppercase shrink-0">
            BLOQUEO TÁCTICO
          </span>
        </div>
      )}

      {/* ─── ESTRUCTURA PRINCIPAL EN 3 COLUMNAS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch min-h-[340px]">
        
        {/* ─── COLUMNA 1 (IZQUIERDA - 3 cols): NIVEL CAN & GALACTIC POWER ─── */}
        <div className="lg:col-span-3 bg-black/60 border border-cyan-950 rounded-xl p-4 flex flex-col items-center justify-between text-center relative">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
            NIVEL DE C.A.N.
          </span>

          <div className="my-3 relative flex items-center justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-cyan-500/40 animate-spin-slow absolute inset-0" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-cyan-400 bg-cyan-950/40 flex items-center justify-center text-3xl font-black text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] relative z-10">
              {canLevel}
            </div>
          </div>

          <div className="p-2 bg-purple-950/40 border border-purple-800 text-purple-200 text-center w-full rounded-lg mb-3">
            <div className="text-[7px] text-zinc-400 uppercase">PODER GALÁCTICO</div>
            <div className="text-base font-black text-white">{galacticPower.toLocaleString()} <span className="text-xs font-bold text-purple-300">POW</span></div>
          </div>

          <button
            onClick={handleUpgradeCan}
            disabled={isUpgrading}
            className="w-full py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-110 border border-cyan-400 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isUpgrading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'UPGRADE NODE'}
          </button>
        </div>

        {/* ─── COLUMNA 2 (CENTRO - 5 cols): MITAD ARRIBA ASSETS ACTIVADOS, MITAD ABAJO ACTIVE SKILLS ─── */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          
          {/* Mitad Superior: ASSETS ACTIVADOS COMPACTO (SIN ÍCONOS) */}
          <div className="bg-black/60 border border-cyan-950 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block text-center mb-2 border-b border-cyan-950 pb-1">
              ASSETS ACTIVADOS
            </span>
            <div className="grid grid-cols-3 gap-2 items-center">
              <div className="bg-[#050910] border border-cyan-900 rounded-lg p-2.5 text-center flex flex-col items-center justify-center">
                <span className="text-[14px] font-black text-white">{assetCounts.structures}</span>
                <span className="text-[8px] font-bold text-zinc-300 uppercase mt-1">STRUCTURES</span>
              </div>
              <div className="bg-[#050910] border border-cyan-900 rounded-lg p-2.5 text-center flex flex-col items-center justify-center">
                <span className="text-[14px] font-black text-white">{assetCounts.tech}</span>
                <span className="text-[8px] font-bold text-zinc-300 uppercase mt-1">TECH</span>
              </div>
              <div className="bg-[#050910] border border-cyan-900 rounded-lg p-2.5 text-center flex flex-col items-center justify-center">
                <span className="text-[14px] font-black text-cyan-300">{assetCounts.badges} / {assetCounts.maxBadgeSlots}</span>
                <span className="text-[8px] font-bold text-zinc-300 uppercase mt-1">BADGES</span>
              </div>
            </div>
          </div>

          {/* Mitad Inferior: DASHBOARD DE ACTIVE SKILLS */}
          <div className="flex-1 bg-black/60 border border-cyan-950 rounded-xl p-3 flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-cyan-950">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                DASHBOARD DE ACTIVE SKILLS
              </span>
              <span className="text-[7.5px] bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded font-bold uppercase">
                TOOLTIPS
              </span>
            </div>

            {/* Grilla de Iconos con Tooltips */}
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 flex-1 overflow-y-auto max-h-[140px] pr-1 custom-scrollbar">
              {skillGridItems}
            </div>

            {/* Botón Pop-up Detalles Completos */}
            <button
              onClick={() => setShowSkillsModal(true)}
              className="mt-2.5 w-full py-1.5 bg-gradient-to-r from-cyan-950 to-cyan-900 hover:from-cyan-900 border border-cyan-500/60 text-cyan-200 text-[8px] font-black uppercase tracking-widest rounded-lg cursor-pointer transition-colors shadow-inner flex items-center justify-center gap-1.5"
            >
              VER DETALLES COMPLETOS DE SKILLS
            </button>
          </div>

        </div>

        {/* ─── COLUMNA 3 (DERECHA - 4 cols): BOTONES LLAMATIVOS A.M.I. & STATS Y PRODUCCIÓN ─── */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3.5">
          
          {/* Card / Botón Táctico A.M.I. */}
          <div
            onClick={() => setShowAmiModal(true)}
            className="flex-1 bg-black/80 border-2 border-cyan-500 hover:border-cyan-300 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:scale-[1.02] active:scale-95 group"
          >
            <Globe className="w-7 h-7 text-cyan-400 animate-pulse group-hover:scale-110 transition-transform" />
            <div className="text-[11px] font-black text-white uppercase tracking-wider">A.M.I. CARTOGRAFÍA SIDERAL</div>
            <div className="text-sm font-bold text-cyan-300 mt-1">
              {assetCounts.totalDiscoveredStars.toLocaleString()} <span className="text-[8px] text-cyan-500 uppercase">ESTRELLAS MAPEADAS</span>
            </div>
          </div>

          {/* Card / Botón Táctico Stats & Producción */}
          <div
            onClick={() => setShowStatsModal(true)}
            className="flex-1 bg-black/80 border-2 border-purple-500 hover:border-purple-300 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(168,85,247,0.25)] hover:scale-[1.02] active:scale-95 group"
          >
            <BarChart2 className="w-7 h-7 text-purple-400 animate-pulse group-hover:scale-110 transition-transform" />
            <div className="text-[11px] font-black text-white uppercase tracking-wider">STATS & PRODUCCIÓN DIARIA</div>
            <div className="text-xs font-bold text-purple-300 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[8.5px] uppercase">MATRIZ DE CÁLCULO ESTIMADA</span>
            </div>
          </div>

        </div>

      </div>

      {/* ─── MODAL 1: A.M.I. CARTOGRAFÍA SIDERAL ─── */}
      {showAmiModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 font-mono text-white">
          <div className="w-full max-w-2xl bg-[#080b0e] border border-cyan-500/50 rounded-2xl p-5 text-left space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-cyan-950 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400 animate-pulse" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">
                  A.M.I. (ASTRAL MAPPING INSTITUTE) - REGISTRO CARTOGRÁFICO
                </h3>
              </div>
              <button onClick={() => setShowAmiModal(false)} className="p-1 text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[8.5px] text-zinc-400 uppercase">
              Historial de exploración estelar real y catálogo de estrellas mapeadas por la flota del comando.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {discoveredStars.length === 0 ? (
                <div className="col-span-2 text-center text-zinc-600 text-[10px] py-10 uppercase font-bold bg-black/40 rounded-xl border border-cyan-950">SIN ESTRELLAS MAPEADAS EN ESTE SECTOR</div>
              ) : (
                discoveredStars.map((star) => (
                  <div key={star.id} className="p-3 bg-black/60 border border-cyan-950 rounded-xl flex items-center justify-between text-[8.5px]">
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-white uppercase">{star.star_name}</span>
                      <span className="text-[7.5px] text-cyan-400 uppercase">CLÚSTER: {star.cluster}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-bold text-[7.5px] block">MAPEADO</span>
                      <span className="text-[7px] text-zinc-500">{star.discovered_at}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-cyan-950 flex justify-end">
              <button onClick={() => setShowAmiModal(false)} className="px-4 py-2 bg-black border border-zinc-800 text-zinc-300 hover:text-white text-[9px] font-bold uppercase rounded-lg cursor-pointer">
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ESTADÍSTICAS Y PRODUCCIÓN ESTIMADA DIARIA ─── */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 font-mono text-white">
          <div className="w-full max-w-lg bg-[#080b0e] border border-purple-500/50 rounded-2xl p-5 text-left space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-purple-950 pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-purple-400 animate-pulse" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">
                  ESTADÍSTICAS Y PRODUCCIÓN ESTIMADA DIARIA
                </h3>
              </div>
              <button onClick={() => setShowStatsModal(false)} className="p-1 text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-[9px]">
              <span className="text-cyan-400 font-bold uppercase block border-b border-purple-950 pb-1">
                PRODUCCIÓN ESTIMADA DIARIA (24 HORAS)
              </span>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2 bg-black/60 border border-purple-950 rounded flex justify-between items-center">
                  <span className="text-zinc-400 uppercase">METAL:</span>
                  <span className="text-cyan-200 font-bold text-[10px]">+{dailyProduction.metal.toLocaleString()} <span className="text-[7px]">/D</span></span>
                </div>
                <div className="p-2 bg-black/60 border border-purple-950 rounded flex justify-between items-center">
                  <span className="text-zinc-400 uppercase">CRISTAL:</span>
                  <span className="text-purple-300 font-bold text-[10px]">+{dailyProduction.crystal.toLocaleString()} <span className="text-[7px]">/D</span></span>
                </div>
                <div className="p-2 bg-black/60 border border-purple-950 rounded flex justify-between items-center">
                  <span className="text-zinc-400 uppercase">DEUTERIO:</span>
                  <span className="text-blue-300 font-bold text-[10px]">+{dailyProduction.deuterium.toLocaleString()} <span className="text-[7px]">/D</span></span>
                </div>
                <div className="p-2 bg-black/60 border border-purple-950 rounded flex justify-between items-center">
                  <span className="text-zinc-400 uppercase">MATERIA OSCURA:</span>
                  <span className="text-indigo-300 font-bold text-[10px]">+{dailyProduction.darkMatter.toLocaleString()} <span className="text-[7px]">/D</span></span>
                </div>
              </div>

              <span className="text-purple-400 font-bold uppercase block border-b border-purple-950 pb-1 pt-2">
                MODIFICADORES TÁCTICOS GLOBALES
              </span>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2 bg-black/60 border border-purple-950 rounded flex justify-between items-center">
                  <span className="text-zinc-400 uppercase">PODER DE FLOTA:</span>
                  <span className="text-emerald-400 font-bold text-[10px]">+{dailyProduction.fleetPowerMod}%</span>
                </div>
                <div className="p-2 bg-black/60 border border-purple-950 rounded flex justify-between items-center">
                  <span className="text-zinc-400 uppercase">ESCUDOS DE DEFENSA:</span>
                  <span className="text-cyan-400 font-bold text-[10px]">+{dailyProduction.defenseShieldMod}%</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-purple-950 flex justify-end">
              <button onClick={() => setShowStatsModal(false)} className="px-4 py-2 bg-black border border-zinc-800 text-zinc-300 hover:text-white text-[9px] font-bold uppercase rounded-lg cursor-pointer">
                ACEPTAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: POP-UP DETALLES COMPLETOS DE SKILLS ─── */}
      {showSkillsModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 font-mono text-white">
          <div className="w-full max-w-2xl bg-[#080b0e] border border-cyan-500/50 rounded-2xl p-5 text-left space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-cyan-950 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">
                  LISTA DETALLADA DE ACTIVE SKILLS TÁCTICAS
                </h3>
              </div>
              <button onClick={() => setShowSkillsModal(false)} className="p-1 text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[8.5px] text-zinc-400 uppercase">
              Desglose completo y jerárquico de todos los efectos pasivos y habilidades activas reales proporcionados por la C.A.N. y assets equipados.
            </p>

            <div className="space-y-2 text-[8px] sm:text-[9px] font-mono text-cyan-300 overflow-y-auto max-h-[340px] pr-2 custom-scrollbar text-left flex-1">
              {activeSkills.map((sk) => (
                <div
                  key={sk.id}
                  className={`p-2 rounded flex flex-col gap-0.5 border ${
                    sk.source === 'CAN'
                      ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                      : 'bg-[#050910] border-cyan-950 text-zinc-300'
                  }`}
                >
                  <div className="flex justify-between items-center text-[7.5px] border-b border-cyan-950 pb-0.5 mb-1">
                    <div className="flex items-center gap-1.5 uppercase font-black text-cyan-400">
                      {getSkillIcon(sk.source)}
                      <span>{sk.assetName}</span>
                    </div>
                    {sk.rarity && (
                      <span className={`px-1.5 rounded text-[7px] font-black uppercase ${
                        sk.rarity === 'LEGENDARY' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        sk.rarity === 'EPIC' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                        sk.rarity === 'RARE' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                        'bg-zinc-800 text-zinc-300'
                      }`}>
                        {sk.rarity} {sk.level && `LVL ${sk.level}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-[9px] font-bold leading-tight">{sk.effectDescription}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-cyan-950 flex justify-end">
              <button onClick={() => setShowSkillsModal(false)} className="px-4 py-2 bg-black border border-zinc-800 text-zinc-300 hover:text-white text-[9px] font-bold uppercase rounded-lg cursor-pointer">
                ACEPTAR
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CanView;