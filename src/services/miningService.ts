import { supabase } from '../lib/supabase';

export interface MiningDrop {
  type: 'RESOURCE' | 'CURRENCY' | 'BLUEPRINT' | 'ASTROBOT';
  name: string;
  amount: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
  icon: string;
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
        .in('status', ['TRAVELING', 'MINING', 'RETURNING']);

      if (error) return true; // Por seguridad bloquea si hay fallo de red
      return (count || 0) > 0;
    } catch (err) {
      return false;
    }
  },

  /**
   * Calcula un Drop Aleatorio para Minería basado en tablas de probabilidad (Página 1, Req 2)
   */
  calculateMiningDrop(): MiningDrop {
    const rand = Math.random() * 100;

    if (rand < 5) {
      // 5% Probabilidad: Drop Legendario (Blueprint o Astrobot)
      return {
        type: 'BLUEPRINT',
        name: 'BLUEPRINT TOX-SYNDICATE MK-II',
        amount: '1 UNIDAD',
        rarity: 'LEGENDARY',
        icon: '📜'
      };
    } else if (rand < 25) {
      // 20% Probabilidad: Drop Raro (Dark Matter o Phantom Coins)
      return {
        type: 'CURRENCY',
        name: 'DARK MATTER & PHANTOM COINS',
        amount: '+500 DM & +25 PH',
        rarity: 'RARE',
        icon: '🔮'
      };
    } else {
      // 75% Probabilidad: Drop Común de Recursos Extra
      const resourceAmount = Math.floor(Math.random() * 15000) + 5000;
      return {
        type: 'RESOURCE',
        name: 'PACK DE RECURSOS EXTRAÍDOS',
        amount: `+${resourceAmount.toLocaleString()} CRISTAL / METAL`,
        rarity: 'COMMON',
        icon: '💎'
      };
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
