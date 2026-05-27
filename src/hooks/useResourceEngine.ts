import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useResourceEngine() {
  const { user } = useAuth();
  const userId = user?.id;

  const [metal, setMetal] = useState<number>(0);
  const [crystal, setCrystal] = useState<number>(0);

  // Refs para guardar las tasas de producción sin provocar re-renders del intervalo
  const metalRateRef = useRef<number>(0);
  const crystalRateRef = useRef<number>(0);

  // ─── SUSCRIPCIÓN WEBSOCKET + CARGA INICIAL (RE-ALINEADO COMPLETO A 'user_id') ───
  useEffect(() => {
    if (!userId) return;

    let channel: any;

    const fetchInitialData = async () => {
      try {
        // AJUSTE CRÍTICO: Buscamos por '.eq('user_id', userId)' para respetar la estructura de tu DB
        const { data, error } = await supabase
          .from('user_profiles')
          .select('metal, crystal, metal_production_rate, crystal_production_rate')
          .eq('user_id', userId)
          .limit(1);

        if (error) {
          console.warn('Fallback a columnas base de recursos:', error.message);
          const { data: fallback, error: fallbackError } = await supabase
            .from('user_profiles')
            .select('metal, crystal')
            .eq('user_id', userId)
            .limit(1);

          if (fallbackError) {
            console.error('Error al obtener recursos base:', fallbackError.message);
            return;
          }
          if (fallback && fallback.length > 0) {
            const fbData = fallback[0];
            setMetal(parseFloat(fbData.metal || 0));
            setCrystal(parseFloat(fbData.crystal || 0));
          }
          return;
        }

        if (data && data.length > 0) {
          const d = data[0];
          setMetal(parseFloat(d.metal || 0));
          setCrystal(parseFloat(d.crystal || 0));
          metalRateRef.current = parseFloat(d.metal_production_rate || 0);
          crystalRateRef.current = parseFloat(d.crystal_production_rate || 0);
        }
      } catch (err) {
        console.error('Error fetching initial resources:', err);
      }
    };

    fetchInitialData();

    // Suscripción en tiempo real — AJUSTE CRÍTICO: Filtro mapeado a 'user_id=eq.'
    channel = supabase
      .channel(`resource_engine_channel_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          if (payload.new) {
            if (payload.new.metal !== undefined) {
              setMetal(parseFloat(payload.new.metal || 0));
            }
            if (payload.new.crystal !== undefined) {
              setCrystal(parseFloat(payload.new.crystal || 0));
            }
            if (payload.new.metal_production_rate !== undefined) {
              metalRateRef.current = parseFloat(payload.new.metal_production_rate || 0);
            }
            if (payload.new.crystal_production_rate !== undefined) {
              crystalRateRef.current = parseFloat(payload.new.crystal_production_rate || 0);
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  // ─── SIMULACIÓN LOCAL DE PRODUCCIÓN PASIVA (1 tick/segundo) ─────────────
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      const metalPerTick = metalRateRef.current / 3600;
      const crystalPerTick = crystalRateRef.current / 3600;

      if (metalPerTick > 0) {
        setMetal((prev) => prev + metalPerTick);
      }
      if (crystalPerTick > 0) {
        setCrystal((prev) => prev + crystalPerTick);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userId]);

  return { metal, crystal };
}