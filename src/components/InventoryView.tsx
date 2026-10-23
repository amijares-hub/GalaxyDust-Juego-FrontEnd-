import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { GalaxyFrame } from "./CanView";

export type { InventoryItem } from "../hooks/useInventory";

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

// 🎯 DETERMINA DE MANERA STRICTA LA CATEGORÍA BASÁNDOSE EN CAMPOS DE BD Y NO EN PALABRAS DEL NOMBRE
const getItemCategory = (item: InventoryItem): string => {
  const cat = String(item.category || "").toLowerCase().trim();
  const type = String((item as any).type || "").toLowerCase().trim();

  if (cat === "fleets" || cat === "fleet" || (item as any).is_fleet) return "Fleets";

  if (
    ["spaceships", "spaceship", "ships", "ship", "naves", "nave"].includes(cat) ||
    ["spaceships", "spaceship", "ships", "ship", "naves", "nave"].includes(type)
  ) {
    return "Spaceships";
  }

  if (
    ["structures", "structure", "estructura", "estructuras"].includes(cat) ||
    ["structures", "structure", "estructura", "estructuras"].includes(type)
  ) {
    return "Structures";
  }

  if (
    ["defense", "defenses", "defensa", "defensas"].includes(cat) ||
    ["defense", "defenses", "defensa", "defensas"].includes(type)
  ) {
    return "Defense";
  }

  if (
    ["astrobots", "astrobot", "robot", "robots"].includes(cat) ||
    ["astrobots", "astrobot", "robot", "robots"].includes(type)
  ) {
    return "Astrobots";
  }

  if (
    ["tecnology", "technology", "technologies", "tech", "tecnologia", "tecnología"].includes(cat) ||
    ["tecnology", "technology", "technologies", "tech", "tecnologia", "tecnología"].includes(type)
  ) {
    return "Tecnology";
  }

  if (
    ["blueprints", "blueprint", "plano", "planos"].includes(cat) ||
    ["blueprints", "blueprint", "plano", "planos"].includes(type)
  ) {
    return "Blueprints";
  }

  if (
    ["badges", "badge", "insignia", "insignias"].includes(cat) ||
    ["badges", "badge", "insignia", "insignias"].includes(type)
  ) {
    return "Badges";
  }

  if (
    ["licencia", "license", "licenses", "licencias"].includes(cat) ||
    ["licencia", "license", "licenses", "licencias"].includes(type)
  ) {
    return "Licencia";
  }

  if (
    ["tools", "tool", "herramientas", "herramienta"].includes(cat) ||
    ["tools", "tool", "herramientas", "herramienta"].includes(type)
  ) {
    return "Tools";
  }

  if (
    ["consumibles", "consumables", "consumable"].includes(cat) ||
    ["consumibles", "consumables", "consumable"].includes(type)
  ) {
    return "Consumibles";
  }

  // Fallback por cadena de categoría aislada
  if (cat) {
    if (cat.includes("ship") || cat.includes("nave")) return "Spaceships";
    if (cat.includes("struct") || cat.includes("estruct")) return "Structures";
    if (cat.includes("defen")) return "Defense";
    if (cat.includes("bot") || cat.includes("robot")) return "Astrobots";
    if (cat.includes("tech") || cat.includes("tecno")) return "Tecnology";
    if (cat.includes("print") || cat.includes("plano")) return "Blueprints";
    if (cat.includes("badge") || cat.includes("insign")) return "Badges";
    if (cat.includes("licen")) return "Licencia";
    if (cat.includes("tool") || cat.includes("herram")) return "Tools";
    if (cat.includes("consum")) return "Consumibles";
  }

  return "Spaceships";
};

const matchInventoryCategory = (item: InventoryItem, selectedSidebarKey: string): boolean => {
  if (!selectedSidebarKey || selectedSidebarKey === "All") return true;
  if (selectedSidebarKey === "Favorites") return Boolean(item.favorite);

  const determinedCategory = getItemCategory(item);
  return determinedCategory.toLowerCase() === selectedSidebarKey.toLowerCase();
};

interface AssetCardProps {
  asset: {
    id: string;
    name: string;
    image: string;
    rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'EXCLUSIVE';
    quantity: number;
    category?: string;
    power?: number;
    isInFlight?: boolean;
    unlocked?: boolean;
    level?: number;
    favorite?: boolean;
  };
  isSelected?: boolean;
  onClick?: () => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, isSelected, onClick }) => {
  // Esquema de color según rareza
  const rarity = (asset.rarity?.toUpperCase() || 'COMMON') as 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'EXCLUSIVE';
  const rarityStyles: Record<string, string> = {
    COMMON: 'border-slate-500/40 text-slate-300 shadow-cyan-950/20',
    RARE: 'border-cyan-500/50 text-cyan-400 shadow-cyan-500/20',
    EPIC: 'border-purple-500/60 text-purple-400 shadow-purple-500/30',
    LEGENDARY: 'border-amber-500/70 text-amber-400 shadow-amber-500/30',
    EXCLUSIVE: 'border-rose-500/70 text-rose-400 shadow-rose-500/30',
  };
  const activeStyle = rarityStyles[rarity] || rarityStyles.COMMON;

  return (
    <div
      onClick={onClick}
      className={`
        group relative aspect-[3/4] min-h-[130px] sm:min-h-[150px] rounded-md overflow-hidden cursor-pointer select-none
        bg-gradient-to-b from-[#0b1320] via-[#05080e] to-[#020408]
        border transition-all duration-200 transform-gpu
        hover:scale-[1.03] hover:z-10
        ${isSelected ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] ring-1 ring-cyan-400' : activeStyle}
        hud-corners
      `}
    >
      {/* 1. Header de la Tarjeta: Categoría y Cantidad */}
      <div className="absolute top-0 inset-x-0 p-1.5 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <span className="text-[8px] font-mono tracking-wider uppercase text-cyan-400/80 font-bold truncate max-w-[65%]">
          {asset.category || 'ASSET'}
        </span>
        <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-black/90 border border-cyan-500/40 text-cyan-300 shadow">
          x{asset.quantity || 1}
        </span>
      </div>

      {/* 2. Visual del Activo: Imagen con Resplandor Holográfico */}
      <div className="w-full h-full p-2 flex items-center justify-center relative overflow-hidden">
        {/* Resplandor radial de fondo */}
        <div className="absolute inset-0 bg-radial from-cyan-500/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
        
        <img
          src={asset.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200'}
          alt={asset.name}
          className={`w-full h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] group-hover:scale-110 group-hover:drop-shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all duration-300 ${asset.unlocked === false ? "grayscale opacity-50 brightness-50" : ""}`}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
          }}
        />

        {asset.isInFlight && (
          <div className="absolute top-7 left-1.5 px-1 py-0.5 rounded bg-red-950/90 border border-red-500 text-red-400 font-mono font-black text-[6.5px] z-20 uppercase tracking-widest animate-pulse">
            EN VUELO
          </div>
        )}

        {asset.level && asset.level > 1 && (
          <div className="absolute top-7 right-1.5 px-1 py-0.5 rounded bg-black/80 border border-amber-500/50 text-amber-300 font-mono font-black text-[7px] z-20">
            LVL {asset.level}
          </div>
        )}

        {asset.unlocked === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
            <Lock className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_cyan]" />
          </div>
        )}
      </div>

      {/* 3. Pie de la Tarjeta: Nombre y Rareza */}
      <div className="absolute bottom-0 inset-x-0 p-1.5 z-10 bg-gradient-to-t from-[#020408] via-[#05080e]/95 to-transparent border-t border-cyan-500/15">
        <p className="text-[10px] sm:text-[11px] font-mono font-bold text-white truncate group-hover:text-cyan-300 transition-colors flex items-center justify-between">
          <span className="truncate">{asset.name}</span>
          {asset.favorite && <span className="text-amber-400 text-[9px] shrink-0">★</span>}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[8px] font-mono tracking-widest uppercase font-semibold text-cyan-400/70 truncate">
            {asset.rarity || 'STANDARD'}
          </span>
          {asset.power ? (
            <span className="text-[8px] font-mono text-amber-400 font-bold shrink-0">
              ⚡ {asset.power} POW
            </span>
          ) : null}
        </div>
      </div>

      {/* Línea de escaneo láser en hover */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-cyan-400 opacity-0 group-hover:opacity-100 group-hover:animate-pulse pointer-events-none transition-opacity" />
    </div>
  );
};

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
  const { items: characters, loading: isLoading, error: loadError, refreshInventory, toggleFavorite: toggleFav } = useInventory();
  const { playSfx } = useAudioEngine();
  const { t } = useTranslation();

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

    // 🎯 FILTRO ANTI-MOCKDATA: Elimina licencias sintéticas o no enlazadas con UUID en el nombre
    list = list.filter((c) => {
      const cat = getItemCategory(c);
      if (cat === "Licencia") {
        const nameUpper = String(c.name || "").trim().toUpperCase();
        if (/^LICENCIA\s*#[0-9A-F-]{10,}$/i.test(nameUpper) && !(c as any).has_real_seed) {
          return false;
        }
      }
      return true;
    });

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
    { key: "All", labelKey: "inventory.categories.all", fallbackLabel: "TODOS LOS ACTIVOS", locked: false },
    { key: "Fleets", labelKey: "inventory.categories.fleets", fallbackLabel: "FLEETS (FLOTAS)", locked: false },
    { key: "Spaceships", labelKey: "inventory.categories.spaceships", fallbackLabel: "SPACESHIPS (NAVES)", locked: false },
    { key: "Structures", labelKey: "inventory.categories.structures", fallbackLabel: "STRUCTURES (ESTRUCTURAS)", locked: false },
    { key: "Defense", labelKey: "inventory.categories.defense", fallbackLabel: "DEFENSE (DEFENSA)", locked: false },
    { key: "Astrobots", labelKey: "inventory.categories.astrobots", fallbackLabel: "ASTROBOTS", locked: false },
    { key: "Tecnology", labelKey: "inventory.categories.technology", fallbackLabel: "TECHNOLOGIES", locked: false },
    { key: "Blueprints", labelKey: "inventory.categories.blueprints", fallbackLabel: "BLUEPRINTS", locked: false },
    { key: "Badges", labelKey: "inventory.categories.badges", fallbackLabel: "BADGES", locked: false },
    { key: "Licencia", labelKey: "inventory.categories.license", fallbackLabel: "LICENCIA", locked: false },
    { key: "Tools", labelKey: "inventory.categories.tools", fallbackLabel: "TOOLS (HERRAMIENTAS)", locked: false },
    { key: "Consumibles", labelKey: "inventory.categories.consumables", fallbackLabel: "CONSUMIBLES", locked: false },
  ];

  return (
    <div className="w-full h-[calc(100dvh-var(--header-height,2.75rem))] grid grid-cols-12 gap-2 p-2 sm:p-3 overflow-hidden select-none font-mono text-white">
      
      {/* ── 1. COLUMNA IZQUIERDA: SIDEBAR DE NAVEGACIÓN TÁCTICA (col-span-3 sm:col-span-3) ── */}
      <div className="col-span-3 sm:col-span-3 hud-panel hud-corners flex flex-col justify-between p-2 h-full overflow-hidden min-h-0 bg-[#05080c]/90 border border-cyan-500/30 rounded-xl shadow-xl">
        
        {/* Cabecera del Sidebar */}
        <div className="shrink-0 mb-1 border-b border-cyan-500/20 pb-1.5">
          <button
            onClick={onBack}
            className="text-xs font-mono font-bold text-cyan-400 hover:text-white flex items-center gap-1 mb-2 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{t('inventory.title')}</span>
          </button>

          <div className="text-[9px] sm:text-[10px] font-mono text-zinc-400 bg-black/60 border border-cyan-900/50 rounded px-2 py-1 flex items-center justify-between">
            <span className="uppercase">{t('inventory.galactic_power')}:</span>
            <span className="text-emerald-400 font-black">{playerPower.toLocaleString()} POW</span>
          </div>
        </div>

        {/* Menú de Categorías (Vertical, scroll si hace falta) */}
        <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-y-auto no-scrollbar py-1 pr-0.5">
          {subSections.map(({ key, labelKey, fallbackLabel, locked }) => {
            const isActive = activeSidebarCategory === key;
            const label = t(labelKey, fallbackLabel);
            return (
              <button
                key={key}
                onClick={() => {
                  if (!locked) {
                    setActiveSidebarCategory(key);
                    playSfx("laser_success");
                  } else {
                    triggerNotification(`🔒 ${label}: PRÓXIMAMENTE`);
                  }
                }}
                className={`w-full text-left px-2 sm:px-2.5 py-1.5 rounded text-[9.5px] sm:text-xs font-mono tracking-wider uppercase transition-all flex items-center justify-between cursor-pointer ${
                  isActive
                    ? "bg-cyan-500/20 border-l-2 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    : locked
                      ? "bg-[#0a0f13]/40 border-l-2 border-transparent text-zinc-600 cursor-default"
                      : "bg-black/40 hover:bg-cyan-950/30 text-cyan-200/60 hover:text-cyan-300 border-l-2 border-transparent"
                }`}
              >
                <span className="truncate">{label}</span>
                {locked && <Lock className="w-3 h-3 text-zinc-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Pie del Sidebar */}
        <div className="shrink-0 border-t border-cyan-500/20 pt-1.5 text-[10px] text-cyan-400/70 font-mono tracking-wider uppercase truncate">
          FILTERED ASSETS: {getFilteredCharacters.length} / {characters.length}
        </div>
      </div>

      {/* ── 2. COLUMNA DERECHA: VENTANA PRINCIPAL DE ACTIVOS (col-span-9 sm:col-span-9) ── */}
      <div className="col-span-9 sm:col-span-9 hud-panel hud-corners flex flex-col h-full min-h-0 p-2 overflow-hidden bg-[#05080c]/80 border border-cyan-500/30 rounded-xl shadow-xl">
        
        {/* Barra Superior de Filtros y Búsqueda (Fija, shrink-0) */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-2 pb-1.5 border-b border-cyan-500/20 text-xs shrink-0 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5">
            {/* Dropdown 1: Clases */}
            <div className="relative">
              <button
                onClick={() => { setShowFilter1Modal(!showFilter1Modal); setShowFilter2Modal(false); }}
                className="px-2 py-1 bg-[#0b212f]/80 border border-cyan-400/80 rounded text-[8px] sm:text-[9px] font-mono tracking-wider text-white uppercase flex items-center justify-between gap-1 cursor-pointer select-none transition-colors hover:bg-cyan-950/60 shadow-[inset_0_1px_4px_rgba(34,211,238,0.25)] min-w-[95px] sm:min-w-[115px]"
              >
                <span className="truncate">{filterDropdown1}</span>
                <ChevronDown className="w-3 h-3 text-cyan-400 stroke-[3] shrink-0" />
              </button>
              <AnimatePresence>
                {showFilter1Modal && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 mt-1 w-40 bg-[#04080b] border-2 border-cyan-500/40 rounded-xl shadow-2xl z-50 p-1 divide-y divide-cyan-950"
                  >
                    {["ALL CLASES", "CLASES: COMMON", "CLASES: UNCOMMON", "CLASES: RARE", "CLASES: EPIC", "CLASES: LEGENDARY"].map((opt) => (
                      <button key={opt} onClick={() => { setFilterDropdown1(opt); setShowFilter1Modal(false); playSfx("laser_success"); }}
                        className="w-full text-left px-2 py-1 text-[8px] font-mono uppercase tracking-wider text-cyan-300 hover:bg-cyan-950/50 hover:text-white transition-colors cursor-pointer"
                      >{opt}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dropdown 2: Facciones / Filtros */}
            <div className="relative">
              <button
                onClick={() => { setShowFilter2Modal(!showFilter2Modal); setShowFilter1Modal(false); }}
                className="px-2 py-1 bg-[#0b212f]/80 border border-cyan-400/80 rounded text-[8px] sm:text-[9px] font-mono tracking-wider text-white uppercase flex items-center justify-between gap-1 cursor-pointer select-none transition-colors hover:bg-cyan-950/60 shadow-[inset_0_1px_4px_rgba(34,211,238,0.25)] min-w-[95px] sm:min-w-[115px]"
              >
                <span className="truncate">{filterDropdown2}</span>
                <ChevronDown className="w-3 h-3 text-cyan-400 stroke-[3] shrink-0" />
              </button>
              <AnimatePresence>
                {showFilter2Modal && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 mt-1 w-40 bg-[#04080b] border-2 border-cyan-500/40 rounded-xl shadow-2xl z-50 p-1"
                  >
                    {["TODOS LOS FILTROS", "FACCIÓN: NOVA", "FACCIÓN: GD I", "FACCIÓN: OSIRIS", "FACCIÓN: MYTON", "FACCIÓN: ALACRAN", "FACCIÓN: ZEPPELIN"].map((opt) => (
                      <button key={opt} onClick={() => { setFilterDropdown2(opt); setShowFilter2Modal(false); playSfx("laser_success"); }}
                        className="w-full text-left px-2 py-1 text-[8px] font-mono uppercase tracking-wider text-cyan-300 hover:bg-cyan-950/50 hover:text-white transition-colors border-b border-cyan-900/40 last:border-0 cursor-pointer"
                      >{opt}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Checkbox táctico: Fleets in Flight */}
            <button
              onClick={() => { setModsEnabled(!modsEnabled); triggerNotification(modsEnabled ? "🔴 FILTRO APAGADO" : "🟢 MOSTRANDO FLOTAS EN VUELO"); }}
              className="flex items-center gap-1 hover:opacity-90 select-none cursor-pointer px-1.5 py-0.5"
            >
              <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center bg-black ${modsEnabled ? 'border-red-500' : 'border-cyan-500'}`}>
                {modsEnabled && <div className="w-1.5 h-1.5 bg-red-500 shadow-[0_0_8px_#ef4444]" />}
              </div>
              <span className={`text-[8px] font-mono tracking-wider uppercase ${modsEnabled ? 'text-red-400 font-bold' : 'text-zinc-400'}`}>
                {t('inventory.in_flight_filter')}
              </span>
            </button>
          </div>

          {/* Buscador */}
          <div className="relative w-36 sm:w-48 ml-auto">
            <Search className="absolute left-2 top-2 w-3 h-3 text-cyan-500 pointer-events-none" />
            <input
              type="text"
              placeholder={t('inventory.search_placeholder') || 'BUSCAR ACTIVO...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-7 text-xs bg-black/60 border border-cyan-500/30 pl-6 pr-2 rounded font-mono text-cyan-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 uppercase"
            />
          </div>
        </div>

        {/* Galería de Activos (Único área con scroll vertical) */}
        {activeSidebarCategory === "Fleets" ? (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <FleetManager characters={characters} triggerNotification={triggerNotification} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1.5 p-2 grid grid-cols-5 gap-2.5 content-start no-scrollbar">
            {isLoading ? (
              <div className="col-span-5 flex flex-col items-center justify-center h-full gap-2 text-cyan-500 py-12">
                <div className="w-7 h-7 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] font-mono tracking-widest uppercase animate-pulse">{t('inventory.loading')}</span>
              </div>
            ) : getFilteredCharacters.length === 0 ? (
              <div className="col-span-5 flex items-center justify-center h-full text-zinc-500 text-[9px] font-mono uppercase tracking-widest py-12">
                {loadError ? (
                  <span className="text-red-500 font-bold">{loadError}</span>
                ) : (
                  modsEnabled ? t('inventory.empty_no_flight') : t('inventory.empty_no_assets')
                )}
              </div>
            ) : (
              getFilteredCharacters.map((char, idx) => {
                const uniqueKey = `${char.category || 'asset'}-${char.id}-${idx}`;
                const isSelected = selectedChar?.id === char.id;
                const power = char.power || (char as any).combat_power || (char as any).galactic_power || undefined;
                return (
                  <AssetCard
                    key={uniqueKey}
                    isSelected={isSelected}
                    onClick={() => { playSfx(char.sound); setSelectedChar(char); }}
                    asset={{
                      id: char.id,
                      name: char.name,
                      image: resolveImageUrl(char.avatar_url || (char as any).image_url),
                      rarity: (char.rarity?.toUpperCase() || 'COMMON') as any,
                      quantity: char.quantity || 1,
                      category: getItemCategory(char),
                      power,
                      isInFlight: char.is_in_flight,
                      unlocked: char.unlocked,
                      level: char.level,
                      favorite: char.favorite,
                    }}
                  />
                );
              })
            )}
          </div>
        )}
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
                        {selectedChar.favorite ? t('inventory.detail.favorited') : t('inventory.detail.not_favorited')}
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
                        {t('inventory.detail.in_flight_warning')}
                      </span>
                    </div>
                  </div>
                )}

                {showSubModal === "fleet" ? (
                  <div className="relative z-10 space-y-4">
                    <h4 className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase border-b border-cyan-900/50 pb-2">{t('inventory.detail.select_fleet')}</h4>
                    {fleets.length === 0 ? (
                      <div className="text-[9px] text-zinc-500 font-mono uppercase py-8 text-center bg-black/40 rounded-xl border border-cyan-950">{t('inventory.detail.no_fleets')}</div>
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
                        <span className="text-[7.5px] font-mono tracking-widest text-cyan-400 font-bold uppercase block mb-1">{t('inventory.detail.description')}</span>
                        <p className="text-[9px] font-sans text-zinc-300 leading-relaxed uppercase">{selectedChar.description || "Sin descripción disponible."}</p>
                      </div>

                      {getItemCategory(selectedChar) === 'Spaceships' ? (
                        <>
                          <div className="bg-black/40 border border-red-900/40 p-2.5 rounded-xl">
                            <span className="text-[7.5px] text-red-400 font-bold tracking-widest uppercase block mb-1.5 border-b border-red-900/30 pb-1">{t('inventory.detail.offensive_matrix')}</span>
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
                            <span className="text-[7.5px] text-cyan-400 font-bold tracking-widest uppercase block mb-1.5 border-b border-cyan-900/30 pb-1">{t('inventory.detail.armor_cinematic')}</span>
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
                          <span className="text-[7.5px] text-amber-400 font-bold tracking-widest uppercase block mb-1.5 border-b border-amber-900/30 pb-1">{t('inventory.detail.module_card')}</span>
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
                      [SKILLS COMING SOON]
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
                    {t('inventory.detail.close_btn')}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* POPUP DEDICADO DE SKILLS */}
        <AnimatePresence>
          {showSkillsPopup && selectedChar && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[10000]">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-md max-h-[88dvh] flex flex-col hud-panel hud-corners border border-purple-500/60 rounded-2xl p-3 sm:p-4 relative overflow-hidden shadow-[0_0_60px_rgba(168,85,247,0.3)] text-left font-mono text-white"
              >
                <div className="shrink-0 flex justify-between items-center border-b border-purple-900/50 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">
                      {t('inventory.detail.skills_title')}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowSkillsPopup(false)}
                    className="w-6 h-6 rounded-full bg-purple-950 border border-purple-800 text-purple-300 hover:text-white font-bold cursor-pointer flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar overscroll-contain">
                  <div className="p-2 bg-black/60 border border-purple-950 rounded-xl flex items-center justify-between opacity-50 grayscale pointer-events-none">
                    <span className="text-[9.5px] text-white font-bold uppercase">{selectedChar.name}</span>
                    <span className="text-[7.5px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded font-bold uppercase border border-purple-800">
                      {selectedChar.category}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-6 bg-black/80 rounded-xl border border-purple-900/50 relative overflow-hidden">
                    <Lock className="w-8 h-8 text-purple-400 mb-2 opacity-80" />
                    <span className="text-[12px] font-black text-purple-300 tracking-widest uppercase">
                      {t('inventory.detail.skills_coming_soon')}
                    </span>
                    <p className="text-[8px] text-zinc-500 mt-2 text-center uppercase">
                      {t('inventory.detail.skills_wip')}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 mt-2 pt-2 border-t border-purple-900/40 flex justify-end">
                  <button
                    onClick={() => setShowSkillsPopup(false)}
                    className="w-full py-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-500/50 text-purple-200 text-[9px] font-black uppercase rounded-xl transition-all cursor-pointer text-center"
                  >
                    {t('inventory.detail.accept')}
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