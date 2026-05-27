import { supabase } from './supabase';

export interface InventoryItem {
  id: string;
  name: string;
  fullname: string;
  avatar_url: string;
  category: string; // Mapeado a: "Spaceships" | "Structures" | "Tecnology" | "Badges"
  faction: string;  // Mapeado a la Corporación/Colección (Nova, Osiris, Myton...)
  rarity: string;   // Common, Uncommon, Rare, Epic, Legendary, Phantom, Xmas Nova
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
}

// Carga en paralelo desde todas las tablas usando Promise.all (0 Lag en red)
export async function fetchAllInventory(): Promise<InventoryItem[]> {
  try {
    const [shipsRes, structsRes, techsRes, badgesRes] = await Promise.all([
      supabase.from('seed_ships').select('*'),
      supabase.from('seed_structures').select('*'),
      supabase.from('seed_technologies').select('*'),
      supabase.from('seed_badges').select('*')
    ]);

    const unifiedInventory: InventoryItem[] = [];

    // 1. Inyectar las 119 Naves
    if (shipsRes.data) {
      shipsRes.data.forEach((ship) => {
        const skills = ship.skills_modifiers || {};
        unifiedInventory.push({
          id: ship.ship_id,
          name: ship.ship_name,
          fullname: `${ship.ship_name} [${ship.rarity.toUpperCase()}]`,
          avatar_url: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${ship.ship_id}`,
          category: 'Spaceships',
          faction: skills.engine || 'HyperSpace',
          rarity: ship.rarity,
          level: ship.requirements?.can_level_required || 1,
          stars: ship.rarity === 'Legendary' ? 7 : ship.rarity === 'Epic' ? 5 : 3,
          blueprints_owned: Math.floor(Math.random() * 12), // Simulación de blueprints poseídos
          blueprints_required: 15,
          unlocked: ship.rarity !== 'Legendary',
          favorite: false,
          sound: 'heavy_laser',
          hp: skills.resistance || 5000,
          stamina: skills.shield || 4000,
          speed: parseInt(skills.speed_boost) || 120,
          defense: skills.defense || 200,
          description: ship.description || ''
        });
      });
    }

    // 2. Inyectar las 44 Estructuras
    if (structsRes.data) {
      structsRes.data.forEach((b) => {
        unifiedInventory.push({
          id: b.building_id,
          name: b.building_name,
          fullname: b.building_name,
          avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${b.building_id}`,
          category: 'Structures',
          faction: b.company || 'Kant',
          rarity: b.rarity,
          level: 1,
          stars: 4,
          blueprints_owned: 15,
          blueprints_required: 15,
          unlocked: true,
          favorite: false,
          sound: 'laser_success',
          hp: 15000,
          stamina: 0,
          speed: 0,
          defense: 500,
          description: b.description || ''
        });
      });
    }

    // 3. Inyectar las 53 Tecnologías
    if (techsRes.data) {
      techsRes.data.forEach((t) => {
        unifiedInventory.push({
          id: t.technology_id,
          name: t.technology_name,
          fullname: t.technology_name,
          avatar_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${t.technology_id}`,
          category: 'Tecnology',
          faction: t.company || 'Myton',
          rarity: t.rarity,
          level: 1,
          stars: 3,
          blueprints_owned: 5,
          blueprints_required: 10,
          unlocked: true,
          favorite: false,
          sound: 'laser_click',
          hp: 0,
          stamina: 0,
          speed: 10,
          defense: 0,
          description: t.description || ''
        });
      });
    }

    // 4. Inyectar las Insignias de Eventos
    if (badgesRes.data) {
      badgesRes.data.forEach((badge) => {
        unifiedInventory.push({
          id: badge.badge_id,
          name: badge.badge_name,
          fullname: badge.badge_name,
          avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${badge.badge_id}`,
          category: 'Badges',
          faction: badge.badge_type || 'Special',
          rarity: 'Exclusive',
          level: 1,
          stars: 5,
          blueprints_owned: 1,
          blueprints_required: 1,
          unlocked: true,
          favorite: false,
          sound: 'laser_success',
          hp: 0,
          stamina: 0,
          speed: 0,
          defense: 0,
          description: badge.description || ''
        });
      });
    }

    return unifiedInventory;
  } catch (error) {
    console.error("Critical fetching assets:", error);
    throw error;
  }
}