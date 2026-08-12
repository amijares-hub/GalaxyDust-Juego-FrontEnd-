import { supabase } from '../lib/supabase';

export interface MiningDrop {
  type: 'RESOURCE' | 'CURRENCY' | 'BLUEPRINT' | 'ASTROBOT';
  name: string;
  amount: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
  icon: string;
  numericAmount?: number;
}

export const miningService = {
  /**
   * Comprueba si el jugador tiene expediciones de minería en curso
   * para bloquear cambios de tecnología en inventario (Página 1, Req 4)
   */
  async hasActiveMiningExpeditions(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { count, error } = await supabase
        .from('active_expeditions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'MINING')
        .in('status', ['LAUNCHED', 'TRAVELING', 'MINING', 'RETURNING']);

      if (error) return true; // Por seguridad bloquea si hay fallo de red
      return (count || 0) > 0;
    } catch (err) {
      return false;
    }
  },

  /**
   * Calcula un Drop Aleatorio para Minería basado en tablas de probabilidad (Página 1, Req 2)
   * Acepta modificadores de riqueza estelar y bonos de rareza de la C.A.N.
   */
  calculateMiningDrop(starRichnessMultiplier: number = 1.0, userRarityBonusPct: number = 0): MiningDrop {
    // Genera valor aleatorio de 0 a 100 modificando probabilidades según bonos de la C.A.N.
    const roll = Math.random() * 100;
    const effectiveRoll = Math.max(0, roll - userRarityBonusPct);

    if (effectiveRoll < 5) {
      // 5% Probabilidad: Drop Legendario (Blueprint de Nave o Astrobot Autónomo)
      const isAstrobot = Math.random() > 0.5;
      if (isAstrobot) {
        return {
          type: 'ASTROBOT',
          name: 'ASTROBOT EXTRACCIÓN OMEGA X-1',
          amount: '1 UNIDAD',
          rarity: 'LEGENDARY',
          icon: '🤖',
          numericAmount: 1
        };
      }
      return {
        type: 'BLUEPRINT',
        name: 'BLUEPRINT TOX-SYNDICATE MK-II',
        amount: '1 UNIDAD',
        rarity: 'LEGENDARY',
        icon: '📜',
        numericAmount: 1
      };
    } else if (effectiveRoll < 25) {
      // 20% Probabilidad: Drop Raro (Dark Matter & Phantom Coins)
      const dmAmount = Math.floor((Math.random() * 300 + 200) * starRichnessMultiplier);
      const phAmount = Math.floor(Math.random() * 15 + 10);
      return {
        type: 'CURRENCY',
        name: 'DARK MATTER & PHANTOM COINS',
        amount: `+${dmAmount} DM & +${phAmount} PH`,
        rarity: 'RARE',
        icon: '🔮',
        numericAmount: dmAmount
      };
    } else {
      // 75% Probabilidad: Drop Común de Recursos Extra
      const baseResource = Math.floor((Math.random() * 15000 + 5000) * starRichnessMultiplier);
      return {
        type: 'RESOURCE',
        name: 'PACK DE RECURSOS EXTRAÍDOS',
        amount: `+${baseResource.toLocaleString()} CRISTAL / METAL`,
        rarity: 'COMMON',
        icon: '💎',
        numericAmount: baseResource
      };
    }
  },

  /**
   * Aplica la regla del tope máximo para Boost de Producción
   * "El Boost de producción es acumulable hasta un máximo de 1 día (24 horas)" (Página 1, Req 6)
   */
  calculateProductionBoost(accumulatedHours: number, boostPercentagePerHour: number): {
    cappedHours: number;
    totalBoostPercentage: number;
    isCapped: boolean;
  } {
    const MAX_BOOST_HOURS = 24; // 1 día límite máximo estricto
    const cappedHours = Math.min(accumulatedHours, MAX_BOOST_HOURS);
    const totalBoostPercentage = cappedHours * boostPercentagePerHour;

    return {
      cappedHours,
      totalBoostPercentage,
      isCapped: accumulatedHours >= MAX_BOOST_HOURS
    };
  },

  /**
   * Rastra y devuelve el número de jugadores activos en línea en tiempo real (Página 1, Req 5 - KPI Backend)
   */
  async getActivePlayersCount(): Promise<number> {
    try {
      // Consulta usuarios activos con sesiones o actividad en los últimos 15 minutos
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const { count, error } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', fifteenMinutesAgo);

      if (error || count === null) {
        // Fallback de consulta a expediciones activas
        const { count: expCount } = await supabase
          .from('active_expeditions')
          .select('user_id', { count: 'exact', head: true })
          .eq('status', 'LAUNCHED');
        
        return expCount || 1;
      }

      return Math.max(1, count);
    } catch (err) {
      return 1;
    }
  },

  /**
   * Guarda y acredita el Drop Raro de Minería en la base de datos de Supabase
   */
  async saveMiningDropReward(userId: string, drop: MiningDrop): Promise<boolean> {
    try {
      if (drop.type === 'RESOURCE' || drop.type === 'CURRENCY') {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('metal, crystal, dark_matter')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          const currentMetal = parseFloat(profile.metal || 0);
          const currentCrystal = parseFloat(profile.crystal || 0);
          const currentDM = parseFloat(profile.dark_matter || 0);

          const addedAmount = drop.numericAmount || 1000;

          await supabase
            .from('user_profiles')
            .update({
              metal: drop.type === 'RESOURCE' ? currentMetal + addedAmount : currentMetal,
              crystal: drop.type === 'RESOURCE' ? currentCrystal + Math.floor(addedAmount * 0.5) : currentCrystal,
              dark_matter: drop.type === 'CURRENCY' ? currentDM + addedAmount : currentDM,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        }
      } else {
        // Registrar ítem raro en el inventario del usuario
        await supabase.from('user_inventory').insert({
          user_id: userId,
          title: drop.name,
          category: drop.type === 'BLUEPRINT' ? 'BLUEPRINTS' : 'ASTROBOTS',
          rarity: drop.rarity,
          quantity: 1,
          created_at: new Date().toISOString()
        });
      }

      return true;
    } catch (err) {
      console.error("Error al acreditar drop de minería:", err);
      return false;
    }
  },

  /**
   * Formatea la fecha y hora actual a estándar UTC (Página 2, Req 4)
   */
  getFormattedUtcTime(): string {
    const now = new Date();
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds} UTC`;
  }
};