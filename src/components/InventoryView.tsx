import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Lock,
  Search,
  ChevronDown,
  Layers,
  Sparkles
} from "lucide-react";
import { Button } from "./ui/joly-button";
import { FleetManager } from "./FleetManager";
import { Scroller } from "./ui/Scroller";
import { supabase } from "../lib/supabase";
import { useInventory, type InventoryItem } from "../hooks/useInventory";
import { useAudioEngine } from "../hooks/useAudioEngine";

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

const getShipStats = (char: any) => {
  const raw = char.seed_ships || char.seed_data || char || {};
  const stats = char.tactical_stats || {};

  return {
    name: raw.name || char.name || 'NAVE DESCONOCIDA',
    description: raw.description || char.description || 'Sin especificaciones tácticas archivadas.',
    type: raw.type || char.type || 'Spaceships',
    company: raw.company || char.company || 'NOVA',
    collection: raw.collection || char.collection || 'ESTÁNDAR',
    rarity: raw.rarity || char.rarity || 'COMMON',
    size: raw.size || char.size || 'MEDIUM',
    engine: raw.engine || char.engine || 'WARP DRIVE CLASS I',
    
    cargo: Number(raw.cargo ?? char.cargo ?? stats.cargo ?? 0),
    production: Number(raw.production ?? char.production ?? stats.production ?? 0),
    
    health: Number(raw.health ?? char.health ?? raw.hp ?? stats.hp ?? 0),
    shield: Number(raw.shield ?? char.shield ?? stats.shield ?? 0),
    defense: Number(raw.defense ?? char.defense ?? stats.defense ?? 0),
    speed: Number(raw.speed ?? char.speed ?? stats.speed ?? 0),
    
    attack: Number(raw.attack ?? char.attack ?? stats.attack ?? stats.kinetic_attack ?? 0),
    ionAttack: Number(raw.ion_attack ?? raw.ionAttack ?? char.ion_attack ?? stats.ionic_attack ?? 0),
    laserAttack: Number(raw.laser_attack ?? raw.laserAttack ?? char.laser_attack ?? stats.laser_attack ?? 0),
    plasmaAttack: Number(raw.plasma_attack ?? raw.plasmaAttack ?? char.plasma_attack ?? stats.plasma_attack ?? 0),
    gravitonAttack: Number(raw.graviton_attack ?? raw.gravitonAttack ?? char.graviton_attack ?? stats.graviton_attack ?? 0),
  };
};

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
  const rarity = (asset.rarity?.toUpperCase() || 'COMMON') as 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'EXCLUSIVE';
  
  const rarityStyles: Record<string, string> = {
    COMMON: 'border-slate-600/50 text-slate-300 shadow-slate-950/40',
    RARE: 'border-cyan-500/60 text-cyan-400 shadow-cyan-950/40',
    EPIC: 'border-purple-500/70 text-purple-400 shadow-purple-950/40',
    LEGENDARY: 'border-amber-500/70 text-amber-400 shadow-amber-950/40',
    EXCLUSIVE: 'border-rose-500/80 text-rose-400 shadow-rose-950/40',
  };

  const activeBorder = isSelected
    ? 'border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)] ring-1 ring-cyan-400'
    : (rarityStyles[rarity] || rarityStyles.COMMON);

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex flex-col justify-between
        h-[115px] sm:h-[128px] w-full
        rounded-md overflow-hidden cursor-pointer select-none
        bg-gradient-to-b from-[#0a111c] via-[#04070c] to-[#020306]
        border transition-all duration-150 transform-gpu
        hover:scale-[1.02] hover:z-10
        ${activeBorder}
      `}
    >
      {/* 1. Header de la Tarjeta: Categoría y Cantidad (Compacto y Firme) */}
      <div className="shrink-0 h-5 px-1.5 flex items-center justify-between z-10 bg-[#04080e]/95 border-b border-cyan-500/20">
        <span className="text-[7.5px] sm:text-[8px] font-mono tracking-wider uppercase text-cyan-400 font-bold truncate max-w-[65%]">
          {asset.category || 'ASSET'}
        </span>
        <span className="text-[8px] sm:text-[8.5px] font-mono font-black px-1 py-0.5 rounded bg-black/90 border border-cyan-500/40 text-cyan-300 leading-none shadow">
          x{asset.quantity || 1}
        </span>
      </div>

      {/* 2. Visual del Activo: Imagen Centrada con Resplandor */}
      <div className="flex-1 min-h-0 w-full p-1 flex items-center justify-center relative overflow-hidden bg-black/40">
        <div className="absolute inset-0 bg-radial from-cyan-500/10 via-transparent to-transparent opacity-30 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <img
          src={asset.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200'}
          alt={asset.name}
          className={`max-h-full max-w-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-all duration-200 ${
            asset.unlocked === false ? "grayscale opacity-50 brightness-50" : ""
          }`}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
          }}
        />

        {asset.isInFlight && (
          <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-red-950/90 border border-red-500 text-red-400 font-mono font-black text-[6.5px] z-20 uppercase tracking-widest animate-pulse">
            EN VUELO
          </div>
        )}

        {asset.level && asset.level > 1 && (
          <div className="absolute top-1 right-1 px-1 py-0.5 rounded bg-black/80 border border-amber-500/50 text-amber-300 font-mono font-black text-[7px] z-20">
            LVL {asset.level}
          </div>
        )}

        {asset.unlocked === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
            <Lock className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_cyan]" />
          </div>
        )}
      </div>

      {/* 3. Pie de la Tarjeta: Nombre y Rareza/POW (Siempre Visible, Nunca Cubierto) */}
      <div className="shrink-0 h-6 sm:h-7 px-1.5 py-0.5 flex flex-col justify-center z-10 bg-[#03060a]/95 border-t border-cyan-500/20">
        <p className="text-[8.5px] sm:text-[9.5px] font-mono font-bold text-white truncate group-hover:text-cyan-300 transition-colors flex items-center justify-between leading-tight">
          <span className="truncate">{asset.name}</span>
          {asset.favorite && <span className="text-amber-400 text-[8px] shrink-0 ml-1">★</span>}
        </p>
        <div className="flex items-center justify-between leading-none mt-0.5">
          <span className="text-[7px] sm:text-[7.5px] font-mono tracking-widest uppercase font-semibold text-cyan-400/70 truncate">
            {asset.rarity || 'STANDARD'}
          </span>
          {asset.power ? (
            <span className="text-[7px] sm:text-[7.5px] font-mono text-amber-400 font-bold shrink-0">
              ⚡ {asset.power} POW
            </span>
          ) : null}
        </div>
      </div>

      {/* Línea de escaneo superior en hover */}
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
  playerPower,
  triggerNotification,
  onBack
}) => {
  const { items: characters, loading: isLoading, error: loadError, toggleFavorite: toggleFav } = useInventory();
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
      
      {/* ── 1. COLUMNA IZQUIERDA: SIDEBAR TÁCTICO (col-span-3) ── */}
      <div className="col-span-3 hud-panel hud-corners flex flex-col justify-between p-2 h-full overflow-hidden min-h-0 bg-[#05080c]/90 border border-cyan-500/30 rounded-xl shadow-xl">
        
        {/* Cabecera del Sidebar */}
        <div className="shrink-0 mb-1 border-b border-cyan-500/20 pb-1.5">
          <button
            onClick={onBack}
            className="text-xs font-mono font-bold text-cyan-400 hover:text-white flex items-center gap-1 mb-2 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{t('inventory.title', 'INVENTARIO')}</span>
          </button>

          <div className="text-[9px] sm:text-[10px] font-mono text-zinc-400 bg-black/60 border border-cyan-900/50 rounded px-2 py-1 flex items-center justify-between">
            <span className="uppercase">{t('inventory.galactic_power', 'PODER GALÁCTICO')}:</span>
            <span className="text-emerald-400 font-black">{playerPower.toLocaleString()} POW</span>
          </div>
        </div>

        {/* Menú de Categorías Vertical */}
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

        {/* Contador Inferior */}
        <div className="shrink-0 border-t border-cyan-500/20 pt-1.5 text-[10px] text-cyan-400/70 font-mono tracking-wider uppercase truncate">
          FILTERED ASSETS: {getFilteredCharacters.length} / {characters.length}
        </div>
      </div>

      {/* ── 2. COLUMNA DERECHA: GRILLA DE 5 COLUMNAS DE ACTIVOS (col-span-9) ── */}
      <div className="col-span-9 hud-panel hud-corners flex flex-col h-full min-h-0 p-2 overflow-hidden bg-[#05080c]/80 border border-cyan-500/30 rounded-xl shadow-xl">
        
        {/* Barra Superior Fija: Filtros y Búsqueda */}
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

            {/* Checkbox: Flotas en vuelo */}
            <button
              onClick={() => { setModsEnabled(!modsEnabled); triggerNotification(modsEnabled ? "🔴 FILTRO APAGADO" : "🟢 MOSTRANDO FLOTAS EN VUELO"); }}
              className="flex items-center gap-1 hover:opacity-90 select-none cursor-pointer px-1.5 py-0.5"
            >
              <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center bg-black ${modsEnabled ? 'border-red-500' : 'border-cyan-500'}`}>
                {modsEnabled && <div className="w-1.5 h-1.5 bg-red-500 shadow-[0_0_8px_#ef4444]" />}
              </div>
              <span className={`text-[8px] font-mono tracking-wider uppercase ${modsEnabled ? 'text-red-400 font-bold' : 'text-zinc-400'}`}>
                {t('inventory.in_flight_filter', 'FLOTAS EN VUELO')}
              </span>
            </button>
          </div>

          {/* Buscador */}
          <div className="relative w-36 sm:w-48 ml-auto">
            <Search className="absolute left-2 top-2 w-3 h-3 text-cyan-500 pointer-events-none" />
            <input
              type="text"
              placeholder={t('inventory.search_placeholder', 'BUSCAR ACTIVO...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-7 text-xs bg-black/60 border border-cyan-500/30 pl-6 pr-2 rounded font-mono text-cyan-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 uppercase"
            />
          </div>
        </div>

        {/* Galería de Activos: Formato Estricto 5 Columnas con Scroll Interno Suave */}
        {activeSidebarCategory === "Fleets" ? (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <FleetManager characters={characters} triggerNotification={triggerNotification} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1.5 p-1.5 grid grid-cols-5 gap-2 sm:gap-2.5 content-start no-scrollbar">
            {isLoading ? (
              <div className="col-span-5 flex flex-col items-center justify-center h-full gap-2 text-cyan-500 py-12">
                <div className="w-7 h-7 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] font-mono tracking-widest uppercase animate-pulse">{t('inventory.loading', 'CARGANDO ALMACÉN...')}</span>
              </div>
            ) : getFilteredCharacters.length === 0 ? (
              <div className="col-span-5 flex items-center justify-center h-full text-zinc-500 text-[9px] font-mono uppercase tracking-widest py-12">
                {loadError ? (
                  <span className="text-red-500 font-bold">{loadError}</span>
                ) : (
                  modsEnabled ? t('inventory.empty_no_flight', 'NO HAY FLOTAS EN VUELO') : t('inventory.empty_no_assets', 'SIN ACTIVOS EN ESTA CATEGORÍA')
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

      {/* ── MODAL DETALLADO PRINCIPAL DEL ACTIVO ── */}
      <AnimatePresence>
        {selectedChar && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl max-h-[90dvh] flex flex-col bg-[#070b0f] border-2 border-cyan-400 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.25)] text-left"
            >
              <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.015)_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />

              {/* Cabecera del Modal */}
              <div className="shrink-0 flex justify-between items-start border-b border-cyan-950 pb-2 mb-3 relative z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[7.5px] font-mono text-cyan-400 font-extrabold uppercase bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
                      {getItemCategory(selectedChar).toUpperCase()} ASSET
                    </span>
                    <button onClick={(e) => handleToggleFavorite(selectedChar, e)} className="text-amber-400 hover:scale-110 transition-transform font-mono text-[9px] font-bold cursor-pointer">
                      {selectedChar.favorite ? t('inventory.detail.favorited', '★ EN FAVORITOS') : t('inventory.detail.not_favorited', '☆ AÑADIR FAVORITO')}
                    </button>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white tracking-widest mt-1 uppercase">{selectedChar.name}</h3>
                </div>
                <button onClick={() => setSelectedChar(null)} className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 hover:text-white font-bold cursor-pointer flex items-center justify-center">✕</button>
              </div>

              {selectedChar.is_in_flight && (
                <div className="shrink-0 p-2 bg-red-950/60 border border-red-500/80 rounded-xl flex items-center justify-between gap-2 text-red-300 text-[8.5px] mb-2 font-mono relative z-10">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-400 animate-pulse shrink-0" />
                    <span className="font-bold uppercase tracking-wider">
                      {t('inventory.detail.in_flight_warning', 'ACTIVO ACTUALMENTE EN MISIÓN')}
                    </span>
                  </div>
                </div>
              )}

              {/* Cuerpo del Modal con Scroll */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 overscroll-contain">
                {showSubModal === "fleet" ? (
                  <div className="relative z-10 space-y-3">
                    <h4 className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase border-b border-cyan-900/50 pb-2">{t('inventory.detail.select_fleet', 'SELECCIONA FLOTA')}</h4>
                    {fleets.length === 0 ? (
                      <div className="text-[9px] text-zinc-500 font-mono uppercase py-8 text-center bg-black/40 rounded-xl border border-cyan-950">{t('inventory.detail.no_fleets', 'NO TIENES FLOTAS CREADAS')}</div>
                    ) : (
                      <Scroller overflow="x" withButtons className="pb-2" gap="gap-3">
                        {fleets.map(f => (
                          <div key={f.id} onClick={() => { triggerNotification(`🚢 ASIGNADO A FLOTA: ${f.name}`); setShowSubModal(null); }} className="min-w-[140px] bg-cyan-950/30 border border-cyan-900 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-cyan-900/50 hover:border-cyan-400 transition-all text-center">
                            <Layers className="w-7 h-7 text-cyan-400 mb-1.5" />
                            <div className="text-[10px] font-bold text-white uppercase">{f.name || 'Flota Alpha'}</div>
                            <div className="text-[8px] text-cyan-500 font-mono mt-0.5">POW: {f.total_power_score}</div>
                          </div>
                        ))}
                      </Scroller>
                    )}
                  </div>
                ) : getItemCategory(selectedChar) === 'Spaceships' ? (
                  (() => {
                    const ship = getShipStats(selectedChar);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 relative z-10 text-white">
                        
                        {/* COLUMNA IZQUIERDA: VISUAL + ESPECIFICACIONES DE CASCO */}
                        <div className="md:col-span-4 flex flex-col items-center gap-2 bg-black/50 border border-cyan-500/30 p-2.5 rounded-xl h-fit">
                          <div className="relative w-full aspect-square rounded-lg border border-cyan-400/80 overflow-hidden bg-gradient-to-b from-cyan-950/40 via-black to-black p-2 flex items-center justify-center">
                            <img 
                              src={resolveImageUrl(selectedChar.avatar_url || (selectedChar as any).image_url)} 
                              alt={ship.name} 
                              className="max-h-full max-w-full object-contain filter drop-shadow-[0_4px_12px_rgba(6,182,212,0.4)]"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
                              }}
                            />
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/90 border border-cyan-400 text-cyan-300 font-mono font-bold text-[8px]">
                              x{selectedChar.quantity || 1}
                            </div>
                          </div>

                          {/* Ficha de Fabricación y Serie */}
                          <div className="w-full space-y-1 font-mono text-[7.5px] uppercase pt-1 border-t border-cyan-900/40">
                            <div className="flex justify-between text-zinc-400">
                              <span>FABRICANTE:</span>
                              <span className="text-cyan-300 font-bold">{ship.company}</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>COLECCIÓN:</span>
                              <span className="text-amber-300 font-bold">{ship.collection}</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>TAMAÑO/CLASE:</span>
                              <span className="text-white font-bold">{ship.size}</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>MOTOR:</span>
                              <span className="text-emerald-400 font-bold truncate max-w-[55%]">{ship.engine}</span>
                            </div>
                          </div>
                        </div>

                        {/* COLUMNA DERECHA: DESCRIPCIÓN Y ESTADÍSTICAS OPERATIVAS */}
                        <div className="md:col-span-8 flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                          
                          {/* Descripción */}
                          <div className="bg-[#05080e] border border-cyan-500/25 p-2 rounded-lg">
                            <span className="text-[7px] font-mono tracking-widest text-cyan-400 font-bold uppercase block mb-0.5">
                              // DESCRIPCIÓN DEL ACTIVO
                            </span>
                            <p className="text-[8px] sm:text-[8.5px] font-mono text-zinc-300 leading-relaxed uppercase">
                              {ship.description}
                            </p>
                          </div>

                          {/* Matriz Ofensiva (5 Tipos de Daño) */}
                          <div className="bg-[#070508] border border-red-500/30 p-2 rounded-lg">
                            <span className="text-[7px] font-mono text-red-400 font-bold tracking-widest uppercase block mb-1 border-b border-red-950 pb-0.5">
                              MATRIZ OFENSIVA
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[8px]">
                              <div className="bg-black/60 border border-red-950/60 p-1 rounded flex justify-between">
                                <span className="text-zinc-400">Base Atk:</span>
                                <span className="text-white font-black">{ship.attack} DMG</span>
                              </div>
                              <div className="bg-black/60 border border-red-950/60 p-1 rounded flex justify-between">
                                <span className="text-zinc-400">Laser:</span>
                                <span className="text-cyan-300 font-black">{ship.laserAttack} DMG</span>
                              </div>
                              <div className="bg-black/60 border border-red-950/60 p-1 rounded flex justify-between">
                                <span className="text-zinc-400">Plasma:</span>
                                <span className="text-purple-300 font-black">{ship.plasmaAttack} DMG</span>
                              </div>
                              <div className="bg-black/60 border border-red-950/60 p-1 rounded flex justify-between">
                                <span className="text-zinc-400">Ionic:</span>
                                <span className="text-blue-300 font-black">{ship.ionAttack} DMG</span>
                              </div>
                              <div className="bg-black/60 border border-red-950/60 p-1 rounded flex justify-between col-span-2 sm:col-span-1">
                                <span className="text-zinc-400">Graviton:</span>
                                <span className="text-emerald-300 font-black">{ship.gravitonAttack} DMG</span>
                              </div>
                            </div>
                          </div>

                          {/* Blindaje, Supervivencia y Logística */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Blindaje & Cinemática */}
                            <div className="bg-[#04080e] border border-cyan-500/30 p-2 rounded-lg">
                              <span className="text-[7px] font-mono text-cyan-400 font-bold tracking-widest uppercase block mb-1 border-b border-cyan-950 pb-0.5">
                                BLINDAJE Y CINEMÁTICA
                              </span>
                              <div className="space-y-1 font-mono text-[8px]">
                                <div className="flex justify-between bg-black/60 px-1.5 py-0.5 rounded border border-cyan-950">
                                  <span className="text-zinc-400">HP:</span>
                                  <span className="text-white font-bold">{ship.health}</span>
                                </div>
                                <div className="flex justify-between bg-black/60 px-1.5 py-0.5 rounded border border-cyan-950">
                                  <span className="text-zinc-400">Shield:</span>
                                  <span className="text-purple-400 font-bold">{ship.shield}</span>
                                </div>
                                <div className="flex justify-between bg-black/60 px-1.5 py-0.5 rounded border border-cyan-950">
                                  <span className="text-zinc-400">Defense:</span>
                                  <span className="text-cyan-300 font-bold">{ship.defense}</span>
                                </div>
                                <div className="flex justify-between bg-black/60 px-1.5 py-0.5 rounded border border-cyan-950">
                                  <span className="text-zinc-400">Speed:</span>
                                  <span className="text-amber-400 font-bold">{ship.speed}</span>
                                </div>
                              </div>
                            </div>

                            {/* Logística y Capacidad */}
                            <div className="bg-[#05090a] border border-amber-500/30 p-2 rounded-lg">
                              <span className="text-[7px] font-mono text-amber-400 font-bold tracking-widest uppercase block mb-1 border-b border-amber-950 pb-0.5">
                                LOGÍSTICA Y RECURSOS
                              </span>
                              <div className="space-y-1 font-mono text-[8px]">
                                <div className="flex justify-between bg-black/60 px-1.5 py-0.5 rounded border border-amber-950">
                                  <span className="text-zinc-400">Cargo:</span>
                                  <span className="text-white font-bold">{ship.cargo.toLocaleString()} U</span>
                                </div>
                                <div className="flex justify-between bg-black/60 px-1.5 py-0.5 rounded border border-amber-950">
                                  <span className="text-zinc-400">Producción:</span>
                                  <span className="text-emerald-400 font-bold">+{ship.production}%</span>
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 relative z-10">
                    <div className="md:col-span-4 flex flex-col items-center gap-2 bg-black/40 border border-cyan-950 p-3 rounded-xl text-center h-fit">
                      <div className="relative w-24 h-24 rounded-xl border border-cyan-400 overflow-hidden shadow-[0_0_15px_rgba(34,211,238,0.25)]">
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
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-white font-mono font-black text-[8px] shadow">
                          x{selectedChar.quantity}
                        </div>
                      </div>

                      <div className="font-mono text-[8px] text-zinc-400 space-y-1 w-full text-left uppercase mt-1">
                        <p className="flex justify-between border-b border-zinc-900 pb-0.5">
                          <span>FACCIÓN:</span> <span className="text-cyan-300 font-bold">{selectedChar.faction}</span>
                        </p>
                        <p className="flex justify-between border-b border-zinc-900 pb-0.5">
                          <span>RAREZA:</span> <span className="text-amber-400 font-bold">{selectedChar.rarity}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>TIPO:</span> <span className="text-purple-400 font-bold">{selectedChar.category}</span>
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-8 flex flex-col justify-start gap-2">
                      <div className="bg-black/50 border border-cyan-950 p-2 rounded-xl">
                        <span className="text-[7.5px] font-mono tracking-widest text-cyan-400 font-bold uppercase block mb-0.5">{t('inventory.detail.description', 'DESCRIPCIÓN TÁCTICA')}</span>
                        <p className="text-[8.5px] sm:text-[9px] font-sans text-zinc-300 leading-relaxed uppercase">{selectedChar.description || "Sin descripción disponible."}</p>
                      </div>

                      <div className="bg-black/40 border border-amber-900/40 p-2 rounded-xl font-mono text-[8px]">
                        <span className="text-[7.5px] text-amber-400 font-bold tracking-widest uppercase block mb-1 border-b border-amber-900/30 pb-0.5">{t('inventory.detail.module_card', 'PARÁMETROS DEL MÓDULO')}</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="bg-black/60 border border-amber-950/50 p-1 rounded flex justify-between">
                            <span className="text-zinc-500 text-[7px]">POW</span>
                            <span className="text-emerald-400 font-black">{selectedChar.power_score || 0}</span>
                          </div>
                          <div className="bg-black/60 border border-amber-950/50 p-1 rounded flex justify-between">
                            <span className="text-zinc-500 text-[7px]">Rango</span>
                            <span className="text-white font-black">LVL {selectedChar.level || 1}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de Acción al Pie del Modal */}
              <div className="shrink-0 border-t border-cyan-950/80 pt-2.5 mt-2 flex justify-between items-center gap-2 relative z-10">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSkillsPopup(true)}
                    className="px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/50 text-purple-300 rounded-lg text-[8px] sm:text-[8.5px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.3)] flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    [SKILLS]
                  </button>

                  {getItemCategory(selectedChar) === 'Spaceships' && showSubModal === null && !selectedChar.is_in_flight && (
                    <button
                      onClick={() => setShowSubModal("fleet")}
                      className="px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg text-[8px] sm:text-[8.5px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      [Añadir a Flota]
                    </button>
                  )}
                  {showSubModal !== null && (
                    <button
                      onClick={() => setShowSubModal(null)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-cyan-900/50 text-cyan-400 rounded-lg text-[8px] sm:text-[8.5px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      [Atrás]
                    </button>
                  )}
                </div>

                <Button variant="secondary" size="sm" onClick={() => setSelectedChar(null)} className="text-[8px] sm:text-[8.5px] font-mono font-bold uppercase cursor-pointer">
                  {t('inventory.detail.close_btn', 'CERRAR')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL FLOTANTE DE SKILLS ── */}
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
                    {t('inventory.detail.skills_title', 'HABILIDADES TÁCTICAS')}
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
                    {t('inventory.detail.skills_coming_soon', 'MÓDULO DE HABILIDADES')}
                  </span>
                  <p className="text-[8px] text-zinc-500 mt-2 text-center uppercase">
                    {t('inventory.detail.skills_wip', 'SISTEMA EN CALIBRACIÓN CUÁNTICA')}
                  </p>
                </div>
              </div>

              <div className="shrink-0 mt-2 pt-2 border-t border-purple-900/40 flex justify-end">
                <button
                  onClick={() => setShowSkillsPopup(false)}
                  className="w-full py-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-500/50 text-purple-200 text-[9px] font-black uppercase rounded-xl transition-all cursor-pointer text-center"
                >
                  {t('inventory.detail.accept', 'ENTENDIDO')}
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