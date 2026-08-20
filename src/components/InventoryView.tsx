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
import { useInventory, type InventoryItem } from "../hooks/useInventory";
import { useAudioEngine } from "../hooks/useAudioEngine";
export type { InventoryItem } from "../hooks/useInventory";

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

// 🌐 RESOLUCIÓN Y NORMALIZACIÓN DE RUTA DE IMÁGENES
const resolveImageUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
  }
  const clean = rawUrl.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;

  if (clean.startsWith('Assets') || clean.startsWith('Monedas') || clean.includes('Assets%20para')) {
    return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/${clean.replace(/^\//, '')}`;
  }

  return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/galaxy-assets/${clean.replace(/^\//, '')}`;
};

// 🎯 CLASIFICADOR ESTRICHO Y DETERMINISTA DE CATEGORÍAS DE ASSETS
const getItemCategory = (item: InventoryItem): string => {
  const cat = String(item.category || "").toLowerCase().trim();
  const type = String((item as any).type || "").toLowerCase().trim();
  const name = String(item.name || (item as any).fullname || "").toLowerCase().trim();

  if (cat === "fleets" || (item as any).is_fleet) return "Fleets";

  // 1. Estructuras (Minitas, Depósitos, Fábricas, Extractores, Agencias, etc.)
  if (
    ["structures", "structure", "estructura", "estructuras"].includes(cat) ||
    ["structures", "structure", "estructura"].includes(type) ||
    /mine|deposit|factory|hq|extractor|plant|refinery|storage|building|estructura|structure|layer|agency/.test(name)
  ) {
    return "Structures";
  }

  // 2. Defensas (Cañones, Lanzadores, Torretas, Baterías, Defensas)
  if (
    ["defense", "defenses", "defensa", "defensas"].includes(cat) ||
    ["defense", "defensa"].includes(type) ||
    /cannon|launcher|turret|torpedo|barrier|battery|defensa|defense/.test(name)
  ) {
    return "Defense";
  }

  // 3. Astrobots (Robots, Drones, Astrobots)
  if (
    ["astrobots", "astrobot", "robot", "robots"].includes(cat) ||
    ["astrobot", "robot"].includes(type) ||
    /astrobot|robot|drone|android/.test(name)
  ) {
    return "Astrobots";
  }

  // 4. Tecnologías e Investigaciones
  if (
    ["tecnology", "technology", "technologies", "tech", "tecnologia", "tecnología"].includes(cat) ||
    ["technology", "tech", "tecnologia"].includes(type) ||
    /technology|tecnologia|tech|research/.test(name)
  ) {
    return "Tecnology";
  }

  // 5. Blueprints / Planos
  if (
    ["blueprints", "blueprint", "plano", "planos"].includes(cat) ||
    ["blueprint", "plano"].includes(type) ||
    /blueprint|plano|schematic/.test(name)
  ) {
    return "Blueprints";
  }

  // 6. Insignias / Badges
  if (
    ["badges", "badge", "insignia", "insignias"].includes(cat) ||
    ["badge", "insignia"].includes(type) ||
    /badge|insignia|medal/.test(name)
  ) {
    return "Badges";
  }

  // 7. Licencias
  if (
    ["licencia", "license", "licenses", "licencias"].includes(cat) ||
    ["license", "licencia"].includes(type) ||
    /license|licencia|permit/.test(name)
  ) {
    return "Licencia";
  }

  // 8. Herramientas / Tools
  if (
    ["tools", "tool", "herramientas", "herramienta"].includes(cat) ||
    ["tool", "herramienta"].includes(type) ||
    /tool|herramienta|drill|probe|scanner|sensor/.test(name)
  ) {
    return "Tools";
  }

  // 9. Consumibles
  if (
    ["consumibles", "consumables", "consumable"].includes(cat) ||
    ["consumable", "consumible"].includes(type) ||
    /consumable|consumible|capsule|ration|resupply/.test(name)
  ) {
    return "Consumibles";
  }

  // 🚀 CUALQUIER ASSET RESTANTE ES UNA NAVE (SPACESHIPS)
  return "Spaceships";
};

// 🔍 EVALUADOR EXCLUSIVO POR PESTAÑA DEL MENÚ LATERAL
const matchInventoryCategory = (item: InventoryItem, selectedSidebarKey: string): boolean => {
  if (!selectedSidebarKey || selectedSidebarKey === "All") return true;
  if (selectedSidebarKey === "Favorites") return Boolean(item.favorite);

  const determinedCategory = getItemCategory(item);
  return determinedCategory.toLowerCase() === selectedSidebarKey.toLowerCase();
};

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
  const { items: characters, loading: isLoading, refreshInventory, toggleFavorite: toggleFav } = useInventory();
  const { playSfx } = useAudioEngine();

  const [activeSidebarCategory, setActiveSidebarCategory] = useState<string>("All");

  const [filterDropdown1, setFilterDropdown1] = useState<string>("ALL CLASES");
  const [filterDropdown2, setFilterDropdown2] = useState<string>("TODOS LOS FILTROS");
  const [modsEnabled, setModsEnabled] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [showFilter1Modal, setShowFilter1Modal] = useState(false);
  const [showFilter2Modal, setShowFilter2Modal] = useState(false);

  const [selectedChar, setSelectedChar] = useState<InventoryItem | null>(null);

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
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase.from("fleets").select("*").eq("user_id", user.id).then(({ data }) => {
          if (data) setFleets(data);
        });
      });
    }
  }, [showSubModal]);

  const getFilteredCharacters = useMemo(() => {
    let list = [...characters];

    if (modsEnabled) {
      list = list.filter((c) => c.is_in_flight);
    }

    if (activeSidebarCategory === "Favorites") {
      list = list.filter((c) => c.favorite);
    } else if (activeSidebarCategory !== "All") {
      list = list.filter((c) => matchInventoryCategory(c, activeSidebarCategory));
    }

    if (filterDropdown1 !== "ALL CLASES") {
      const cls = filterDropdown1.replace("CLASES: ", "").trim().toUpperCase();
      list = list.filter((c) => c.rarity && c.rarity.trim().toUpperCase() === cls);
    }

    if (filterDropdown2 !== "TODOS LOS FILTROS") {
      const fac = filterDropdown2.replace("FACCIÓN: ", "").trim().toUpperCase();
      list = list.filter((c) => c.faction && c.faction.trim().toUpperCase() === fac);
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.fullname.toLowerCase().includes(query) ||
          (c.category && c.category.toLowerCase().includes(query)) ||
          (c.faction && c.faction.toLowerCase().includes(query))
      );
    }

    return list;
  }, [characters, activeSidebarCategory, filterDropdown1, filterDropdown2, searchQuery, modsEnabled]);

  const handleToggleFavorite = (char: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerNotification(!char.favorite ? "⭐ INDEXADO A SECTOR DE ACCESO PRIORITARIO" : "⭐ ELIMINADO DE FAVORITOS", e);
    toggleFav(char.id);
  };

  const subSections = [
    { key: "All", label: "TODOS LOS ACTIVOS", locked: false },
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

      {/* HEADER COMPACTO */}
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

      {/* FILTROS SUPERIORES COMPACTOS */}
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
                      className="w-full text-left px-2.5 py-1.5 text-[8px] font-mono uppercase tracking-wider text-cyan-300 hover:bg-cyan-950/50 hover:text-white transition-colors cursor-pointer"
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
                      className="w-full text-left px-2.5 py-1.5 text-[8px] font-mono uppercase tracking-wider text-cyan-300 hover:bg-cyan-950/50 hover:text-white transition-colors border-b border-cyan-900/40 last:border-0 cursor-pointer"
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
            <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center bg-black ${modsEnabled ? 'border-red-500' : 'border-cyan-500'}`}>
              {modsEnabled && <div className="w-1.5 h-1.5 bg-red-500 shadow-[0_0_8px_#ef4444]" />}
            </div>
            <span className={`text-[8px] font-mono tracking-widest uppercase ${modsEnabled ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
              FLOTAS EN VUELO
            </span>
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

      {/* CUERPO PRINCIPAL FLEXIBLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start flex-1 min-h-0 h-full overflow-hidden">

        {/* MENU LATERAL */}
        <div className="lg:col-span-3 flex flex-col gap-1 relative h-full overflow-y-auto custom-scrollbar pr-1 shrink-0">
          {subSections.map(({ key, label, locked }) => (
            <button
              key={key}
              onClick={() => { 
                if (!locked) { 
                  setActiveSidebarCategory(key); 
                  playSfx("laser_success"); 
                } else { 
                  triggerNotification(`🔒 ${label}: PRÓXIMAMENTE EN GALAXYDUST`); 
                } 
              }}
              className={`w-full py-1.5 px-2.5 text-left font-sans text-[9px] font-extrabold uppercase tracking-widest rounded-xl transition-all border flex items-center justify-between cursor-pointer ${
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
                    {modsEnabled ? "NO HAY NAVES EN VUELO REGISTRADAS" : "NO HAY ASSETS DISPONIBLES EN ESTE SECTOR"}
                  </div>
                ) : (
                  getFilteredCharacters.map((char, idx) => {
                    const uniqueKey = `${char.category || 'asset'}-${char.id}-${idx}`;
                    return (
                      <div
                        key={uniqueKey}
                        onClick={() => { playSfx(char.sound); setSelectedChar(char); }}
                        className="flex flex-col items-center justify-between relative group cursor-pointer transition-all duration-200 select-none p-2 rounded-xl border border-cyan-900/50 bg-[#070c12] hover:bg-[#0c1620] hover:border-cyan-400/80 shadow-lg text-center h-fit w-full"
                      >
                        <div className="relative w-full aspect-square rounded-lg border border-cyan-800/80 bg-black overflow-hidden mb-1 group-hover:scale-[1.02] transition-transform">
                          {char.is_in_flight && (
                            <div className="absolute inset-0 border-2 border-dashed border-red-500 animate-[spin_5s_linear_infinite] pointer-events-none z-20 rounded-lg" />
                          )}

                          {/* 🎯 CÁRGADOR DE IMAGEN CON FALLBACK AUTOMÁTICO */}
                          <img
                            src={resolveImageUrl(char.avatar_url || (char as any).image_url)}
                            alt={char.name}
                            className={`w-full h-full object-cover ${!char.unlocked ? "grayscale opacity-50 brightness-50" : ""}`}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
                            }}
                          />

                          {char.is_in_flight && (
                            <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-red-950/90 border border-red-500 text-red-400 font-mono font-black text-[6.5px] shadow z-30 uppercase tracking-widest animate-pulse">
                              EN VUELO
                            </div>
                          )}

                          {char.unlocked && (
                            <div className="absolute top-1 right-1 px-1 py-0.5 rounded bg-cyan-950/90 border border-cyan-400 text-cyan-300 font-mono font-black text-[7px] shadow z-30">
                              x{char.quantity || 1}
                            </div>
                          )}
                          {char.level > 1 && (
                            <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/80 border border-amber-500/60 text-amber-400 font-mono font-black text-[6.5px] z-30">
                              LVL {char.level}
                            </div>
                          )}
                          {!char.unlocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
                              <Lock className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_8px_cyan]" />
                            </div>
                          )}
                        </div>

                        <div className="w-full truncate text-[9px] text-[#e8f1f5] font-extrabold uppercase mb-0.5 flex items-center justify-center gap-1">
                          <span className="truncate">{char.name}</span>
                          {char.favorite && <span className="text-amber-400 text-[8.5px] shrink-0">★</span>}
                        </div>

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

              <div className="flex justify-between items-start border-b border-cyan-950 pb-3 mb-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[7.5px] font-mono text-cyan-400 font-extrabold uppercase bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
                      {getItemCategory(selectedChar).toUpperCase()} ASSET
                    </span>
                    <button onClick={(e) => handleToggleFavorite(selectedChar, e)} className="text-amber-400 hover:scale-110 transition-transform font-mono text-[9px] font-bold cursor-pointer">
                      {selectedChar.favorite ? "★ FAVORITO" : "☆ FAVORITO"}
                    </button>
                  </div>
                  <h3 className="text-md font-black text-white tracking-widest mt-1 uppercase">{selectedChar.name}</h3>
                </div>
                <button onClick={() => setSelectedChar(null)} className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 hover:text-white font-bold cursor-pointer flex items-center justify-center">✕</button>
              </div>

              {selectedChar.is_in_flight && (
                <div className="p-2 bg-red-950/60 border border-red-500/80 rounded-xl flex items-center justify-between gap-2 text-red-300 text-[8.5px] mb-3 font-mono relative z-10">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-400 animate-pulse shrink-0" />
                    <span className="font-bold uppercase tracking-wider">
                      ACTIVO EN VUELO EN ESPACIO EXTERIOR. RESTRICCIÓN TÁCTICA DE EQUIPAMIENTO ACTIVA.
                    </span>
                  </div>
                </div>
              )}

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
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 relative z-10">
                  <div className="md:col-span-4 flex flex-col items-center gap-3 bg-black/40 border border-cyan-950 p-3.5 rounded-2xl text-center h-fit">
                    <div className="relative w-24 h-28 aspect-square rounded-xl border-2 border-cyan-400 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                      <img 
                        src={resolveImageUrl(selectedChar.avatar_url || (selectedChar as any).image_url)} 
                        alt={selectedChar.name} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
                        }}
                      />
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

                  <div className="md:col-span-8 flex flex-col justify-start gap-2.5 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="bg-black/50 border border-cyan-950 p-2.5 rounded-xl">
                      <span className="text-[7.5px] font-mono tracking-widest text-cyan-400 font-bold uppercase block mb-1">// DESCRIPCIÓN DEL ACTIVO</span>
                      <p className="text-[9px] font-sans text-zinc-300 leading-relaxed uppercase">{selectedChar.description || "Sin descripción disponible."}</p>
                    </div>

                    {getItemCategory(selectedChar) === 'Spaceships' ? (
                      <>
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

              <div className="border-t border-cyan-950/80 pt-3 mt-3 flex justify-between items-center gap-2.5 relative z-10">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSkillsPopup(true)}
                    className="px-3.5 py-1.5 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/50 text-purple-300 rounded-xl text-[8.5px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.3)] flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    [SKILLS]
                  </button>

                  {getItemCategory(selectedChar) === 'Spaceships' && showSubModal === null && !selectedChar.is_in_flight && (
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
              className="w-full max-w-md bg-[#080d14] border-2 border-purple-500/60 rounded-3xl p-5 relative overflow-hidden shadow-[0_0_60px_rgba(168,85,247,0.3)] text-left font-mono text-white"
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
                  className="w-6 h-6 rounded-full bg-purple-950 border border-purple-800 text-purple-300 hover:text-white font-bold cursor-pointer flex items-center justify-center"
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

export default InventoryView;