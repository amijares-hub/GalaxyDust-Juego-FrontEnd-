import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Interfaces estrictas para tipado militar de la flota
export interface Expedition {
  id: string;
  user_id?: string;
  sector_name: string;
  duration_hours: number;
  fleet_id?: string | null;
  fleet_name?: string | null;
  ship_type?: string;
  risk_factor: number;
  status: 'LAUNCHED' | 'SUCCESS' | 'FAILED';
  launch_time: string;
  estimated_return_time: string;
  is_adrift?: boolean;
  reward_est: any;
}

export function useExpeditionEngine(userId: string | undefined) {
  const [activeFlights, setActiveFlights] = useState<Expedition[]>([]);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<string | null>(null);

  // 1. CARGA DE TELEMETRÍA: Obtener vuelos activos en órbita
  const fetchActiveFlights = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('active_expeditions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'LAUNCHED')
      .order('estimated_return_time', { ascending: true });

    if (!error && data) {
      setActiveFlights(data as Expedition[]);
    } else if (error) {
      console.error('Error cargando telemetría de expediciones:', error.message);
    }
  };

  useEffect(() => {
    fetchActiveFlights();
  }, [userId]);

  // 2. DISPARADOR DE DESPEGUE: Inserción atómica con soporte de flotas y modo a la deriva
  const launchExpedition = async (
    sectorName: string,
    durationHours: number,
    fleetName: string,
    riskFactor: number,
    isAdrift: boolean = false,
    fleetId: string | null = null
  ) => {
    if (!userId || isLaunching) return { success: false, error: 'Acción bloqueada o usuario no autenticado.' };

    setIsLaunching(true);

    const launchTime = new Date();
    const returnTime = new Date();
    returnTime.setHours(launchTime.getHours() + durationHours);

    // Factor de riesgo: A la deriva duplica el riesgo base
    const effectiveRisk = isAdrift ? Math.min(0.99, riskFactor * 2) : riskFactor;

    try {
      const { data, error } = await supabase
        .from('active_expeditions')
        .insert([
          {
            user_id: userId,
            sector_name: sectorName,
            duration_hours: durationHours,
            fleet_id: fleetId,
            fleet_name: fleetName,
            risk_factor: effectiveRisk,
            status: 'LAUNCHED',
            launch_time: launchTime.toISOString(),
            estimated_return_time: returnTime.toISOString(),
            is_adrift: isAdrift,
            galaxy_cluster: sectorName.split(' / ')[0],
            reward_est: { ship_power: 150 }
          }
        ])
        .select();

      if (error) throw error;

      if (data) {
        setActiveFlights((prev) => [...prev, data[0] as Expedition]);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error en despegue de hangar:', err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLaunching(false);
    }
  };

  // 3. RECOLECTOR DE BOTÍN: Handshake con la función RPC de Supabase
  const claimExpeditionLoot = async (expeditionId: string) => {
    if (isClaiming) return { success: false, error: 'Procesando otra extracción.' };

    setIsClaiming(expeditionId);

    try {
      const { data, error } = await supabase.rpc('resolve_expedition_loot', {
        p_expedition_id: expeditionId
      });

      if (error) throw error;

      setActiveFlights((prev) => prev.filter((f) => f.id !== expeditionId));

      return {
        success: true,
        status: data.status,
        rewards: data.rewards
      };
    } catch (err: any) {
      console.error('Fallo en la resolución del botín:', err.message);
      return { success: false, error: err.message };
    } finally {
      setIsClaiming(null);
    }
  };

  return {
    activeFlights,
    isLaunching,
    isClaiming,
    launchExpedition,
    claimExpeditionLoot,
    refreshFlights: fetchActiveFlights
  };
}
