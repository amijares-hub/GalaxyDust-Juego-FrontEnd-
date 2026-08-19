import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface MarketListing {
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

export function useMarketplace() {
  const [userId, setUserId] = useState<string | null>(null);
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Obtener el UUID real de Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchMarketplaceData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: dbListings, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });

      if (!error && dbListings) {
        setListings(dbListings.map((l: any) => ({
          id: l.id,
          seller_id: l.seller_id,
          inventory_item_id: l.inventory_item_id,
          title: l.title || 'ACTIVO GALÁCTICO',
          category: l.category || 'SHIPS',
          rarity: l.rarity || 'COMMON',
          description: l.description || 'Sin descripción.',
          price: Number(l.price || 0),
          currency: 'GD',
          is_auction: l.is_auction || false,
          current_bid: Number(l.current_bid || l.price || 0),
          ends_at: l.ends_at ? new Date(l.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '24h 00m',
          image_url: l.image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200',
          created_at: new Date(l.created_at).toLocaleDateString()
        })));
      }
    } catch (err) {
      console.error("Error al cargar Marketplace:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketplaceData();

    const channel = supabase
      .channel('marketplace_pub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_listings' }, () => {
        fetchMarketplaceData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMarketplaceData]);

  const publishItem = useCallback(async (params: {
    inventoryItemId: string;
    title: string;
    category: string;
    rarity: string;
    description: string;
    price: number;
    isAuction: boolean;
    imageUrl: string;
  }) => {
    if (!userId) throw new Error("Usuario no autenticado.");

    const { data, error } = await supabase.rpc('publish_marketplace_item_secure', {
      p_inventory_item_id: params.inventoryItemId,
      p_title: params.title,
      p_category: params.category,
      p_rarity: params.rarity,
      p_description: params.description,
      p_price: params.price,
      p_is_auction: params.isAuction,
      p_image_url: params.imageUrl
    });

    if (error) throw error;
    fetchMarketplaceData();
    return data;
  }, [userId, fetchMarketplaceData]);

  const buyItem = useCallback(async (listingId: string) => {
    if (!userId) throw new Error("Usuario no autenticado.");

    const { data, error } = await supabase.rpc('buy_marketplace_item_secure', {
      p_listing_id: listingId
    });

    if (error) throw error;
    fetchMarketplaceData();
    return data;
  }, [userId, fetchMarketplaceData]);

  const cancelListing = useCallback(async (listingId: string) => {
    if (!userId) throw new Error("Usuario no autenticado.");

    const { data, error } = await supabase.rpc('cancel_marketplace_listing_secure', {
      p_listing_id: listingId
    });

    if (error) throw error;
    fetchMarketplaceData();
    return data;
  }, [userId, fetchMarketplaceData]);

  return {
    listings,
    loading,
    publishItem,
    buyItem,
    cancelListing,
    refreshMarket: fetchMarketplaceData,
    currentUserId: userId
  };
}
