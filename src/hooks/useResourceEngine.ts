import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ResourcesState {
  metal: number;
  crystal: number;
  deuterium: number;
  darkMatter: number;
  gdCoin: number;
  loading: boolean;
}

export function useResourceEngine(): ResourcesState {
  const [userId, setUserId] = useState<string | null>(null);
  const [resources, setResources] = useState<ResourcesState>({
    metal: 0,
    crystal: 0,
    deuterium: 0,
    darkMatter: 0,
    gdCoin: 0,
    loading: true
  });

  // Obtener el UUID real de Supabase Auth (UserProfile del AuthContext no expone `id`)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const fetchUserResources = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('metal, crystal, deuterium, dark_matter, gd_coin')
          .eq('id', userId)
          .maybeSingle();

        if (error) throw error;

        if (data && isMounted) {
          setResources({
            metal: Number(data.metal || 0),
            crystal: Number(data.crystal || 0),
            deuterium: Number(data.deuterium || 0),
            darkMatter: Number(data.dark_matter || 0),
            gdCoin: Number(data.gd_coin || 0),
            loading: false
          });
        }
      } catch (err) {
        console.error("Error al sincronizar recursos:", err);
      }
    };

    fetchUserResources();

    // 🛰️ Escucha Realtime: Refresca el HUD inmediatamente cuando cambien los recursos en la DB
    const channel = supabase
      .channel(`res_engine_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`
        },
        (payload: any) => {
          const updated = payload.new;
          if (updated && isMounted) {
            setResources((prev) => ({
              ...prev,
              metal: Number(updated.metal ?? prev.metal),
              crystal: Number(updated.crystal ?? prev.crystal),
              deuterium: Number(updated.deuterium ?? prev.deuterium),
              darkMatter: Number(updated.dark_matter ?? prev.darkMatter),
              gdCoin: Number(updated.gd_coin ?? prev.gdCoin),
              loading: false
            }));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return resources;
}

export default useResourceEngine;