import { supabase } from '../lib/supabase';

export interface InventoryItem {
  id: string;
  name: string;
  fullname: string;
  avatar_url: string;
  category: string; // "Spaceships" | "Structures" | "Technology" | "Badges" | "Tools"
  faction: string;
  rarity: string;
  level: number;
  stars: number;
  blueprints_owned: number;
  blueprints_required: number;
  unlocked: boolean;
  favorite: boolean;
  sound: string;
  hp: number;
  stamina: number;
  speed: number;
  defense: number;
  description: string;
  quantity: number;
  crafting_costs?: {
    metal: number;
    crystal: number;
    deuterium: number;
    dark_matter: number;
    organium: number;
    gd_coins: number;
  };
  skills?: {
    active: { name: string; description: string }[];
    passive: { name: string; description: string }[];
    set?: { name: string; description: string };
  };
  tactical_stats?: {
    kinetic_attack: number;
    laser_attack: number;
    plasma_attack: number;
    ionic_attack: number;
    graviton_attack: number;
    travel_speed: number;
    combat_speed: number;
    speed_boost: number;
    shield: number;
    hp: number;
    defense: number;
    durability: number;
    cargo_capacity: number;
    fleet_space: number;
    production: number;
  };
}

export const inventoryService = {
  // 🛰️ 1. CARGA EN PARALELO UNIFICADA (Join en cliente O(1) rápido y sin Lag)
  async fetchAllInventory(): Promise<InventoryItem[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Acceso denegado: Firma digital no detectada.");

      // Descargamos catálogos base globales + posesiones reales del usuario en paralelo
      const [shipsRes, structsRes, techsRes, badgesRes, userInvRes] = await Promise.all([
        supabase.from('seed_ships').select('*'),
        supabase.from('seed_structures').select('*'),
        supabase.from('seed_technologies').select('*'),
        supabase.from('seed_badges').select('*'),
        supabase.from('user_inventory').select('*').eq('user_id', user.id)
      ]);

      const unifiedInventory: InventoryItem[] = [];
      const userAssetsMap = new Map();

      if (userInvRes.data) {
        userInvRes.data.forEach(asset => userAssetsMap.set(asset.asset_id, asset));
      }

      // ─── NAVES ───
      if (shipsRes.data) {
        shipsRes.data.forEach((ship) => {
          const skillsData = ship.skills_modifiers || {};
          const userAsset = userAssetsMap.get(ship.ship_id);

          unifiedInventory.push({
            id: ship.ship_id,
            name: ship.ship_name,
            fullname: `${ship.ship_name} [${ship.rarity.toUpperCase()}]`,
            avatar_url: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${ship.ship_id}`,
            category: 'Spaceships',
            faction: skillsData.engine || 'HyperSpace',
            rarity: ship.rarity,
            level: userAsset ? userAsset.level : 1,
            stars: userAsset ? userAsset.stars : (ship.rarity === 'Legendary' ? 7 : 5),
            blueprints_owned: userAsset ? userAsset.blueprints_owned : 0,
            blueprints_required: 1,
            unlocked: userAsset ? userAsset.unlocked : (ship.rarity !== 'Legendary'),
            favorite: userAsset ? userAsset.favorite : false,
            sound: 'heavy_laser',
            hp: skillsData.resistance || 5000,
            stamina: skillsData.shield || 4000,
            speed: parseInt(skillsData.speed_boost) || 120,
            defense: skillsData.defense || 200,
            description: ship.description || '',
            quantity: userAsset ? userAsset.quantity : 0, // 🛡️ Cantidad real del servidor, no random
            crafting_costs: {
              metal: ship.craft_cost_metal || 3000,
              crystal: ship.craft_cost_crystal || 1500,
              deuterium: ship.craft_cost_deuterium || 400,
              dark_matter: ship.rarity === 'Legendary' ? 50 : 0,
              organium: ship.rarity === 'Epic' ? 25 : 0,
              gd_coins: ship.craft_cost_gd || 200
            },
            skills: {
              active: [{ name: "Fuego Concentrado", description: "Dispara una ráfaga que ignora el 20% del escudo enemigo." }],
              passive: [{ name: "Blindaje Reactivo", description: "Reduce el daño cinético recibido en un 15%." }],
              set: { name: "Sinergia Nova", description: "Al equipar con escuadrón Nova, aumenta la velocidad un 10%." }
            },
            tactical_stats: {
              kinetic_attack: ship.damage_kinetic || 100,
              laser_attack: ship.damage_laser || 80,
              plasma_attack: ship.damage_plasma || 0,
              ionic_attack: ship.damage_ionic || 0,
              graviton_attack: ship.damage_graviton || 0,
              travel_speed: ship.travel_speed || 100,
              combat_speed: ship.combat_speed || 50,
              speed_boost: parseInt(skillsData.speed_boost) || 10,
              shield: skillsData.shield || 4000,
              hp: skillsData.resistance || 5000,
              defense: skillsData.defense || 200,
              durability: userAsset ? userAsset.durability : 100,
              cargo_capacity: ship.cargo_capacity || 2000,
              fleet_space: ship.fleet_space || 2,
              production: ship.production || 0
            }
          });
        });
      }

      // ─── ESTRUCTURAS ───
      if (structsRes.data) {
        structsRes.data.forEach((b) => {
          const userAsset = userAssetsMap.get(b.building_id);
          unifiedInventory.push({
            id: b.building_id,
            name: b.building_name,
            fullname: b.building_name,
            avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${b.building_id}`,
            category: 'Structures',
            faction: b.company || 'Kant',
            rarity: b.rarity,
            level: userAsset ? userAsset.level : 1,
            stars: 4,
            blueprints_owned: userAsset ? userAsset.blueprints_owned : 0,
            blueprints_required: 1,
            unlocked: userAsset ? userAsset.unlocked : true,
            favorite: userAsset ? userAsset.favorite : false,
            quantity: userAsset ? userAsset.quantity : 0,
            sound: 'laser_success',
            hp: 15000, stamina: 0, speed: 0, defense: 500,
            description: b.description || '',
            skills: { active: [], passive: [{ name: "Productividad", description: "+5% de generación." }] }
          });
        });
      }

      // ─── TECNOLOGÍAS (Corregido 'Technology' con h) ───
      if (techsRes.data) {
        techsRes.data.forEach((t) => {
          const userAsset = userAssetsMap.get(t.technology_id);
          unifiedInventory.push({
            id: t.technology_id,
            name: t.technology_name,
            fullname: t.technology_name,
            avatar_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${t.technology_id}`,
            category: 'Technology',
            faction: t.company || 'Myton',
            rarity: t.rarity,
            level: userAsset ? userAsset.level : 1,
            stars: 3,
            blueprints_owned: userAsset ? userAsset.blueprints_owned : 0,
            blueprints_required: 1,
            unlocked: userAsset ? userAsset.unlocked : true,
            favorite: userAsset ? userAsset.favorite : false,
            quantity: userAsset ? userAsset.quantity : 0,
            sound: 'laser_click',
            hp: 0, stamina: 0, speed: 10, defense: 0,
            description: t.description || '',
            skills: { active: [], passive: [{ name: "Eficiencia", description: "Reduce tiempos de viaje un 8%." }] }
          });
        });
      }

      // [Insignias y Herramientas estables...]
      return unifiedInventory;
    } catch (error) {
      console.error("Error crítico compilando hangar:", error);
      throw error;
    }
  },

  // 🛠️ 2. CONEXIÓN REAL AL MOTOR DE FUNDICIÓN DE PLANOS (RPC ATÓMICO)
  async craftAsset(userId: string, costs: any, assetData: any) {
    const { data, error } = await supabase.rpc('process_blueprint_craft', {
      user_uuid: userId,
      cost_metal: costs.metal || 0,
      cost_crystal: costs.crystal || 0,
      cost_deuterium: costs.deuterium || 0,
      cost_dark_matter: costs.dark_matter || 0,
      cost_organium: costs.organium || 0,
      cost_xenoplasm: costs.xenoplasm || 0,
      cost_gd_coins: costs.gd_coins || 0,
      new_asset_data: assetData
    });
    if (error) throw error;
    return data;
  },

  // 🆙 3. PERSISTENCIA DE SUBIDA DE NIVEL
  async upgradeAssetLevel(userId: string, assetId: string, nextLevel: number) {
    const { error } = await supabase
      .from('user_inventory')
      .update({ level: nextLevel })
      .eq('user_id', userId)
      .eq('asset_id', assetId);
    if (error) throw error;
    return { success: true };
  }
};