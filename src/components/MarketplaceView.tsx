import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Gavel,
  Tag,
  PlusCircle,
  Search,
  Filter,
  ChevronLeft,
  Clock,
  Shield,
  Zap,
  Lock,
  Unlock,
  Layers,
  Cpu,
  Rocket,
  Bot,
  ArrowUpDown,
  X,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMarketplace, type MarketListing } from '../hooks/useMarketplace';
export type { MarketListing } from '../hooks/useMarketplace';

const GD_COIN_ASSET = "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/GD%20Coin.png";

interface MarketplaceViewProps {
  playerGems?: number;
  setPlayerGems?: (v: any) => void;
  playerPower?: number;
  setPlayerPower?: (v: any) => void;
  playerGold?: number;
  setPlayerGold?: (v: any) => void;
  onBack: () => void;
  triggerNotification?: (text: string, e?: any) => void;
}

type MarketTab = 'MARKET' | 'AUCTIONS' | 'SELL_ITEM' | 'MY_LISTINGS';
type AssetCategory = 'ALL' | 'SHIPS' | 'TECH' | 'BLUEPRINTS' | 'RESOURCES' | 'ASTROBOTS';
type RarityFilter = 'ALL' | 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
type PriceSortOption = 'NONE' | 'LOW_TO_HIGH' | 'HIGH_TO_LOW';


interface MyInventoryItem {
  id: string;
  title: string;
  category: 'SHIPS' | 'TECH' | 'BLUEPRINTS' | 'RESOURCES' | 'ASTROBOTS';
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  description: string;
  image_url: string;
  is_locked: boolean;
  amount?: number;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  playerGold = 0,
  setPlayerGold,
  onBack,
  triggerNotification
}) => {
  const {
    listings: marketListings,
    loading,
    publishItem,
    buyItem,
    cancelListing,
    refreshMarket: fetchMarketplaceData,
    currentUserId
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<MarketTab>('MARKET');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('ALL');
  const [priceSort, setPriceSort] = useState<PriceSortOption>('NONE');

  const [myInventory, setMyInventory] = useState<MyInventoryItem[]>([]); // inventario propio sigue cargándose localmente


  // Modal de Venta
  const [selectedItemToList, setSelectedItemToList] = useState<MyInventoryItem | null>(null);
  const [sellPrice, setSellPrice] = useState<number>(1000);
  const [sellIsAuction, setSellIsAuction] = useState<boolean>(false);
  const [auctionDuration, setAuctionDuration] = useState<'12h' | '24h' | '48h'>('24h');
  const [sellDescription, setSellDescription] = useState<string>('');

  // Inventario propio: carga local (sólo naves propias para venta)
  useEffect(() => {
    if (!currentUserId) return;
    const loadMyInventory = async () => {
      const { data: dbListings } = await supabase
        .from('marketplace_listings')
        .select('inventory_item_id')
        .eq('status', 'ACTIVE')
        .eq('seller_id', currentUserId);

      const { data: myShips } = await supabase
        .from('user_ships')
        .select('id, id_ship, seed_ships(name_ship, rarity, image_url, company)')
        .eq('user_id', currentUserId);

      const items: MyInventoryItem[] = [];
      if (myShips) {
        myShips.forEach((s: any) => {
          const seed = s.seed_ships || {};
          const isListed = dbListings?.some((l: any) => l.inventory_item_id === s.id);
          items.push({
            id: s.id,
            title: seed.name_ship || 'NAVE DE COMBATE',
            category: 'SHIPS',
            rarity: (seed.rarity || 'COMMON').toUpperCase(),
            description: `Unidad de combate estelar fabricada por ${seed.company || 'GD'}`,
            image_url: seed.image_url || 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=200',
            is_locked: !!isListed
          });
        });
      }
      setMyInventory(items);
    };
    loadMyInventory();
  }, [currentUserId]);

  // 🛡️ Handlers delegados al hook useMarketplace
  const handleConfirmPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemToList) return;
    if (sellPrice <= 0) {
      if (triggerNotification) triggerNotification("⚠️ INGRESA UN PRECIO VÁLIDO");
      return;
    }
    try {
      await publishItem({
        inventoryItemId: selectedItemToList.id,
        title: selectedItemToList.title,
        category: selectedItemToList.category,
        rarity: selectedItemToList.rarity,
        description: sellDescription.trim() || selectedItemToList.description,
        price: sellPrice,
        isAuction: sellIsAuction,
        imageUrl: selectedItemToList.image_url
      });
      setSelectedItemToList(null);
      setSellPrice(1000);
      setSellDescription('');
      if (triggerNotification) triggerNotification(`🔒 ACTIVO REGISTRADO EN MERCADO P2P COMO ${sellIsAuction ? 'SUBASTA' : 'VENTA DIRECTA'}`);
    } catch (err: any) {
      if (triggerNotification) triggerNotification(`⛔ ERROR AL PUBLICAR: ${err.message}`);
    }
  };

  const handleCancelListing = async (listing: MarketListing) => {
    try {
      await cancelListing(listing.id);
      if (triggerNotification) triggerNotification("🔓 ACTIVO RETIRADO DEL MERCADO Y DESBLOQUEADO");
    } catch (err: any) {
      console.error("Error al cancelar oferta:", err);
    }
  };

  const handleBuyDirect = async (item: MarketListing) => {
    try {
      await buyItem(item.id);
      if (setPlayerGold) setPlayerGold((prev: number) => Math.max(0, prev - item.price));
      if (triggerNotification) triggerNotification(`🎉 TRANSACCIÓN EXITOSA: Adquiriste "${item.title}"`);
    } catch (err: any) {
      if (triggerNotification) triggerNotification(`⛔ TRANSACCIÓN RECHAZADA: ${err.message}`);
    }
  };

  const getFilteredAndSortedListings = () => {
    let result = marketListings.filter((item) => {
      if (activeTab === 'MARKET' && item.is_auction) return false;
      if (activeTab === 'AUCTIONS' && !item.is_auction) return false;
      if (activeTab === 'MY_LISTINGS' && item.seller_id !== currentUserId) return false;

      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (rarityFilter !== 'ALL' && item.rarity !== rarityFilter) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q);
      }

      return true;
    });

    if (priceSort === 'LOW_TO_HIGH') {
      result.sort((a, b) => a.price - b.price);
    } else if (priceSort === 'HIGH_TO_LOW') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  };

  const getFilteredMyInventory = () => {
    return myInventory.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (rarityFilter !== 'ALL' && item.rarity !== rarityFilter) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q);
      }

      return true;
    });
  };

  const filteredListings = getFilteredAndSortedListings();
  const filteredMyInventory = getFilteredMyInventory();

  return (
    <div className="w-full max-w-7xl mx-auto bg-[#080b0e] border border-cyan-500/30 p-5 rounded-2xl shadow-2xl relative overflow-hidden font-mono text-left select-none flex flex-col gap-4 text-white">
      
      {/* ENCABEZADO SUPERIOR */}
      <div className="w-full bg-[#05070a] border border-cyan-500/30 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="p-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-left">
            <h1 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-cyan-400 animate-pulse" />
              MARKETPLACE P2P
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-black/60 p-1 border border-cyan-950 rounded-lg overflow-x-auto">
          {[
            { id: 'MARKET', label: 'COMPRAR', icon: ShoppingBag },
            { id: 'AUCTIONS', label: 'SUBASTAS EN VIVO', icon: Gavel },
            { id: 'SELL_ITEM', label: 'PUBLICAR / VENDER', icon: PlusCircle },
            { id: 'MY_LISTINGS', label: 'MIS PUBLICACIONES', icon: Tag }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as MarketTab);
                  setSelectedCategory('ALL');
                }}
                className={`px-3 py-1.5 text-[8.5px] font-bold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                  isActive
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)] font-black'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="w-full bg-[#05070a] border border-cyan-500/20 p-3 rounded-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div className="flex flex-wrap items-center gap-1 text-[8px] font-bold uppercase">
          {[
            { id: 'ALL', label: 'TODAS' },
            { id: 'COMMON', label: 'COMÚN' },
            { id: 'RARE', label: 'RARA' },
            { id: 'EPIC', label: 'ÉPICA' },
            { id: 'LEGENDARY', label: 'LEGENDARIA' }
          ].map((rar) => (
            <button
              key={rar.id}
              onClick={() => setRarityFilter(rar.id as RarityFilter)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer border ${
                rarityFilter === rar.id
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40 font-black'
                  : 'bg-black/40 text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              {rar.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {activeTab !== 'SELL_ITEM' && (
            <div className="flex items-center gap-1 bg-black p-0.5 border border-cyan-950 rounded text-[8px]">
              <ArrowUpDown className="w-3 h-3 text-amber-400 ml-1" />
              <span className="text-zinc-500 pl-1 font-bold">PRECIO:</span>
              {[
                { id: 'NONE', label: 'DEF' },
                { id: 'LOW_TO_HIGH', label: 'MENOR A MAYOR ↑' },
                { id: 'HIGH_TO_LOW', label: 'MAYOR A MENOR ↓' }
              ].map((sortOpt) => (
                <button
                  key={sortOpt.id}
                  onClick={() => setPriceSort(sortOpt.id as PriceSortOption)}
                  className={`px-2 py-0.5 rounded font-bold uppercase transition-colors cursor-pointer ${
                    priceSort === sortOpt.id ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {sortOpt.label}
                </button>
              ))}
            </div>
          )}

          <div className="relative flex-1 md:w-52">
            <Search className="absolute left-2.5 top-2 w-3 h-3 text-cyan-500" />
            <input
              type="text"
              placeholder={activeTab === 'SELL_ITEM' ? "BUSCAR EN MI INVENTARIO..." : "BUSCAR ACTIVO..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-cyan-950 rounded pl-7 pr-2.5 py-1 text-[8px] text-cyan-200 placeholder-zinc-600 outline-none uppercase font-mono focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ESTRUCTURA PRINCIPAL */}
      <div className="w-full flex flex-col md:flex-row gap-3.5 items-start">
        <div className="w-full md:w-52 shrink-0 bg-[#05070a] border border-cyan-500/20 p-3 rounded-xl flex flex-col gap-2">
          <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 px-1 border-b border-cyan-950 pb-2">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>CATEGORÍAS</span>
          </div>

          <div className="flex flex-col gap-1 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-950">
            {[
              { id: 'ALL', label: 'TODOS', icon: ShoppingBag },
              { id: 'SHIPS', label: 'NAVES', icon: Rocket },
              { id: 'TECH', label: 'TECNOLOGÍA', icon: Cpu },
              { id: 'BLUEPRINTS', label: 'BLUEPRINTS', icon: Tag },
              { id: 'RESOURCES', label: 'RECURSOS', icon: Layers },
              { id: 'ASTROBOTS', label: 'ASTROBOTS', icon: Bot }
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const IconComp = cat.icon;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as AssetCategory)}
                  className={`w-full px-2.5 py-2 rounded-lg text-[8px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center justify-between border ${
                    isSelected
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.2)] font-black'
                      : 'bg-[#0a0f14] text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-[#0e1620]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <IconComp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* FEED PRINCIPAL */}
        {activeTab !== 'SELL_ITEM' ? (
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[440px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-cyan-950">
            {filteredListings.length === 0 ? (
              <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                {loading ? 'CARGANDO PUBLICACIONES DE LA RED...' : 'NO HAY PUBLICACIONES REGISTRADAS'}
              </div>
            ) : (
              filteredListings.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#050910] border border-cyan-500/30 hover:border-cyan-400 p-3.5 rounded-xl shadow-xl flex flex-col justify-between gap-3 transition-all relative group"
                >
                  <div className="flex justify-end items-center border-b border-cyan-950 pb-2">
                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border ${
                      item.rarity === 'LEGENDARY' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                      item.rarity === 'EPIC' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                      item.rarity === 'RARE' ? 'bg-cyan-950 text-cyan-300 border-cyan-800' :
                      'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}>
                      {item.rarity}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-black border border-cyan-950 rounded-lg p-1 shrink-0 flex items-center justify-center overflow-hidden">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-contain brightness-90 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="flex flex-col text-left flex-1">
                      <h3 className="text-[10px] font-black text-white uppercase tracking-wider line-clamp-1">{item.title}</h3>
                      <p className="text-[8px] text-zinc-400 font-sans normal-case line-clamp-2 mt-0.5">{item.description}</p>
                    </div>
                  </div>

                  <div className="bg-[#020305] border border-cyan-950 p-2 rounded-lg flex justify-between items-center text-[9px]">
                    <div className="flex flex-col text-left">
                      <span className="text-[7.5px] text-zinc-500 uppercase">PRECIO DIRECTO</span>
                      <div className="flex items-center gap-1 font-black text-amber-400 text-sm">
                        <span>{item.price.toLocaleString()}</span>
                        <img src={GD_COIN_ASSET} alt="GD Coin" className="w-3.5 h-3.5 object-contain" />
                      </div>
                    </div>
                  </div>

                  {activeTab === 'MY_LISTINGS' ? (
                    <button
                      onClick={() => handleCancelListing(item)}
                      className="w-full py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 font-black text-[8.5px] uppercase rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Unlock className="w-3 h-3" /> RETIRAR Y DESBLOQUEAR
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuyDirect(item)}
                      className="w-full py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-110 text-white font-black text-[8.5px] uppercase rounded-lg shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> COMPRAR AHORA
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[440px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-cyan-950">
            {filteredMyInventory.length === 0 ? (
              <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                NO TIENES ACTIVOS DISPONIBLES PARA VENDER
              </div>
            ) : (
              filteredMyInventory.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all relative group min-h-[140px] ${
                    item.is_locked
                      ? 'bg-black/60 border-zinc-800 opacity-60'
                      : 'bg-[#050910] border-cyan-500/30 hover:border-cyan-400 shadow-xl'
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-cyan-950 pb-2">
                    {item.is_locked ? (
                      <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase bg-red-950/80 text-red-400 border border-red-800 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-red-400" /> BLOQUEADO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                        <Unlock className="w-3 h-3 text-emerald-400" /> DISPONIBLE
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase border bg-zinc-800 text-zinc-300 border-zinc-700">
                      {item.rarity}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-black border border-cyan-950 rounded-lg p-1 shrink-0 flex items-center justify-center overflow-hidden">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-contain brightness-90 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="flex flex-col text-left flex-1">
                      <h3 className="text-[10px] font-black text-white uppercase tracking-wider line-clamp-1">{item.title}</h3>
                      <p className="text-[8px] text-zinc-400 font-sans normal-case line-clamp-2 mt-0.5">{item.description}</p>
                    </div>
                  </div>

                  {item.is_locked ? (
                    <div className="bg-black/80 border border-zinc-800 p-2 rounded-lg text-center text-[8px] text-zinc-500 font-bold uppercase">
                      PUBLICACIÓN ACTIVA EN EL MERCADO
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedItemToList(item);
                        setSellPrice(1000);
                        setSellIsAuction(false);
                      }}
                      className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black text-[8.5px] uppercase rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> VENDER / SUBASTAR
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* MODAL CONFIGURACIÓN DE VENTA */}
      <AnimatePresence>
        {selectedItemToList && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#080b0e] border border-cyan-500/40 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 text-left relative"
            >
              <div className="flex justify-between items-center border-b border-cyan-950 pb-3">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">
                    CONFIGURAR COMERCIALIZACIÓN
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedItemToList(null)}
                  className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-black/80 border border-cyan-950 rounded-xl flex items-center gap-3">
                <img src={selectedItemToList.image_url} alt={selectedItemToList.title} className="w-12 h-12 object-contain" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white uppercase">{selectedItemToList.title}</span>
                  <span className="text-[8px] text-cyan-400 uppercase">CATEGORÍA: {selectedItemToList.category} | RAREZA: {selectedItemToList.rarity}</span>
                </div>
              </div>

              <form onSubmit={handleConfirmPublish} className="flex flex-col gap-3 text-[9px]">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-zinc-400 font-bold uppercase">
                    <span>PRECIO DE VENTA EN</span>
                    <img src={GD_COIN_ASSET} alt="GD Coin" className="w-3.5 h-3.5 object-contain" />
                  </div>
                  <input
                    type="number"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Number(e.target.value))}
                    className="bg-black border border-cyan-950 focus:border-cyan-500 rounded-lg p-2 text-amber-400 font-black outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-zinc-400 font-bold uppercase">DESCRIPCIÓN DE OFERTA</label>
                  <textarea
                    rows={2}
                    placeholder="Detalla las especificaciones tácticas de tu oferta..."
                    value={sellDescription}
                    onChange={(e) => setSellDescription(e.target.value)}
                    className="bg-black border border-cyan-950 focus:border-cyan-500 rounded-lg p-2 text-cyan-200 outline-none font-sans text-[9px]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black text-[9.5px] uppercase rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
                >
                  <Lock className="w-3.5 h-3.5" /> CONFIRMAR Y PUBLICAR EN MERCADO
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MarketplaceView;