import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Expedition {
  id: string;
  fleet_name: string;
  sector_name: string;
  galaxy_cluster: string;
  star_cluster?: string;
  status: 'LAUNCHED' | 'SUCCESS' | 'FAILED' | 'CLAIMED';
  timeLeft: number; // Expresado en segundos para las barras de progreso
  progress: number; // Porcentaje de progreso (0 a 100)
  is_adrift?: boolean;
  estimated_return_time: string;
}

export function useExpeditionEngine() {
  const { user } = useAuth();
  const [activeExpeditions, setActiveExpeditions] = useState<Expedition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    let channel: any;

    const loadExpeditions = async () => {
      const { data, error } = await supabase
        .from('active_expeditions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'LAUNCHED');

      if (error) {
        console.error("🚨 [GALAXYDUST KERNEL]: Fallo al escanear radar estelar:", error.message);
        return;
      }

      if (data && isMounted) {
        const mapped: Expedition[] = data.map(exp => {
          const returnDate = new Date(exp.estimated_return_time);
          const launchDate = new Date(exp.launch_time);
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
        setLoading(false);
      }
    };

    loadExpeditions();

    // 🛰️ Escucha Realtime: Refresca el radar en caliente cuando se inserta o cambia una expedición
    channel = supabase
      .channel(`expeditions_engine_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_expeditions', filter: `user_id=eq.${user.id}` },
        () => {
          loadExpeditions();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ⏱️ RELOJ DE TICK CONTINUO: Descuenta segundos en el cliente y calcula el % de progreso
  useEffect(() => {
    if (activeExpeditions.length === 0) return;

    const timer = setInterval(() => {
      setActiveExpeditions(prev =>
        prev.map(exp => {
          const nextTimeLeft = Math.max(0, exp.timeLeft - 1);
          return {
            ...exp,
            timeLeft: nextTimeLeft
          };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [activeExpeditions.length]);

  return { activeExpeditions, loading };
}