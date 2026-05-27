import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Gem, 
  RotateCw, 
  Sparkles, 
  Clock, 
  User, 
  Shield, 
  Cpu, 
  Trophy, 
  Wrench, 
  Database,
  Compass,
  ArrowLeft,
  Flame,
  Award
} from "lucide-react";
import { Button } from "./ui/joly-button";

interface BlueprintItem {
  id: string;
  name: string;
  avatarUrl: string;
  rank: "A" | "C" | "E" | "S";
  type: "Fire" | "Lightning" | "Water" | "Earth" | "Wind";
  blueprintsCount: number;
  price: number;
  currency: "gem" | "crystal";
  colorTheme: string; // Banner background theme classes
  borderTheme: string;
  ribbon?: string;
  isSoldOut: boolean;
  storageLeft: number;
  hp: number;
  stamina: number;
  speed: number;
  defense: number;
  damageType: string;
}

interface ResourceItem {
  id: string;
  name: string;
  quantity: number;
  discount: number; // e.g. 10 (representing -10%)
  price: number;
  currency: "crystal";
  colorTheme: string;
  isSoldOut: boolean;
  label: string; // e.g. "30m", "100,000", "15m"
  icon: React.ReactNode;
  storageLeft: number;
}

interface PhantomStationViewProps {
  playerGems: number;
  setPlayerGems: React.Dispatch<React.SetStateAction<number>>;
  playerPower: number;
  setPlayerPower: React.Dispatch<React.SetStateAction<number>>;
  playerGold: number;
  setPlayerGold: React.Dispatch<React.SetStateAction<number>>;
  playerWood: number;
  setPlayerWood: React.Dispatch<React.SetStateAction<number>>;
  playerFood: number;
  setPlayerFood: React.Dispatch<React.SetStateAction<number>>;
  playerStone: number;
  setPlayerStone: React.Dispatch<React.SetStateAction<number>>;
  playerOre: number;
  setPlayerOre: React.Dispatch<React.SetStateAction<number>>;
  onBack: () => void;
  triggerNotification: (text: string, e: any) => void;
}

export const PhantomStationView: React.FC<PhantomStationViewProps> = ({
  playerGems,
  setPlayerGems,
  playerPower,
  setPlayerPower,
  playerGold,
  setPlayerGold,
  playerWood,
  setPlayerWood,
  playerFood,
  setPlayerFood,
  playerStone,
  setPlayerStone,
  playerOre,
  setPlayerOre,
  onBack,
  triggerNotification
}) => {
  // Original Currency Panel States
  const [crownTokens, setCrownTokens] = useState<number>(0);
  const [phantomCrystals, setPhantomCrystals] = useState<number>(80400); // 80.4K in image
  
  // Custom interactive states requested by user
  const [playerBlueprintProgress, setPlayerBlueprintProgress] = useState<number>(24);
  const totalBlueprintsGoal = 50;
  const [rarityFilter, setRarityFilter] = useState<string>("ALL");

  const [missionsList, setMissionsList] = useState([
    { id: "EXP-809", name: "Incursión en Cinturón de Carbono", reward: "+140 Bloques de Carbono", date: "Hace 2m", status: "COMPLETADA" },
    { id: "EXP-402", name: "Brecha Coloidal Sector Vacío", reward: "+2.5 Ore de Titanio", date: "Hace 15m", status: "COMPLETADA" },
    { id: "EXP-115", name: "Análisis Sismógrafo Cronológico", reward: "+35 Gemas Verdes", date: "Hace 1h", status: "COMPLETADA" },
    { id: "EXP-098", name: "Exploración de Asteroide Pyros", reward: "+90 Suministros de Lignito", date: "Hace 3h", status: "COMPLETADA" }
  ]);

  // Refresh trackers
  const [refreshAttempts, setRefreshAttempts] = useState<number>(53);
  const maxRefreshAttempts = 90;
  
  // Timer countdowns
  const [refreshCountdown, setRefreshCountdown] = useState<number>(1306); // 21:46 is 1306 seconds
  const [freeRefreshCountdown, setFreeRefreshCountdown] = useState<number>(831); // 13:51 is 831 seconds

  // Active status interaction states
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [hoveredDescription, setHoveredDescription] = useState<string>("Coloca el cursor sobre un suministro para analizarlo");

  // New Interactive states
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBlueprintForModal, setSelectedBlueprintForModal] = useState<BlueprintItem | null>(null);
  
  // Press Hold timer state
  const pressTimeoutRef = React.useRef<any>(null);

  const handlePressStart = (hero: BlueprintItem) => {
    pressTimeoutRef.current = setTimeout(() => {
      playSfx("laser_success");
      setSelectedBlueprintForModal(hero);
    }, 600); // 600ms hold triggers stats blueprint specs info modal
  };

  const handlePressEnd = () => {
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
    }
  };
  
  // Crystal particles state
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; angle: number; speed: number; opacity: number }[]>([]);

  // Blueprints Inventory State
  const [blueprints, setBlueprints] = useState<BlueprintItem[]>([
    {
      id: "hero-1",
      name: "Chrono-Imperator",
      avatarUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150&auto=format&fit=crop&q=60",
      rank: "A",
      type: "Wind",
      blueprintsCount: 5,
      price: 500,
      currency: "crystal",
      colorTheme: "from-[#cb913c] to-[#7f5119]",
      borderTheme: "border-[#e0aa5d]",
      ribbon: "Deploy",
      isSoldOut: false,
      storageLeft: 2,
      hp: 12500,
      stamina: 100,
      speed: 90,
      defense: 65,
      damageType: "Sináptico"
    },
    {
      id: "hero-2",
      name: "Tox-Syndicate",
      avatarUrl: "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=150&auto=format&fit=crop&q=60",
      rank: "C",
      type: "Fire",
      blueprintsCount: 5,
      price: 250,
      currency: "crystal",
      colorTheme: "from-[#7e47b3] to-[#461e70]",
      borderTheme: "border-[#a570db]",
      isSoldOut: false,
      storageLeft: 5,
      hp: 14000,
      stamina: 80,
      speed: 60,
      defense: 80,
      damageType: "Fuego"
    },
    {
      id: "hero-3",
      name: "Aetherial Mage",
      avatarUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&auto=format&fit=crop&q=60",
      rank: "C",
      type: "Lightning",
      blueprintsCount: 5,
      price: 250,
      currency: "crystal",
      colorTheme: "from-[#634cc9] to-[#311f80]",
      borderTheme: "border-[#8a72f0]",
      isSoldOut: false,
      storageLeft: 1,
      hp: 9800,
      stamina: 120,
      speed: 95,
      defense: 45,
      damageType: "Relámpago"
    },
    {
      id: "hero-4",
      name: "Frost Siren",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60",
      rank: "E",
      type: "Water",
      blueprintsCount: 10,
      price: 50,
      currency: "crystal",
      colorTheme: "from-[#3c9c64] to-[#14522e]",
      borderTheme: "border-[#61c98e]",
      isSoldOut: false,
      storageLeft: 3,
      hp: 11000,
      stamina: 100,
      speed: 85,
      defense: 55,
      damageType: "Agua/Hielo"
    }
  ]);

  // Resource Items Inventory State (Based on bottom row of the image)
  const [resources, setResources] = useState<ResourceItem[]>([
    {
      id: "res-1",
      name: "Escudo De Combate",
      quantity: 1,
      discount: 10,
      price: 54,
      currency: "crystal",
      colorTheme: "from-[#2f6fbf] to-[#0f346b]",
      isSoldOut: false,
      label: "30m",
      icon: <Shield className="w-10 h-10 text-sky-300 drop-shadow-[0_2px_8px_rgba(50,150,255,0.4)]" />,
      storageLeft: 2
    },
    {
      id: "res-2",
      name: "Polvo Estelar",
      quantity: 1,
      discount: 20,
      price: 960,
      currency: "crystal",
      colorTheme: "from-[#2f6fbf] to-[#0f346b]",
      isSoldOut: false,
      label: "Polvo",
      icon: (
        <div className="relative">
          <Database className="w-10 h-10 text-amber-200 fill-amber-200/20" />
          <Sparkles className="w-4 h-4 text-white absolute -top-1 -right-1 animate-pulse" />
        </div>
      ),
      storageLeft: 5
    },
    {
      id: "res-3",
      name: "Bloques De Carbono",
      quantity: 1,
      discount: 10,
      price: 162,
      currency: "crystal",
      colorTheme: "from-[#2f6fbf] to-[#0f346b]",
      isSoldOut: false,
      label: "100K",
      icon: <Cpu className="w-10 h-10 text-indigo-300 drop-shadow-[0_2px_8px_rgba(100,50,255,0.4)]" />,
      storageLeft: 1
    },
    {
      id: "res-4",
      name: "Reloj Cronológico",
      quantity: 1,
      discount: 10,
      price: 27,
      currency: "crystal",
      colorTheme: "from-[#3c9c64] to-[#14522e]",
      isSoldOut: false,
      label: "15m",
      icon: <Clock className="w-10 h-10 text-emerald-300 animate-pulse" />,
      storageLeft: 3
    }
  ]);

  // Timers countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown(prev => (prev > 0 ? prev - 1 : 1306));
      setFreeRefreshCountdown(prev => (prev > 0 ? prev - 1 : 831));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const playSfx = (type: "synth_click" | "heavy_load" | "laser_success" | "denied") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === "laser_success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      } else if (type === "heavy_load") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      } else if (type === "denied") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.setValueAtTime(110, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio blocked.", e);
    }
  };

  // Spawn crystal explosion particles
  const spawnExplosion = (x: number, y: number, color: string = "#e53e3e") => {
    const list = Array.from({ length: 24 }).map((_, i) => ({
      id: Math.random() * 1000000 + i,
      x: x || (typeof window !== "undefined" ? window.innerWidth / 2 : 400),
      y: y || (typeof window !== "undefined" ? window.innerHeight / 2 : 300),
      color,
      size: Math.random() * 6 + 3,
      angle: Math.random() * Math.PI * 2,
      speed: Math.random() * 11 + 3,
      opacity: 1
    }));
    setParticles(prev => [...prev, ...list]);
  };

  // Particle physics updates
  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => {
      setParticles(prev =>
        prev
          .map(p => {
            const rad = p.angle;
            const nextX = p.x + Math.cos(rad) * p.speed;
            const nextY = p.y + Math.sin(rad) * p.speed + 1.5; // Simulate light downward gravity
            return {
              ...p,
              x: nextX,
              y: nextY,
              opacity: p.opacity - 0.05,
              speed: p.speed * 0.94 // Air friction drag
            };
          })
          .filter(p => p.opacity > 0)
      );
    }, 25);
    return () => clearInterval(interval);
  }, [particles]);

  // Handle auto refresh countdown trigger
  useEffect(() => {
    if (freeRefreshCountdown === 0 && autoRefreshEnabled) {
      if (phantomCrystals >= 10) {
        setPhantomCrystals(prev => prev - 10);
        setRefreshAttempts(prev => prev + 1);
        setBlueprints(prev => 
          prev.map(hero => ({
            ...hero,
            isSoldOut: false,
            blueprintsCount: Math.random() > 0.5 ? 5 : 10,
            storageLeft: Math.floor(Math.random() * 4) + 1
          }))
        );
        setResources(prev => 
          prev.map(res => ({
            ...res,
            isSoldOut: false,
            discount: Math.random() > 0.5 ? 10 : 20,
            storageLeft: Math.floor(Math.random() * 4) + 1
          }))
        );
        setFreeRefreshCountdown(831);
        setRefreshCountdown(1306);
        playSfx("laser_success");
        triggerNotification("🔄 SISTEMA AUTOMÁTICO REINICIÓ LA ESTACIÓN (-10🔮)", null);
      } else {
        triggerNotification("⚠️ COLA AUTOMÁTICA DETENIDA: PHANTOM COINS INSUFICIENTES", null);
      }
    }
  }, [freeRefreshCountdown, autoRefreshEnabled, phantomCrystals]);

  const handleManualRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSfx("synth_click");

    if (phantomCrystals < 10) {
      playSfx("denied");
      triggerNotification("⚠️ PHANTOM COINS INSUFICIENTES (REQUIERE 10🔮)", e);
      return;
    }

    if (refreshAttempts >= maxRefreshAttempts) {
      playSfx("denied");
      triggerNotification("⚠️ LÍMITE DIARIO DE RECARGA ALCANZADO (90/90)", e);
      return;
    }

    const rect = e.currentTarget ? (e.currentTarget as HTMLElement).getBoundingClientRect() : null;
    const clickX = rect ? rect.left + rect.width / 2 : (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    const clickY = rect ? rect.top + rect.height / 2 : (typeof window !== 'undefined' ? window.innerHeight / 2 : 300);

    setIsRefreshing(true);
    playSfx("heavy_load");

    setTimeout(() => {
      setPhantomCrystals(prev => prev - 10);
      setRefreshAttempts(prev => prev + 1);
      
      setBlueprints(prev => 
        prev.map(hero => ({
          ...hero,
          isSoldOut: false,
          blueprintsCount: Math.random() > 0.5 ? 5 : 10,
          storageLeft: Math.floor(Math.random() * 4) + 1
        }))
      );

      setResources(prev => 
        prev.map(res => ({
          ...res,
          isSoldOut: false,
          discount: Math.random() > 0.5 ? 10 : 20,
          storageLeft: Math.floor(Math.random() * 4) + 1
        }))
      );

      setRefreshCountdown(1306);
      setIsRefreshing(false);
      playSfx("laser_success");
      triggerNotification("🔄 ESTACIÓN DE REABASTECIMIENTO REINICIADA", { x: clickX, y: clickY });
    }, 900);
  };

  const buyBlueprint = (hero: BlueprintItem, e: React.MouseEvent) => {
    e.stopPropagation();
    playSfx("synth_click");

    if (hero.isSoldOut) {
      playSfx("denied");
      return;
    }

    const price = hero.price;
    if (phantomCrystals < price) {
      playSfx("denied");
      triggerNotification("⚠️ CRISTALES DEL VACÍO INSUFICIENTES (🔮)", e);
      return;
    }
    setPhantomCrystals(prev => prev - price);

    const rect = e.currentTarget ? (e.currentTarget as HTMLElement).getBoundingClientRect() : null;
    const clickX = rect ? rect.left + rect.width / 2 : (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    const clickY = rect ? rect.top + rect.height / 2 : (typeof window !== 'undefined' ? window.innerHeight / 2 : 300);

    setPurchasingId(hero.id);
    setTimeout(() => {
      setBlueprints(prev => 
        prev.map(h => h.id === hero.id ? { ...h, isSoldOut: true, storageLeft: 0 } : h)
      );
      setPlayerBlueprintProgress(prev => Math.min(totalBlueprintsGoal, prev + hero.blueprintsCount));
      setPlayerPower(prev => prev + (hero.rank === "A" ? 8500 : hero.rank === "S" ? 15000 : 3500));
      setPurchasingId(null);
      playSfx("laser_success");
      spawnExplosion(clickX, clickY, hero.rank === "S" ? "#d946ef" : hero.rank === "A" ? "#f59e0b" : "#a855f7");
      triggerNotification(`🧬 RECLUTADO: ${hero.blueprintsCount} BLUEPRINTS DE ${hero.name.toUpperCase()}`, { x: clickX, y: clickY });
    }, 800);
  };

  const buyResource = (res: ResourceItem, e: React.MouseEvent) => {
    e.stopPropagation();
    playSfx("synth_click");

    if (res.isSoldOut) {
      playSfx("denied");
      return;
    }

    const price = res.price;
    if (phantomCrystals < price) {
      playSfx("denied");
      triggerNotification("⚠️ CRISTALES DEL VACÍO INSUFICIENTES (🔮)", e);
      return;
    }

    const rect = e.currentTarget ? (e.currentTarget as HTMLElement).getBoundingClientRect() : null;
    const clickX = rect ? rect.left + rect.width / 2 : (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    const clickY = rect ? rect.top + rect.height / 2 : (typeof window !== 'undefined' ? window.innerHeight / 2 : 300);

    setPurchasingId(res.id);
    setTimeout(() => {
      setResources(prev => 
        prev.map(r => r.id === res.id ? { ...r, isSoldOut: true, storageLeft: 0 } : r)
      );

      if (res.name.includes("Mage") || res.name.includes("Estrellas")) {
        setPlayerOre(prev => parseFloat((prev + 2.5).toFixed(1)));
        setPlayerPower(prev => prev + 1200);
      } else if (res.name.includes("Carbono") || res.name.includes("Bloques")) {
        setPlayerWood(prev => prev + 120);
        setPlayerStone(prev => parseFloat((prev + 5.0).toFixed(1)));
      } else if (res.name.includes("Reloj")) {
        setPlayerPower(prev => prev + 500);
      } else {
        setPlayerPower(prev => prev + 3000);
      }

      setPhantomCrystals(prev => prev - price);
      setPurchasingId(null);
      playSfx("laser_success");
      spawnExplosion(clickX, clickY, "#06b6d4");
      triggerNotification(`📦 ADQUIRIDO: ${res.name.toUpperCase()}`, { x: clickX, y: clickY });
    }, 800);
  };

  const getFilteredBlueprints = () => {
    let list = blueprints;
    if (rarityFilter !== "ALL") {
      list = list.filter(h => h.rank === rarityFilter);
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(h => h.name.toLowerCase().includes(q) || h.type.toLowerCase().includes(q));
    }
    return list;
  };

  const getFilteredResources = () => {
    let list = resources;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.label.toLowerCase().includes(q));
    }
    return list;
  };

  return (
    <div className="w-full flex flex-col text-white font-sans max-h-[85vh] overflow-y-auto pr-1">
      
      {/* Floating Canvas/Elements for crystal explosion particles */}
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 shadow-lg"
            style={{
              left: p.x,
              top: p.y,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              opacity: p.opacity,
              boxShadow: `0 0 12px ${p.color}, 0 0 4px ${p.color}`,
              clipPath: "polygon(50% 0%, 100% 38%, 81% 100%, 19% 100%, 0% 38%)"
            }}
          />
        ))}
      </div>

      {/* HEADER SECTION IN BLOCK - GAMIFIED STORE TOP BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-white/5 pb-4 mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg text-white shadow-md shadow-red-600/20">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[7.5px] font-mono bg-red-500/10 border border-red-500/20 text-[#E53E3E] px-1.5 py-0.5 rounded font-black tracking-widest uppercase">
                ESTACIÓN FANTASMA
              </span>
              <span className="text-[7.5px] font-mono text-zinc-500">• SECTOR VENDEDOR COLOIDAL</span>
            </div>
            <h2 className="text-base font-black tracking-widest text-white uppercase mt-0.5">
              MERCADO DE ESQUIRLAS Y MEJORAS
            </h2>
          </div>
        </div>

        {/* Dynamic Multi-Currency Bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Phantom Coin Display */}
          <div className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-500/30 px-2.5 py-1.5 rounded-lg text-xs font-mono relative">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse fill-purple-400/20" />
            <span className="text-purple-300 font-bold text-[10px]">
              {phantomCrystals >= 1000 ? `${(phantomCrystals / 1000).toFixed(1)}K` : phantomCrystals}
            </span>
            <span className="text-[7px] text-purple-400/60 font-mono uppercase tracking-wider">PHANTOM</span>
          </div>

          <Button 
            variant="secondary" 
            size="sm" 
            onClick={onBack}
            className="text-[9px] font-mono tracking-widest border border-white/10 text-white/70 hover:text-red-500 hover:border-red-500/30 py-1.5"
          >
            <ArrowLeft className="w-3 h-3 mr-1" /> VOLVER
          </Button>

        </div>
      </div>

      {/* LATERAL MENU (LEFT) + 8 PRODUCTS WORKSPACE (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LATERAL MENU: OPERATOR CONTROLS, FILTERS, TELEMETRY (SPAN 3) */}
        <div className="lg:col-span-3 flex flex-col gap-4 bg-neutral-950/70 border border-white/5 p-4 rounded-xl backdrop-blur-md">
          
          {/* Operator Header */}
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[8.5px] font-mono tracking-widest text-[#E53E3E] font-black uppercase">
              OPERADOR DE ESTACIÓN
            </span>
          </div>

          {/* Merchant Portrait representation inside a cybernetic holographic frame */}
          <div className="w-full flex items-center gap-3 bg-black/40 p-2.5 rounded-lg border border-white/5">
            <div className="w-10 h-10 rounded-full border border-red-500/20 bg-neutral-900 flex items-center justify-center text-[#E53E3E] shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="text-left overflow-hidden">
              <h4 className="text-[10px] font-black uppercase text-stone-200 truncate">
                SÍNDICO COLOIDAL
              </h4>
              <p className="text-[7.5px] font-mono text-stone-500 truncate uppercase mt-0.5">
                "TODO TIENE UN VALOR"
              </p>
            </div>
          </div>

          {/* Real-time Hovered Analyzer Log block */}
          <div className="bg-[#0c0d10] border border-white/5 px-2.5 py-1.5 rounded-lg text-left">
            <div className="flex justify-between items-center text-[#E53E3E] text-[7.5px] font-mono uppercase font-black border-b border-white/5 pb-1 mb-1">
              <span>ESTADO TERMINAL</span>
              <span className="animate-pulse">ONLINE</span>
            </div>
            <p className="text-stone-400 text-[8px] leading-relaxed uppercase">{hoveredDescription}</p>
          </div>

          {/* Rarity Selector embedded directly as a lateral menu control */}
          <div className="space-y-1.5 text-left bg-black/30 p-2.5 rounded-lg border border-white/5">
            <span className="text-[8.5px] font-mono text-zinc-400 uppercase tracking-wider block font-bold">
              Rareza Filtro:
            </span>
            <div className="grid grid-cols-5 gap-1">
              {(["ALL", "S", "A", "C", "E"] as const).map(rank => (
                <button
                  key={rank}
                  onClick={(e) => {
                    e.stopPropagation();
                    playSfx("synth_click");
                    setRarityFilter(rank);
                  }}
                  className={`py-1 rounded text-[7.5px] font-mono font-bold transition-all uppercase cursor-pointer text-center ${
                    rarityFilter === rank
                      ? "bg-red-600 text-white border border-red-400/30"
                      : "bg-neutral-900 text-zinc-500 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  {rank === "ALL" ? "ALL" : rank}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Refresh Actions inside Sidebar */}
          <div className="bg-[#0f0a0c]/60 border border-red-950/40 rounded-lg p-2.5 space-y-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="w-full py-2.5 rounded-lg bg-gradient-to-b from-[#deb02c] to-[#997813] hover:brightness-110 active:scale-[0.985] text-stone-900 font-sans font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {isRefreshing ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin text-stone-900" />
              ) : (
                <>
                  <span>REFRESCAR</span>
                  <div className="flex items-center gap-0.5 bg-black/40 px-1 py-0.2 rounded text-purple-300 border border-purple-400/20 text-[8.5px] font-black">
                    <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                    <span>10</span>
                  </div>
                </>
              )}
            </button>

            <div className="space-y-0.5 text-center font-mono text-[8.5px] uppercase tracking-wide">
              <div className="text-zinc-500">
                Intentos: <span className="text-stone-300 font-bold">{refreshAttempts}/{maxRefreshAttempts}</span>
              </div>
              <div className="text-zinc-500 flex items-center justify-center gap-1">
                <span>Auto Refresco en:</span> 
                <span className="text-amber-400 font-sans font-bold animate-pulse">{formatTime(freeRefreshCountdown)}</span>
              </div>
            </div>

            {/* Auto-refresh Switch Toggle as requested */}
            <div className="flex items-center justify-between border-t border-red-950/20 pt-2 mt-2">
              <span className="text-[7px] font-mono text-zinc-400 uppercase font-bold text-left">RECARGA AUTOMÁTICA</span>
              <button
                role="switch"
                aria-checked={autoRefreshEnabled}
                onClick={() => {
                  playSfx("synth_click");
                  setAutoRefreshEnabled(!autoRefreshEnabled);
                  triggerNotification(!autoRefreshEnabled ? "🟢 AUTOREFRESO ACTIVO: RECARGA AL LLEGAR A CERO" : "🔴 AUTOREFRESO DESACTIVADO", null);
                }}
                className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer outline-none relative flex items-center ${
                  autoRefreshEnabled ? "bg-red-600" : "bg-neutral-800"
                }`}
              >
                <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${
                  autoRefreshEnabled ? "translate-x-4" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>

          {/* Dynamic Global Shard Level Progress inside Sidebar bar */}
          <div className="space-y-1 bg-black/40 p-2.5 rounded-lg border border-white/5 text-left">
            <div className="flex justify-between items-center text-[8px] font-mono uppercase font-bold text-zinc-400">
              <span>UNIDADES DESPLEGADAS</span>
              <span className="text-red-500 font-black">{playerBlueprintProgress}/{totalBlueprintsGoal} BLUEPRINTS</span>
            </div>
            
            <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden relative">
              <motion.div 
                className="bg-red-500 h-full rounded-full"
                animate={{ width: `${(playerBlueprintProgress / totalBlueprintsGoal) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Expedition Telemetry log with smooth scroll inside Sidebar */}
          <div className="space-y-1 bg-[#090b0d] p-2.5 rounded-lg border border-white/5 text-left">
            <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider block font-bold">
              LOG DE TELEMETRÍA (RECIENTES):
            </span>
            <div className="max-h-[66px] overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-stone-800 pr-1">
              {missionsList.map(m => (
                <div key={m.id} className="text-[7px] font-mono border-l-2 border-red-500/40 pl-1.5 py-0.5">
                  <div className="flex justify-between text-zinc-400">
                    <span className="font-bold text-red-500">{m.id}</span>
                    <span>{m.date}</span>
                  </div>
                  <p className="text-stone-300 truncate">{m.name}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* WORKSPACE RIGHT AREA: EXACTLY 8 PRODUCTS DISPLAY (HERO BANNERS TOP, SUPPLIES FLAGS BOTTOM) */}
        <div className="lg:col-span-9 flex flex-col gap-6">

          {/* Search bar above the products grid as requested */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-neutral-950/50 p-3 rounded-xl border border-white/5">
            <div className="relative w-full sm:w-72">
              <Compass className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-red-500 animate-pulse" />
              <input
                id="workspace-search-input"
                type="text"
                placeholder="FILTRAR POR NOMBRE O CLASE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-black/60 border border-white/10 rounded-lg text-[9px] font-mono tracking-wider text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 uppercase"
              />
              {searchQuery && (
                <button
                  type="button"
                  id="clear-search-button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white font-mono text-[8.5px]"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[7.5px] font-mono text-zinc-500 uppercase">🔍 CONECCION COLOIDAL INMEDIATA</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
          </div>

          {/* Background Wood Board Frame replicating real gamer store board */}
          <div className="w-full bg-[#1b1c24]/85 border-2 border-[#3d2715] rounded-2xl p-6 relative overflow-hidden shadow-2xl">
            
            {/* Visual Rope/Wire hangers styled at top of Hero Shards Row */}
            <div className="relative w-full h-1 select-none pointer-events-none mb-6">
              {/* Rope horizontal wire */}
              <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#8a603c] to-transparent shadow-[0_1px_4px_rgba(0,0,0,0.8)]" />
              <div className="w-full flex justify-around">
                <div className="w-1.5 h-4 bg-[#8a603c]/40 rotate-12 -mt-1.5" />
                <div className="w-1.5 h-4 bg-[#8a603c]/40 -rotate-12 -mt-1.5" />
                <div className="w-1.5 h-4 bg-[#8a603c]/40 rotate-6 -mt-1.5" />
                <div className="w-1.5 h-4 bg-[#8a603c]/40 -rotate-6 -mt-1.5" />
              </div>
            </div>

            {/* ROW 1: THE 4 EXQUISITE HANGING HERO SHARD BANNERS (SHAPED LIKE FLAGS) */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-mono tracking-widest text-[#f5c56c] font-black uppercase flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 fill-amber-500/10 text-amber-500" />
                  BLUEPRINTS DISPONIBLES // SECTOR ALFA
                </span>
                <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider">FILAS: 1 / 2</span>
              </div>
              
              <div id="blueprints-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {getFilteredBlueprints().map((hero) => (
                  <div
                    key={hero.id}
                    onMouseEnter={() => setHoveredDescription(`BLUEPRINT DE UNIDAD ${hero.name.toUpperCase()}. RANK [${hero.rank}]. DA PODER TÁCTICO INMEDIATO. (MANTÉN PRESIONADO PARA VER FICHA)`)}
                    onMouseDown={() => handlePressStart(hero)}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onTouchStart={() => handlePressStart(hero)}
                    onTouchEnd={handlePressEnd}
                    className="flex flex-col text-center relative select-none group cursor-pointer"
                  >
                    
                    {/* Hanging Rope Joint Link top-center */}
                    <div className="w-[3px] h-3 bg-[#a37046] mx-auto -mb-1 shadow-[0_1px_2px_rgba(0,0,0,0.5)] z-10" />

                    {/* Banner card body using custom clip-path and matching gold, purple, green themes */}
                    <div 
                      style={{ 
                        clipPath: "polygon(0% 0%, 100% 0%, 100% 90%, 50% 100%, 0% 90%)",
                        backgroundImage: `linear-gradient(to bottom, var(--tw-gradient-stops))`
                      }}
                      className={`relative pt-3 pb-8 px-3 rounded-t-lg bg-gradient-to-b ${hero.colorTheme} border-t-2 ${hero.borderTheme} flex flex-col justify-between min-h-[225px] transition-transform duration-200 group-hover:-translate-y-1 group-hover:brightness-105 shadow-xl`}
                    >
                      {/* Urgency Badge as requested (Only X left) */}
                      {!hero.isSoldOut && hero.storageLeft <= 3 && (
                        <div className="absolute top-1 right-1 bg-gradient-to-r from-red-600 to-orange-500 border border-red-400 text-white font-mono text-[7px] font-extrabold px-1.5 py-0.5 rounded-full shadow-[0_1px_6px_rgba(239,68,68,0.7)] animate-pulse z-20 font-mono tracking-wider">
                          ONLY {hero.storageLeft} LEFT
                        </div>
                      )}

                      {/* Technical Stats Tooltip on Hover as requested */}
                      <div className="absolute inset-x-2 bottom-12 bg-black/95 border border-[#e53e3e]/30 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none text-left font-mono z-30 shadow-2xl backdrop-blur-md">
                        <div className="text-[7px] text-[#e53e3e] font-extrabold pb-0.5 border-b border-white/5 uppercase mb-1 flex justify-between items-center">
                          <span>SINAPSIS COLOIDAL</span>
                          <span className="animate-pulse text-[6.5px]">OK</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[6.5px] text-zinc-300">
                          <div>HP: <span className="text-white font-semibold">{hero.hp}</span></div>
                          <div>STAMINA: <span className="text-white font-semibold">{hero.stamina}</span></div>
                          <div>SPEED: <span className="text-white font-semibold">{hero.speed} MHz</span></div>
                          <div>ARMOR: <span className="text-white font-semibold">{hero.defense} AM</span></div>
                        </div>
                        <div className="mt-1 text-[6.5px] text-zinc-500 border-t border-white/5 pt-0.5 text-center">
                          INFO: <span className="text-red-400 font-bold uppercase">{hero.damageType}</span>
                        </div>
                      </div>

                      {/* Interactive diagonal Ribbon banner flags (like Deploy) */}
                      {hero.ribbon && (
                        <div className="absolute top-0 left-0 bg-red-600/90 py-0.5 px-3 text-left text-[7.5px] font-black text-white uppercase tracking-widest z-10 rounded-tl-md">
                          {hero.ribbon}
                        </div>
                      )}

                      {/* Display Area inside card */}
                      <div className="flex flex-col items-center mt-3 flex-1 justify-start">
                        
                        {/* Jigsaw Avatar block container */}
                        <div className="relative w-16 h-16 rounded-full bg-black/40 border border-white/15 flex items-center justify-center p-0.5">
                          <img 
                            src={hero.avatarUrl} 
                            alt={hero.name} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover rounded-full grayscale-[10%]"
                          />
                          
                          {/* Puzzle icon badge overlay in bottom right corner */}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-neutral-950 border border-white/10 flex items-center justify-center">
                            <Database className="w-2.5 h-2.5 text-amber-400" />
                          </div>

                          {/* Rank letter in top left corner */}
                          <div className={`absolute top-0 left-0 text-[8.5px] font-mono px-1 rounded font-black border uppercase ${
                            hero.rank === "S" ? "bg-fuchsia-600 border-fuchsia-400 animate-pulse" :
                            hero.rank === "A" ? "bg-amber-600 border-amber-400" :
                            hero.rank === "C" ? "bg-purple-600 border-purple-400" :
                            "bg-emerald-600 border-emerald-400"
                          }`}>
                            {hero.rank}
                          </div>

                          {/* Blueprints unit count e.g. "5" or "10" */}
                          <div className="absolute bottom-0 right-1.5 bg-black/75 border border-white/10 px-1 rounded font-mono font-bold text-[9px]/tight text-[#eee]">
                            {hero.blueprintsCount}
                          </div>
                        </div>

                        {/* Title descriptions */}
                        <h4 className="text-[10px] font-bold text-white tracking-wide uppercase mt-2.5 block text-center">
                          {hero.name}
                        </h4>
                        <span className="text-[7px] font-mono text-zinc-300 tracking-wider uppercase mt-0.5">
                          CLASE: {hero.type}
                        </span>

                        {/* Hint representation */}
                        <span className="text-[5.5px] font-mono text-stone-400/60 uppercase tracking-widest mt-1">
                          [Mantener presionado...]
                        </span>

                      </div>

                      {/* Buy trigger layout matching the picture (centered cost button) */}
                      <div className="mt-4 flex flex-col justify-end">
                        {hero.isSoldOut ? (
                          <div className="text-zinc-500 font-mono font-bold text-[9px] tracking-wide uppercase">
                            AGOTADO
                          </div>
                        ) : purchasingId === hero.id ? (
                          <div className="text-amber-400 font-mono font-bold text-[8.5px] tracking-wider animate-pulse uppercase">
                            FUSIONANDO...
                          </div>
                        ) : (
                          <button
                            onClick={(e) => buyBlueprint(hero, e)}
                            className="inline-flex items-center justify-center gap-1 bg-black/30 hover:bg-black/50 py-1 px-3 border border-white/10 hover:border-white/20 rounded-lg text-[10px] font-black text-center text-white cursor-pointer transition-all mx-auto"
                          >
                            <>
                              <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
                              <span className="font-bold text-purple-300">{hero.price}</span>
                            </>
                          </button>
                        )}
                      </div>

                    </div>

                    {/* Rank Glow Strip directly on bottom point */}
                    <div className={`mx-auto w-[65%] h-1 rounded-full opacity-80 ${
                      hero.rank === 'S' ? 'bg-fuchsia-500 shadow-[0_1px_10px_rgba(236,72,153,0.8)]' :
                      hero.rank === 'A' ? 'bg-amber-400 shadow-[0_1px_8px_rgba(245,158,11,0.6)]' :
                      hero.rank === 'C' ? 'bg-purple-500 shadow-[0_1px_8px_rgba(168,85,247,0.5)]' :
                      'bg-emerald-500 shadow-[0_1px_6px_rgba(16,185,129,0.4)]'
                    }`} />

                  </div>
                ))}
              </div>
            </div>

            {/* Middle connecting rope suspension divider line between row 1 and row 2 */}
            <div className="relative w-full h-1 select-none pointer-events-none my-6">
              <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#8a603c] to-transparent shadow-[0_1px_3px_rgba(0,0,0,0.6)]" />
              <div className="w-full flex justify-around">
                <div className="w-1.5 h-4 bg-[#8a603c]/40 rotate-12 -mt-1.5" />
                <div className="w-1.5 h-4 bg-[#8a603c]/40 -rotate-12 -mt-1.5" />
                <div className="w-1.5 h-4 bg-[#8a603c]/40 rotate-6 -mt-1.5" />
                <div className="w-1.5 h-4 bg-[#8a603c]/40 -rotate-6 -mt-1.5" />
              </div>
            </div>

            {/* ROW 2: THE 4 EXQUISITE SUPPORT EXTRACTION FLAGS (BLUE/GREEN BANNERS WITH RED DISCOUNT BADGES) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-mono tracking-widest text-[#06b6d4] font-black uppercase flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  SUMINISTROS DE EXPEDICIÓN & REDUCTORES DE TIEMPO
                </span>
                <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider">FILAS: 2 / 2</span>
              </div>

              <div id="resources-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {getFilteredResources().map((res) => (
                  <div
                    key={res.id}
                    onMouseEnter={() => setHoveredDescription(`SUMINISTRO: ${res.name.toUpperCase()}. REDUCE EL TIEMPO O PREVIENE PERDIDAS COLOIDALES.`)}
                    className="flex flex-col text-center relative select-none group"
                  >
                    
                    {/* Rope Joint Hanging Link */}
                    <div className="w-[3px] h-3 bg-[#a37046] mx-auto -mb-1 shadow-[0_1px_2px_rgba(0,0,0,0.5)] z-10" />

                    {/* Swallowtail Flag body using clip-path */}
                    <div
                      style={{ 
                        clipPath: "polygon(0% 0%, 100% 0%, 100% 90%, 50% 100%, 0% 90%)",
                        backgroundImage: `linear-gradient(to bottom, var(--tw-gradient-stops))`
                      }}
                      className={`relative pt-3 pb-8 px-3 bg-gradient-to-b ${res.colorTheme} border-t-2 border-[#508bd6]/30 flex flex-col justify-between min-h-[225px] transition-transform duration-200 group-hover:-translate-y-1 group-hover:brightness-105 shadow-xl`}
                    >
                      {/* Urgency scarcity Badge as requested */}
                      {!res.isSoldOut && res.storageLeft <= 3 && (
                        <div className="absolute top-1 right-1 bg-gradient-to-r from-red-600 to-orange-500 border border-red-400 text-white font-mono text-[7px] font-extrabold px-1.5 py-0.5 rounded-full shadow-[0_1px_6px_rgba(239,68,68,0.7)] animate-pulse z-20">
                          Solo {res.storageLeft} disp.
                        </div>
                      )}

                      {/* Orange/Red discount badge flag tag precisely top-left like the photograph */}
                      <div className="absolute top-0 left-0 bg-gradient-to-r from-red-600 to-orange-500 py-0.5 px-2 text-[7px] font-black text-white uppercase tracking-wider rounded-br-lg rounded-tl-sm shadow-md">
                        -{res.discount}%
                      </div>

                      {/* Display Area inside card */}
                      <div className="flex flex-col items-center mt-3 flex-1 justify-start">
                        
                        {/* Rounded layout container for item asset */}
                        <div className="relative w-16 h-16 rounded-xl bg-black/45 border border-white/10 flex items-center justify-center p-2.5 shadow-inner">
                          {res.icon}
                          
                          {/* Quantity overlay */}
                          <div className="absolute bottom-1 right-1.5 bg-black/85 border border-white/5 px-1 rounded font-mono font-black text-[9px]/tight text-red-500">
                            {res.quantity}
                          </div>

                          {/* Time label overlay e.g. "30m", "100K", "15m" precisely above asset */}
                          <div className="absolute top-1 left-1.5 text-[8.5px] font-sans font-black text-[#f1ebdb] tracking-wide">
                            {res.label}
                          </div>
                        </div>

                        {/* Title descriptions */}
                        <h4 className="text-[10px] font-bold text-white tracking-wide uppercase mt-2.5 block text-center">
                          {res.name}
                        </h4>
                        <span className="text-[7px] font-mono text-zinc-400 tracking-wider">
                          CATEGORÍA: EXP
                        </span>

                      </div>

                      {/* Cost buy button precisely layout aligned with top row */}
                      <div className="mt-4 flex flex-col justify-end">
                        {res.isSoldOut ? (
                          <div className="text-zinc-500 font-mono font-bold text-[9px] tracking-wide uppercase">
                            ADQUIRIDO
                          </div>
                        ) : purchasingId === res.id ? (
                          <div className="text-purple-400 font-mono font-bold text-[8.5px] tracking-wider animate-pulse uppercase">
                            PROCESANDO...
                          </div>
                        ) : (
                          <button
                            onClick={(e) => buyResource(res, e)}
                            className="inline-flex items-center justify-center gap-1 bg-black/30 hover:bg-black/50 py-1 px-3 border border-white/10 hover:border-white/20 rounded-lg text-[10px] font-black text-center text-white cursor-pointer transition-all mx-auto"
                          >
                            <Gem className="w-3 h-3 text-emerald-400 fill-emerald-500/10" />
                            <span className="font-bold text-[#ffd880]">{res.price}</span>
                          </button>
                        )}
                      </div>

                    </div>

                    {/* Bottom link element decor */}
                    <div className="mx-auto w-[65%] h-1 bg-cyan-600 opacity-60 rounded-full shadow-[0_1px_5px_rgba(6,182,212,0.4)]" />

                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Secure transaction notice footer panel */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-neutral-950/40 border border-white/5 text-[7.5px] font-mono uppercase text-zinc-500 text-left">
            <span className="bg-red-500/10 border border-red-500/20 text-[#E53E3E] text-[6.5px] px-1 py-0.2 rounded font-bold shrink-0">INFO</span>
            <span>Las compras de la Estación Fantasma son definitivas. Los fragmentos e ítems sinápticos potencian el nivel de poder general y desbloquean habilidades de expedición avanzada en tiempo real.</span>
          </div>

        </div>

      </div>

      {/* Detailed Sci-Fi Hero Stats Modal */}
      <AnimatePresence>
        {selectedBlueprintForModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#0d090b] border-2 border-red-500/20 rounded-2xl p-6 relative shadow-[0_0_50px_rgba(239,68,68,0.15)] text-left overflow-hidden"
            >
              {/* Futuristic Grid background decoration */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(229,62,62,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(229,62,62,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-white/10 pb-3 mb-4 relative z-10">
                <div>
                  <span className="text-[7px] font-mono text-red-500 font-extrabold uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                    FICHA DETALLADA COLOIDAL
                  </span>
                  <h3 className="text-sm font-black text-white tracking-widest mt-1 uppercase flex items-center gap-2">
                    {selectedBlueprintForModal.name}
                    <span className="text-[9px] bg-red-600/90 text-white px-1.5 py-0.5 rounded font-bold uppercase">
                      Rank {selectedBlueprintForModal.rank}
                    </span>
                  </h3>
                </div>
                <button
                  type="button"
                  id="close-modal-detail"
                  onClick={() => setSelectedBlueprintForModal(null)}
                  className="text-zinc-500 hover:text-white transition-colors p-1"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-4 relative z-10">
                
                {/* Hero Render Preview */}
                <div className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-red-500/30 shrink-0">
                    <img
                      src={selectedBlueprintForModal.avatarUrl}
                      alt={selectedBlueprintForModal.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-300 font-mono uppercase font-black">
                      TIPO ELEMENTAL: <span className="text-[#f5c56c]">{selectedBlueprintForModal.type}</span>
                    </p>
                    <p className="text-[9px] text-zinc-500 font-mono mt-1 leading-relaxed uppercase">
                      LECTOR BIOMÉTRICO COLOIDAL ENCONTRÓ RESISTENCIA ALTA. MÁXIMO SOPORTE TÁCTICO INTEGRADO.
                    </p>
                  </div>
                </div>

                {/* Stats Sheet with visual bars/gauges */}
                <div className="space-y-3">
                  <h4 className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest font-black">
                    // TELEMETRÍA DETALLADA DE ATRIBUTOS
                  </h4>

                  {/* HP */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-mono">
                      <span className="text-stone-400">PUNTOS DE SALUD (HP)</span>
                      <span className="text-white font-bold">{selectedBlueprintForModal.hp} / 15,000 HP</span>
                    </div>
                    <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-red-500 h-full rounded-full" 
                        style={{ width: `${(selectedBlueprintForModal.hp / 15000) * 100}%` }} 
                      />
                    </div>
                  </div>

                  {/* STAMINA */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-mono">
                      <span className="text-stone-400">ESTAMINA</span>
                      <span className="text-white font-bold">{selectedBlueprintForModal.stamina} ST</span>
                    </div>
                    <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-purple-500 h-full rounded-full" 
                        style={{ width: `${(selectedBlueprintForModal.stamina / 150) * 100}%` }} 
                      />
                    </div>
                  </div>

                  {/* DEFENSE */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-mono">
                      <span className="text-stone-400">DEFENSA</span>
                      <span className="text-white font-bold">{selectedBlueprintForModal.defense} AM</span>
                    </div>
                    <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-cyan-500 h-full rounded-full" 
                        style={{ width: `${selectedBlueprintForModal.defense}%` }} 
                      />
                    </div>
                  </div>

                  {/* SPEED */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-mono">
                      <span className="text-stone-400">VELOCIDAD</span>
                      <span className="text-white font-bold">{selectedBlueprintForModal.speed} MHz</span>
                    </div>
                    <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full rounded-full" 
                        style={{ width: `${selectedBlueprintForModal.speed}%` }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Damage Type Info Banner */}
                <div className="bg-black/40 border border-white/5 p-2 rounded-lg py-1.5 font-mono text-[8px] flex justify-between items-center">
                  <span className="text-zinc-500 uppercase">TIPO DE DAÑO COLOIDAL:</span>
                  <span className="text-red-400 font-bold uppercase">{selectedBlueprintForModal.damageType}</span>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="border-t border-white/5 pt-4 mt-5 flex justify-end gap-2 relative z-10">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedBlueprintForModal(null)}
                  className="text-[9px] font-mono border border-white/10"
                >
                  CERRAR
                </Button>
                {!selectedBlueprintForModal.isSoldOut && (
                  <button
                    onClick={(e) => {
                      buyBlueprint(selectedBlueprintForModal, e);
                      setSelectedBlueprintForModal(null);
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-mono font-black uppercase tracking-wider"
                  >
                    Adquirir Blueprint
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
