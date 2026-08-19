import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Expedition {
  id: string;
  fleet_name: string;
  sector_name: string;
  galaxy_cluster: string;
  star_cluster?: string;
  status: 'LAUNCHED' | 'SUCCESS' | 'FAILED' | 'CLAIMED';
  timeLeft: number;
  progress: number;
  is_adrift?: boolean;
  estimated_return_time: string;
}

export function useExpeditionEngine() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeExpeditions, setActiveExpeditions] = useState<Expedition[]>([]);
  const [loading, setLoading] = useState(true);

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

  const loadExpeditions = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('active_expeditions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'LAUNCHED');

      if (error) throw error;

      if (data) {
        const mapped: Expedition[] = data.map((exp: any) => {
          const returnDate = new Date(exp.estimated_return_time || Date.now());
          const launchDate = new Date(exp.launch_time || Date.now());
          const now = Date.now();

          const totalSeconds = Math.max(1, Math.floor((returnDate.getTime() - launchDate.getTime()) / 1000));
          const diffSeconds = Math.max(0, Math.floor((returnDate.getTime() - now) / 1000));
          const elapsedSeconds = totalSeconds - diffSeconds;
          const calculatedProgress = Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100));

          return {
            id: exp.id,
            fleet_name: exp.fleet_name || "Flota Sin Nombre",
            sector_name: exp.sector_name || "Espacio Profundo",
            galaxy_cluster: exp.galaxy_cluster || "Cúmulo Desconocido",
            star_cluster: exp.star_cluster,
            status: exp.status,
            timeLeft: diffSeconds,
            progress: parseFloat(calculatedProgress.toFixed(1)),
            is_adrift: exp.is_adrift,
            estimated_return_time: exp.estimated_return_time
          };
        });

        setActiveExpeditions(mapped);
      }
    } catch (err: any) {
      console.error("🚨 Fallo al escanear radar estelar:", err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    if (isMounted) {
      loadExpeditions();
    }

    const channel = supabase
      .channel(`exp_engine_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_expeditions',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadExpeditions();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, loadExpeditions]);

  useEffect(() => {
    if (activeExpeditions.length === 0) return;

    const timer = setInterval(() => {
      setActiveExpeditions((prev) =>
        prev.map((exp) => ({
          ...exp,
          timeLeft: Math.max(0, exp.timeLeft - 1)
        }))
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [activeExpeditions.length]);

  return { activeExpeditions, loading, refreshExpeditions: loadExpeditions };
}