import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Lock,
  Search,
  ChevronDown,
  Star,
  Zap,
  Shield,
  Layers,
  Sparkles,
  Cpu,
  Wrench,
  Award,
  Info
} from "lucide-react";
import { Button } from "./ui/joly-button";
import { FleetManager } from "./FleetManager";
import { Scroller } from "./ui/Scroller";
import { supabase } from "../lib/supabase";

export interface InventoryItem {
  id: string;
  name: string;
  fullname: string;
  category: string;
  rarity: string;
  faction?: string;
  avatar_url: string;
  unlocked: boolean;
  quantity: number;
  level: number;
  stars: number;
  blueprints_owned: number;
  blueprints_required: number;
  crafting_costs?: any;
  tactical_stats?: any;
  skills?: any;
  set_skills?: string;
  effect?: string;
  stack_info?: string;
  duration_info?: string;
  power_score?: number;
  description?: string;
  favorite?: boolean;
  sound?: string;
  raw_seed?: any;
}

interface InventoryViewProps {
  playerGems: number;
  setPlayerGems: React.Dispatch<React.SetStateAction<number>>;
  playerPower: number;
  setPlayerPower: React.Dispatch<React.SetStateAction<number>>;
  playerGold?: number;
  setPlayerGold?: React.Dispatch<React.SetStateAction<number>>;
  triggerNotification: (text: string, e?: any) => void;
  onBack: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  playerGems,
  setPlayerGems,
  playerPower,
  setPlayerPower,
  playerGold = 0,
  setPlayerGold,
  triggerNotification,
  onBack
}) => {
  const [activeSidebarCategory, setActiveSidebarCategory] = useState<string>("All");

  const [filterDropdown1, setFilterDropdown1] = useState<string>("ALL CLASES");
  const [filterDropdown2, setFilterDropdown2] = useState<string>("TODOS LOS FILTROS");
  const [modsEnabled, setModsEnabled] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [showFilter1Modal, setShowFilter1Modal] = useState(false);
  const [showFilter2Modal, setShowFilter2Modal] = useState(false);

  const [selectedChar, setSelectedChar] = useState<InventoryItem | null>(null);
  const [characters, setCharacters] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [showSubModal, setShowSubModal] = useState<"fleet" | null>(null);
  const [showSkillsPopup, setShowSkillsPopup] = useState(false);
  const [fleets, setFleets] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedChar) {
      setShowSubModal(null);
      setShowSkillsPopup(false);
    }
  }, [selectedChar]);

  useEffect(() => {
    if (showSubModal === "fleet") {
      supabase.from("fleets").select("*").then(({ data }) => {
        if (data) setFleets(data);
      });
    }
  }, [showSubModal]);

  // ─── CARGA INTEGRAL DESDE LAS TABLAS SEED Y USER DE SUPABASE ───
  const fetchUserAssetsFromSupabase = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '9abc737e-9c3d-4349-a976-59af24f51f4d';

      const allItems: InventoryItem[] = [];

      const loadCategory = async (
        userTable: string,
        seedTable: string,
        categoryName: string,
        possibleFkCols: string[],
        pkSeedCol: string = 'id',
        nameCols: string[] = ['name', 'title']
      ) => {
        try {
          const { data: userRows } = await supabase
            .from(userTable)
            .select('*')
            .eq('user_id', userId);

          if (!userRows || userRows.length === 0) return;

          const { data: seedRows } = await supabase.from(seedTable).select('*');
          if (!seedRows || seedRows.length === 0) return;

          const seedMap = new Map(seedRows.map((s: any) => [s[pkSeedCol]?.toString(), s]));

          userRows.forEach((row: any) => {
            let targetId: string | null = null;
            for (const col of possibleFkCols) {
              if (row[col]) {
                targetId = row[col].toString();
                break;
              }
            }

            if (!targetId) return;

            const seed = seedMap.get(targetId);
            if (!seed) return;

            let realName = 'ACTIVO';
            for (const col of nameCols) {
              if (seed[col]) {
                realName = seed[col];
                break;
              }
            }

            let parsedSkills = seed.skills;
            if (typeof parsedSkills === 'string') {
              try { parsedSkills = JSON.parse(parsedSkills); } catch (e) { }
            }

            const imageUrl = seed.image_url || seed.avatar_url || seed.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';

            allItems.push({
              id: row.id?.toString() || targetId,
              name: realName,
              fullname: realName,
              category: categoryName,
              rarity: seed.rarity || 'Common',
              faction: seed.company || seed.collection || seed.series || 'GD',
              avatar_url: imageUrl,
              unlocked: true,
              quantity: row.quantity || row.amount || 1,
              level: row.current_level || row.level || 1,
              stars: 3,
              blueprints_owned: 1,
              blueprints_required: 1,
              description: seed.description || 'Sin descripción disponible en la base de datos.',
              power_score: seed.power_score || 0,
              effect: seed.effect || null,
              set_skills: seed.set_skills || null,
              stack_info: seed.stack || seed.max_stack?.toString() || null,
              duration_info: seed.duration || null,
              skills: parsedSkills || null,
              crafting_costs: {
                metal: seed.base_metal_cost || seed.req_metal || 0,
                crystal: seed.base_crystal_cost || seed.req_crystal || 0,
                deuterium: seed.req_deuterium || 0,
                dark_matter: seed.req_dark_matter || 0,
                gd_coins: seed.req_gd || 0
              },
              tactical_stats: {
                hp: seed.resistance || seed.base_hp || 1000,
                shield: seed.shield || 500,
                defense: seed.defense || 100,
                kinetic_attack: seed.attack_standard || 0,
                laser_attack: seed.attack_laser || 0,
                plasma_attack: seed.attack_plasma || 0,
                ionic_attack: seed.attack_ionic || 0,
                graviton_attack: seed.attack_graviton || 0,
                travel_speed: seed.speed_boost || 50,
                combat_speed: seed.speed_boost || 50,
                speed_boost: seed.speed_boost || 0,
                cargo_capacity: seed.cargo_capacity || 1000,
                fleet_space: seed.fleet_slots || 1,
                production: seed.production_min || 0,
                max_uses: seed.max_uses || null,
                total_existing: seed.total_existing || null,
                total_used: seed.total_used || null
              },
              raw_seed: seed
            });
          });
        } catch (catErr) {
          console.warn(`Aviso al cargar categoría ${categoryName}:`, catErr);
        }
      };

      await Promise.all([
        loadCategory('user_ships', 'seed_ships', 'Spaceships', ['ship_id'], 'ship_id', ['ship_name', 'name']),
        loadCategory('user_structures', 'seed_structures', 'Structures', ['structure_id', 'building_id'], 'id', ['name', 'title']),
        loadCategory('user_technologies', 'seed_technologies', 'Tecnology', ['technology_id'], 'id', ['name', 'title']),
        loadCategory('user_tools', 'seed_tools', 'Tools', ['tool_id'], 'id', ['name', 'title']),
        loadCategory('user_astrobots', 'seed_astrobots', 'Astrobots', ['astrobot_id'], 'id', ['name', 'title']),
        loadCategory('user_defenses', 'seed_defenses', 'Defense', ['defense_id'], 'defense_id', ['defense_name', 'name']),
        loadCategory('user_blueprints', 'seed_blueprints', 'Blueprints', ['blueprint_id'], 'id', ['name', 'title']),
        loadCategory('user_consumibles', 'seed_consumables', 'Consumibles', ['consumable_id'], 'id', ['name', 'title']),
        loadCategory('user_licenses', 'seed_licenses', 'Licencia', ['license_id'], 'id', ['name', 'title']),
        loadCategory('user_badges_unlocked', 'seed_badges', 'Badges', ['badge_id'], 'id', ['name', 'title'])
      ]);

      setCharacters(allItems);
    } catch (error) {
      triggerNotification("FALLO AL SINCRONIZAR NÚCLEO DE INVENTARIOS");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAssetsFromSupabase();
  }, []);

  const playSfx = (soundName?: string) => {
    try {
      const sfx = new Audio();
      sfx.src = soundName === "heavy_laser"
        ? "https://assets.mixkit.co/active_storage/sfx/2759/2759-84.wav"
        : "https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav";
      sfx.volume = 0.15;
      sfx.play().catch(() => { });
    } catch (ignore) { }
  };

  const getFilteredCharacters = useMemo(() => {
    let list = [...characters];

    if (activeSidebarCategory === "Favorites") {
      list = list.filter((c) => c.favorite);
    } else if (activeSidebarCategory !== "All") {
      const categoryMap: Record<string, string> = {
        "Ships": "Spaceships",
        "Spaceships": "Spaceships",
        "Structures": "Structures",
        "Tecnology": "Tecnology",
        "Defense": "Defense",
        "Astrobots": "Astrobots",
        "Blueprints": "Blueprints",
        "Badges": "Badges",
        "Licencia": "Licencia",
        "Tools": "Tools",
        "Consumibles": "Consumibles",
        "Fleets": "Fleets",
      };
      const dbCat = categoryMap[activeSidebarCategory] || activeSidebarCategory;
      list = list.filter((c) => c.category === dbCat);
    }

    if (filterDropdown1 !== "ALL CLASES") {
      const cls = filterDropdown1.replace("CLASES: ", "");
      list = list.filter((c) => c.rarity && c.rarity.toUpperCase() === cls.toUpperCase());
    }

    if (filterDropdown2 !== "TODOS LOS FILTROS") {
      const fac = filterDropdown2.replace("FACCIÓN: ", "");
      list = list.filter((c) => c.faction && c.faction.toUpperCase() === fac.toUpperCase());
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.fullname.toLowerCase().includes(query) ||
          (c.category && c.category.toLowerCase().includes(query)) ||
          (c.faction && c.faction.toLowerCase().includes(query))
      );
    }

    return list;
  }, [characters, activeSidebarCategory, filterDropdown1, filterDropdown2, searchQuery]);

  const handleToggleFavorite = (char: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = characters.map((c) => {
      if (c.id === char.id) {
        triggerNotification(!c.favorite ? "⭐ INDEXADO A SECTOR DE ACCESO PRIORITARIO" : "⭐ ELIMINADO DE FAVORITOS", e);
        return { ...c, favorite: !c.favorite };
      }
      return c;
    });
    setCharacters(updated);
  };

  const subSections = [
    { key: "Fleets", label: "FLEETS", locked: false },
    { key: "Spaceships", label: "SPACESHIPS", locked: false },
    { key: "Structures", label: "STRUCTURES", locked: false },
    { key: "Defense", label: "DEFENSE", locked: false },
    { key: "Astrobots", label: "ASTROBOTS", locked: false },
    { key: "Tecnology", label: "TECHNOLOGIES", locked: false },
    { key: "Blueprints", label: "BLUEPRINTS", locked: false },
    { key: "Badges", label: "BADGES", locked: false },
    { key: "Licencia", label: "LICENCIA", locked: false },
    { key: "Tools", label: "TOOLS", locked: false },
    { key: "Consumibles", label: "CONSUMIBLES", locked: false },
  ];

  return (
    <div
      id="swgoh-inventory-screen"
      className="relative w-full max-w-6xl mx-auto bg-black text-white rounded-3xl border border-cyan-500/20 overflow-hidden font-sans select-none shadow-[0_0_40px_rgba(6,182,212,0.1)] p-2.5 sm:p-3.5 h-[calc(100vh-10rem)] max-h-[510px] flex flex-col"
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/[0.04] rounded-full blur-3xl pointer-events-none" />

      {/* HEADER COMPACTO (LIMPIO SIN BADGE NI SUBTÍTULO) */}
      <div className="flex flex-col md:flex-row items-center justify-between border-b border-cyan-800/25 pb-1.5 mb-1.5 gap-2 relative shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-950 to-neutral-900 border-2 border-cyan-400 text-white flex items-center justify-center hover:bg-cyan-900 transition-all cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.3)] hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 text-cyan-300 drop-shadow-[0_0_3px_cyan]" />
          </button>
          <div className="text-left">
            <h2 className="text-base font-bold tracking-widest text-[#e8f1f5] uppercase font-sans">
              INVENTORY
            </h2>
          </div>
        </div>

        <div id="inventory-gal-power" className="flex items-center gap-3">
          <div className="bg-[#0b1016]/80 border border-cyan-600/30 rounded-xl px-3 py-1 flex flex-col items-center">
            <span className="text-[7px] font-mono tracking-widest text-zinc-400 uppercase">GALACTIC POWER</span>
            <span className="text-xs font-black text-emerald-400 tracking-wider">{playerPower.toLocaleString()} POW</span>
          </div>
        </div>
      </div>

      {/* FILTROS SUPERIORES COMPACTOS (shrink-0) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0a0f14]/85 border border-cyan-900/35 px-2.5 py-1.5 rounded-xl mb-2 relative shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              onClick={() => { setShowFilter1Modal(!showFilter1Modal); setShowFilter2Modal(false); }}
              className="px-2.5 py-1 bg-[#0b212f]/80 border-t-2 border-b border-r border-l border-cyan-400/80 rounded-md text-[8px] font-mono tracking-widest text-white uppercase flex items-center justify-between gap-2 cursor-pointer select-none transition-colors hover:bg-cyan-950/60 shadow-[inset_0_1px_4px_rgba(34,211,238,0.25)] min-w-[130px]"
            >
              <span>{filterDropdown1}</span>
              <ChevronDown className="w-3 h-3 text-cyan-400 stroke-[3]" />
            </button>
            <AnimatePresence>
              {showFilter1Modal && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                  className="absolute left-0 mt-1 w-44 bg-[#04080b] border-2 border-cyan-500/40 rounded-xl shadow-2xl z-50 p-1 divide-y divide-cyan-950"
                >
                  {["ALL CLASES", "CLASES: COMMON", "CLASES: UNCOMMON", "CLASES: RARE", "CLASES: EPIC", "CLASES: LEGENDARY"].map((opt) => (
                    <button key={opt} onClick={() => { setFilterDropdown1(opt); setShowFilter1Modal(false); playSfx("laser_success"); }}
                      className="w-full text-left px-2.5 py-1.5 text-[8px] font-mono uppercase tracking-wider text-cyan-300 hover:bg-cyan-950/50 hover:text-white transition-colors"
                    >{opt}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              onClick={() => { setShowFilter2Modal(!showFilter2Modal); setShowFilter1Modal(false); }}
              className="px-2.5 py-1 bg-[#0b212f]/80 border-t-2 border-b border-r border-l border-cyan-400/80 rounded-md text-[8px] font-mono tracking-widest text-white uppercase flex items-center justify-between gap-2 cursor-pointer select-none transition-colors hover:bg-cyan-950/60 shadow-[inset_0_1px_4px_rgba(34,211,238,0.25)] min-w-[130px]"
            >
              <span>{filterDropdown2}</span>
              <ChevronDown className="w-3 h-3 text-cyan-400 stroke-[3]" />
            </button>
            <AnimatePresence>
              {showFilter2Modal && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                  className="absolute left-0 mt-1 w-44 bg-[#04080b] border-2 border-cyan-500/40 rounded-xl shadow-2xl z-50 p-1"
                >
                  {["TODOS LOS FILTROS", "FACCIÓN: NOVA", "FACCIÓN: GD I", "FACCIÓN: OSIRIS", "FACCIÓN: MYTON", "FACCIÓN: ALACRAN", "FACCIÓN: ZEPPELIN"].map((opt) => (
                    <button key={opt} onClick={() => { setFilterDropdown2(opt); setShowFilter2Modal(false); playSfx("laser_success"); }}
                      className="w-full text-left px-2.5 py-1.5 text-[8px] font-mono uppercase tracking-wider text-cyan-300 hover:bg-cyan-950/50 hover:text-white transition-colors border-b border-cyan-900/40 last:border-0"
                    >{opt}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => { setModsEnabled(!modsEnabled); triggerNotification(modsEnabled ? "🔴 FILTRO APAGADO" : "🟢 MOSTRANDO FLOTAS EN VUELO"); }}
            className="flex items-center gap-1.5 hover:opacity-90 select-none cursor-pointer"
          >
            <div className="w-3.5 h-3.5 border border-cyan-500 rounded flex items-center justify-center bg-black">
              {modsEnabled && <div className="w-1.5 h-1.5 bg-cyan-400 shadow-[0_0_8px_cyan]" />}
            </div>
            <span className="text-[8px] font-mono text-zinc-300 tracking-widest uppercase">FLOTAS EN VUELO</span>
          </button>
        </div>

        <div className="relative w-full sm:w-40 ml-auto">
          <Search className="absolute left-2 top-1.5 w-3 h-3 text-cyan-500" />
          <input
            type="text"
            placeholder="BUSCAR COMPAÑERO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border border-cyan-900/60 rounded-lg pl-6 pr-2 py-0.5 text-[7.5px] font-mono tracking-wider text-cyan-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/20 uppercase"
          />
        </div>
      </div>

      {/* CUERPO PRINCIPAL FLEXIBLE (flex-1 min-h-0) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start flex-1 min-h-0 h-full overflow-hidden">

        {/* MENU LATERAL */}
        <div className="lg:col-span-3 flex flex-col gap-1 relative h-full overflow-y-auto custom-scrollbar pr-1 shrink-0">
          {subSections.map(({ key, label, locked }) => (
            <button
              key={key}
              onClick={() => { if (!locked) { setActiveSidebarCategory(key); playSfx("laser_success"); } else { triggerNotification(`🔒 ${label}: PRÓXIMAMENTE EN GALAXYDUST`); } }}
              className={`w-full py-1.5 px-2.5 text-left font-sans text-[9px] font-extrabold uppercase tracking-widest rounded-xl transition-all border flex items-center justify-between ${
                activeSidebarCategory === key
                  ? "bg-gradient-to-r from-red-950/50 to-[#ca421e]/20 border-red-500/60 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  : locked
                    ? "bg-[#0a0f13]/40 border-cyan-900/20 text-zinc-600 cursor-default"
                    : "bg-[#0a0f13]/60 hover:bg-[#0d161c]/80 border-cyan-900/35 text-zinc-400 hover:text-cyan-400"
              }`}
            >
              <span>{label}</span>
              {locked && <Lock className="w-3 h-3 text-zinc-600 shrink-0" />}
            </button>
          ))}
        </div>

        {/* GRID DERECHA */}
        <div className="lg:col-span-9 flex flex-col gap-1.5 h-full min-h-0 overflow-hidden">
          {activeSidebarCategory === "Fleets" ? (
            <FleetManager characters={characters} triggerNotification={triggerNotification} />
          ) : (
            <>
              <div className="flex items-center justify-between px-1 shrink-0">
                <span className="text-[8px] font-mono text-cyan-400 uppercase tracking-widest">
                  Compañeros Filtrados: {getFilteredCharacters.length} / {characters.length}
                </span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {/* CONTENEDOR CON SCROLL EXCLUSIVO Y ALINEACIÓN DE TARJETAS */}
              <div
                id="swgoh-characters-grid"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 items-start content-start bg-[#030608]/90 border border-cyan-900/25 p-3 rounded-2xl shadow-inner flex-1 min-h-0 overflow-y-auto custom-scrollbar scrollbar-thin scrollbar-thumb-cyan-900"
              >
                {isLoading ? (
                  <div className="col-span-2 md:col-span-5 flex flex-col items-center justify-center h-full gap-2.5 text-cyan-500 py-12">
                    <div className="w-7 h-7 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[8.5px] font-mono tracking-widest uppercase animate-pulse">ESTABLECIENDO ENLACE CON DATA CENTER...</span>
                  </div>
                ) : getFilteredCharacters.length === 0 ? (
                  <div className="col-span-2 md:col-span-5 flex items-center justify-center h-full text-zinc-500 text-[9px] font-mono uppercase tracking-widest py-12">
                    NO HAY ASSETS DISPONIBLES EN ESTE SECTOR
                  </div>
                ) : (
                  getFilteredCharacters.map((char) => {
                    return (
                      <div
                        key={char.id}
                        onClick={() => { playSfx(char.sound); setSelectedChar(char); }}
                        className="flex flex-col items-center justify-between relative group cursor-pointer transition-all duration-200 select-none p-2 rounded-xl border border-cyan-900/50 bg-[#070c12] hover:bg-[#0c1620] hover:border-cyan-400/80 shadow-lg text-center h-fit w-full"
                      >
                        {/* MARCO Y TARJETA CUADRADA DE IMAGEN */}
                        <div className="relative w-full aspect-square rounded-lg border border-cyan-800/80 bg-black overflow-hidden mb-1 group-hover:scale-[1.02] transition-transform">
                          <img
                            src={char.avatar_url}
                            alt={char.name}
                            className={`w-full h-full object-cover ${!char.unlocked ? "grayscale opacity-50 brightness-50" : ""}`}
                            referrerPolicy="no-referrer"
                          />
                          {/* Cantidad */}
                          {char.unlocked && (
                            <div className="absolute top-1 right-1 px-1 py-0.5 rounded bg-cyan-950/90 border border-cyan-400 text-cyan-300 font-mono font-black text-[7px] shadow">
                              x{char.quantity || 1}
                            </div>
                          )}
                          {/* Nivel / Rango */}
                          {char.level > 1 && (
                            <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/80 border border-amber-500/60 text-amber-400 font-mono font-black text-[6.5px]">
                              LVL {char.level}
                            </div>
                          )}
                          {!char.unlocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                              <Lock className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_8px_cyan]" />
                            </div>
                          )}
                        </div>

                        {/* Nombre del Activo */}
                        <div className="w-full truncate text-[9px] text-[#e8f1f5] font-extrabold uppercase mb-0.5 flex items-center justify-center gap-1">
                          <span className="truncate">{char.name}</span>
                          {char.favorite && <span className="text-amber-400 text-[8.5px] shrink-0">★</span>}
                        </div>

                        {/* Etiqueta de Rareza */}
                        <div className="w-full flex items-center justify-center">
                          <span className={`text-[6.5px] font-mono font-black uppercase tracking-wider px-1 py-0.5 rounded border w-full truncate ${
                            char.rarity?.toUpperCase() === 'LEGENDARY' ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' :
                            char.rarity?.toUpperCase() === 'EPIC' ? 'text-purple-400 border-purple-500/40 bg-purple-500/10' :
                            char.rarity?.toUpperCase() === 'RARE' ? 'text-sky-400 border-sky-500/40 bg-sky-500/10' :
                            char.rarity?.toUpperCase() === 'UNCOMMON' ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' :
                            'text-zinc-400 border-zinc-500/40 bg-zinc-500/10'
                          }`}>
                            {char.rarity || 'COMMON'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL DETALLADO PRINCIPAL */}
      <AnimatePresence>
        {selectedChar && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-[#070b0f] border-2 border-cyan-400 rounded-3xl p-5 relative overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.25)] text-left"
            >
              <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.015)_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />

              {/* Encabezado Modal */}
              <div className="flex justify-between items-start border-b border-cyan-950 pb-3 mb-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[7.5px] font-mono text-cyan-400 font-extrabold uppercase bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
                      {selectedChar.category.toUpperCase()} ASSET
                    </span>
                    <button onClick={(e) => handleToggleFavorite(selectedChar, e)} className="text-amber-400 hover:scale-110 transition-transform font-mono text-[9px] font-bold">
                      {selectedChar.favorite ? "★ FAVORITO" : "☆ FAVORITO"}
                    </button>
                  </div>
                  <h3 className="text-md font-black text-white tracking-widest mt-1 uppercase">{selectedChar.name}</h3>
                </div>
                <button onClick={() => setSelectedChar(null)} className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 hover:text-white font-bold cursor-pointer">✕</button>
              </div>

              {/* VISTA DE SELECCIÓN DE FLOTA */}
              {showSubModal === "fleet" ? (
                <div className="relative z-10 space-y-4">
                  <h4 className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase border-b border-cyan-900/50 pb-2">Seleccionar Flota Operativa</h4>
                  {fleets.length === 0 ? (
                    <div className="text-[9px] text-zinc-500 font-mono uppercase py-8 text-center bg-black/40 rounded-xl border border-cyan-950">No hay flotas activas en este sector.</div>
                  ) : (
                    <Scroller overflow="x" withButtons className="pb-2" gap="gap-3">
                      {fleets.map(f => (
                        <div key={f.id} onClick={() => { triggerNotification(`🚢 ASIGNADO A FLOTA: ${f.name}`); setShowSubModal(null); }} className="min-w-[140px] bg-cyan-950/30 border border-cyan-900 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-cyan-900/50 hover:border-cyan-400 transition-all text-center">
                          <Layers className="w-8 h-8 text-cyan-400 mb-2" />
                          <div className="text-[10px] font-bold text-white uppercase">{f.name || 'Flota Alpha'}</div>
                          <div className="text-[8px] text-cyan-500 font-mono mt-1">POW: {f.total_power_score}</div>
                        </div>
                      ))}
                    </Scroller>
                  )}
                </div>
              ) : (
                /* DETALLE COMPLETO Y ESTADÍSTICAS REALES */
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 relative z-10">
                  
                  {/* Tarjeta Visual Cuadrada de Previsualización */}
                  <div className="md:col-span-4 flex flex-col items-center gap-3 bg-black/40 border border-cyan-950 p-3.5 rounded-2xl text-center h-fit">
                    <div className="relative w-24 h-28 aspect-square rounded-xl border-2 border-cyan-400 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                      <img src={selectedChar.avatar_url} alt={selectedChar.name} className="w-full h-full object-cover" />
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-white font-mono font-black text-[8.5px] shadow">
                        x{selectedChar.quantity}
                      </div>
                    </div>

                    <div className="font-mono text-[8px] text-zinc-400 space-y-1 w-full text-left uppercase mt-1">
                      <p className="flex justify-between border-b border-zinc-900 pb-1">
                        <span>FACTION/SERIES:</span> <span className="text-cyan-300 font-bold">{selectedChar.faction}</span>
                      </p>
                      <p className="flex justify-between border-b border-zinc-900 pb-1">
                        <span>RARITY:</span> <span className="text-amber-400 font-bold">{selectedChar.rarity}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>CATEGORY:</span> <span className="text-purple-400 font-bold">{selectedChar.category}</span>
                      </p>
                    </div>
                  </div>

                  {/* Panel de Atributos y Lore Real */}
                  <div className="md:col-span-8 flex flex-col justify-start gap-2.5 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                    
                    {/* Lore / Descripción Real */}
                    <div className="bg-black/50 border border-cyan-950 p-2.5 rounded-xl">
                      <span className="text-[7.5px] font-mono tracking-widest text-cyan-400 font-bold uppercase block mb-1">// DESCRIPCIÓN DEL ACTIVO</span>
                      <p className="text-[9px] font-sans text-zinc-300 leading-relaxed uppercase">{selectedChar.description || "Sin descripción disponible."}</p>
                    </div>

                    {/* STATS CONDICIONALES POR CATEGORÍA */}
                    {selectedChar.category === "Spaceships" ? (
                      <>
                        {/* Naves: Matriz Ofensiva */}
                        <div className="bg-black/40 border border-red-900/40 p-2.5 rounded-xl">
                          <span className="text-[7.5px] text-red-400 font-bold tracking-widest uppercase block mb-1.5 border-b border-red-900/30 pb-1">Matriz Ofensiva</span>
                          <div className="grid grid-cols-2 gap-2 font-mono text-[8.5px]">
                            <div className="bg-black/60 border border-red-950/50 p-1.5 rounded-lg flex justify-between">
                              <span className="text-zinc-500 text-[7px]">Kinetic Attack</span>
                              <span className="text-white font-black">{selectedChar.tactical_stats?.kinetic_attack || 0} DMG</span>
                            </div>
                            <div className="bg-black/60 border border-red-950/50 p-1.5 rounded-lg flex justify-between">
                              <span className="text-zinc-500 text-[7px]">Laser Attack</span>
                              <span className="text-white font-black">{selectedChar.tactical_stats?.laser_attack || 0} DMG</span>
                            </div>
                            <div className="bg-black/60 border border-red-950/50 p-1.5 rounded-lg flex justify-between">
                              <span className="text-zinc-500 text-[7px]">Plasma Attack</span>
                              <span className="text-white font-black">{selectedChar.tactical_stats?.plasma_attack || 0} DMG</span>
                            </div>
                            <div className="bg-black/60 border border-red-950/50 p-1.5 rounded-lg flex justify-between">
                              <span className="text-zinc-500 text-[7px]">Ionic Attack</span>
                              <span className="text-white font-black">{selectedChar.tactical_stats?.ionic_attack || 0} DMG</span>
                            </div>
                            <div className="bg-black/60 border border-red-950/50 p-1.5 rounded-lg flex justify-between col-span-2">
                              <span className="text-zinc-500 text-[7px]">Graviton Attack</span>
                              <span className="text-white font-black">{selectedChar.tactical_stats?.graviton_attack || 0} DMG</span>
                            </div>
                          </div>
                        </div>

                        {/* Naves: Blindaje y Cinemática */}
                        <div className="bg-black/40 border border-cyan-900/40 p-2.5 rounded-xl">
                          <span className="text-[7.5px] text-cyan-400 font-bold tracking-widest uppercase block mb-1.5 border-b border-cyan-900/30 pb-1">Blindaje y Cinemática</span>
                          <div className="grid grid-cols-2 gap-2 font-mono text-[8.5px]">
                            <div className="bg-black/60 border border-cyan-950/50 p-1.5 rounded-lg flex justify-between">
                              <span className="text-zinc-500 text-[7px]">Hit Points</span>
                              <span className="text-white font-black">{selectedChar.tactical_stats?.hp || 0} HP</span>
                            </div>
                            <div className="bg-black/60 border border-cyan-950/50 p-1.5 rounded-lg flex justify-between">
                              <span className="text-zinc-500 text-[7px]">Shield</span>
                              <span className="text-purple-400 font-black">{selectedChar.tactical_stats?.shield || 0} SH</span>
                            </div>
                            <div className="bg-black/60 border border-cyan-950/50 p-1.5 rounded-lg flex justify-between">
                              <span className="text-zinc-500 text-[7px]">Defense</span>
                              <span className="text-cyan-400 font-black">{selectedChar.tactical_stats?.defense || 0} DEF</span>
                            </div>
                            <div className="bg-black/60 border border-cyan-950/50 p-1.5 rounded-lg flex justify-between">
                              <span className="text-zinc-500 text-[7px]">Speed Boost</span>
                              <span className="text-amber-400 font-black">{selectedChar.tactical_stats?.speed_boost || 0}%</span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Demás Categorías */
                      <div className="bg-black/40 border border-amber-900/40 p-2.5 rounded-xl font-mono text-[8.5px]">
                        <span className="text-[7.5px] text-amber-400 font-bold tracking-widest uppercase block mb-1.5 border-b border-amber-900/30 pb-1">Ficha Táctica de Módulo</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-black/60 border border-amber-950/50 p-1.5 rounded-lg flex flex-col">
                            <span className="text-zinc-500 text-[7px]">Power Score</span>
                            <span className="text-emerald-400 font-black text-[10px]">{selectedChar.power_score || 0} POW</span>
                          </div>
                          <div className="bg-black/60 border border-amber-950/50 p-1.5 rounded-lg flex flex-col">
                            <span className="text-zinc-500 text-[7px]">Level / Rango</span>
                            <span className="text-white font-black text-[10px]">LVL {selectedChar.level}</span>
                          </div>
                          {selectedChar.effect && (
                            <div className="bg-black/60 border border-amber-950/50 p-1.5 rounded-lg flex flex-col col-span-2">
                              <span className="text-zinc-500 text-[7px]">Efecto Principal</span>
                              <span className="text-amber-300 font-bold">{selectedChar.effect}</span>
                            </div>
                          )}
                          {selectedChar.stack_info && (
                            <div className="bg-black/60 border border-amber-950/50 p-1.5 rounded-lg flex justify-between">
                              <span className="text-zinc-500 text-[7px]">Stack Max:</span>
                              <span className="text-white font-bold">{selectedChar.stack_info}</span>
                            </div>
                          )}
                          {selectedChar.duration_info && (
                            <div className="bg-black/60 border border-amber-950/50 p-1.5 rounded-lg flex justify-between">
                              <span className="text-zinc-500 text-[7px]">Duración:</span>
                              <span className="text-cyan-400 font-bold">{selectedChar.duration_info}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* Botonera de Acciones Tácticas */}
              <div className="border-t border-cyan-950/80 pt-3 mt-3 flex justify-between items-center gap-2.5 relative z-10">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSkillsPopup(true)}
                    className="px-3.5 py-1.5 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/50 text-purple-300 rounded-xl text-[8.5px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.3)] flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    [SKILLS]
                  </button>

                  {selectedChar.category === "Spaceships" && showSubModal === null && (
                    <button
                      onClick={() => setShowSubModal("fleet")}
                      className="px-3.5 py-1.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-xl text-[8.5px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      [Añadir a Flota]
                    </button>
                  )}
                  {showSubModal !== null && (
                    <button
                      onClick={() => setShowSubModal(null)}
                      className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-cyan-900/50 text-cyan-400 rounded-xl text-[8.5px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      [Atrás]
                    </button>
                  )}
                </div>

                <Button variant="secondary" size="sm" onClick={() => setSelectedChar(null)} className="text-[8.5px] font-mono font-bold uppercase cursor-pointer">
                  [CERRAR]
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP DEDICADO DE SKILLS */}
      <AnimatePresence>
        {showSkillsPopup && selectedChar && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 z-[10000]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-[#080d14] border-2 border-purple-500/60 rounded-3xl p-5 relative overflow-hidden shadow-[0_0_60px_rgba(168,85,247,0.3)] text-left font-mono"
            >
              <div className="flex justify-between items-center border-b border-purple-900/50 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">
                    ANÁLISIS DE HABILIDADES
                  </h3>
                </div>
                <button
                  onClick={() => setShowSkillsPopup(false)}
                  className="w-6 h-6 rounded-full bg-purple-950 border border-purple-800 text-purple-300 hover:text-white font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="p-2 bg-black/60 border border-purple-950 rounded-xl flex items-center justify-between">
                  <span className="text-[9.5px] text-white font-bold uppercase">{selectedChar.name}</span>
                  <span className="text-[7.5px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded font-bold uppercase border border-purple-800">
                    {selectedChar.category}
                  </span>
                </div>

                <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[8.5px] text-amber-400 font-bold tracking-widest uppercase">Set Skills & Sinergias</span>
                  </div>
                  <p className="text-[8.5px] text-zinc-300 uppercase leading-relaxed">
                    {selectedChar.set_skills || "Sin habilidad de set asociada."}
                  </p>
                </div>

                <div className="bg-purple-950/20 border border-purple-900/40 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[8.5px] text-purple-400 font-bold tracking-widest uppercase">Habilidades Registradas</span>
                  </div>
                  {selectedChar.skills ? (
                    <div className="space-y-1.5 text-[8.5px] text-zinc-300 uppercase">
                      {Array.isArray(selectedChar.skills) ? (
                        selectedChar.skills.map((s: any, idx: number) => (
                          <div key={idx} className="p-1.5 bg-black/40 border border-purple-950 rounded">
                            {typeof s === 'string' ? s : JSON.stringify(s)}
                          </div>
                        ))
                      ) : (
                        <pre className="text-[7.5px] bg-black/60 p-2 rounded text-purple-300 whitespace-pre-wrap font-mono">
                          {JSON.stringify(selectedChar.skills, null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <p className="text-[8.5px] text-zinc-500 uppercase">Sin habilidades activas en esta matriz.</p>
                  )}
                </div>

                <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[8.5px] text-cyan-400 font-bold tracking-widest uppercase">Efecto Especial</span>
                  </div>
                  <p className="text-[8.5px] text-zinc-300 uppercase leading-relaxed">
                    {selectedChar.effect || "Sin efecto pasivo registrado."}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-purple-900/40 flex justify-end">
                <button
                  onClick={() => setShowSkillsPopup(false)}
                  className="w-full py-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-500/50 text-purple-200 text-[9px] font-black uppercase rounded-xl transition-all cursor-pointer text-center"
                >
                  ACEPTAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};