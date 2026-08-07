import { supabase } from '../lib/supabase';

export interface CraftingCosts {
  metal?: number;
  crystal?: number;
  deuterium?: number;
  dark_matter?: number;
  organium?: number;
  gd_coins?: number;
}

export interface TacticalStats {
  kinetic_attack?: number;
  laser_attack?: number;
  plasma_attack?: number;
  ionic_attack?: number;
  graviton_attack?: number;
  travel_speed?: number;
  combat_speed?: number;
  speed_boost?: number;
  shield?: number;
  hp?: number;
  defense?: number;
  durability?: number;
  cargo_capacity?: number;
  fleet_space?: number;
  production?: number;
}

export interface SkillDetail {
  name: string;
  description: string;
}

export interface AssetSkills {
  active?: SkillDetail[];
  passive?: SkillDetail[];
  set?: SkillDetail;
}

export interface InventoryItem {
  id: string;
  name: string;
  fullname: string;
  category: 'Spaceships' | 'Structures' | 'Tecnology' | 'Astrobots' | 'Tools' | 'Badges' | 'Consumibles';
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | string;
  faction?: string;
  avatar_url: string;
  unlocked: boolean;
  quantity: number;
  stars: number;
  level: number;
  power?: number;
  favorite?: boolean;
  sound?: string;
  description?: string;
  blueprints_owned: number;
  blueprints_required: number;
  crafting_costs?: CraftingCosts;
  tactical_stats?: TacticalStats;
  skills?: AssetSkills;
}

/**
 * 📡 CONSULTA CANÓNICA DE INVENTARIOS
 * Obtiene directamente los componentes asociados al usuario desde `user_inventory`.
 */
export async function fetchAllInventory(): Promise<InventoryItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("⚠️ No se detectó ninguna sesión activa de piloto.");
  }

  const { data, error } = await supabase
    .from('user_inventory')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("🚨 [GALAXYDUST KERNEL]: Error al cargar user_inventory:", error.message);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Mapeo determinista sin valores aleatorios
  return data.map((item: any) => ({
    id: item.id,
    name: item.name || 'Activo Sin Nombre',
    fullname: item.fullname || item.name || 'Activo Desconocido',
    category: item.category || 'Spaceships',
    rarity: item.rarity || 'Common',
    faction: item.faction || 'NOVA',
    avatar_url: item.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200',
    unlocked: Boolean(item.unlocked),
    quantity: Number(item.quantity || 1),
    stars: Number(item.stars || 1),
    level: Number(item.level || 1),
    power: Number(item.power || 0),
    favorite: Boolean(item.favorite),
    sound: item.sound || 'laser_success',
    description: item.description || '',
    blueprints_owned: Number(item.blueprints_owned || 0),
    blueprints_required: Number(item.blueprints_required || 1),
    crafting_costs: item.crafting_costs || {
      metal: 0,
      crystal: 0,
      deuterium: 0,
      dark_matter: 0,
      organium: 0,
      gd_coins: 0
    },
    tactical_stats: item.tactical_stats || {},
    skills: item.skills || {}
  }));
}

export const inventoryService = {
  /**
   * Transacción atómica de fabricación en Backend.
   * Ejecuta el RPC `craft_inventory_item` verificando materiales y descontando fondos.
   */
  async craftAsset(
    userId: string,
    costs: CraftingCosts,
    itemMeta: { id: string; name: string; category: string; rarity: string }
  ) {
    const { data, error } = await supabase.rpc('craft_inventory_item', {
      p_user_id: userId,
      p_item_id: itemMeta.id,
      p_cost_metal: costs.metal || 0,
      p_cost_crystal: costs.crystal || 0,
      p_cost_deuterium: costs.deuterium || 0,
      p_cost_dark_matter: costs.dark_matter || 0,
      p_cost_organium: costs.organium || 0,
      p_cost_gd_coins: costs.gd_coins || 0
    });

    if (error) {
      console.error("🚨 [GALAXYDUST KERNEL]: Rechazo en transacción RPC craft_inventory_item:", error.message);
      throw error;
    }

    return data;
  }
};