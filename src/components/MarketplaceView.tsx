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
  Lock,
  Unlock,
  Cpu,
  Rocket,
  Bot,
  Wrench,
  Building,
  FileText,
  Package,
  ArrowUpDown,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMarketplace, type MarketListing } from '../hooks/useMarketplace';
import { useInventory } from '../hooks/useInventory';

export type { MarketListing } from '../hooks/useMarketplace';

const GD_COIN_ASSET = "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/GD%20Coin.png";

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
type AssetCategory = 'ALL' | 'SHIPS' | 'TOOLS' | 'STRUCTURES' | 'TECH' | 'BLUEPRINTS' | 'LICENSES' | 'ASTROBOTS' | 'CONSUMABLES';
type RarityFilter = 'ALL' | 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
type PriceSortOption = 'NONE' | 'LOW_TO_HIGH' | 'HIGH_TO_LOW';

interface MyInventoryItem {
  id: string;
  title: string;
  category: AssetCategory;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  description: string;
  image_url: string;
  is_locked: boolean;
  is_in_flight: boolean;
  amount?: number;
}

const normalizeCategory = (cat?: string, type?: string): AssetCategory => {
  const upperCat = String(cat || '').toUpperCase().trim();
  if (['SHIPS', 'TOOLS', 'STRUCTURES', 'TECH', 'BLUEPRINTS', 'LICENSES', 'ASTROBOTS', 'CONSUMABLES'].includes(upperCat)) {
    return upperCat as AssetCategory;
  }

  const raw = `${cat || ''} ${type || ''}`.toLowerCase().trim();
  if (['spaceships', 'ships', 'naves', 'nave', 'spaceship', 'ship'].some(k => raw.includes(k))) return 'SHIPS';
  if (['tools', 'tool', 'herramientas', 'herramienta'].some(k => raw.includes(k))) return 'TOOLS';
  if (['structures', 'structure', 'estructuras', 'estructura', 'defense', 'defensa', 'defenses'].some(k => raw.includes(k))) return 'STRUCTURES';
  if (['technologies', 'technology', 'tech', 'tecnología', 'tecnologia'].some(k => raw.includes(k))) return 'TECH';
  if (['blueprints', 'blueprint', 'planos', 'plano'].some(k => raw.includes(k))) return 'BLUEPRINTS';
  if (['licencia', 'license', 'licenses', 'licencias'].some(k => raw.includes(k))) return 'LICENSES';
  if (['astrobots', 'astrobot', 'robot', 'robots'].some(k => raw.includes(k))) return 'ASTROBOTS';
  if (['consumibles', 'consumables', 'resources', 'recursos', 'consumable'].some(k => raw.includes(k))) return 'CONSUMABLES';
  
  return 'SHIPS';
};

const normalizeRarity = (rar?: string): 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' => {
  const r = String(rar || 'COMMON').toUpperCase().trim();
  if (['COMMON', 'RARE', 'EPIC', 'LEGENDARY'].includes(r)) return r as any;
  if (r.includes('UNCOMMON')) return 'COMMON';
  return 'COMMON';
};

const matchCategory = (itemCat?: string, targetCat?: AssetCategory, itemType?: string) => {
  if (!targetCat || targetCat === 'ALL') return true;
  return normalizeCategory(itemCat, itemType) === targetCat;
};

const matchRarity = (itemRar?: string, targetRar?: RarityFilter) => {
  if (!targetRar || targetRar === 'ALL') return true;
  return normalizeRarity(itemRar) === targetRar;
};

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  setPlayerGold,
  onBack,
  triggerNotification
}) => {
  const {
    listings: marketListings,
    loading: marketLoading,
    publishItem,
    buyItem,
    cancelListing,
    refreshMarket: fetchMarketplaceData,
    currentUserId
  } = useMarketplace();

  const { items: inventoryItems, loading: inventoryLoading, refreshInventory } = useInventory();

  const [activeTab, setActiveTab] = useState<MarketTab>('MARKET');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('ALL');
  const [priceSort, setPriceSort] = useState<PriceSortOption>('NONE');

  const [myInventory, setMyInventory] = useState<MyInventoryItem[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState<boolean>(false);

  const [selectedItemToList, setSelectedItemToList] = useState<MyInventoryItem | null>(null);
  const [sellPrice, setSellPrice] = useState<number>(1000);
  const [sellIsAuction, setSellIsAuction] = useState<boolean>(false);
  const [auctionDuration, setAuctionDuration] = useState<'12h' | '24h' | '48h'>('24h');
  const [sellDescription, setSellDescription] = useState<string>('');

  const syncInventory = async () => {
    setIsLocalLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || currentUserId;
      if (!userId) return;

      const { data: dbListings } = await supabase
        .from('marketplace_listings')
        .select('inventory_item_id')
        .eq('status', 'ACTIVE')
        .eq('seller_id', userId);

      const activeListingIds = new Set((dbListings || []).map((l: any) => String(l.inventory_item_id)));

      const loadCat = async (userTable: string, seedTable: string, category: AssetCategory, fkCols: string[]) => {
        const { data: userRows } = await supabase.from(userTable).select('*').eq('user_id', userId);
        if (!userRows || userRows.length === 0) return [];

        const { data: seedRows } = await supabase.from(seedTable).select('*');
        const seedMap = new Map<string, any>();
        (seedRows || []).forEach((s: any) => {
          [s.id, s.ship_id, s.id_ship, s.tool_id, s.astrobot_id, s.license_id, s.consumable_id, s.technology_id].forEach(k => {
            if (k !== undefined && k !== null) seedMap.set(String(k), s);
          });
        });

        return userRows.map((row: any) => {
          let targetId: string | null = null;
          for (const col of fkCols) {
            if (row[col] !== undefined && row[col] !== null) {
              targetId = String(row[col]);
              break;
            }
          }
          const seed = targetId ? seedMap.get(targetId) : null;
          const realName = row.custom_name || seed?.ship_name || seed?.name || row.name || `${category} #${row.id}`;
          const rawImg = seed?.image_url || seed?.avatar_url || seed?.avatar || row.image_url;
          const finalImg = resolveImageUrl(rawImg);
          const rarity = normalizeRarity(seed?.rarity || row.rarity);
          const isListed = activeListingIds.has(String(row.id)) || (targetId ? activeListingIds.has(targetId) : false);

          return {
            id: String(row.id),
            title: realName,
            category: category,
            rarity: rarity,
            description: seed?.description || row.description || `Activo estelar de la flota.`,
            image_url: finalImg,
            is_locked: Boolean(row.is_in_flight) || isListed,
            is_in_flight: Boolean(row.is_in_flight),
            amount: row.quantity || row.amount || 1
          };
        });
      };

      const [ships, tools, astrobots, consumables, licenses, techs] = await Promise.all([
        loadCat('user_ships', 'seed_ships', 'SHIPS', ['id_ship', 'ship_id', 'id']),
        loadCat('user_tools', 'seed_tools', 'TOOLS', ['tool_id', 'id']),
        loadCat('user_astrobots', 'seed_astrobots', 'ASTROBOTS', ['astrobot_id', 'id']),
        loadCat('user_consumibles', 'seed_consumables', 'CONSUMABLES', ['consumable_id', 'id']),
        loadCat('user_licenses', 'seed_licenses', 'LICENSES', ['license_id', 'id']),
        loadCat('user_technologies', 'seed_technologies', 'TECH', ['technology_id', 'tech_id', 'id'])
      ]);

      const directAssets = [...ships, ...tools, ...astrobots, ...consumables, ...licenses, ...techs];

      const hookAssets: MyInventoryItem[] = (inventoryItems || []).map((item) => {
        const itemCat = normalizeCategory(item.category, item.type);
        const itemRarity = normalizeRarity(item.rarity);
        const isListed = activeListingIds.has(String(item.id));

        return {
          id: String(item.id),
          title: item.name,
          category: itemCat,
          rarity: itemRarity,
          description: item.description || `Activo estelar registrado en la flota.`,
          image_url: resolveImageUrl(item.avatar_url || item.image_url),
          is_locked: item.is_in_flight || isListed,
          is_in_flight: Boolean(item.is_in_flight),
          amount: item.quantity || 1
        };
      });

      const mergedMap = new Map<string, MyInventoryItem>();
      [...directAssets, ...hookAssets].forEach(a => mergedMap.set(a.id, a));

      setMyInventory(Array.from(mergedMap.values()));
    } catch (err) {
      console.error("Error al sincronizar inventario del Marketplace:", err);
    } finally {
      setIsLocalLoading(false);
    }
  };

  useEffect(() => {
    syncInventory();
  }, [inventoryItems, currentUserId, marketListings]);

  const handleConfirmPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemToList) return;
    if (sellPrice <= 0) {
      if (triggerNotification) triggerNotification("⚠️ INGRESA UN PRECIO VÁLIDO");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || currentUserId;

      if (!userId) {
        throw new Error("Sesión no válida.");
      }

      let durationHours = 24;
      if (auctionDuration === '12h') durationHours = 12;
      if (auctionDuration === '48h') durationHours = 48;
      
      const auctionEndTime = sellIsAuction 
        ? new Date(Date.now() + durationHours * 3600 * 1000).toISOString() 
        : null;

      if (publishItem) {
        await publishItem({
          inventoryItemId: selectedItemToList.id,
          title: selectedItemToList.title,
          category: selectedItemToList.category,
          rarity: selectedItemToList.rarity,
          description: sellDescription.trim() || selectedItemToList.description,
          price: sellPrice,
          isAuction: sellIsAuction,
          imageUrl: selectedItemToList.image_url,
          auctionEndTime
        });
      } else {
        const { error } = await supabase.from('marketplace_listings').insert([{
          seller_id: userId,
          inventory_item_id: selectedItemToList.id,
          title: selectedItemToList.title,
          category: selectedItemToList.category,
          rarity: selectedItemToList.rarity,
          description: sellDescription.trim() || selectedItemToList.description,
          price: sellPrice,
          is_auction: sellIsAuction,
          auction_end_time: auctionEndTime,
          image_url: selectedItemToList.image_url,
          status: 'ACTIVE'
        }]);
        if (error) throw error;
      }

      setSelectedItemToList(null);
      setSellPrice(1000);
      setSellDescription('');
      setSellIsAuction(false);

      if (fetchMarketplaceData) await fetchMarketplaceData();
      if (refreshInventory) await refreshInventory();
      await syncInventory();

      if (triggerNotification) {
        triggerNotification(`🔒 ACTIVO PUBLICADO COMO ${sellIsAuction ? 'SUBASTA EN VIVO' : 'VENTA DIRECTA'}`);
      }
    } catch (err: any) {
      console.error("Error al publicar activo:", err);
      if (triggerNotification) triggerNotification(`⛔ ERROR AL PUBLICAR: ${err.message || 'Error de comunicación'}`);
    }
  };

  const handleCancelListing = async (listing: MarketListing) => {
    try {
      await cancelListing(listing.id);
      if (fetchMarketplaceData) await fetchMarketplaceData();
      if (refreshInventory) await refreshInventory();
      await syncInventory();
      if (triggerNotification) triggerNotification("🔓 ACTIVO RETIRADO DEL MERCADO Y DESBLOQUEADO");
    } catch (err: any) {
      console.error("Error al cancelar oferta:", err);
    }
  };

  const handleBuyDirect = async (item: MarketListing) => {
    try {
      await buyItem(item.id);
      if (setPlayerGold) setPlayerGold((prev: number) => Math.max(0, prev - item.price));
      if (fetchMarketplaceData) await fetchMarketplaceData();
      if (refreshInventory) await refreshInventory();
      await syncInventory();
      if (triggerNotification) triggerNotification(`🎉 TRANSACCIÓN EXITOSA: Adquiriste "${item.title}"`);
    } catch (err: any) {
      if (triggerNotification) triggerNotification(`⛔ TRANSACCIÓN RECHAZADA: ${err.message}`);
    }
  };

  const getFilteredAndSortedListings = () => {
    const validInventoryIds = new Set(myInventory.map(i => String(i.id)));

    let result = (marketListings || []).filter((item) => {
      const isAuction = Boolean(item.is_auction || (item as any).isAuction);

      if (activeTab === 'MARKET' && isAuction) return false;
      if (activeTab === 'AUCTIONS' && !isAuction) return false;
      if (activeTab === 'MY_LISTINGS' && String(item.seller_id) !== String(currentUserId)) return false;

      // 🛡️ REGLA AUTOMÁTICA DE INTEGRIDAD Y AUTO-CURACIÓN:
      // Si la publicación me pertenece pero el activo ya no existe en mi inventario, se auto-elimina de DB
      if (String(item.seller_id) === String(currentUserId) && !isLocalLoading) {
        const itemId = String(item.inventory_item_id || item.id);
        const existsInInventory = validInventoryIds.has(itemId);
        if (!existsInInventory) {
          supabase.from('marketplace_listings').delete().eq('id', item.id).then();
          return false;
        }
      }

      if (!matchCategory(item.category, selectedCategory)) return false;
      if (!matchRarity(item.rarity, rarityFilter)) return false;

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
    return (myInventory || []).filter((item) => {
      if (!matchCategory(item.category, selectedCategory)) return false;
      if (!matchRarity(item.rarity, rarityFilter)) return false;

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

      <div className="w-full flex flex-col md:flex-row gap-3.5 items-start">
        <div className="w-full md:w-52 shrink-0 bg-[#05070a] border border-cyan-500/20 p-3 rounded-xl flex flex-col gap-2">
          <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 px-1 border-b border-cyan-950 pb-2">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>CATEGORÍAS</span>
          </div>

          <div className="flex flex-col gap-1 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
            {[
              { id: 'ALL', label: 'TODOS', icon: ShoppingBag },
              { id: 'SHIPS', label: 'NAVES', icon: Rocket },
              { id: 'TOOLS', label: 'HERRAMIENTAS', icon: Wrench },
              { id: 'STRUCTURES', label: 'ESTRUCTURAS / DEFENSA', icon: Building },
              { id: 'TECH', label: 'TECNOLOGÍA', icon: Cpu },
              { id: 'BLUEPRINTS', label: 'BLUEPRINTS', icon: Tag },
              { id: 'LICENSES', label: 'LICENCIAS', icon: FileText },
              { id: 'ASTROBOTS', label: 'ASTROBOTS', icon: Bot },
              { id: 'CONSUMABLES', label: 'CONSUMIBLES / RECURSOS', icon: Package }
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

        {activeTab !== 'SELL_ITEM' ? (
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[440px] overflow-y-auto pr-1.5 custom-scrollbar">
            {filteredListings.length === 0 ? (
              <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                {marketLoading ? 'CARGANDO PUBLICACIONES DE LA RED...' : 'NO HAY PUBLICACIONES REGISTRADAS'}
              </div>
            ) : (
              filteredListings.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#050910] border border-cyan-500/30 hover:border-cyan-400 p-3.5 rounded-xl shadow-xl flex flex-col justify-between gap-3 transition-all relative group"
                >
                  <div className="flex justify-between items-center border-b border-cyan-950 pb-2">
                    {item.is_auction && (
                      <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase bg-amber-950/80 text-amber-400 border border-amber-800 flex items-center gap-1">
                        <Gavel className="w-3 h-3 text-amber-400" /> SUBASTA
                      </span>
                    )}

                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border ml-auto ${
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
                      <img src={resolveImageUrl(item.image_url)} alt={item.title} className="w-full h-full object-contain brightness-90 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="flex flex-col text-left flex-1">
                      <h3 className="text-[10px] font-black text-white uppercase tracking-wider line-clamp-1">{item.title}</h3>
                      <p className="text-[8px] text-zinc-400 font-sans normal-case line-clamp-2 mt-0.5">{item.description}</p>
                    </div>
                  </div>

                  <div className="bg-[#020305] border border-cyan-950 p-2 rounded-lg flex justify-between items-center text-[9px]">
                    <div className="flex flex-col text-left">
                      <span className="text-[7.5px] text-zinc-500 uppercase">{item.is_auction ? 'PUJA ACTUAL / SALIDA' : 'PRECIO DIRECTO'}</span>
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
                  ) : item.is_auction ? (
                    <button
                      onClick={() => handleBuyDirect(item)}
                      className="w-full py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white font-black text-[8.5px] uppercase rounded-lg shadow-[0_0_10px_rgba(245,158,11,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Gavel className="w-3.5 h-3.5" /> PUJAR EN SUBASTA
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
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[440px] overflow-y-auto pr-1.5 custom-scrollbar">
            {(inventoryLoading || isLocalLoading) ? (
              <div className="col-span-full p-12 text-center text-cyan-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                ESCANEAR ACTIVOS DEL JUGADOR...
              </div>
            ) : filteredMyInventory.length === 0 ? (
              <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
                NO TIENES ACTIVOS DISPONIBLES EN ESTA CATEGORÍA
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
                    {item.is_in_flight ? (
                      <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase bg-red-950/80 text-red-400 border border-red-800 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-red-400" /> EN VUELO
                      </span>
                    ) : item.is_locked ? (
                      <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase bg-purple-950/80 text-purple-400 border border-purple-800 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-purple-400" /> PUBLICADO
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
                      <img src={resolveImageUrl(item.image_url)} alt={item.title} className="w-full h-full object-contain brightness-90 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="flex flex-col text-left flex-1">
                      <h3 className="text-[10px] font-black text-white uppercase tracking-wider line-clamp-1">{item.title}</h3>
                      <p className="text-[8px] text-zinc-400 font-sans normal-case line-clamp-2 mt-0.5">{item.description}</p>
                    </div>
                  </div>

                  {item.is_locked ? (
                    <div className="bg-black/80 border border-zinc-800 p-2 rounded-lg text-center text-[8px] text-zinc-500 font-bold uppercase">
                      {item.is_in_flight ? "ACTIVO EN MISIÓN - NO REUTILIZABLE" : "PUBLICACIÓN ACTIVA EN EL MERCADO"}
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

              <div className="grid grid-cols-2 gap-2 bg-black/60 p-1 rounded-xl border border-cyan-950 text-[9px] font-bold uppercase">
                <button
                  type="button"
                  onClick={() => setSellIsAuction(false)}
                  className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                    !sellIsAuction
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> VENTA DIRECTA
                </button>
                <button
                  type="button"
                  onClick={() => setSellIsAuction(true)}
                  className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                    sellIsAuction
                      ? 'bg-amber-950 text-amber-300 border-amber-500/60 font-black shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                      : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  <Gavel className="w-3.5 h-3.5" /> SUBASTA EN VIVO
                </button>
              </div>

              <div className="p-3 bg-black/80 border border-cyan-950 rounded-xl flex items-center gap-3">
                <img src={resolveImageUrl(selectedItemToList.image_url)} alt={selectedItemToList.title} className="w-12 h-12 object-contain" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white uppercase">{selectedItemToList.title}</span>
                  <span className="text-[8px] text-cyan-400 uppercase">CATEGORÍA: {selectedItemToList.category} | RAREZA: {selectedItemToList.rarity}</span>
                </div>
              </div>

              <form onSubmit={handleConfirmPublish} className="flex flex-col gap-3 text-[9px]">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-zinc-400 font-bold uppercase">
                    <span>{sellIsAuction ? 'PRECIO DE SALIDA / PUJA INICIAL' : 'PRECIO DE VENTA DIRECTA'} EN</span>
                    <img src={GD_COIN_ASSET} alt="GD Coin" className="w-3.5 h-3.5 object-contain" />
                  </div>
                  <input
                    type="number"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Number(e.target.value))}
                    className="bg-black border border-cyan-950 focus:border-cyan-500 rounded-lg p-2 text-amber-400 font-black outline-none"
                  />
                </div>

                {sellIsAuction && (
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-400 font-bold uppercase">DURACIÓN DE LA SUBASTA</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['12h', '24h', '48h'] as const).map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setAuctionDuration(dur)}
                          className={`py-1.5 rounded border text-[8.5px] font-bold uppercase cursor-pointer ${
                            auctionDuration === dur
                              ? 'bg-amber-950 text-amber-300 border-amber-500'
                              : 'bg-black text-zinc-500 border-cyan-950 hover:text-white'
                          }`}
                        >
                          {dur}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                  className={`w-full py-2.5 text-white font-black text-[9.5px] uppercase rounded-lg shadow transition-all cursor-pointer flex items-center justify-center gap-2 mt-1 ${
                    sellIsAuction
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  {sellIsAuction ? 'CONFIRMAR Y PUBLICAR SUBASTA' : 'CONFIRMAR Y PUBLICAR VENTA DIRECTA'}
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