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
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'PHANTOM' | 'EXCLUSIVE';
  priceValue: number;
  currencyType: string;
  description: string;
  image: string;
}

const CATEGORY_IMAGES: Record<string, string> = {
  Naves: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300',
  Estructuras: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300',
  Defensas: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300',
  Tecnologías: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=300',
  Insignias: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300',
  Blueprints: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=300',
  Licencias: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300',
  Tools: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=300',
  Consumibles: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300',
  Astrobots: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=300'
};

export const PhantomStationView: React.FC<PhantomStationViewProps> = ({
  onBack,
  triggerNotification
}) => {
  const { playSfx } = useAudioEngine();
  const [refreshCountdown, setRefreshCountdown] = useState<string>('03:00:00');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [blueprints, setBlueprints] = useState<PhantomBlueprint[]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number>(10800);
  const [loading, setLoading] = useState<boolean>(true);

  // Sincronización autoritativa desde Supabase en tiempo real
  const fetchLiveStore = useCallback(async () => {
    setLoading(true);
    let loadedItems: PhantomBlueprint[] = [];

    try {
      // 1. Obtener todas las colecciones desde phantom_rotation_config
      const { data: allLists, error: listErr } = await supabase
        .from('phantom_rotation_config')
        .select('*');

      if (!listErr && Array.isArray(allLists) && allLists.length > 0) {
        // Buscar la colección activada desde el Backoffice
        const activeList = allLists.find((l: any) => l.is_active === true || l.isActive === true);

        if (activeList && Array.isArray(activeList.items) && activeList.items.length > 0) {
          const slotCount = Math.min(8, Math.max(1, activeList.display_slots || activeList.displaySlots || 8));
          let selectedItems = activeList.items;

          // Manejo del modo de selección (Secuencial o Aleatorio)
          if (activeList.selection_mode === 'random' || activeList.selectionMode === 'random') {
            selectedItems = [...activeList.items].sort(() => Math.random() - 0.5);
          }
          selectedItems = selectedItems.slice(0, slotCount);

          loadedItems = selectedItems.map((item: any) => ({
            id: item.id || `PH-${Math.random().toString(36).substring(2, 6)}`,
            name: (item.name || 'ACTIVO VOID').toUpperCase(),
            category: (item.category || 'MÓDULO').toUpperCase(),
            rarity: (item.rarity || item.rank || 'COMMON').toUpperCase() as any,
            priceValue: Number(item.priceValue || item.pricePH || item.price || 1000),
            currencyType: item.currencyType || 'Phantom Coins',
            description: item.description || `Dispositivo coloidal en oferta. Stock: ${item.storageLeft ?? 10} u.`,
            image: item.image || CATEGORY_IMAGES[item.category] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300'
          }));
        }
      }

      // 2. Fallback a sasori_game_hud si no hay lista en phantom_rotation_config
      if (loadedItems.length === 0) {
        const { data: hudData } = await supabase
          .from('sasori_game_hud')
          .select('config')
          .eq('id', 'global_hud_config')
          .maybeSingle();

        const catalog = hudData?.config?.phantomStation?.suppliesCatalog;
        if (Array.isArray(catalog) && catalog.length > 0) {
          loadedItems = catalog.map((item: any) => ({
            id: item.id || `PH-${Math.random().toString(36).substring(2, 6)}`,
            name: (item.name || 'ACTIVO VOID').toUpperCase(),
            category: (item.category || 'MÓDULO').toUpperCase(),
            rarity: (item.rank || item.rarity || 'COMMON').toUpperCase() as any,
            priceValue: Number(item.priceValue || item.pricePH || 1000),
            currencyType: item.currencyType || 'Phantom Coins',
            description: item.description || `Módulo espacial activo registrado en la Estación C.A.N.`,
            image: item.image || CATEGORY_IMAGES[item.category] || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300'
          }));
        }
      }

      setBlueprints(loadedItems);

      // Cargar tiempo de rotación configurado en el Backoffice
      const { data: timerData } = await supabase
        .from('sasori_game_hud')
        .select('config')
        .eq('id', 'global_hud_config')
        .maybeSingle();

      if (timerData?.config?.phantomStation?.autoRefreshStockTimerSeconds) {
        setTimerSeconds(Number(timerData.config.phantomStation.autoRefreshStockTimerSeconds));
      }
    } catch (err) {
      console.error("Error cargando Phantom Station desde Supabase:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveStore();

    // Listener Realtime para actualizar la tienda de forma inmediata cuando cambias algo en el Backoffice
    const channel = supabase
      .channel('phantom_game_view_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phantom_rotation_config' }, () => {
        fetchLiveStore();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sasori_game_hud' }, () => {
        fetchLiveStore();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLiveStore]);

  // Contador de refresco que respeta el timer configurado desde el Backoffice
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const intervalMs = (timerSeconds || 10800) * 1000;
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
      console.error("Error al adquirir activo en Phantom Station:", err);
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

        {/* GRID DE ITEMS RECTIFICADO */}
        <div className="flex-1 w-full lg:w-9/12 bg-[#05070a] border border-cyan-500/20 p-2.5 rounded-xl flex flex-col justify-between">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-cyan-400 font-mono text-xs gap-2">
              <RefreshCw className="animate-spin w-5 h-5" />
              <span>Sincronizando catálogo con el Backoffice...</span>
            </div>
          ) : blueprints.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-zinc-500 font-mono text-xs gap-2 border border-dashed border-zinc-800 rounded-lg">
              <span>No hay colecciones publicadas activamente en la tienda.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full h-full">
              {blueprints.map((bp) => (
                <div
                  key={bp.id}
                  className="bg-[#050910] border border-cyan-500/30 hover:border-cyan-400 p-2 rounded-lg shadow-xl flex flex-col justify-between gap-1.5 transition-all relative group"
                >
                  <div className="flex justify-between items-center border-b border-cyan-950 pb-1">
                    <span className="text-[6.5px] text-cyan-400/80 font-bold uppercase truncate max-w-[70px]">{bp.category}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[6px] font-black uppercase border shrink-0 ${
                      bp.rarity === 'LEGENDARY' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                      bp.rarity === 'EPIC' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                      bp.rarity === 'EXCLUSIVE' ? 'bg-red-950 text-red-400 border-red-800' :
                      bp.rarity === 'PHANTOM' ? 'bg-indigo-950 text-indigo-300 border-indigo-800' :
                      'bg-cyan-950 text-cyan-300 border-cyan-800'
                    }`}>
                      {bp.rarity}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="w-full h-16 bg-black border border-cyan-950 rounded p-0.5 overflow-hidden flex items-center justify-center">
                      <img
                        src={bp.image}
                        alt={bp.name}
                        className="w-full h-full object-cover rounded brightness-90 group-hover:scale-105 transition-transform"
                      />
                    </div>

                    <h3 className="text-[8.5px] font-black text-white uppercase tracking-wider line-clamp-1">{bp.name}</h3>
                    <p className="text-[7.5px] text-zinc-400 font-sans normal-case line-clamp-1 leading-tight">{bp.description}</p>
                  </div>

                  <div className="bg-[#020305] border border-cyan-950 p-1 rounded flex justify-between items-center text-[7.5px]">
                    <span className="text-[6.5px] text-zinc-500 uppercase font-bold">PRECIO</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9.5px] font-black text-cyan-300">{bp.priceValue.toLocaleString()}</span>
                      <img
                        src={bp.currencyType === 'GD Coins' ? GD_COIN_ASSET : PHANTOM_COIN_ASSET}
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
                        <span>ADQUIRIR ({bp.priceValue}</span>
                        <img
                          src={bp.currencyType === 'GD Coins' ? GD_COIN_ASSET : PHANTOM_COIN_ASSET}
                          alt={bp.currencyType}
                          className="w-3 h-3 object-contain"
                        />
                        <span>)</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PhantomStationView;