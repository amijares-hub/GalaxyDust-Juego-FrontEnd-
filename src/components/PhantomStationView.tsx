import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ShoppingBag, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAudioEngine } from '../hooks/useAudioEngine';

const PHANTOM_COIN_ASSET = "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Phantom%20Coin.png";
const GD_COIN_ASSET = "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/GD%20Coin.png";

interface PhantomStationViewProps {
  onBack: () => void;
  triggerNotification?: (text: string, e?: any) => void;
}

interface PhantomBlueprint {
  id: string;
  name: string;
  category: string;
  rarity: string;
  priceValue: number;
  currencyType: string;
  description: string;
  image: string;
}

const CATEGORY_IMAGES: Record<string, string> = {
  NAVES: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300',
  ESTRUCTURAS: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300',
  DEFENSAS: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300',
  TECNOLOGÍAS: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=300',
  INSIGNIAS: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300',
  BLUEPRINTS: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=300',
  LICENCIAS: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300',
  TOOLS: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=300',
  CONSUMIBLES: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300',
  ASTROBOTS: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=300'
};

const EMERGENCY_FALLBACK_ITEMS: PhantomBlueprint[] = [
  {
    id: 'PH-FB-01',
    name: 'LIGHT HUNTER BLUEPRINT',
    category: 'BLUEPRINTS',
    rarity: 'COMMON',
    priceValue: 1000,
    currencyType: 'Phantom Coins',
    description: 'Plano de ensamblaje ligero para unidades de reconocimiento.',
    image: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=300'
  },
  {
    id: 'PH-FB-02',
    name: 'HEAVY HUNTER ZX08 BLUEPRINT',
    category: 'BLUEPRINTS',
    rarity: 'COMMON',
    priceValue: 10000,
    currencyType: 'Phantom Coins',
    description: 'Nave pesada de asalto frontal con blindaje reforzado.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300'
  },
  {
    id: 'PH-FB-03',
    name: 'CHILLIAD CX01 BLUEPRINT',
    category: 'BLUEPRINTS',
    rarity: 'COMMON',
    priceValue: 100000,
    currencyType: 'Phantom Coins',
    description: 'Caza estelar avanzado con propulsión por plasma.',
    image: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=300'
  }
];

export const PhantomStationView: React.FC<PhantomStationViewProps> = ({
  onBack,
  triggerNotification
}) => {
  const { playSfx } = useAudioEngine();
  const [refreshCountdown, setRefreshCountdown] = useState<string>('03:00:00');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [blueprints, setBlueprints] = useState<PhantomBlueprint[]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLiveStore = useCallback(async () => {
    setLoading(true);
    let loadedItems: PhantomBlueprint[] = [];

    try {
      // 1. Lectura principal desde phantom_rotation_config
      const { data: allLists, error: listErr } = await supabase
        .from('phantom_rotation_config')
        .select('*');

      if (!listErr && Array.isArray(allLists) && allLists.length > 0) {
        const activeList = allLists.find((l: any) => l.is_active === true || l.isActive === true) || allLists[0];

        if (activeList && Array.isArray(activeList.items) && activeList.items.length > 0) {
          const slotCount = Math.min(8, Math.max(1, Number(activeList.display_slots || activeList.displaySlots) || 8));
          let rawItems = activeList.items.filter((i: any) => i && typeof i === 'object');

          if (activeList.selection_mode === 'random' || activeList.selectionMode === 'random') {
            rawItems = [...rawItems].sort(() => Math.random() - 0.5);
          }
          rawItems = rawItems.slice(0, slotCount);

          loadedItems = rawItems.map((item: any, idx: number) => {
            const rawCat = String(item.category || 'BLUEPRINTS').toUpperCase();
            return {
              id: String(item.id || `PH-${idx}-${Date.now()}`),
              name: String(item.name || 'ACTIVO VOID').toUpperCase(),
              category: rawCat,
              rarity: String(item.rarity || item.rank || 'COMMON').toUpperCase(),
              priceValue: Number(item.priceValue || item.pricePH || item.price) || 1000,
              currencyType: String(item.currencyType || 'Phantom Coins'),
              description: String(item.description || `Dispositivo coloidal en oferta. Stock: ${item.storageLeft ?? 10} u.`),
              image: item.image || CATEGORY_IMAGES[rawCat] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300'
            };
          });
        }
      }

      // 2. Lectura secundaria desde sasori_game_hud
      if (loadedItems.length === 0) {
        const { data: hudData } = await supabase
          .from('sasori_game_hud')
          .select('config')
          .eq('id', 'global_hud_config')
          .maybeSingle();

        const catalog = hudData?.config?.phantomStation?.suppliesCatalog;
        if (Array.isArray(catalog) && catalog.length > 0) {
          loadedItems = catalog.map((item: any, idx: number) => {
            const rawCat = String(item.category || 'MÓDULO').toUpperCase();
            return {
              id: String(item.id || `HUD-${idx}`),
              name: String(item.name || 'ACTIVO VOID').toUpperCase(),
              category: rawCat,
              rarity: String(item.rank || item.rarity || 'COMMON').toUpperCase(),
              priceValue: Number(item.priceValue || item.pricePH || item.price) || 1000,
              currencyType: String(item.currencyType || 'Phantom Coins'),
              description: String(item.description || 'Módulo espacial registrado en la Estación C.A.N.'),
              image: item.image || CATEGORY_IMAGES[rawCat] || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300'
            };
          });
        }
      }

      // 3. Fallback de respaldo para evitar tienda vacía
      if (loadedItems.length === 0) {
        loadedItems = EMERGENCY_FALLBACK_ITEMS;
      }

      setBlueprints(loadedItems);

      // Cargar frecuencia de rotación
      const { data: timerData } = await supabase
        .from('sasori_game_hud')
        .select('config')
        .eq('id', 'global_hud_config')
        .maybeSingle();

      if (timerData?.config?.phantomStation?.autoRefreshStockTimerSeconds) {
        setTimerSeconds(Number(timerData.config.phantomStation.autoRefreshStockTimerSeconds));
      }
    } catch (err) {
      console.error("Error cargando tienda:", err);
      setBlueprints(EMERGENCY_FALLBACK_ITEMS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveStore();

    const channel = supabase
      .channel('phantom_game_sync_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phantom_rotation_config' }, () => fetchLiveStore())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sasori_game_hud' }, () => fetchLiveStore())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLiveStore]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const intervalMs = Math.max(10, timerSeconds || 60) * 1000;
      const remainingMs = intervalMs - (now % intervalMs);

      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      setRefreshCountdown(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  const handleAcquireBlueprint = async (bp: PhantomBlueprint) => {
    if (purchasingId) return;
    setPurchasingId(bp.id);
    playSfx(880);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión no autenticada.");

      const { error } = await supabase.rpc('acquire_phantom_station_item_secure', {
        p_item_id: bp.id,
        p_item_name: bp.name,
        p_category: bp.category,
        p_price_ph: bp.priceValue
      });

      if (error) throw error;

      playSfx(1200);
      if (triggerNotification) {
        triggerNotification(`📜 ACTIVO VOID ADQUIRIDO: ${bp.name}`);
      }
    } catch (err: any) {
      console.error("Error en compra:", err);
      playSfx(300);
      if (triggerNotification) {
        triggerNotification(`⛔ TRANSACCIÓN FALLIDA: ${err.message}`);
      }
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-[#080b0e] border border-cyan-500/30 p-3 rounded-2xl shadow-2xl relative overflow-hidden font-mono text-left select-none text-white">
      <div className="w-full flex flex-col lg:flex-row gap-3 items-stretch">
        
        {/* HERO POSTER */}
        <div className="w-full lg:w-3/12 shrink-0 relative rounded-xl overflow-hidden border border-cyan-500/40 bg-[#05070a] flex flex-col justify-between p-3 min-h-[360px] shadow-2xl group">
          <div className="absolute inset-0 z-0">
            <img
              src="https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Phatom%20Station/Skin%20Original/phantom%20station.png"
              alt="Phantom Station"
              className="w-full h-full object-cover object-center brightness-75 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080b0e] via-[#080b0e]/40 to-black/60 z-10" />
            <div className="absolute inset-0 bg-cyan-950/20 mix-blend-overlay z-10" />
          </div>

          <div className="relative z-20 flex justify-between items-center">
            <button
              onClick={() => { playSfx(660); onBack(); }}
              className="p-1.5 bg-black/80 hover:bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded-lg transition-all cursor-pointer backdrop-blur-md flex items-center gap-1 text-[8px] font-bold uppercase shadow-lg"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>VOLVER</span>
            </button>
          </div>

          <div className="relative z-20 flex flex-col gap-1.5 mt-auto text-left">
            <h1 className="text-lg lg:text-xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
              PHANTOM STATION
            </h1>

            <p className="text-[8px] text-zinc-300 font-sans normal-case leading-tight">
              Estación espacial descentralizada para la adquisición de blueprints, prototipos de combate y tecnología coloidal.
            </p>

            <div className="flex items-center gap-1.5 mt-1 bg-black/80 border border-cyan-500/40 px-2.5 py-1 rounded-lg backdrop-blur-md w-fit">
              <Clock className="w-3 h-3 text-cyan-400 animate-pulse shrink-0" />
              <div className="flex items-center gap-1 text-[7.5px] font-mono uppercase">
                <span className="text-zinc-400">REFRESCO EN:</span>
                <span className="text-amber-400 font-black tracking-wider">{refreshCountdown}</span>
              </div>
            </div>
          </div>
        </div>

        {/* GRID DE CARDS RESISTENTE A FALLOS */}
        <div className="flex-1 w-full lg:w-9/12 bg-[#05070a] border border-cyan-500/20 p-2.5 rounded-xl flex flex-col justify-between min-h-[360px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center my-auto text-cyan-400 font-mono text-xs gap-2 py-20">
              <RefreshCw className="animate-spin w-6 h-6" />
              <span>Conectando con la Estación Phantom...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full h-full">
              {blueprints.map((bp) => {
                const isGD = String(bp.currencyType || '').includes('GD');
                const rarityUpper = String(bp.rarity || 'COMMON').toUpperCase();

                return (
                  <div
                    key={bp.id}
                    className="bg-[#050910] border border-cyan-500/30 hover:border-cyan-400 p-2 rounded-lg shadow-xl flex flex-col justify-between gap-1.5 transition-all relative group"
                  >
                    <div className="flex justify-between items-center border-b border-cyan-950 pb-1">
                      <span className="text-[6.5px] text-cyan-400/80 font-bold uppercase truncate max-w-[70px]">
                        {bp.category || 'MÓDULO'}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[6px] font-black uppercase border shrink-0 ${
                        rarityUpper === 'LEGENDARY' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                        rarityUpper === 'EPIC' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                        rarityUpper === 'EXCLUSIVE' ? 'bg-red-950 text-red-400 border-red-800' :
                        rarityUpper === 'PHANTOM' ? 'bg-indigo-950 text-indigo-300 border-indigo-800' :
                        'bg-cyan-950 text-cyan-300 border-cyan-800'
                      }`}>
                        {rarityUpper}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="w-full h-16 bg-black border border-cyan-950 rounded p-0.5 overflow-hidden flex items-center justify-center">
                        <img
                          src={bp.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300'}
                          alt={bp.name || 'Activo'}
                          className="w-full h-full object-cover rounded brightness-90 group-hover:scale-105 transition-transform"
                        />
                      </div>

                      <h3 className="text-[8.5px] font-black text-white uppercase tracking-wider line-clamp-1">
                        {bp.name || 'ACTIVO PHANTOM'}
                      </h3>
                      <p className="text-[7.5px] text-zinc-400 font-sans normal-case line-clamp-1 leading-tight">
                        {bp.description || 'Sin descripción disponible.'}
                      </p>
                    </div>

                    <div className="bg-[#020305] border border-cyan-950 p-1 rounded flex justify-between items-center text-[7.5px]">
                      <span className="text-[6.5px] text-zinc-500 uppercase font-bold">PRECIO</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9.5px] font-black text-cyan-300">
                          {(bp.priceValue || 0).toLocaleString()}
                        </span>
                        <img
                          src={isGD ? GD_COIN_ASSET : PHANTOM_COIN_ASSET}
                          alt={bp.currencyType}
                          className="w-3.5 h-3.5 object-contain"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcquireBlueprint(bp)}
                      disabled={purchasingId === bp.id}
                      className="w-full py-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-110 text-white font-black text-[7.5px] uppercase rounded transition-all cursor-pointer flex items-center justify-center gap-1 shadow-[0_0_6px_rgba(6,182,212,0.3)] disabled:opacity-50"
                    >
                      {purchasingId === bp.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <ShoppingBag className="w-3 h-3" />
                          <span>ADQUIRIR ({(bp.priceValue || 0).toLocaleString()}</span>
                          <img
                            src={isGD ? GD_COIN_ASSET : PHANTOM_COIN_ASSET}
                            alt={bp.currencyType}
                            className="w-3 h-3 object-contain"
                          />
                          <span>)</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PhantomStationView;