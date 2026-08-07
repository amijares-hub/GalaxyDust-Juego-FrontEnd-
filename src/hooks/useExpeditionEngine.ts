import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Expedition {
  id: string;
  phase: 'traveling' | 'active' | 'returning' | 'finished';
  target_cluster: string;
  timeLeft: number; // Expresado en segundos para las barras de progreso de Tailwind
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
        .from('user_expeditions')
        .select('*')
        .in('phase', ['traveling', 'active', 'returning']);

      if (error) {
        console.error("Fallo al escanear radar estelar:", error.message);
        return;
      }

      if (data && isMounted) {
        const mapped: Expedition[] = data.map(exp => {
          const targetDate = exp.phase === 'traveling' ? new Date(exp.arrival_time) : new Date(exp.return_time);
          const diffSeconds = Math.max(0, Math.floor((targetDate.getTime() - Date.now()) / 1000));
          return {
            id: exp.id,
            phase: exp.phase,
            target_cluster: exp.target_cluster,
            timeLeft: diffSeconds
          };
        });
        setActiveExpeditions(mapped);
        setLoading(false);
      }
    };

    loadExpeditions();

    // 🛰️ Escucha Realtime: Si el Backoffice o la API alteran la fase o inyectan eventos, refrescamos el HUD
    channel = supabase
      .channel(`star_radar_changes_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_expeditions', filter: `user_id=eq.${user.id}` }, () => {
        loadExpeditions();
      })
      .subscribe();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ⏱️ RELOJ DE TICK CONTINUO: Descuenta segundos en el cliente para animar las barras en tiempo real
  useEffect(() => {
    if (activeExpeditions.length === 0) return;

    const timer = setInterval(() => {
      setActiveExpeditions(prev =>
        prev.map(exp => ({
          ...exp,
          timeLeft: Math.max(0, exp.timeLeft - 1)
        })).filter(exp => exp.timeLeft > 0) // Si llega a 0, el Realtime de Supabase se encargará de re-hidratar la nueva fase
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [activeExpeditions.length]);

  return { activeExpeditions, loading };
}