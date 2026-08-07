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
  CheckCircle2,
  Lock,
  Unlock,
  Layers,
  Cpu,
  Rocket,
  Bot,
  ArrowUpDown,
  X,
  AlertTriangle,
  Award
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const GD_COIN_ASSET = "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/GD%20Coin.png";

interface MarketplaceViewProps {
  playerGems?: number;
  setPlayerGems?: (v: any) => void;
  playerPower?: number;
  setPlayerPower?: (v: any) => void;
  playerGold?: number;
  setPlayerGold?: (v: any) => void;
  playerWood?: number;
  setPlayerWood?: (v: any) => void;
  playerFood?: number;
  setPlayerFood?: (v: any) => void;
  playerStone?: number;
  setPlayerStone?: (v: any) => void;
  playerOre?: number;
  setPlayerOre?: (v: any) => void;
  onBack: () => void;
  triggerNotification?: (text: string, e?: any) => void;
}

type MarketTab = 'MARKET' | 'AUCTIONS' | 'SELL_ITEM' | 'MY_LISTINGS';
type AssetCategory = 'ALL' | 'SHIPS' | 'TECH' | 'BLUEPRINTS' | 'RESOURCES' | 'ASTROBOTS';
type RarityFilter = 'ALL' | 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
type PriceSortOption = 'NONE' | 'LOW_TO_HIGH' | 'HIGH_TO_LOW';

interface MarketListing {
  id: string;
  seller_id: string;
  inventory_item_id: string;
  title: string;
  category: 'SHIPS' | 'TECH' | 'BLUEPRINTS' | 'RESOURCES' | 'ASTROBOTS';
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  description: string;
  price: number;
  currency: 'GD';
  is_auction: boolean;
  current_bid?: number;
  ends_at?: string;
  image_url: string;
  created_at: string;
}

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
  const [activeTab, setActiveTab] = useState<MarketTab>('MARKET');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtros de navegación
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('ALL');
  const [priceSort, setPriceSort] = useState<PriceSortOption>('NONE');

  // Estado del usuario
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Inventario propio para venta
  const [myInventory, setMyInventory] = useState<MyInventoryItem[]>([
    {
      id: 'INV-01',
      title: 'FRAGATA SASORI MK-III',
      category: 'SHIPS',
      rarity: 'LEGENDARY',
      description: 'Nave de combate pesada equipada con cañones de pulso gravitacional.',
      image_url: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=200',
      is_locked: false
    },
    {
      id: 'INV-02',
      title: 'ESCUDO IMPERIAL CINETICO V2',
      category: 'TECH',
      rarity: 'RARE',
      description: 'Matriz de escudos absorbentes para amortiguar impactos de proyectiles.',
      image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200',
      is_locked: false
    },
    {
      id: 'INV-03',
      title: 'PLANO DESTROYER OMEGA',
      category: 'BLUEPRINTS',
      rarity: 'EPIC',
      description: 'Plano de fabricación para nave destructora de clase estelar.',
      image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200',
      is_locked: false
    },
    {
      id: 'INV-04',
      title: 'ASTROBOT EXTRACCIÓN ALPHA',
      category: 'ASTROBOTS',
      rarity: 'RARE',
      description: 'Unidad robótica autónoma optimizada para recolección de Xenoplasma.',
      image_url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=200',
      is_locked: false
    },
    {
      id: 'INV-05',
      title: 'PACK 25,000 CRISTALES DE VACÍO',
      category: 'RESOURCES',
      rarity: 'COMMON',
      description: 'Silo comprimido de minerales cristalinos para tecnología de salto.',
      image_url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=200',
      is_locked: false,
      amount: 25000
    }
  ]);

  // Ofertas Globales del Mercado
  const [marketListings, setMarketListings] = useState<MarketListing[]>([
    {
      id: 'LST-01',
      seller_id: 'usr-kronos',
      inventory_item_id: 'INV-EXT-01',
      title: 'BLUEPRINT CHRONO-IMPERATOR MK-IV',
      category: 'BLUEPRINTS',
      rarity: 'LEGENDARY',
      description: 'Plano de ensamblaje para nave insignia de largo alcance. Requisito de hangar nivel 5.',
      price: 25000,
      currency: 'GD',
      is_auction: false,
      image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200',
      created_at: 'Hace 1 hora'
    },
    {
      id: 'LST-02',
      seller_id: 'usr-vanguard',
      inventory_item_id: 'INV-EXT-02',
      title: 'FRAGATA DESTROYER HALLOWEEN EDITION',
      category: 'SHIPS',
      rarity: 'EPIC',
      description: 'Nave fragata equipada con cañones de plasma y escudos hiperespaciales reforzados.',
      price: 15000,
      currency: 'GD',
      is_auction: false,
      image_url: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=200',
      created_at: 'Hace 3 horas'
    },
    {
      id: 'LST-03',
      seller_id: 'usr-aether',
      inventory_item_id: 'INV-EXT-03',
      title: 'NÚCLEO INFINITO NIVEL 4 (TECNOLOGÍA)',
      category: 'TECH',
      rarity: 'RARE',
      description: 'Módulo de energía cuántica para acelerar la minería en un +25%.',
      price: 3500,
      currency: 'GD',
      is_auction: true,
      current_bid: 4200,
      ends_at: '02h 14m',
      image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200',
      created_at: 'Hace 5 horas'
    }
  ]);

  // Modal de Venta
  const [selectedItemToList, setSelectedItemToList] = useState<MyInventoryItem | null>(null);
  const [sellPrice, setSellPrice] = useState<number>(1000);
  const [sellIsAuction, setSellIsAuction] = useState<boolean>(false);
  const [auctionDuration, setAuctionDuration] = useState<'12h' | '24h' | '48h'>('24h');
  const [sellDescription, setSellDescription] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, []);

  // Confirmar Publicación
  const handleConfirmPublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemToList) return;

    if (sellPrice <= 0) {
      if (triggerNotification) triggerNotification("⚠️ INGRESA UN PRECIO O PUJA VÁLIDA");
      return;
    }

    const listingId = `LST-${Date.now()}`;
    const newListing: MarketListing = {
      id: listingId,
      seller_id: currentUserId || 'usr-my-user',
      inventory_item_id: selectedItemToList.id,
      title: selectedItemToList.title,
      category: selectedItemToList.category,
      rarity: selectedItemToList.rarity,
      description: sellDescription.trim() || selectedItemToList.description,
      price: sellPrice,
      currency: 'GD',
      is_auction: sellIsAuction,
      current_bid: sellIsAuction ? sellPrice : undefined,
      ends_at: sellIsAuction ? (auctionDuration === '12h' ? '12h 00m' : auctionDuration === '24h' ? '24h 00m' : '48h 00m') : undefined,
      image_url: selectedItemToList.image_url,
      created_at: 'Hace un momento'
    };

    setMarketListings((prev) => [newListing, ...prev]);

    setMyInventory((prev) =>
      prev.map((item) => (item.id === selectedItemToList.id ? { ...item, is_locked: true } : item))
    );

    setSelectedItemToList(null);
    setSellPrice(1000);
    setSellDescription('');

    if (triggerNotification) {
      triggerNotification(
        `🔒 ACTIVO BLOQUEADO Y PUBLICADO EN MERCADO COMO ${sellIsAuction ? 'SUBASTA' : 'VENTA DIRECTA'}`
      );
    }
  };

  // Cancelar Publicación Propia
  const handleCancelListing = (listing: MarketListing) => {
    setMarketListings((prev) => prev.filter((l) => l.id !== listing.id));

    setMyInventory((prev) =>
      prev.map((item) => (item.id === listing.inventory_item_id ? { ...item, is_locked: false } : item))
    );

    if (triggerNotification) {
      triggerNotification("🔓 ACTIVO RETIRADO DEL MERCADO Y DESBLOQUEADO EN TU INVENTARIO");
    }
  };

  // Comprar Oferta Directa
  const handleBuyDirect = (item: MarketListing) => {
    if (playerGold < item.price) {
      if (triggerNotification) triggerNotification("⚠️ FONDOS INSUFICIENTES PARA ESTA COMPRA");
      return;
    }

    if (setPlayerGold) {
      setPlayerGold((prev: number) => prev - item.price);
    }

    setMarketListings((prev) => prev.filter((l) => l.id !== item.id));
    setMyInventory((prev) => prev.filter((inv) => inv.id !== item.inventory_item_id));

    if (triggerNotification) {
      triggerNotification(`🎉 TRANSACCIÓN EXITOSA: Adquiriste "${item.title}"`);
    }
  };

  // Pujar en Subasta
  const handleBidAuction = (item: MarketListing) => {
    const minBid = (item.current_bid || item.price) + 250;

    if (playerGold < minBid) {
      if (triggerNotification) triggerNotification("⚠️ FONDOS INSUFICIENTES PARA REALIZAR ESTA PUJA");
      return;
    }

    setMarketListings((prev) =>
      prev.map((l) => (l.id === item.id ? { ...l, current_bid: minBid } : l))
    );

    if (triggerNotification) {
      triggerNotification(`⚖️ PUJA REGISTRADA: Ofreciste ${minBid.toLocaleString()} en "${item.title}"`);
    }
  };

  // Filtrado y Ordenación de Publicaciones
  const getFilteredAndSortedListings = () => {
    let result = marketListings.filter((item) => {
      if (activeTab === 'MARKET' && item.is_auction) return false;
      if (activeTab === 'AUCTIONS' && !item.is_auction) return false;
      if (activeTab === 'MY_LISTINGS' && item.seller_id !== (currentUserId || 'usr-my-user')) return false;

      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (rarityFilter !== 'ALL' && item.rarity !== rarityFilter) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q);
      }

      return true;
    });

    if (priceSort === 'LOW_TO_HIGH') {
      result.sort((a, b) => (a.is_auction ? (a.current_bid || a.price) : a.price) - (b.is_auction ? (b.current_bid || b.price) : b.price));
    } else if (priceSort === 'HIGH_TO_LOW') {
      result.sort((a, b) => (b.is_auction ? (b.current_bid || b.price) : b.price) - (a.is_auction ? (a.current_bid || a.price) : a.price));
    }

    return result;
  };

  // Filtrado de Mi Inventario
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
    <div className="w-full max-w-7xl mx-auto bg-[#080b0e] border border-cyan-500/30 p-5 rounded-2xl shadow-2xl relative overflow-hidden font-mono text-left select-none flex flex-col gap-4">
      
      {/* ─── ENCABEZADO SUPERIOR SÓLIDO Y COMPACTO ─── */}
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
              MARKETPLACE
            </h1>
          </div>
        </div>

        {/* Pestañas Principales del Mercado */}
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

      {/* ─── FILTROS SUPERIORES DE RAREZA, ORDEN DE PRECIO Y BÚSQUEDA ─── */}
      <div className="w-full bg-[#05070a] border border-cyan-500/20 p-3 rounded-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        
        {/* Filtro por Rareza */}
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

        {/* Buscador u Ordenación */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {activeTab !== 'SELL_ITEM' && (
            <div className="flex items-center gap-1 bg-black p-0.5 border border-cyan-950 rounded text-[8px]">
              <ArrowUpDown className="w-3 h-3 text-amber-400 ml-1" />
              <span className="text-zinc-500 pl-1 font-bold">PRECIO</span>
              <img src={GD_COIN_ASSET} alt="GD Coin" className="w-3 h-3 object-contain" />
              <span className="text-zinc-500 pr-1 font-bold">:</span>
              {[
                { id: 'NONE', label: 'DEF' },
                { id: 'LOW_TO_HIGH', label: 'MENOR A MAYOR ↑' },
                { id: 'HIGH_TO_LOW', label: 'MAYOR A MENOR ↓' }
              ].map((sortOpt) => (
                <button
                  key={sortOpt.id}
                  onClick={() => setPriceSort(sortOpt.id as PriceSortOption)}
                  className={`px-2 py-0.5 rounded font-bold uppercase transition-colors ${
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

      {/* ─── ESTRUCTURA EN 2 COLUMNAS (SIDEBAR DE CATEGORÍAS + GRID PRINCIPAL) ─── */}
      <div className="w-full flex flex-col md:flex-row gap-3.5 items-start">
        
        {/* ─── SIDEBAR IZQUIERDO: CATEGORÍAS ─── */}
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

              const count = activeTab === 'SELL_ITEM'
                ? myInventory.filter(i => cat.id === 'ALL' || i.category === cat.id).length
                : marketListings.filter(l => {
                    if (activeTab === 'MARKET' && l.is_auction) return false;
                    if (activeTab === 'AUCTIONS' && !l.is_auction) return false;
                    if (activeTab === 'MY_LISTINGS' && l.seller_id !== (currentUserId || 'usr-my-user')) return false;
                    return cat.id === 'ALL' || l.category === cat.id;
                  }).length;

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
                  <span className={`text-[7.5px] px-1.5 py-0.2 rounded font-black ${
                    isSelected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-black text-zinc-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── LADO DERECHO: VISTA A (COMPRAR / SUBASTAS / MIS PUBLICACIONES) O VISTA B (MI INVENTARIO) ─── */}
        {activeTab !== 'SELL_ITEM' ? (
          /* VISTA A: PUBLICACIONES EN EL MERCADO */
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[440px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-cyan-950">
            {filteredListings.length === 0 ? (
              <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                NO HAY PUBLICACIONES QUE COINCIDAN CON TUS FILTROS
              </div>
            ) : (
              filteredListings.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#050910] border border-cyan-500/30 hover:border-cyan-400 p-3.5 rounded-xl shadow-xl flex flex-col justify-between gap-3 transition-all relative group"
                >
                  {/* Rareza */}
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

                  {/* Info del Activo */}
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-black border border-cyan-950 rounded-lg p-1 shrink-0 flex items-center justify-center overflow-hidden">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-contain brightness-90 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="flex flex-col text-left flex-1">
                      <h3 className="text-[10px] font-black text-white uppercase tracking-wider line-clamp-1">{item.title}</h3>
                      <p className="text-[8px] text-zinc-400 font-sans normal-case line-clamp-2 mt-0.5">{item.description}</p>
                    </div>
                  </div>

                  {/* Bloque de Precio con Ícono de GD Coin */}
                  <div className="bg-[#020305] border border-cyan-950 p-2 rounded-lg flex justify-between items-center text-[9px]">
                    <div className="flex flex-col text-left">
                      <span className="text-[7.5px] text-zinc-500 uppercase">
                        {item.is_auction ? 'PUJA ACTUAL' : 'PRECIO DIRECTO'}
                      </span>
                      <div className="flex items-center gap-1 font-black text-amber-400 text-sm">
                        <span>{(item.is_auction ? (item.current_bid || item.price) : item.price).toLocaleString()}</span>
                        <img src={GD_COIN_ASSET} alt="GD Coin" className="w-3.5 h-3.5 object-contain" />
                      </div>
                    </div>

                    {item.is_auction && (
                      <div className="flex flex-col text-right text-[7.5px] text-zinc-400">
                        <span className="text-purple-400 font-bold flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" /> {item.ends_at}
                        </span>
                        <span className="text-emerald-400 font-bold">PUJA ACTIVA</span>
                      </div>
                    )}
                  </div>

                  {/* Botón de Acción Directa con Ícono de GD Coin */}
                  {activeTab === 'MY_LISTINGS' ? (
                    <button
                      onClick={() => handleCancelListing(item)}
                      className="w-full py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 font-black text-[8.5px] uppercase rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Unlock className="w-3 h-3" /> RETIRAR Y DESBLOQUEAR
                    </button>
                  ) : item.is_auction ? (
                    <button
                      onClick={() => handleBidAuction(item)}
                      className="w-full py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-black text-[8.5px] uppercase rounded-lg shadow-[0_0_10px_rgba(147,51,234,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Gavel className="w-3.5 h-3.5" />
                      <span>PUJAR (+250</span>
                      <img src={GD_COIN_ASSET} alt="GD Coin" className="w-3 h-3 object-contain" />
                      <span>)</span>
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
          /* VISTA B: MI INVENTARIO DISPONIBLE PARA PUBLICAR / VENDER */
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[440px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-cyan-950">
            {filteredMyInventory.length === 0 ? (
              <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                NO TIENES ACTIVOS EN ESTA CATEGORÍA DE TU INVENTARIO
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
                  {/* Rareza y Estado de Bloqueo */}
                  <div className="flex justify-between items-center border-b border-cyan-950 pb-2">
                    {item.is_locked ? (
                      <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase bg-red-950/80 text-red-400 border border-red-800 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-red-400" /> BLOQUEADO (EN MERCADO)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                        <Unlock className="w-3 h-3 text-emerald-400" /> DISPONIBLE
                      </span>
                    )}

                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border ${
                      item.rarity === 'LEGENDARY' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                      item.rarity === 'EPIC' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                      item.rarity === 'RARE' ? 'bg-cyan-950 text-cyan-300 border-cyan-800' :
                      'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}>
                      {item.rarity}
                    </span>
                  </div>

                  {/* Imagen e Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-black border border-cyan-950 rounded-lg p-1 shrink-0 flex items-center justify-center overflow-hidden">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-contain brightness-90 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="flex flex-col text-left flex-1">
                      <h3 className="text-[10px] font-black text-white uppercase tracking-wider line-clamp-1">{item.title}</h3>
                      <p className="text-[8px] text-zinc-400 font-sans normal-case line-clamp-2 mt-0.5">{item.description}</p>
                    </div>
                  </div>

                  {/* Botón de Publicación / Subasta */}
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

      {/* ─── MODAL TÁCTICO DE CONFIGURACIÓN DE VENTA / SUBASTA ─── */}
      <AnimatePresence>
        {selectedItemToList && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#080b0e] border border-cyan-500/40 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 text-left relative"
            >
              {/* Encabezado Modal */}
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

              {/* Activo Seleccionado */}
              <div className="p-3 bg-black/80 border border-cyan-950 rounded-xl flex items-center gap-3">
                <img src={selectedItemToList.image_url} alt={selectedItemToList.title} className="w-12 h-12 object-contain" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white uppercase">{selectedItemToList.title}</span>
                  <span className="text-[8px] text-cyan-400 uppercase">CATEGORÍA: {selectedItemToList.category} | RAREZA: {selectedItemToList.rarity}</span>
                </div>
              </div>

              {/* Formulario */}
              <form onSubmit={handleConfirmPublish} className="flex flex-col gap-3 text-[9px]">
                
                {/* Selección Modo de Venta */}
                <div className="flex flex-col gap-1">
                  <label className="text-zinc-400 font-bold uppercase">MODO DE COMERCIALIZACIÓN</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSellIsAuction(false)}
                      className={`py-2 rounded-lg font-bold border uppercase transition-colors cursor-pointer ${
                        !sellIsAuction ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50' : 'bg-black text-zinc-500 border-cyan-950'
                      }`}
                    >
                      VENTA DIRECTA
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellIsAuction(true)}
                      className={`py-2 rounded-lg font-bold border uppercase transition-colors cursor-pointer ${
                        sellIsAuction ? 'bg-purple-950 text-purple-300 border-purple-500/50' : 'bg-black text-zinc-500 border-cyan-950'
                      }`}
                    >
                      SUBASTA PÚBLICA
                    </button>
                  </div>
                </div>

                {/* Precio o Puja Inicial con icono de GD Coin */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-zinc-400 font-bold uppercase">
                    <span>{sellIsAuction ? 'PUJA INICIAL EN' : 'PRECIO VENTA DIRECTA EN'}</span>
                    <img src={GD_COIN_ASSET} alt="GD Coin" className="w-3.5 h-3.5 object-contain" />
                  </div>
                  <input
                    type="number"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Number(e.target.value))}
                    className="bg-black border border-cyan-950 focus:border-cyan-500 rounded-lg p-2 text-amber-400 font-black outline-none"
                  />
                </div>

                {/* Duración si es Subasta */}
                {sellIsAuction && (
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-400 font-bold uppercase">DURACIÓN DE LA SUBASTA</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['12h', '24h', '48h'] as const).map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setAuctionDuration(dur)}
                          className={`py-1.5 rounded font-bold border uppercase transition-colors cursor-pointer ${
                            auctionDuration === dur ? 'bg-purple-900 text-purple-200 border-purple-400' : 'bg-black text-zinc-500 border-cyan-950'
                          }`}
                        >
                          {dur}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Descripción */}
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

                {/* Aviso de Bloqueo */}
                <div className="p-2 bg-amber-950/30 border border-amber-500/40 rounded-lg flex items-center gap-2 text-amber-300 text-[8px]">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>El activo quedará bloqueado en tu inventario hasta que se complete o se cancele la transacción.</span>
                </div>

                {/* Botón de Confirmación */}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black text-[9.5px] uppercase rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
                >
                  <Lock className="w-3.5 h-3.5" /> CONFIRMAR Y BLOQUEAR ACTIVO
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};