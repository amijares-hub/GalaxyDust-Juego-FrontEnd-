import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  ShieldCheck,
  User,
  Swords,
  Zap,
  Shield,
  Plus,
  Coins,
  Sparkles,
  Home,
  ShoppingBag,
  Radio,
  Cpu,
  Wallet,
  Box
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CardStack, CardStackItem } from './ui/card-stack';
import { Button } from './ui/joly-button';
import { ExpeditionsView } from './ExpeditionsView';
import { MarketplaceView } from './MarketplaceView';
import { PhantomStationView } from './PhantomStationView';
import { InventoryView } from './InventoryView';
import { AllianceView } from './AllianceView';

interface UserProfile {
  email: string;
  name: string;
  provider: 'password' | 'google' | 'github' | 'facebook';
  registrationDate: string;
  mfaEnabled: boolean;
  verified: boolean;
  avatarUrl: string;
  assignedToken: string;
}

interface HomepageProps {
  user: UserProfile;
  onLogout: () => void;
}

const items: CardStackItem[] = [
  {
    id: 1,
    title: "EXPEDICIONES",
    description: "Explora sectores estelares desconocidos en busca de tecnología avanzada y recursos cósmicos.",
    imageSrc: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
    href: "#",
    ctaLabel: "INICIAR EXPEDICIÓN"
  },
  {
    id: 2,
    title: "INVENTARIO",
    description: "Administra el armamento cuántico, escudos deflectores y naves de la flota.",
    imageSrc: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
    href: "#",
    ctaLabel: "GESTIONAR ASSETS"
  },
  {
    id: 3,
    title: "ALIANZA",
    description: "Coordina flotas intergalácticas y establece enlaces criptográficos seguros con tu alianza.",
    imageSrc: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800&auto=format&fit=crop",
    href: "#",
    ctaLabel: "CONECTAR RED"
  }
];

export const Homepage: React.FC<HomepageProps> = ({ user, onLogout }) => {
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "marketplace" | "phantom" | "can" | "inventory">("home");
  const [activeWindow, setActiveWindow] = useState<"home" | "expeditions" | "alliance">("home");
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  // HUD STATE ENGINE PRINCIPAL
  const [power, setPower] = useState(0);
  const [energy, setEnergy] = useState(120);

  // MONEDAS Y LICENCIAS
  const [currencies, setCurrencies] = useState({
    gd_coin: 0,
    quantum_credit: 0,
    phantom_coin: 0,
    halloween_coin: 0,
    xmas_coin: 0,
    valentine_coin: 0
  });

  // RECURSOS
  const [resources, setResources] = useState({
    metal: 0,
    crystal: 0,
    deuterium: 0,
    dark_matter: 0,
    omniplate: 0,
    orichaltron: 0,
    lunar_fiber: 0,
    infinite_core: 0,
    pt_token: 0,
    primal_token: 0,
    xenoplasm: 0,
    organium: 0,
    mana: 0,
    wood: 0
  });

  const [activeBuffs, setActiveBuffs] = useState({ attack: true, defense: false, speed: true });
  const [floatingTexts, setFloatingTexts] = useState<{ id: number; text: string; x: number; y: number }[]>([]);

  // 📡 CONEXIÓN REALTIME ASÍNCRONA OPTIMIZADA (PREVIENE RACE CONDITIONS)
  useEffect(() => {
    let channel: any;
    let isMounted = true;

    const initEconomyEngine = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !isMounted) return;

      // 1. Lectura canónica inicial libre de duplicados
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (profile && isMounted) {
        setPower(parseFloat(profile.power_score || 0));
        setCurrencies({
          gd_coin: parseFloat(profile.gd_coin || 0),
          quantum_credit: parseFloat(profile.quantum_credit || 0),
          phantom_coin: parseFloat(profile.phantom_coin || 0),
          halloween_coin: parseFloat(profile.halloween_coin || 0),
          xmas_coin: parseFloat(profile.xmas_coin || 0),
          valentine_coin: parseFloat(profile.valentine_coin || 0)
        });
        setResources(prev => ({
          ...prev,
          metal: parseFloat(profile.metal || 0),
          crystal: parseFloat(profile.crystal || 0),
          deuterium: parseFloat(profile.deuterium || 0),
          dark_matter: parseFloat(profile.dark_matter || 0),
          omniplate: parseFloat(profile.omniplate || 0),
          orichaltron: parseFloat(profile.orichaltron || 0),
          lunar_fiber: parseFloat(profile.lunar_fiber || 0),
          infinite_core: parseFloat(profile.infinite_core || 0),
          primal_token: parseFloat(profile.primal_token || 0),
          xenoplasm: parseFloat(profile.xenoplasm || 0),
          organium: parseFloat(profile.organium || 0),
          mana: parseFloat(profile.mana || 0)
        }));
      }

      // 2. Montaje síncrono del canal WebSockets libre de solapamientos
      channel = supabase
        .channel(`economy_hud_stream_${authUser.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${authUser.id}` }, (payload: any) => {
          const updated = payload.new;
          if (!updated || !isMounted) return;

          setPower(parseFloat(updated.power_score || 0));
          setCurrencies({
            gd_coin: parseFloat(updated.gd_coin || 0),
            quantum_credit: parseFloat(updated.quantum_credit || 0),
            phantom_coin: parseFloat(updated.phantom_coin || 0),
            halloween_coin: parseFloat(updated.halloween_coin || 0),
            xmas_coin: parseFloat(updated.xmas_coin || 0),
            valentine_coin: parseFloat(updated.valentine_coin || 0)
          });
          setResources(prev => ({
            ...prev,
            metal: parseFloat(updated.metal || 0),
            crystal: parseFloat(updated.crystal || 0),
            deuterium: parseFloat(updated.deuterium || 0),
            dark_matter: parseFloat(updated.dark_matter || 0),
            omniplate: parseFloat(updated.omniplate || 0),
            orichaltron: parseFloat(updated.orichaltron || 0),
            lunar_fiber: parseFloat(updated.lunar_fiber || 0),
            infinite_core: parseFloat(updated.infinite_core || 0),
            primal_token: parseFloat(updated.primal_token || 0),
            xenoplasm: parseFloat(updated.xenoplasm || 0),
            organium: parseFloat(updated.organium || 0),
            mana: parseFloat(updated.mana || 0)
          }));
        })
        .subscribe();
    };

    initEconomyEngine();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleSetCrystal = useCallback((val: React.SetStateAction<number>) => {
    if (typeof val === 'function') {
      setResources(prev => ({ ...prev, crystal: (val as (p: number) => number)(prev.crystal) }));
    } else {
      setResources(prev => ({ ...prev, crystal: val }));
    }
  }, []);

  const handleSetPower = useCallback((val: React.SetStateAction<number>) => {
    if (typeof val === 'function') {
      setPower(prev => (val as (p: number) => number)(prev));
    } else {
      setPower(val);
    }
  }, []);

  const handleSetGdCoin = useCallback((val: React.SetStateAction<number>) => {
    if (typeof val === 'function') {
      setCurrencies(prev => ({ ...prev, gd_coin: (val as (p: number) => number)(prev.gd_coin) }));
    } else {
      setCurrencies(prev => ({ ...prev, gd_coin: val }));
    }
  }, []);

  const triggerFloatingText = (text: string, e?: any) => {
    const id = Date.now() + Math.random();
    let x = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
    let y = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;

    if (e) {
      if (typeof e.x === "number" && typeof e.y === "number") {
        x = e.x;
        y = e.y - 12;
      } else if (e.currentTarget) {
        try {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          if (rect) {
            x = rect.left + rect.width / 2;
            y = rect.top - 12;
          }
        } catch (err) {
          console.warn(err);
        }
      }
    }

    setFloatingTexts(prev => [...prev, { id, text, x, y }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(item => item.id !== id));
    }, 1000);
  };

  const handlePowerSurge = async (e: React.MouseEvent) => {
    const amount = Math.floor(Math.random() * 850) + 150;
    setPower(prev => prev + amount);
    triggerFloatingText(`+${amount.toLocaleString()} ⚔️ POWER`, e);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await supabase.rpc('update_user_power', { user_uuid: authUser.id, amount });
    }
  };

  const handleEnergyReplenish = (e: React.MouseEvent) => {
    if (energy >= 190) {
      triggerFloatingText("⚡ ENERGY MAXIMUM", e);
      return;
    }
    setEnergy(prev => Math.min(190, prev + 25));
    triggerFloatingText("+25 AP ⚡", e);
  };

  const handleClaimAsset = async (type: 'currency' | 'resource', key: string, label: string, e: React.MouseEvent) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const amount = type === 'currency' ? 5.0 : 10.0;

    if (type === 'currency') {
      setCurrencies(prev => ({ ...prev, [key]: prev[key as keyof typeof currencies] + amount }));
      triggerFloatingText(`+${amount} ${label}`, e);
    } else {
      setResources(prev => ({ ...prev, [key]: prev[key as keyof typeof resources] + amount }));
      triggerFloatingText(`+${amount}K ${label}`, e);
    }

    await supabase.rpc('increment_player_resource', {
      user_uuid: authUser.id,
      resource_col: key,
      increment_amount: amount
    });
  };

  const handlePurchaseGems = async (e: React.MouseEvent) => {
    setResources(prev => ({ ...prev, crystal: prev.crystal + 1000 }));
    triggerFloatingText("+1,000 CRISTALES 💎", e);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await supabase.rpc('increment_player_resource', { user_uuid: authUser.id, resource_col: 'crystal', increment_amount: 1000 });
    }
  };

  const currencyMeta = [
    { key: 'gd_coin', label: 'GD COIN', icon: '🏆', style: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' },
    { key: 'quantum_credit', label: 'QUANTUM CREDIT', icon: '💳', style: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
    { key: 'phantom_coin', label: 'PHANTOM COIN', icon: '👻', style: 'bg-purple-500/10 border-purple-500/30 text-purple-400' },
    { key: 'halloween_coin', label: 'HALLOWEEN COIN', icon: '🎃', style: 'bg-orange-500/10 border-orange-500/30 text-orange-400' },
    { key: 'xmas_coin', label: 'XMAS COIN', icon: '🎄', style: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
    { key: 'valentine_coin', label: 'VALENTINE COIN', icon: '💝', style: 'bg-rose-500/10 border-rose-500/30 text-rose-400' }
  ];

  const resourceMeta = [
    { key: 'metal', label: 'METAL', icon: '⚙️' },
    { key: 'crystal', label: 'CRISTAL', icon: '💎' },
    { key: 'deuterium', label: 'DEUTERIUM', icon: '🧪' },
    { key: 'dark_matter', label: 'DARK MATTER', icon: '🌌' },
    { key: 'omniplate', label: 'OMNIPLATE', icon: '🛡️' },
    { key: 'orichaltron', label: 'ORICHALTRON', icon: '🔱' },
    { key: 'lunar_fiber', label: 'LUNAR FIBER', icon: '🕸️' },
    { key: 'infinite_core', keyLabel: 'INF CORE', label: 'INFINITE CORE', icon: '🔮' },
    { key: 'primal_token', keyLabel: 'PRM TOKEN', label: 'PRIMAL TOKEN', icon: '🧿' },
    { key: 'xenoplasm', label: 'XENOPLASM', icon: '🧪' },
    { key: 'organium', label: 'ORGANIUM', icon: '🌿' },
    { key: 'mana', label: 'MANA', icon: '✨' }
  ];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070809] text-white flex flex-col justify-start items-center font-sans select-none">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-rose-500/[0.03] rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] bg-cyan-500/[0.02] rounded-full blur-[140px] pointer-events-none z-0" />

      <AnimatePresence>
        {floatingTexts.map(f => (
          <motion.div key={f.id} initial={{ opacity: 1, y: f.y, scale: 0.8 }} animate={{ opacity: 0, y: f.y - 70, scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: 0.85, ease: "easeOut" }} style={{ left: f.x, top: f.y }} className="fixed z-55 pointer-events-none -translate-x-1/2 select-none text-[10px] font-mono font-black text-[#E53E3E] bg-black/85 border border-[#E53E3E]/30 px-3 py-1 rounded shadow-[0_0_15px_rgba(229,62,62,0.5)] uppercase tracking-wider">
            {f.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* BARRA SUPERIOR DEL HUD */}
      <div className="w-full mt-4 mb-4 px-4 md:px-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 z-40 select-none flex-shrink-0">

        {/* COMPONENTE IZQUIERDO: PERFIL */}
        <div className="flex items-center gap-2 bg-[#090a0e]/60 border border-white/5 pb-2 pt-1.5 px-3 rounded-xl backdrop-blur-md shadow-2xl relative flex-shrink-0">
          <div onClick={() => setShowProfileDrawer(true)} className="relative cursor-pointer flex-shrink-0 mr-1">
            <div className="w-12 h-12 rounded-full p-[2.5px] bg-gradient-to-tr from-[#2c7a7b] via-[#2f855a] to-[#e53e3e] shadow-lg">
              <div className="w-full h-full rounded-full bg-neutral-900 overflow-hidden relative">
                {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-5 h-5 text-white/40" /></div>}
              </div>
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#2B6CB0] border border-sky-400/40 text-[8px] font-mono font-black text-white rounded px-1.5 py-0.5 shadow-md">27</div>
          </div>

          <div className="flex flex-col gap-0.5">
            <div onClick={handlePowerSurge} className="h-[22px] w-[135px] bg-gradient-to-r from-[#ca421e] to-[#7f1c07] border border-[#f57457]/30 rounded flex items-center justify-between px-2 cursor-pointer shadow-md group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-1 z-10">
                <Swords className="w-3 h-3 text-amber-200" />
                <span className="text-[10.5px] font-black font-mono">{power.toLocaleString()}</span>
              </div>
              <span className="text-[6px] font-mono font-black text-amber-300/40 tracking-wider">POW</span>
            </div>

            <div onClick={handleEnergyReplenish} className="h-[18px] w-[135px] bg-black/60 border border-white/5 rounded flex items-center px-2 justify-between cursor-pointer relative overflow-hidden shadow-inner">
              <div className="absolute left-0 top-0 bottom-0 bg-[#E53E3E]/12 transition-all duration-500" style={{ width: `${(energy / 190) * 100}%` }} />
              <div className="flex items-center gap-1 z-10">
                <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400/25" />
                <span className="text-[9px] font-mono font-black">{energy}/190</span>
              </div>
              <span className="text-[6px] font-mono text-white/20">AP</span>
            </div>

            <div className="flex items-center gap-1 mt-0.5 ml-0.5">
              <button onClick={(e) => { e.stopPropagation(); setActiveBuffs(prev => ({ ...prev, attack: !prev.attack })) }} className={`w-[15px] h-[15px] border rounded flex items-center justify-center transition-all cursor-pointer ${activeBuffs.attack ? 'bg-[#E53E3E]/20 border-[#E53E3E]/60 shadow-md' : 'bg-black/40 border-white/10 opacity-35'}`}><Swords className="w-2 h-2 text-[#E53E3E]" /></button>
              <button onClick={(e) => { e.stopPropagation(); setActiveBuffs(prev => ({ ...prev, defense: !prev.defense })) }} className={`w-[15px] h-[15px] border rounded flex items-center justify-center transition-all cursor-pointer ${activeBuffs.defense ? 'bg-indigo-500/20 border-indigo-500/60' : 'bg-black/40 border-white/10 opacity-35'}`}><Shield className="w-2 h-2 text-indigo-400" /></button>
              <button onClick={(e) => { e.stopPropagation(); setActiveBuffs(prev => ({ ...prev, speed: !prev.speed })) }} className={`w-[15px] h-[15px] border rounded flex items-center justify-center transition-all cursor-pointer ${activeBuffs.speed ? 'bg-amber-500/20 border-amber-500/60' : 'bg-black/40 border-white/10 opacity-35'}`}><Sparkles className="w-2 h-2 text-amber-400" /></button>
              <button onClick={(e) => { e.stopPropagation(); triggerFloatingText("CANAL CODIFICADO SECURE", e); }} className="w-[15px] h-[15px] border border-white/10 bg-white/5 rounded flex items-center justify-center cursor-pointer"><Plus className="w-2 h-2 text-white/50" /></button>
            </div>
          </div>

          <div className="relative w-10 h-10 bg-gradient-to-b from-[#8f9ca8] to-[#424950] border border-slate-300/40 rounded-full shadow flex items-center justify-center overflow-hidden ml-1">
            <span className="text-white font-mono font-black text-[12px] drop-shadow-md z-10">7</span>
            <div className="absolute -bottom-1 inset-x-0 h-2 bg-black/40 flex items-center justify-center z-10"><span className="text-[5.5px] font-mono text-[#E53E3E] font-black uppercase">VIP</span></div>
          </div>
        </div>

        {/* NAVEGACIÓN EN PESTAÑAS CENTRAL */}
        <div className="flex items-center justify-center gap-1.5 bg-[#090a0e]/60 border border-white/5 p-1.5 rounded-xl backdrop-blur-md shadow-2xl overflow-x-auto scrollbar-none flex-shrink-0">
          <Button variant={activeTab === "home" ? "default" : "secondary"} size="sm" onClick={(e) => { setActiveTab("home"); setActiveWindow("home"); triggerFloatingText("SECTOR OPERACIONES", e); }} className="text-[9px] font-mono px-2.5 py-1"><Home className="w-3 h-3 text-[#E53E3E] mr-1" /> Home</Button>
          <Button variant={activeTab === "marketplace" ? "default" : "secondary"} size="sm" onClick={(e) => { setActiveTab("marketplace"); triggerFloatingText("CONEXIÓN MARKETPLACE", e); }} className="text-[9px] font-mono px-2.5 py-1"><ShoppingBag className="w-3 h-3 text-[#E53E3E] mr-1" /> Mercado</Button>
          <Button variant={activeTab === "phantom" ? "default" : "secondary"} size="sm" onClick={(e) => { setActiveTab("phantom"); triggerFloatingText("PHANTOM STATION", e); }} className="text-[9px] font-mono px-2.5 py-1"><Radio className="w-3 h-3 text-red-500 mr-1 animate-pulse" /> Phantom</Button>
          <Button variant={activeTab === "inventory" ? "default" : "secondary"} size="sm" onClick={(e) => { setActiveTab("inventory"); triggerFloatingText("SINCRO INVENTARIO", e); }} className="text-[9px] font-mono px-2.5 py-1"><Swords className="w-3 h-3 text-[#E53E3E] mr-1" /> Inventario</Button>
          <Button variant={activeTab === "can" ? "default" : "secondary"} size="sm" onClick={(e) => { setActiveTab("can"); triggerFloatingText("NÓDULO SINÁPTICO C.A.N", e); }} className="text-[9px] font-mono px-2.5 py-1"><Cpu className="w-3 h-3 text-[#E53E3E] mr-1" /> C.A.N</Button>
        </div>

        {/* ECONOMÍA (MONEDAS + VAULT DROPDOWN) */}
        <div className="flex items-center gap-1.5 bg-[#090a0e]/45 border border-white/5 p-1.5 rounded-xl backdrop-blur-md shadow-2xl flex-shrink-0 overflow-visible relative">
          <div className="text-[7px] font-mono text-white/30 uppercase tracking-widest flex flex-col justify-center mr-1">
            <Wallet className="w-2.5 h-2.5 mb-0.5" /> BANK
          </div>
          {currencyMeta.map(c => (
            <div key={c.key} onClick={(e) => handleClaimAsset('currency', c.key, c.label, e)} className={`flex items-center gap-1 border transition-all rounded-lg pl-1 pr-2 py-0.5 select-none cursor-pointer group font-mono text-[9px] font-bold ${c.style}`}>
              <span>{c.icon}</span>
              <span>{currencies[c.key as keyof typeof currencies].toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
            </div>
          ))}

          {/* VAULT BUTTON & DROPDOWN */}
          <div className="relative ml-2">
            <Button variant={isVaultOpen ? "default" : "secondary"} size="sm" onClick={() => setIsVaultOpen(!isVaultOpen)} className="text-[9px] font-mono px-3 py-1 font-bold tracking-wider">
              <Box className="w-3 h-3 text-sky-400 mr-1.5" /> VAULT RECURSOS
            </Button>

            <AnimatePresence>
              {isVaultOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-3 p-3 bg-[#0a0d14]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 w-[450px]"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {resourceMeta.map(r => (
                      <div key={r.key} onClick={(e) => handleClaimAsset('resource', r.key, r.label, e)} className="flex items-center gap-2 bg-black/40 hover:bg-black/60 border border-white/5 hover:border-white/20 transition-all rounded-lg px-2 py-1.5 select-none cursor-pointer group">
                        <span className="text-sm group-hover:scale-110 transition-transform">{r.icon}</span>
                        <div className="flex flex-col">
                          <span className="text-white/40 font-mono text-[7px] uppercase tracking-wider">{r.label}</span>
                          <span className="text-sky-200 font-mono text-[10px] font-bold">{resources[r.key as keyof typeof resources].toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <div onClick={handlePurchaseGems} className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 transition-all rounded-lg px-2 py-1.5 select-none cursor-pointer group justify-center">
                      <span className="text-sm group-hover:scale-110 transition-transform">💎</span>
                      <span className="text-green-400 font-mono text-[9px] font-black uppercase tracking-widest">ADQUIRIR CRISTALES (BUY)</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* ÁREA CENTRAL DE VENTANAS DEL JUEGO */}
      <div className="w-full max-w-[1500px] flex-1 overflow-y-auto px-4 md:px-6 pb-6 z-10 flex flex-col items-center scrollbar-none">
        <AnimatePresence mode="wait">
          {activeTab === "home" ? (
            activeWindow === "home" ? (
              <motion.div key="sector-home-screen" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.22 }} className="flex flex-col items-center w-full max-w-6xl mx-auto">
                <div className="text-center mb-8">
                  <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-[0.4em] mt-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">GALAXYDUST</h1>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                  {items.map((item) => (
                    <div key={item.id} className="relative h-[380px] w-full rounded-2xl overflow-hidden group border border-white/10 hover:border-[#E53E3E]/50 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.8)] hover:shadow-[0_0_40px_rgba(229,62,62,0.15)] flex flex-col justify-center items-center">
                      {/* Background Image */}
                      <div className="absolute inset-0 z-0">
                        <img src={item.imageSrc} alt={item.title} className="w-full h-full object-cover brightness-50 group-hover:scale-105 group-hover:brightness-75 transition-all duration-700" />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      </div>

                      {/* Content */}
                      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full p-6 text-center">
                        <h2 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-xl mb-auto mt-auto group-hover:scale-110 transition-transform duration-300">
                          {item.title}
                        </h2>

                        {/* Action Button */}
                        <button
                          onClick={(e) => {
                            if (item.title === "EXPEDICIONES") {
                              setActiveWindow("expeditions");
                              triggerFloatingText("ACCEDIENDO A SECTOR EXPEDICIONES...", e);
                            } else if (item.title === "INVENTARIO") {
                              setActiveTab("inventory");
                              triggerFloatingText("ABRIENDO PANEL DE COMPONENTES...", e);
                            } else if (item.title === "ALIANZA") {
                              setActiveWindow("alliance");
                              triggerFloatingText("CONECTANDO ALIANZA CORE...", e);
                            }
                          }}
                          className="w-full mt-auto py-3.5 bg-[#E53E3E] hover:bg-[#FF4A4A] text-white font-mono text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(229,62,62,0.4)] hover:shadow-[0_0_30px_rgba(229,62,62,0.6)] cursor-pointer active:scale-95"
                        >
                          {item.title === "EXPEDICIONES" ? "INICIAR EXPEDICIÓN" : item.title === "INVENTARIO" ? "SISTEMA INVENTARIO" : "VER ALIANZAS"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : activeWindow === "expeditions" ? (
              <motion.div key="sector-expeditions-screen" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="w-full" >
                <ExpeditionsView
                  playerGems={resources.crystal}
                  setPlayerGems={handleSetCrystal}
                  playerPower={power}
                  setPlayerPower={handleSetPower}
                  onClaimResource={handleClaimAsset}
                  onBack={() => setActiveWindow("home")}
                  triggerNotification={(text, e) => triggerFloatingText(text, e)}
                  onNavigateToTab={(tabName) => {
                    if (tabName === 'inventario') {
                      setActiveTab('inventory');
                      setActiveWindow('home');
                    }
                  }}
                />
              </motion.div>
            ) : (
              <motion.div key="sector-alliance-screen" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="w-full" >
                <AllianceView playerGems={resources.crystal} setPlayerGems={handleSetCrystal} playerPower={power} setPlayerPower={handleSetPower} onBack={() => setActiveWindow("home")} triggerNotification={(text, e) => triggerFloatingText(text, e)} />
              </motion.div>
            )
          ) : activeTab === "marketplace" ? (
            <motion.div key="sector-marketplace-screen" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="w-full" >
              <MarketplaceView playerGems={resources.crystal} setPlayerGems={handleSetCrystal} playerPower={power} setPlayerPower={handleSetPower} playerGold={currencies.gd_coin} setPlayerGold={handleSetGdCoin} playerWood={resources.wood} setPlayerWood={() => { }} playerFood={resources.deuterium} setPlayerFood={() => { }} playerStone={resources.dark_matter} setPlayerStone={() => { }} playerOre={resources.metal} setPlayerOre={() => { }} onBack={() => setActiveTab("home")} triggerNotification={(text, e) => triggerFloatingText(text, e)} />
            </motion.div>
          ) : activeTab === "marketplace" || activeTab === "phantom" ? (
            <motion.div key="sector-phantom-screen" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="w-full" >
              <PhantomStationView playerGems={resources.crystal} setPlayerGems={handleSetCrystal} playerPower={power} setPlayerPower={handleSetPower} playerGold={currencies.gd_coin} setPlayerGold={handleSetGdCoin} playerWood={resources.wood} setPlayerWood={() => { }} playerFood={resources.deuterium} setPlayerFood={() => { }} playerStone={resources.dark_matter} setPlayerStone={() => { }} playerOre={resources.metal} setPlayerOre={() => { }} onBack={() => setActiveTab("home")} triggerNotification={(text, e) => triggerFloatingText(text, e)} />
            </motion.div>
          ) : (
            <motion.div key="sector-inventory-screen" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="w-full" >
              <InventoryView playerGems={resources.crystal} setPlayerGems={handleSetCrystal} playerPower={power} setPlayerPower={handleSetPower} playerGold={currencies.gd_coin} setPlayerGold={handleSetGdCoin} onBack={() => setActiveTab("home")} triggerNotification={(text, e) => triggerFloatingText(text, e)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FLYOUT SECURITY PASSPORT DRAWER */}
      <AnimatePresence>
        {showProfileDrawer && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex justify-end">
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 220 }} className="w-full max-w-sm h-full bg-[#090A0C] border-l border-white/5 p-8 flex flex-col justify-between" >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex flex-col text-left">
                    <span className="text-[7.5px] font-mono text-[#E53E3E] tracking-widest">GALAXYDUST PASSPORT</span>
                    <h3 className="text-xs font-black tracking-widest text-white uppercase">FIRMA DIGITAL</h3>
                  </div>
                  <button onClick={() => setShowProfileDrawer(false)} className="py-1 px-3 border border-white/10 rounded-lg text-[8px] font-mono text-white/50 uppercase">CERRAR</button>
                </div>
                <div className="flex flex-col items-center gap-4 text-center py-6 border border-white/5 bg-white/[0.01] rounded-2xl relative">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-[#E53E3E] animate-pulse" />
                  <div className="w-14 h-14 rounded-full border border-white/10 overflow-hidden bg-black p-0.5">
                    {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-neutral-900 flex items-center justify-center"><User className="w-4 h-4 text-white/20" /></div>}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">{user.name}</h4>
                    <span className="text-[10px] text-white/40 font-mono break-all px-4 block mt-1">{user.email}</span>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#E53E3E]/10 border border-[#E53E3E]/20 rounded-full text-[#E53E3E] text-[7.5px] font-mono tracking-widest"><ShieldCheck className="w-3 h-3" />PILOTO AUTORIZADO</div>
                </div>
                <div className="space-y-3.5 font-mono text-[8.5px] text-[#A0A2A5]/80">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2"><span className="text-white/20 tracking-widest text-[7.5px]">Token Acceso:</span><span className="text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[8px]">{user.assignedToken}</span></div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2"><span className="text-white/20 tracking-widest text-[7.5px]">Enlace Primario:</span><span className="text-white font-bold tracking-widest">{user.provider.toUpperCase()}</span></div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2"><span className="text-white/20 tracking-widest text-[7.5px]">Clave Registro:</span><span className="text-white/70">{user.registrationDate}</span></div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2"><span className="text-white/20 tracking-widest text-[7.5px]">MFA ENCRIPTACIÓN:</span><span className="text-emerald-500 font-bold uppercase">HABILITADO</span></div>
                </div>
              </div>
              <div className="space-y-3">
                <button onClick={() => { setShowProfileDrawer(false); onLogout(); }} className="w-full py-3.5 bg-red-500/10 hover:bg-[#E53E3E] border border-red-500/20 text-red-400 hover:text-white font-mono tracking-widest text-[9px] font-extrabold rounded-2xl transition-all">DESCONECTAR FIRMA</button>
                <div className="text-center text-[7px] text-white/20 tracking-widest font-mono">SISTEMA_CRIPTOGRÁFICO // SASORILABS</div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};