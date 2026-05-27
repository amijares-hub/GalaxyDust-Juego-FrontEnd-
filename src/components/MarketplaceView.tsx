import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Lock, 
  ShoppingBag, 
  Coins, 
  Heart, 
  ChevronRight, 
  ChevronLeft, 
  Info,
  Check,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Gift,
  Shield,
  Zap,
  Flame,
  Globe
} from "lucide-react";
import { Button } from "./ui/joly-button";

interface BundleItem {
  name: string;
  quantity: number;
  icon: string;
  color: string;
  subText?: string;
}

interface MarketplaceBundle {
  id: string;
  title: string;
  badgePct: string;
  ribbonText: string;
  ribbonColor: string;
  gemsReward: number;
  giftValueGems: number;
  items: BundleItem[];
  cooldownTime: string; // e.g., "12:21:25"
  cooldownDays?: number;
  storageLeft: number;
  price: string; // e.g., "15,000 GD COIN"
  priceGd?: number; // if paid in GD Coin
  isPurchased?: boolean;
}

interface MarketplaceViewProps {
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

const CATEGORIES = [
  { id: "heartwarming", label: "Gift of Heartwarming", icon: Heart, badge: "HOT" },
  { id: "recommended", label: "Recommended Immortals", icon: Globe, badge: "NEW" },
  { id: "dragon", label: "Dragon Knight", icon: Flame },
  { id: "special", label: "Special Bundles", icon: Sparkles, highlighted: true },
  { id: "limited", label: "Limited to One Purchase", icon: Lock },
  { id: "cultivate", label: "Cultivate Immortals", icon: Zap }
];

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
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
  const [activeCategory, setActiveCategory] = useState<string>("special");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [successBundle, setSuccessBundle] = useState<MarketplaceBundle | null>(null);
  
  const carouselRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Live Timer states
  const [timeLeftSecs, setTimeLeftSecs] = useState(44485); // roughly 12:21:25

  // Localized bundles state to persist purchase count limits
  const [bundles, setBundles] = useState<Record<string, MarketplaceBundle[]>>({
    special: [
      {
        id: "daily-surprise-1",
        title: "Daily Surprise",
        badgePct: "800%",
        ribbonText: "Daily Surprise",
        ribbonColor: "bg-[#1034A6]/90 text-white", // Royal Blue Ribbon
        gemsReward: 100,
        giftValueGems: 800,
        storageLeft: 1,
        price: "1,500 GD COIN",
        priceGd: 1500,
        cooldownTime: "12:21:25",
        items: [
          { name: "Philosopher's Stone", quantity: 1, icon: "🔴", color: "from-rose-500 to-red-600", subText: "Inmortal Catalyst" },
          { name: "Major SP Recovery", quantity: 1, icon: "🧪", color: "from-yellow-400 to-amber-500", subText: "100 SP Points" },
          { name: "Major AP Recovery", quantity: 1, icon: "🧴", color: "from-purple-500 to-pink-500", subText: "1,000 AP Points" },
          { name: "VIP Points (X100)", quantity: 1, icon: "🎫", color: "from-emerald-400 to-teal-500", subText: "100 VIP exp" }
        ]
      },
      {
        id: "monthly-sale",
        title: "Monthly Sale",
        badgePct: "791%",
        ribbonText: "Monthly Sale",
        ribbonColor: "bg-[#8B0000]/90 text-white", // Dark Red Crimson
        gemsReward: 1100,
        giftValueGems: 9000,
        storageLeft: 1,
        price: "15,000 GD COIN",
        priceGd: 15000,
        cooldownTime: "12:21:25",
        cooldownDays: 9,
        items: [
          { name: "Freely Campaign Chest", quantity: 1, icon: "📦", color: "from-amber-500 to-yellow-600", subText: "Advanced Blueprint" },
          { name: "Random Teleport", quantity: 3, icon: "🌀", color: "from-sky-400 to-blue-500", subText: "Coordenadas Q." },
          { name: "8h Speedup Boost", quantity: 1, icon: "⏱️", color: "from-indigo-500 to-violet-600", subText: "8 Horas" },
          { name: "20m Speedup Boost", quantity: 15, icon: "⚡", color: "from-orange-400 to-amber-500", subText: "20m x 15 Unidades" }
        ]
      },
      {
        id: "daily-surprise-2",
        title: "Daily Surprise",
        badgePct: "650%",
        ribbonText: "Daily Surprise",
        ribbonColor: "bg-[#4B0082]/90 text-white", // Violet/Purple Ribbon
        gemsReward: 60,
        giftValueGems: 400,
        storageLeft: 2,
        price: "600 GD COIN",
        priceGd: 600,
        cooldownTime: "12:21:25",
        items: [
          { name: "Heart of Norheim", quantity: 1, icon: "❤️", color: "from-rose-500 to-pink-600", subText: "Garantía de Aliento" },
          { name: "Medium Resource Chest", quantity: 1, icon: "🧰", color: "from-amber-600 to-yellow-700", subText: "Contiene Madera y Mineral" }
        ]
      }
    ],
    heartwarming: [
      {
        id: "heart-warm-1",
        title: "Empathy Pulse",
        badgePct: "950%",
        ribbonText: "Limited Pulse",
        ribbonColor: "bg-[#D53F8C]/90 text-white",
        gemsReward: 500,
        giftValueGems: 4800,
        storageLeft: 1,
        price: "7,500 GD COIN",
        priceGd: 7500,
        cooldownTime: "15:10:02",
        items: [
          { name: "Eternal Sparkle", quantity: 2, icon: "✨", color: "from-pink-400 to-fuchsia-500" },
          { name: "Hyper Drive Fuel", quantity: 5, icon: "☄️", color: "from-yellow-400 to-orange-500" }
        ]
      }
    ],
    recommended: [
      {
        id: "immortal-recruit",
        title: "Chrono Caesar Pack",
        badgePct: "1200%",
        ribbonText: "Special Recruitment",
        ribbonColor: "bg-[#B7791F]/90 text-white",
        gemsReward: 2500,
        giftValueGems: 30000,
        storageLeft: 1,
        price: "35,000 GD COIN",
        priceGd: 35000,
        cooldownTime: "23:59:59",
        items: [
          { name: "Ancient Relic Map", quantity: 5, icon: "🗺️", color: "from-amber-600 to-yellow-800" },
          { name: "Chrono Core", quantity: 1, icon: "🌀", color: "from-cyan-400 to-blue-600" }
        ]
      }
    ],
    dragon: [
      {
        id: "dragon-breath",
        title: "Dragon Breath",
        badgePct: "500%",
        ribbonText: "Draconic Core",
        ribbonColor: "bg-red-600 text-white",
        gemsReward: 300,
        giftValueGems: 1500,
        storageLeft: 3,
        price: "4,500 GD COIN",
        priceGd: 4500,
        cooldownTime: "04:30:10",
        items: [
          { name: "Fire Shard", quantity: 12, icon: "🔥", color: "from-red-500 to-orange-600" },
          { name: "Scale Extract", quantity: 1, icon: "🐲", color: "from-emerald-500 to-teal-600" }
        ]
      }
    ],
    limited: [
      {
        id: "one-time-hyper",
        title: "Cosmic Foundation",
        badgePct: "2000%",
        ribbonText: "Once Per Account",
        ribbonColor: "bg-amber-500 text-black font-extrabold",
        gemsReward: 5000,
        giftValueGems: 100000,
        storageLeft: 1,
        price: "75,000 GD COIN",
        priceGd: 75000,
        cooldownTime: "INFINITE",
        items: [
          { name: "Singularity Reactor", quantity: 1, icon: "⚛️", color: "from-violet-600 to-indigo-800" },
          { name: "Grand Master Medal", quantity: 3, icon: "🎖️", color: "from-amber-400 to-yellow-600" }
        ]
      }
    ],
    cultivate: [
      {
        id: "cultivate-immortals-boost",
        title: "Ascension Codex",
        badgePct: "450%",
        ribbonText: "Weekly Powerup",
        ribbonColor: "bg-[#319795]/90 text-white",
        gemsReward: 350,
        giftValueGems: 1500,
        storageLeft: 5,
        price: "4,500 GD COIN",
        priceGd: 4500,
        cooldownTime: "48:00:00",
        items: [
          { name: "Tome of Epiphany", quantity: 4, icon: "📖", color: "from-teal-400 to-cyan-500" },
          { name: "Aura Condenser", quantity: 2, icon: "🌌", color: "from-fuchsia-500 to-purple-700" }
        ]
      }
    ]
  });

  // Countdown timer clock and carousel auto-scroll
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSecs(prev => (prev > 0 ? prev - 1 : 44485));
    }, 1000);
    
    // Auto scroll logic
    const scrollInterval = setInterval(() => {
      if (carouselRef.current && !isDragging.current) {
        carouselRef.current.scrollLeft += 1.5;
        // Reset if reached the end smoothly
        if (carouselRef.current.scrollLeft >= (carouselRef.current.scrollWidth - carouselRef.current.clientWidth - 2)) {
          carouselRef.current.scrollLeft = 0;
        }
      }
    }, 30); // 30ms ~33fps smooth scroll

    return () => {
      clearInterval(timer);
      clearInterval(scrollInterval);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.pageX - (carouselRef.current?.offsetLeft || 0);
    scrollLeft.current = carouselRef.current?.scrollLeft || 0;
  };
  const handleMouseLeave = () => { isDragging.current = false; };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX.current) * 2; // scroll speed multiplier
    carouselRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const formatTime = (secs: number, days?: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (num: number) => num.toString().padStart(2, "0");
    if (days) {
      return `${days}d ${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // Audiotone synthesizer for modern, atmospheric SFX feedbacks
  const playSfxTone = (type: "click" | "purchase" | "loading" | "error") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      if (type === "purchase") {
        // High-end sci-fi digital receipt sound sweep
        osc.type = "sine";
        osc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
        osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + 0.1); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        osc.frequency.exponentialRampToValueAtTime(1200.00, ctx.currentTime + 0.35); // Super sweep
        
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      } else if (type === "loading") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(330, ctx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      } else if (type === "error") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.25);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      } else {
        // Subtle modern high-contrast click
        osc.type = "sine";
        osc.frequency.setValueAtTime(720, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.07);
        gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      }

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (err) {
      console.warn("Blocked audio payload until gesture.", err);
    }
  };

  const handlePurchase = (bundle: MarketplaceBundle, e: React.MouseEvent) => {
    e.stopPropagation();
    playSfxTone("click");

    if (bundle.isPurchased || bundle.storageLeft <= 0) {
      playSfxTone("error");
      triggerNotification("⚠️ ESTE PAQUETE AGOTADO O LÍMITE ALCANZADO", e);
      return;
    }

    // GD Coin check
    if (bundle.priceGd) {
      // playerGold is in Millions. So playerGold = 1.5 means 1,500,000.
      // GD Coin prices are in integers (e.g. 15000), so we check against playerGold * 1,000,000.
      const gdCoinOwned = playerGold * 1000000;
      if (gdCoinOwned < bundle.priceGd) {
        playSfxTone("error");
        triggerNotification("⚠️ GD COINS INSUFICIENTES", e);
        return;
      }
    }

    // Trigger loading spinner
    setIsProcessing(bundle.id);
    playSfxTone("loading");

    setTimeout(() => {
      // Complete transaction
      setBundles(prev => {
        const catBundles = prev[activeCategory].map(b => {
          if (b.id === bundle.id) {
            const nextStorage = b.storageLeft - 1;
            return {
              ...b,
              storageLeft: nextStorage,
              isPurchased: nextStorage <= 0 ? true : false
            };
          }
          return b;
        });
        return { ...prev, [activeCategory]: catBundles };
      });

      // Update actual resources based on rewards
      let gemsGained = bundle.gemsReward;
      
      if (bundle.priceGd) {
        // Reducción de GD Coins, sumamos recompensas
        setPlayerGold(prev => parseFloat((prev - (bundle.priceGd! / 1000000)).toFixed(4)));
        setPlayerGems(prev => prev + gemsGained);
      } else {
        setPlayerGems(prev => prev + gemsGained);
      }

      // Claim pack items (add values to our real state dashboard)
      bundle.items.forEach(itm => {
        if (itm.name.includes("Heart")) {
          // Boost player power
          setPlayerPower(prev => prev + 12000);
        } else if (itm.name.includes("Stone")) {
          setPlayerStone(prev => parseFloat((prev + 1.5).toFixed(1)));
        } else if (itm.name.includes("AP Recovery") || itm.name.includes("Speedup")) {
          // Increase player power due to faster operations
          setPlayerPower(prev => prev + 3500);
        } else if (itm.name.includes("Resource Chest") || itm.name.includes("Resource")) {
          // Add lots of wood, food & ore
          setPlayerWood(prev => prev + 150);
          setPlayerFood(prev => parseFloat((prev + 10.5).toFixed(1)));
          setPlayerOre(prev => parseFloat((prev + 5.2).toFixed(1)));
        }
      });

      // Award premium aesthetic bonus
      setPlayerGold(prev => parseFloat((prev + 0.55).toFixed(2)));

      setIsProcessing(null);
      setSuccessBundle(bundle);
      playSfxTone("purchase");

      triggerNotification(`🎉 ADQUISICIÓN ÉXITO: ${bundle.title.toUpperCase()} ADQUIRIDO`, e);
    }, 1200);
  };

  const getCategoryThemeColor = (catId: string) => {
    switch (catId) {
      case "special": return "border-[#E53E3E]/30 shadow-red-500/10 text-red-400";
      case "heartwarming": return "border-pink-500/30 shadow-pink-500/10 text-pink-400";
      case "recommended": return "border-amber-400/30 shadow-amber-400/10 text-amber-400";
      case "dragon": return "border-red-500/30 shadow-orange-500/10 text-orange-400";
      case "limited": return "border-blue-500/30 shadow-blue-500/10 text-blue-400";
      default: return "border-zinc-700/30 text-zinc-400";
    }
  };

  const displayBundles = bundles[activeCategory] || [];

  return (
    <div className="w-full flex flex-col select-none text-white font-sans max-h-[85vh] overflow-y-auto pr-1">
      
      {/* HEADER SECTION IN BLOCK - GAMIFIED STORE TOP BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 mb-5 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-lg shadow-red-600/20">
            <ShoppingBag className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[7.5px] font-mono bg-[#E53E3E]/10 border border-[#E53E3E]/20 text-[#E53E3E] px-1.5 py-0.5 rounded font-black tracking-widest uppercase">
                MÓDULO COLOIDAL DE COMERCIO
              </span>
              <span className="text-[7.5px] font-mono text-[#A0A2A5]/50">• SECTOR IMPERIAL SECURE</span>
            </div>
            <h2 className="text-base font-black tracking-widest text-white uppercase mt-0.5">
              ADQUISICIÓN DE CARGA Y BUNDLES
            </h2>
          </div>
        </div>

        {/* Current Balance matching the top bar looks */}
        <div className="flex items-center gap-2">
          
          <div className="flex items-center gap-1.5 bg-black/50 border border-white/5 px-3 py-1.5 rounded-xl text-xs font-mono">
            <Coins className="w-3.5 h-3.5 text-yellow-300" />
            <span className="text-yellow-300 font-bold text-[10px]">{playerGold}M</span>
          </div>



          <Button 
            variant="secondary" 
            size="sm" 
            onClick={onBack}
            className="text-[8px] font-mono tracking-widest border border-white/10 text-white/70 hover:text-[#E53E3E] hover:border-[#E53E3E]/30 px-2 py-1.5"
          >
            VOLVER
          </Button>

        </div>
      </div>

      {/* TWO COLUMN GRID FOR VIEW: LEFT SIDEBAR TAB SELECTION, RIGHT DETAIL GRID CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COMPONENT - MULTI-SELECTION SIDEBAR (SPAN 3) */}
        <div className="md:col-span-3 flex flex-col space-y-2.5 bg-[#0c0d10]/95 border border-white/5 p-3.5 rounded-2xl backdrop-blur-md">
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-black px-2 pb-1.5 border-b border-white/5">
            SECTORES DE TIENDA
          </div>
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none select-none">
            {CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    playSfxTone("click");
                    setActiveCategory(cat.id);
                  }}
                  className={`relative flex items-center justify-between md:w-full px-3 py-2.5 rounded-xl text-left font-mono transition-all border shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-[#14151a] border-amber-400 text-amber-400 font-bold shadow-md shadow-amber-400/5 scale-[1.01]"
                      : cat.highlighted
                      ? "bg-red-950/20 border-red-500/20 text-[#E53E3E] hover:bg-neutral-900/40 hover:border-red-500/30"
                      : "bg-[#08090b] border-white/5 text-neutral-400 hover:border-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <IconComp className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : cat.highlighted ? "text-red-500 animate-pulse" : "text-neutral-500"}`} />
                    <span className="text-[9.5px] tracking-wide uppercase">{cat.label}</span>
                  </div>

                  {/* Red/Orange bullet badging mimicking side tab stats */}
                  {cat.badge && (
                    <span className="hidden md:inline-block text-[6.5px] font-mono px-1 py-0.2 rounded bg-[#E53E3E]/20 text-[#E53E3E] border border-red-500/30 font-black animate-pulse">
                      {cat.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex flex-col p-2.5 rounded-xl bg-neutral-900/40 border border-white/5 text-[8px] font-mono leading-relaxed text-zinc-500 uppercase">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1 font-bold">
              <Info className="w-3 h-3 text-[#E53E3E]" />
              SOPORTE DE SUMINISTROS
            </div>
            Los paquetes adquiridos se procesan a través del núcleo coloidal de Sasorilabs.io. Los cristales y minerales se acreditan de inmediato a tus contadores.
          </div>
        </div>

        {/* RIGHT COMPONENT - DETAILED CARD GRID (SPAN 9) */}
        <div className="md:col-span-9">
          
          <div 
            className="flex overflow-x-auto gap-5 pb-4 hide-scrollbar snap-x snap-mandatory cursor-grab active:cursor-grabbing w-full"
            style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
            ref={carouselRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            
            {displayBundles.map((bundle) => {
              const isP = bundle.isPurchased || bundle.storageLeft <= 0;
              const hasGemsPrice = bundle.priceGd ? false : false; // Using GD coin for all 
              
              return (
                <div
                  key={bundle.id}
                  className="relative snap-center shrink-0 w-[300px] sm:w-[340px] rounded-2xl bg-gradient-to-b from-[#181a20]/95 to-[#0b0c0e]/95 border border-white/10 overflow-hidden flex flex-col justify-between shadow-2xl transition-all hover:scale-[1.015] hover:border-white/20 select-none group min-h-[480px]"
                >
                  
                  {/* Decorative glowing backdrops behind matching Ribbon theme */}
                  <div className="absolute top-0 inset-x-0 h-44 bg-gradient-to-b from-red-600/[0.03] to-transparent pointer-events-none" />
                  
                  {/* Outer Ornate Double Border Corner layout */}
                  <div className="absolute inset-1 border border-white/[0.02] pointer-events-none rounded-xl" />
                  <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-white/15 pointer-events-none" />
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-white/15 pointer-events-none" />
                  <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-white/15 pointer-events-none" />
                  <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-white/15 pointer-events-none" />

                  {/* UPPER BUST / BACKGROUND ICON ARTWORK PANEL (Bursting light, chests, shield) */}
                  <div className="relative h-32 w-full flex items-center justify-center bg-[#070809]/40 border-b border-white/[0.04]">
                    
                    {/* Radial gold gradient bloom representing chest contents */}
                    <div className="absolute w-24 h-24 rounded-full bg-amber-400/[0.04] blur-xl animate-pulse" />
                    
                    <div className="flex flex-col items-center justify-center space-y-1 z-10 text-center">
                      {bundle.id === "monthly-sale" ? (
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <span className="absolute inset-0 bg-amber-500/10 rounded-full animate-ping duration-[3s]" />
                          <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl shadow-xl shadow-amber-500/15 border border-yellow-300/30">
                            <Gift className="w-7 h-7 text-yellow-50" />
                          </div>
                        </div>
                      ) : bundle.id.includes("surprise") ? (
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <span className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse" />
                          <div className="p-3 bg-gradient-to-br from-[#E53E3E] to-rose-700 rounded-2xl shadow-xl shadow-red-500/15 border border-red-400/30">
                            <Shield className="w-7 h-7 text-red-50" />
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-sky-600 rounded-2xl shadow-xl border border-sky-400/30">
                          <Sparkles className="w-7 h-7 text-sky-50" />
                        </div>
                      )}

                      {/* Small text description inside artworks */}
                      <span className="text-[7.5px] font-mono tracking-widest text-[#A0A2A5]/70 uppercase block mt-1.5 bg-[#08090c]/80 px-2 py-0.5 rounded border border-white/5">
                        {bundle.ribbonText}
                      </span>
                    </div>

                    {/* SCALLOPED EMBLEM PERCENTAGE BADGE - Exact replica of the "800%", "791%" badge on right */}
                    <div className="absolute top-2.5 right-2.5 z-20 w-11 h-11 flex items-center justify-center">
                      <svg className="absolute inset-0 w-full h-full rotate-45" viewBox="0 0 100 100">
                        {/* Beautiful scalloped edge generator */}
                        <path 
                          d="M50 0 C54 10 64 10 68 0 C72 10 82 10 86 0 C90 10 100 10 100 22 C90 26 90 36 100 40 C90 44 90 54 100 58 C90 62 90 72 100 76 C90 80 90 90 86 100 C82 90 72 90 68 100 C64 90 54 90 50 100 C46 90 36 90 32 100 C28 90 18 90 14 100 C10 90 0 90 0 76 C10 72 10 62 0 58 C10 54 10 44 0 40 C10 36 10 26 0 22 C0 10 10 10 14 0 C18 10 28 10 32 0 C36 10 46 10 50 0 Z"
                          fill={bundle.id === "monthly-sale" ? "#E53E3E" : "#3182CE"}
                          className="opacity-90 shadow-md"
                        />
                      </svg>
                      {/* Badge value overlay centered */}
                      <div className="z-10 flex flex-col items-center justify-center -rotate-1 select-none pointer-events-none">
                        <span className="text-[10px] font-black text-white leading-none drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)]">
                          {bundle.badgePct}
                        </span>
                        <span className="text-[5.5px] font-mono uppercase text-white font-extrabold block leading-none scale-90">
                          MÁS
                        </span>
                      </div>
                    </div>

                    {/* Share icon matching orange top crest */}
                    <div className="absolute top-2.5 left-2.5 z-10 w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 hover:bg-amber-500/20 transition-all cursor-pointer" title="Compartir Oferta">
                      <span className="text-[9px] font-black leading-none">⚙️</span>
                    </div>

                  </div>

                  {/* INNER CONTAINER / BLUE TRANSITION HEADER (Receive 100 Gems) */}
                  <div className={`px-4 py-2 text-center select-none ${
                    bundle.id === "monthly-sale" 
                      ? "bg-rose-950/20 border-y border-red-500/15" 
                      : "bg-[#1A202C]/40 border-y border-white/[0.03]"
                  }`}>
                    
                    <div className="flex items-center justify-center gap-1 text-white">
                      <span className="text-[10.5px] font-mono uppercase font-black tracking-wider text-slate-100">
                        RECIBE {bundle.gemsReward.toLocaleString()} BONUS
                      </span>
                      <Coins className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                    </div>

                    <div className="text-[8.5px] font-mono font-black text-amber-400 tracking-wider uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] mt-0.5">
                      Y REGALOS POR VALOR DE {bundle.giftValueGems.toLocaleString()} GD COIN
                    </div>

                  </div>

                  {/* VALUE TABLE / DETAILED LISTING FRAME WITH VINTAGE CREAM BACKGROUND LOOK */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    
                    <div className="space-y-1.5 bg-[#eae2d3]/[0.1] border border-stone-800/40 p-2.5 rounded-xl text-[8.5px] font-mono leading-none flex flex-col justify-center min-h-[145px]">
                      {bundle.items.map((itm, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between border-b border-white/[0.03] pb-1.5 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center gap-1.5">
                            {/* Inner circle visual bullet */}
                            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${itm.color} shadow-md flex items-center justify-center text-[10px]`}>
                              {itm.icon}
                            </div>
                            <div>
                              <span className="text-[#eeeeee] font-black tracking-normal uppercase block text-[8px] sm:text-[8.5px]">
                                {itm.name}
                              </span>
                              {itm.subText && (
                                <span className="text-[6.5px] text-zinc-500 font-medium block uppercase tracking-wider scale-95 origin-left">
                                  {itm.subText}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Circle badge display count x1 x3 etc */}
                          <div className="w-5 h-5 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center font-black text-[9px] text-[#E53E3E]">
                            {itm.quantity}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* BUNDLE FOOTER META DETAILS (Timer count and remaining stock limits) */}
                    <div className="mt-3.5 pt-2.5 border-t border-white/[0.04] space-y-2 select-none">
                      
                      <div className="flex items-center justify-between text-[7px] sm:text-[7.5px] font-mono text-[#A0A2A5]/70 uppercase">
                        
                        {/* Cooldown state */}
                        <div className="flex items-center gap-1 tracking-wider">
                          <Clock className="w-3 h-3 text-[#E53E3E] animate-pulse" />
                          <span>EXPIRA: {formatTime(timeLeftSecs, bundle.cooldownDays)}</span>
                        </div>

                        {/* Inventory stock count limits */}
                        <div className="tracking-widest font-bold">
                          LIM. CUPO: <span className="text-[#E53E3E] font-black">{bundle.storageLeft} DISP.</span>
                        </div>

                      </div>

                      {/* CTA BUY TRIGGERS AND INTERACTIVE TRANSACTION STREAMS */}
                      <div className="relative">
                        {isP ? (
                          <div className="w-full py-2.5 rounded-xl bg-neutral-900 border border-white/5 text-center text-zinc-600 font-mono font-black text-[9px] tracking-widest uppercase cursor-not-allowed">
                            ADQUIRIDO / AGOTADO ❌
                          </div>
                        ) : isProcessing === bundle.id ? (
                          <div className="w-full py-2.5 rounded-xl bg-[#E53E3E]/20 border border-[#E53E3E]/40 text-center text-[#E53E3E] font-mono font-black text-[9px] tracking-widest uppercase flex items-center justify-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-[#E53E3E] border-t-transparent rounded-full animate-spin" />
                            PROCESANDO CARGA...
                          </div>
                        ) : (
                          <button
                            onClick={(e) => handlePurchase(bundle, e)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-yellow-500 hover:to-amber-500 text-stone-950 font-serif font-black text-center text-[10px] sm:text-[10.5px] uppercase tracking-[0.15em] transition-all cursor-pointer shadow-lg shadow-amber-400/10 active:scale-[0.985] flex items-center justify-center gap-1.5 border border-amber-300/40"
                          >
                            <span>ADQUIRIR // {bundle.price}</span>
                          </button>
                        )}
                      </div>

                    </div>

                  </div>

                </div>
              );
            })}

          </div>

        </div>

      </div>

      {/* DETAILED DIALOG MODAL SIMULATING SECURE CREDIT TRANSACTION OR RECEIPT POPUP */}
      <AnimatePresence>
        {successBundle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-b from-[#161a20] to-[#0c0d0f] border border-amber-400/50 p-6 rounded-2xl max-w-sm w-full text-center relative shadow-[0_0_50px_rgba(245,158,11,0.15)]"
            >
              
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => {
                    playSfxTone("click");
                    setSuccessBundle(null);
                  }}
                  className="w-6 h-6 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="w-12 h-12 rounded-full bg-amber-500/10 border-2 border-amber-400 flex items-center justify-center text-amber-400 mx-auto animate-bounce mb-3">
                <Sparkles className="w-6 h-6" />
              </div>

              <span className="text-[7.5px] font-mono text-amber-400 uppercase tracking-widest font-black block">
                CARGA AUTORIZADA EXCELENTE
              </span>
              <h3 className="text-sm font-black text-white uppercase tracking-widest mt-0.5">
                ¡SUMINISTROS ENTREGADOS!
              </h3>
              
              <p className="text-[9.5px] font-mono text-neutral-400 uppercase leading-relaxed mt-2 p-1.5 border border-white/5 bg-black/20 rounded">
                El lote <span className="text-white font-bold">{successBundle.title}</span> se ha fusionado con las reservas generales de tu estación matriz.
              </p>

              <div className="my-4 space-y-1 text-left bg-[#eae2d3]/[0.1] p-3 rounded-lg text-[8px] font-mono border border-stone-800">
                <div className="text-neutral-400 tracking-wider">RECURSOS ADQUIRIDOS:</div>
                <div className="text-yellow-400 font-bold flex items-center gap-1">
                  • +{successBundle.gemsReward} GD COIN BONUS 🪙
                </div>
                {successBundle.items.map((itm, i) => (
                  <div key={i} className="text-neutral-300 font-medium pl-1.5">
                    • +{itm.quantity} {itm.name} {itm.icon}
                  </div>
                ))}
                <div className="text-yellow-400 font-bold">
                  • Multiplicadores de Oro de Combate activados ✨
                </div>
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  playSfxTone("click");
                  setSuccessBundle(null);
                }}
                className="w-full text-[8px] font-mono tracking-widest bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg uppercase py-2"
              >
                CONFIRMAR RECOLECCIÓN
              </Button>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
