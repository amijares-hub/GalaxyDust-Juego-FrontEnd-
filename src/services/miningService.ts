import { supabase } from '../lib/supabase';

// ============================================================================
// ESTRUCTURAS E INTERFACES DEL SERVICIO DE MINERÍA Y C.A.N.
// ============================================================================

export interface MiningDrop {
  type: 'RESOURCE' | 'CURRENCY' | 'BLUEPRINT' | 'ASTROBOT';
  name: string;
  amount: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
  icon: string;
  numericAmount?: number;
}

export interface StructureSkill {
  skill_code: string;
  stat_affected: string;
  operator: 'add' | 'multiply';
  modifier_value: number;
}

export interface UserStructureActive {
  id: string;
  user_id: string;
  structure_id: string;
  structure_name: string;
  is_active: boolean;
  skills: StructureSkill[];
}

export interface CANProductionReport {
  energyProduced: number;
  energyRequired: number;
  energyEfficiency: number; // Factor entre 0.0 (Sin energía) y 1.0 (100% Operativa)
  hourlyProduction: {
    metal: number;
    crystal: number;
    deuterium: number;
    dark_matter: number;
  };
  storageLimits: {
    metal: number;
    crystal: number;
    deuterium: number;
    dark_matter: number;
  };
}

// Configuración de almacenamiento base del jugador
const BASE_STORAGE = {
  metal: 10000,
  crystal: 5000,
  deuterium: 2500,
  dark_matter: 100
};

// ============================================================================
// MOTOR MAESTRO MINING SERVICE
// ============================================================================

export const miningService = {
  /**
   * CÁLCULO DE ESTRUCTURAS, ENERGÍA SOLAR Y LÍMITES DE ALMACENAMIENTO C.A.N.
   * Audita estructuras activas, consumo de energía y producción por hora.
   */
  async calculateUserCANMetrics(userId: string): Promise<CANProductionReport> {
    try {
      const { data: userStructs } = await supabase
        .from('user_structures')
        .select(`
          id,
          user_id,
          structure_id,
          is_active,
          seed_structures!fk_user_structures_seed_structures (
            name,
            skills
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      let energyProduced = 0;
      let energyRequired = 0;

      let rawMetalRates = 0;
      let rawCrystalRates = 0;
      let rawDeuteriumRates = 0;
      let rawDarkMatterRates = 0;

      let totalMineBoostPercent = 0;

      let storageAdditions = {
        metal: 0,
        crystal: 0,
        deuterium: 0,
        dark_matter: 0
      };

      if (userStructs && userStructs.length > 0) {
        for (const struct of userStructs) {
          const rawSkills = (struct.seed_structures as any)?.skills || [];
          let skillsList: StructureSkill[] = [];

          if (Array.isArray(rawSkills)) {
            skillsList = rawSkills;
          } else if (typeof rawSkills === 'string') {
            try { skillsList = JSON.parse(rawSkills); } catch { skillsList = []; }
          }

          for (const skill of skillsList) {
            const val = Number(skill.modifier_value || 0);

            switch (skill.stat_affected) {
              // 1. Energía Solar
              case 'energy_production':
                energyProduced += val;
                break;
              case 'energy_required':
                energyRequired += val;
                break;

              // 2. Extracción por Hora
              case 'metal_production':
                rawMetalRates += val;
                break;
              case 'crystal_production':
                rawCrystalRates += val;
                break;
              case 'deuterium_production':
                rawDeuteriumRates += val;
                break;
              case 'dark_matter_production':
                rawDarkMatterRates += val;
                break;

              // 3. Potenciador %
              case 'mine_boost':
                totalMineBoostPercent += val;
                break;

              // 4. Capacidad de Almacenamiento
              case 'metal_storage':
                storageAdditions.metal += val;
                break;
              case 'crystal_storage':
                storageAdditions.crystal += val;
                break;
              case 'deuterium_storage':
                storageAdditions.deuterium += val;
                break;
              case 'dark_matter_storage':
                storageAdditions.dark_matter += val;
                break;
            }
          }
        }
      }

      // 🛡️ Regla de Energía: Si la mina requiere energía y no hay Planta Solar activa, se apaga la producción (eficiencia 0.0)
      let energyEfficiency = 1.0;
      if (energyRequired > 0) {
        if (energyProduced === 0) {
          energyEfficiency = 0.0;
        } else {
          energyEfficiency = Math.min(1.0, energyProduced / energyRequired);
        }
      }

      const boostMultiplier = 1.0 + totalMineBoostPercent;

      return {
        energyProduced,
        energyRequired,
        energyEfficiency,
        hourlyProduction: {
          metal: Math.floor(rawMetalRates * boostMultiplier * energyEfficiency),
          crystal: Math.floor(rawCrystalRates * boostMultiplier * energyEfficiency),
          deuterium: Math.floor(rawDeuteriumRates * boostMultiplier * energyEfficiency),
          dark_matter: Math.floor(rawDarkMatterRates * boostMultiplier * energyEfficiency)
        },
        storageLimits: {
          metal: BASE_STORAGE.metal + storageAdditions.metal,
          crystal: BASE_STORAGE.crystal + storageAdditions.crystal,
          deuterium: BASE_STORAGE.deuterium + storageAdditions.deuterium,
          dark_matter: BASE_STORAGE.dark_matter + storageAdditions.dark_matter
        }
      };
    } catch (error) {
      console.error("Error al calcular métricas C.A.N.:", error);
      return {
        energyProduced: 0,
        energyRequired: 0,
        energyEfficiency: 0,
        hourlyProduction: { metal: 0, crystal: 0, deuterium: 0, dark_matter: 0 },
        storageLimits: BASE_STORAGE
      };
    }
  },

  /**
   * Comprueba si el jugador tiene expediciones de minería en curso
   * para bloquear cambios de tecnología en inventario (Página 1, Req 4)
   */
  async hasActiveMiningExpeditions(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
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
   * Rastrea y devuelve el número de jugadores activos en línea en tiempo real (Página 1, Req 5 - KPI Backend)
   */
  async getActivePlayersCount(): Promise<number> {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const { count, error } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', fifteenMinutesAgo);

      if (error || count === null) {
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