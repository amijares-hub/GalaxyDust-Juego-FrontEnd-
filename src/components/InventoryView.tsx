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
  Check,
  Square,
  Layers,
  Sparkles
} from "lucide-react";
import { Button } from "./ui/joly-button";
import { fetchAllInventory, InventoryItem } from "../lib/inventoryService";
import { FleetManager } from "./FleetManager";

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

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await fetchAllInventory();
        setCharacters(data);
      } catch (error) {
        triggerNotification("FALLO AL SINCRONIZAR NÚCLEO DE INVENTARIOS");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const playSfx = (soundName: string) => {
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
    } else if (activeSidebarCategory === "Lightspeed") {
      list = list.filter((c) => c.unlocked && c.stars >= 5);
    } else if (activeSidebarCategory !== "All") {
      // Map sidebar labels to DB categories
      const categoryMap: Record<string, string> = {
        "Ships":       "Spaceships",
        "Spaceships":  "Spaceships",
        "Structures":  "Structures",
        "Tecnology":   "Tecnology",
        "Badges":      "Badges",
        "Squads":      "Spaceships",
        "Fleets":      "Spaceships",
        "Journey Guide": "Badges",
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

  const handleUpgradeLevel = (char: InventoryItem, e: React.MouseEvent) => {
    if (!char.unlocked) return;
    const cost = Math.round(char.level * 450);
    if (playerGold < cost && setPlayerGold) {
      triggerNotification("⚠️ SALDO DE GD COINS INSUFICIENTE PARA DESARROLLAR", e);
      return;
    }
    if (setPlayerGold) {
      setPlayerGold(prev => parseFloat((prev - cost).toFixed(2)));
    }
    const updated = characters.map((c) => {
      if (c.id === char.id) {
        const nextLevel = c.level + 1;
        setPlayerPower((prev) => prev + Math.round(nextLevel * 18));
        return { ...c, level: nextLevel, hp: c.hp + 200, defense: c.defense + 5, speed: c.speed + 2 };
      }
      return c;
    });
    setCharacters(updated);
    playSfx("laser_success");
    triggerNotification(`⬆️ INDUSTRIAL: MEJORADO AL NIVEL ${char.level + 1}!`, e);
    setSelectedChar(updated.find((c) => c.id === char.id) || null);
  };

  const handleBuyBlueprints = (char: InventoryItem, e: React.MouseEvent) => {
    if (playerGems < 85) {
      triggerNotification("⚠️ RECARGA ENERGÉTICA RECHAZADA [85 CRISTALES REQUERIDOS]", e);
      return;
    }
    setPlayerGems((prev) => prev - 85);
    const updated = characters.map((c) => {
      if (c.id === char.id) return { ...c, blueprints_owned: c.blueprints_owned + 5 };
      return c;
    });
    setCharacters(updated);
    playSfx("laser_success");
    triggerNotification(`🧬 PLANOS COMPILADOS: +5 BLUEPRINTS DE ${char.name.toUpperCase()}`, e);
    setSelectedChar(updated.find((c) => c.id === char.id) || null);
  };

  const handleActivateCharacter = (char: InventoryItem, e: React.MouseEvent) => {
    if (char.blueprints_owned < char.blueprints_required) {
      triggerNotification("⚠️ PLANOS ESTRUCTURALES INCOMPLETOS", e);
      return;
    }
    const updated = characters.map((c) => {
      if (c.id === char.id) return { ...c, unlocked: true, level: 1, stars: 1, blueprints_owned: c.blueprints_owned - c.blueprints_required, blueprints_required: 15 };
      return c;
    });
    setCharacters(updated);
    setPlayerPower((prev) => prev + 1200);
    playSfx("heavy_laser");
    triggerNotification(`🔥 DESPLIEGUE COMPLETO: ${char.name.toUpperCase()} ENSAMBLADO EN EL HANGAR`, e);
    setSelectedChar(updated.find((c) => c.id === char.id) || null);
  };

  const handlePromoteStars = (char: InventoryItem, e: React.MouseEvent) => {
    if (!char.unlocked || char.stars >= 7) return;
    if (char.blueprints_owned < char.blueprints_required) {
      triggerNotification("⚠️ MATERIAL DE MATRIZ INSUFICIENTE PARA ASCENSO", e);
      return;
    }
    const nextScale = [15, 25, 40, 65, 80, 100, 0];
    const updated = characters.map((c) => {
      if (c.id === char.id) return { ...c, stars: Math.min(7, c.stars + 1), blueprints_owned: c.blueprints_owned - c.blueprints_required, blueprints_required: nextScale[c.stars] || 0 };
      return c;
    });
    setCharacters(updated);
    setPlayerPower((prev) => prev + 2500);
    playSfx("heavy_laser");
    triggerNotification(`⭐ CRONOS: ACTIVO ASCENDIDO A RANGO ${char.stars + 1}`, e);
    setSelectedChar(updated.find((c) => c.id === char.id) || null);
  };

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

  const handleLightspeedInstantUnlock = (e: React.MouseEvent) => {
    const cost = 299;
    if (playerGems < cost) {
      triggerNotification("⚠️ DIAL ENERGÉTICO INSUFICIENTE (299💎)", e);
      playSfx("laser_click");
      return;
    }
    setPlayerGems((prev) => prev - cost);
    const updated = characters.map((c) => {
      if (!c.unlocked) return { ...c, unlocked: true, stars: Math.max(c.stars, 3), level: Math.max(c.level, 5) };
      return c;
    });
    setCharacters(updated);
    setPlayerPower((prev) => prev + 24500);
    playSfx("heavy_laser");
    triggerNotification("🚀 TOKENS LIGHTSPEED ACTIVOS: ¡ACTIVOS DESBLOQUEADOS AL INSTANTE!", e);
  };

  // Sidebar section definitions
  const topSections = [
    { key: "All",      label: "ALL" },
    { key: "Favorites", label: "FAVORITES" },
    { key: "Lightspeed", label: "ELITE GUILDS" },
  ];

  const subSections = [
    { key: "Fleets",        label: "FLEETS",         locked: false },
    { key: "Spaceships",    label: "SPACESHIPS",     locked: false },
    { key: "Structures",    label: "STRUCTURES",     locked: false },
    { key: "Defense",       label: "DEFENSE",        locked: false },
    { key: "Astrobots",     label: "ASTROBOTS",      locked: false },
    { key: "Tecnology",     label: "TECHNOLOGIES",   locked: false },
    { key: "Blueprints",    label: "BLUEPRINTS",     locked: false },
    { key: "Badges",        label: "BADGES",         locked: false },
    { key: "Licencia",      label: "LICENCIA",       locked: false },
    { key: "Tools",         label: "TOOLS",          locked: false },
    { key: "Consumibles",   label: "CONSUMIBLES",    locked: false },
  ];

  return (
    <div
      id="swgoh-inventory-screen"
      className="relative w-full max-w-6xl mx-auto bg-black text-white rounded-3xl border border-cyan-500/20 overflow-hidden font-sans select-none shadow-[0_0_40px_rgba(6,182,212,0.1)] p-4 sm:p-6"
    >
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/[0.04] rounded-full blur-3xl pointer-events-none" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between border-b-2 border-cyan-800/25 pb-3 mb-4 gap-4 relative">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-950 to-neutral-900 border-2 border-cyan-400 text-white flex items-center justify-center hover:bg-cyan-900 transition-all cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.3)] hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6 text-cyan-300 drop-shadow-[0_0_3px_cyan]" />
          </button>
          <div className="text-left">
            <h2 className="text-xl font-bold tracking-widest text-[#e8f1f5] uppercase font-sans flex items-center gap-2">
              INVENTORY
              <span className="text-[9px] bg-red-600/95 font-mono text-white px-2 py-0.5 rounded-full border border-red-500/30">
                ACTIVE TAC-NET
              </span>
            </h2>
            <p className="text-[10px] font-medium tracking-wide text-cyan-400 uppercase mt-0.5">
              Tap portraits to research and upgrade
            </p>
          </div>
        </div>

        <div id="inventory-gal-power" className="flex items-center gap-4">
          <div className="bg-[#0b1016]/80 border border-cyan-600/30 rounded-xl px-4 py-1.5 flex flex-col items-center">
            <span className="text-[8px] font-mono tracking-widest text-zinc-400 uppercase">GALACTIC POWER</span>
            <span className="text-sm font-black text-emerald-400 tracking-wider">{playerPower.toLocaleString()} POW</span>
          </div>
          <button
            onClick={onBack}
            className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-950 to-neutral-900 border border-cyan-500/30 text-white flex items-center justify-center hover:bg-cyan-900 transition-all cursor-pointer relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-cyan-300 drop-shadow-[0_0_4px_cyan]">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <div className="absolute -top-1 -right-1 bg-red-600 text-[8px] font-extrabold w-4 h-4 rounded-full border border-black flex items-center justify-center text-white shadow-lg">1</div>
          </button>
        </div>
      </div>

      {/* FILTER ROW */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0f14]/85 border border-cyan-900/35 px-4 py-2.5 rounded-2xl mb-4 relative">
        <div className="flex flex-wrap items-center gap-3">

          {/* Dropdown 1 — Raridades */}
          <div className="relative">
            <button
              onClick={() => { setShowFilter1Modal(!showFilter1Modal); setShowFilter2Modal(false); }}
              className="px-4 py-1.5 bg-[#0b212f]/80 border-t-2 border-b border-r border-l border-cyan-400/80 rounded-md text-[9px] font-mono tracking-widest text-white uppercase flex items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-cyan-950/60 shadow-[inset_0_1px_4px_rgba(34,211,238,0.25)] min-w-[155px]"
            >
              <span>{filterDropdown1}</span>
              <ChevronDown className="w-3 h-3 text-cyan-400 stroke-[3]" />
            </button>
            <AnimatePresence>
              {showFilter1Modal && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                  className="absolute left-0 mt-1 w-48 bg-[#04080b] border-2 border-cyan-500/40 rounded-xl shadow-2xl z-50 p-1 divide-y divide-cyan-950"
                >
                  {["ALL CLASES", "CLASES: COMMON", "CLASES: UNCOMMON", "CLASES: RARE", "CLASES: EPIC", "CLASES: LEGENDARY"].map((opt) => (
                    <button key={opt} onClick={() => { setFilterDropdown1(opt); setShowFilter1Modal(false); playSfx("laser_success"); }}
                      className="w-full text-left px-3 py-2 text-[8px] font-mono uppercase tracking-wider text-cyan-300 hover:bg-cyan-950/50 hover:text-white transition-colors"
                    >{opt}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dropdown 2 — Facciones */}
          <div className="relative">
            <button
              onClick={() => { setShowFilter2Modal(!showFilter2Modal); setShowFilter1Modal(false); }}
              className="px-4 py-1.5 bg-[#0b212f]/80 border-t-2 border-b border-r border-l border-cyan-400/80 rounded-md text-[9px] font-mono tracking-widest text-white uppercase flex items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-cyan-950/60 shadow-[inset_0_1px_4px_rgba(34,211,238,0.25)] min-w-[155px]"
            >
              <span>{filterDropdown2}</span>
              <ChevronDown className="w-3.5 h-3 text-cyan-400 stroke-[3]" />
            </button>
            <AnimatePresence>
              {showFilter2Modal && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                  className="absolute left-0 mt-1 w-48 bg-[#04080b] border-2 border-cyan-500/40 rounded-xl shadow-2xl z-50 p-1"
                >
                  {["TODOS LOS FILTROS", "FACCIÓN: NOVA", "FACCIÓN: GD I", "FACCIÓN: OSIRIS", "FACCIÓN: MYTON", "FACCIÓN: ALACRAN", "FACCIÓN: ZEPPELIN"].map((opt) => (
                    <button key={opt} onClick={() => { setFilterDropdown2(opt); setShowFilter2Modal(false); playSfx("laser_success"); }}
                      className="w-full text-left px-3 py-2 text-[8px] font-mono uppercase tracking-wider text-cyan-300 hover:bg-cyan-950/50 hover:text-white transition-colors border-b border-cyan-900/40 last:border-0"
                    >{opt}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Flotas en Vuelo checkbox */}
          <button
            onClick={() => { setModsEnabled(!modsEnabled); triggerNotification(modsEnabled ? "🔴 FILTRO APAGADO" : "🟢 MOSTRANDO FLOTAS EN VUELO"); }}
            className="flex items-center gap-2 hover:opacity-90 select-none cursor-pointer"
          >
            <div className="w-5 h-5 border border-cyan-500 rounded flex items-center justify-center bg-black">
              {modsEnabled && <div className="w-2.5 h-2.5 bg-cyan-400 shadow-[0_0_8px_cyan]" />}
            </div>
            <span className="text-[9px] font-mono text-zinc-300 tracking-widest uppercase">FLOTAS EN VUELO</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-48 ml-auto">
          <Search className="absolute left-2 top-2 w-3 h-3 text-cyan-500" />
          <input
            type="text"
            placeholder="BUSCAR COMPAÑERO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border border-cyan-900/60 rounded-lg pl-7 pr-3 py-1 text-[8.5px] font-mono tracking-wider text-cyan-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/20 uppercase"
          />
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* LEFT SIDEBAR */}
        <div className="lg:col-span-3 flex flex-col gap-2 relative">

          {/* SUB SECTIONS */}
          {subSections.map(({ key, label, locked }) => (
            <button
              key={key}
              onClick={() => { if (!locked) { setActiveSidebarCategory(key); playSfx("laser_success"); } else { triggerNotification(`🔒 ${label}: PRÓXIMAMENTE EN GALAXYDUST`); } }}
              className={`w-full py-2.5 px-4 text-left font-sans text-[10px] font-extrabold uppercase tracking-widest rounded-xl transition-all border flex items-center justify-between ${
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

          {/* LIGHTSPEED PACK BANNER */}
          <div className="bg-gradient-to-b from-red-950 to-neutral-950 border border-red-600/30 rounded-2xl p-4 text-center mt-2 relative overflow-hidden shadow-[0_5px_15px_rgba(239,68,68,0.15)]">
            <div className="absolute top-0 inset-x-0 h-1 bg-red-600 animate-pulse" />
            <h4 className="text-[11px] font-sans font-black tracking-widest text-[#ffd384] uppercase">🚀 LIGHTSPEED PACK</h4>
            <p className="text-[8px] font-mono leading-relaxed text-zinc-400 uppercase mt-1">
              Desbloquea instantáneamente tus activos de flota con tokens de acceso premium.
            </p>
            <button
              onClick={handleLightspeedInstantUnlock}
              className="w-full mt-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-mono text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg active:scale-95 transition-all text-center justify-center flex items-center gap-1.5 cursor-pointer"
            >
              Adquirir Token [299💎]
            </button>
          </div>
        </div>

        {/* RIGHT: CHARACTER GRID */}
        <div className="lg:col-span-9 flex flex-col gap-3">
          {activeSidebarCategory === "Fleets" ? (
            <FleetManager characters={characters} triggerNotification={triggerNotification} />
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">
                  Compañeros Filtrados: {getFilteredCharacters.length} / {characters.length}
                </span>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div
                id="swgoh-characters-grid"
                className="grid grid-cols-2 md:grid-cols-5 gap-y-6 gap-x-3.5 bg-[#030608]/90 border border-cyan-900/25 p-5 sm:p-7 rounded-2xl shadow-inner min-h-[420px] max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900"
              >
                {isLoading ? (
              <div className="col-span-2 md:col-span-5 flex flex-col items-center justify-center h-full gap-4 text-cyan-500 py-20">
                <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-mono tracking-widest uppercase animate-pulse">ESTABLECIENDO ENLACE CON DATA CENTER...</span>
              </div>
            ) : getFilteredCharacters.length === 0 ? (
              <div className="col-span-2 md:col-span-5 flex items-center justify-center h-full text-zinc-500 text-[10px] font-mono uppercase tracking-widest py-20">
                NO HAY ASSETS DISPONIBLES EN ESTE SECTOR
              </div>
            ) : (
              getFilteredCharacters.map((char) => {
                const hasGems = char.blueprints_owned >= char.blueprints_required;
                return (
                  <div
                    key={char.id}
                    onClick={() => { playSfx(char.sound); setSelectedChar(char); }}
                    className="flex flex-col items-center justify-between relative group cursor-pointer transition-all duration-200 select-none pb-2 text-center"
                  >
                    {/* Name */}
                    <div className="w-full truncate text-[9.5px] text-[#e8f1f5] tracking-wide font-sans font-extrabold capitalize mb-1 flex items-center justify-center gap-1">
                      <span className="truncate">{char.name}</span>
                      {char.favorite && <span className="text-amber-400 text-[10px] shrink-0">★</span>}
                    </div>

                    {/* Portrait */}
                    <div className="relative w-[76px] h-[76px] shrink-0">
                      <div className="absolute inset-0 rounded-full border-[3px] border-cyan-800 bg-neutral-900 shadow-[0_4px_12px_rgba(0,0,0,0.8)] z-10 overflow-hidden group-hover:scale-105 group-hover:brightness-110 active:scale-95 transition-all duration-150">
                        <img
                          src={char.avatar_url}
                          alt={char.name}
                          className={`w-full h-full object-cover transition-transform duration-300 ${!char.unlocked ? "grayscale opacity-50 brightness-50" : ""}`}
                          referrerPolicy="no-referrer"
                        />
                        {!char.unlocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="w-9 h-9 rounded-full bg-cyan-950/80 border border-cyan-400 text-cyan-300 flex items-center justify-center shadow-[0_0_8px_cyan]">
                              <Lock className="w-4 h-4" />
                            </div>
                          </div>
                        )}
                        {modsEnabled && char.unlocked && (
                          <div className="absolute inset-0 border border-dashed border-red-500 animate-[spin_5s_linear_infinite] pointer-events-none" />
                        )}
                      </div>
                      {char.unlocked && (
                        <div className="absolute bottom-[-4px] left-[50%] translate-x-[-50%] w-7 h-7 rounded-full bg-[#1b506f] border border-sky-400 flex items-center justify-center text-white font-black text-[9.5px] z-20 shadow-[0_2px_4px_rgba(0,0,0,0.6)] font-mono leading-none">
                          {char.level}
                        </div>
                      )}
                    </div>

                    {/* Rarity Badge */}
                    <div className="mt-2 flex items-center justify-center">
                      {char.unlocked ? (
                        <span className={`text-[8px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                          char.rarity === 'Legendary' ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' :
                          char.rarity === 'Epic' ? 'text-purple-400 border-purple-500/40 bg-purple-500/10' :
                          char.rarity === 'Rare' ? 'text-sky-400 border-sky-500/40 bg-sky-500/10' :
                          char.rarity === 'Uncommon' ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' :
                          'text-zinc-400 border-zinc-500/40 bg-zinc-500/10'
                        }`}>{char.rarity || 'COMMON'}</span>
                      ) : (
                        <span className="text-[6.5px] font-mono text-zinc-500 uppercase tracking-widest">BLOCKED UNIT</span>
                      )}
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

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedChar && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#070b0f] border-2 border-cyan-400 rounded-3xl p-6 relative overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.25)] text-left"
            >
              <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.015)_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />

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
                <button onClick={() => setSelectedChar(null)} className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 hover:text-white font-bold">✕</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 relative z-10">
                <div className="md:col-span-4 flex flex-col items-center gap-3 bg-black/40 border border-cyan-950 p-4 rounded-2xl text-center">
                  <div className="relative w-20 h-20">
                    <div className="w-full h-full rounded-full border-[3px] border-cyan-400 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                      <img src={selectedChar.avatar_url} alt={selectedChar.name} className="w-full h-full object-cover" />
                    </div>
                    {selectedChar.unlocked && (
                      <div className="absolute bottom-[-4px] left-[50%] translate-x-[-50%] w-7 h-7 rounded-full bg-cyan-900 border border-cyan-400 flex items-center justify-center text-white font-mono font-black text-[9px] shadow-md">{selectedChar.level}</div>
                    )}
                  </div>
                  <div className="flex gap-0.5 justify-center mt-1">
                    {Array.from({ length: 7 }).map((_, idx) => (
                      <Star key={idx} className={`w-[8px] h-[8px] ${idx < selectedChar.stars ? "text-amber-400 fill-amber-400" : "text-gray-700"}`} />
                    ))}
                  </div>
                  <div className="font-mono text-[8px] text-zinc-400 space-y-0.5 w-full text-left">
                    <p>FACTION: <span className="text-cyan-300">{selectedChar.faction}</span></p>
                    <p>RARITY: <span className="text-amber-400">{selectedChar.rarity}</span></p>
                    <p>CATEGORY: <span className="text-purple-400">{selectedChar.category}</span></p>
                  </div>
                </div>

                <div className="md:col-span-8 flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <span className="text-[8px] font-mono tracking-widest text-[#a2d3fc] uppercase block">// TACTICAL PROFILE</span>
                    <p className="text-[10px] font-sans text-zinc-400 leading-normal mb-2 max-h-16 overflow-y-auto uppercase">{selectedChar.description || "No description available."}</p>

                    <div className="grid grid-cols-2 gap-2 font-mono text-[9px]">
                      <div className="bg-black/50 border border-cyan-950 p-2 rounded-lg flex flex-col">
                        <span className="text-zinc-500 text-[7.5px]">INTEGRIDAD ESTRUCTURAL</span>
                        <span className="text-white font-black">{selectedChar.unlocked ? selectedChar.hp : "???"} HP</span>
                      </div>
                      <div className="bg-black/50 border border-cyan-950 p-2 rounded-lg flex flex-col">
                        <span className="text-zinc-500 text-[7.5px]">POTENCIA DE SHIELD</span>
                        <span className="text-purple-400 font-black">{selectedChar.unlocked ? selectedChar.stamina : "???"} SH</span>
                      </div>
                      <div className="bg-black/50 border border-cyan-950 p-2 rounded-lg flex flex-col">
                        <span className="text-zinc-500 text-[7.5px]">PROPULSIÓN IMPULSE</span>
                        <span className="text-amber-400 font-black">{selectedChar.unlocked ? selectedChar.speed : "???"} VEL</span>
                      </div>
                      <div className="bg-black/50 border border-cyan-950 p-2 rounded-lg flex flex-col">
                        <span className="text-zinc-500 text-[7.5px]">ABSORCIÓN DE DEFENSA</span>
                        <span className="text-cyan-400 font-black">{selectedChar.unlocked ? selectedChar.defense : "???"} DEF</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/80 border border-cyan-900/35 p-2.5 rounded-xl font-mono">
                    <div className="flex justify-between text-[8px] mb-1">
                      <span>BLUEPRINTS DISPONIBLES</span>
                      <span>{selectedChar.blueprints_owned}/{selectedChar.blueprints_required}</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-600 to-sky-400" style={{ width: `${Math.min(100, (selectedChar.blueprints_owned / selectedChar.blueprints_required) * 100)}%` }} />
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <button onClick={(e) => handleBuyBlueprints(selectedChar, e)} className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/35 text-cyan-300 rounded-md text-[8px] font-bold uppercase tracking-wider cursor-pointer transition-all">
                        Obtener Planos [85💎]
                      </button>
                      {!selectedChar.unlocked && (
                        <button disabled={selectedChar.blueprints_owned < selectedChar.blueprints_required} onClick={(e) => handleActivateCharacter(selectedChar, e)}
                          className={`px-3 py-1 text-white rounded-md text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${selectedChar.blueprints_owned < selectedChar.blueprints_required ? "bg-zinc-800 opacity-30 cursor-not-allowed" : "bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)]"}`}
                        >FABRICAR COMPONENTE</button>
                      )}
                      {selectedChar.unlocked && selectedChar.stars < 7 && (
                        <button disabled={selectedChar.blueprints_owned < selectedChar.blueprints_required} onClick={(e) => handlePromoteStars(selectedChar, e)}
                          className={`px-3 py-1 rounded-md text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${selectedChar.blueprints_owned < selectedChar.blueprints_required ? "bg-zinc-800 opacity-30 cursor-not-allowed" : "bg-amber-500 text-neutral-900 shadow-[0_0_10px_rgba(245,158,11,0.5)]"}`}
                        >ASCENDER RANGO</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-cyan-950/80 pt-4 mt-5 flex justify-end gap-2.5 relative z-10">
                <Button variant="secondary" size="sm" onClick={() => setSelectedChar(null)} className="text-[9px] font-mono font-bold">CERRAR EXPEDIENTE</Button>
                {selectedChar.unlocked && (
                  <button onClick={(e) => handleUpgradeLevel(selectedChar, e)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[9px] font-mono font-black uppercase tracking-wider shadow-lg hover:scale-105 transition-transform">
                    Optimizar Core [-{selectedChar.level * 450} GD Coin]
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};