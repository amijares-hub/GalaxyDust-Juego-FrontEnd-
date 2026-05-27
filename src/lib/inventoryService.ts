import { supabase } from './supabase';

export interface InventoryItem {
  id: string;
  name: string;
  fullname: string;
  avatar_url: string;
  category: string; // "Spaceships" | "Structures" | "Tecnology" | "Badges" | "Tools"
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
  
  // Novedades para Refactorización Masiva
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
  
  // Novedades: 14 Estadísticas Tácticas de Naves
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
        const skillsData = ship.skills_modifiers || {};
        unifiedInventory.push({
          id: ship.ship_id,
          name: ship.ship_name,
          fullname: `${ship.ship_name} [${ship.rarity.toUpperCase()}]`,
          avatar_url: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${ship.ship_id}`,
          category: 'Spaceships',
          faction: skillsData.engine || 'HyperSpace',
          rarity: ship.rarity,
          level: ship.requirements?.can_level_required || 1,
          stars: ship.rarity === 'Legendary' ? 7 : ship.rarity === 'Epic' ? 5 : 3,
          blueprints_owned: Math.floor(Math.random() * 2), // 0 or 1
          blueprints_required: 1, // 1 Plano = 1 Fabricación
          unlocked: ship.rarity !== 'Legendary',
          favorite: false,
          sound: 'heavy_laser',
          hp: skillsData.resistance || 5000,
          stamina: skillsData.shield || 4000,
          speed: parseInt(skillsData.speed_boost) || 120,
          defense: skillsData.defense || 200,
          description: ship.description || '',
          quantity: ship.rarity === 'Legendary' ? 0 : Math.floor(Math.random() * 4),
          crafting_costs: {
            metal: Math.floor(Math.random() * 5000) + 1000,
            crystal: Math.floor(Math.random() * 3000) + 500,
            deuterium: Math.floor(Math.random() * 1000) + 200,
            dark_matter: ship.rarity === 'Legendary' ? 50 : 0,
            organium: ship.rarity === 'Epic' ? 25 : 0,
            gd_coins: Math.floor(Math.random() * 500) + 100
          },
          skills: {
            active: [{ name: "Fuego Concentrado", description: "Dispara una ráfaga que ignora el 20% del escudo enemigo." }],
            passive: [{ name: "Blindaje Reactivo", description: "Reduce el daño cinético recibido en un 15%." }],
            set: { name: "Sinergia Nova", description: "Al equipar con escuadrón Nova, aumenta la velocidad un 10%." }
          },
          tactical_stats: {
            kinetic_attack: ship.damage_kinetic || Math.floor(Math.random() * 100),
            laser_attack: ship.damage_laser || Math.floor(Math.random() * 100),
            plasma_attack: ship.damage_plasma || Math.floor(Math.random() * 100),
            ionic_attack: ship.damage_ionic || Math.floor(Math.random() * 100),
            graviton_attack: ship.damage_graviton || Math.floor(Math.random() * 100),
            travel_speed: ship.travel_speed || Math.floor(Math.random() * 50) + 50,
            combat_speed: ship.combat_speed || Math.floor(Math.random() * 30) + 20,
            speed_boost: parseInt(skillsData.speed_boost) || 10,
            shield: skillsData.shield || 4000,
            hp: skillsData.resistance || 5000,
            defense: skillsData.defense || 200,
            durability: ship.durability || 100,
            cargo_capacity: ship.cargo_capacity || Math.floor(Math.random() * 5000) + 1000,
            fleet_space: ship.fleet_space || Math.floor(Math.random() * 5) + 1,
            production: ship.production || 0
          }
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
          blueprints_owned: 1,
          blueprints_required: 1,
          unlocked: true,
          favorite: false,
          sound: 'laser_success',
          hp: 15000,
          stamina: 0,
          speed: 0,
          defense: 500,
          description: b.description || '',
          quantity: Math.floor(Math.random() * 2),
          crafting_costs: {
            metal: 10000, crystal: 5000, deuterium: 2000, dark_matter: 0, organium: 0, gd_coins: 1000
          },
          skills: {
            active: [],
            passive: [{ name: "Productividad Aumentada", description: "+5% de generación de recursos." }]
          }
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
          blueprints_owned: 0,
          blueprints_required: 1,
          unlocked: true,
          favorite: false,
          sound: 'laser_click',
          hp: 0,
          stamina: 0,
          speed: 10,
          defense: 0,
          description: t.description || '',
          quantity: 1, // Las techs se investigan 1 vez
          crafting_costs: {
            metal: 2000, crystal: 8000, deuterium: 5000, dark_matter: 10, organium: 5, gd_coins: 2500
          },
          skills: {
            active: [],
            passive: [{ name: "Eficiencia Cuántica", description: "Reduce el tiempo de viaje en el hiperespacio un 8%." }]
          }
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
          description: badge.description || '',
          quantity: 1,
          skills: {
            active: [],
            passive: [{ name: "Aura de Comando", description: "+2% a todas las estadísticas de la flota." }]
          }
        });
      });
    }

    // Mock para Tools (ya que no viene de tabla externa en este momento)
    unifiedInventory.push({
      id: "tool-extractor-1",
      name: "Extractor de Núcleo Plasma",
      fullname: "Extractor de Núcleo Plasma [RARE]",
      avatar_url: `https://api.dicebear.com/7.x/icons/svg?seed=extractor`,
      category: 'Tools',
      faction: 'Myton',
      rarity: 'Rare',
      level: 1,
      stars: 4,
      blueprints_owned: 1,
      blueprints_required: 1,
      unlocked: true,
      favorite: false,
      sound: 'laser_success',
      hp: 0,
      stamina: 0,
      speed: 0,
      defense: 0,
      description: "Herramienta indispensable de extracción minera. Ocupa 1 espacio de capacidad de flota y permite la recolección física de materiales cristalinos en expediciones.",
      quantity: 5,
      crafting_costs: {
        metal: 500, crystal: 500, deuterium: 50, dark_matter: 0, organium: 0, gd_coins: 100
      },
      skills: {
        active: [],
        passive: [{ name: "Minería Eficiente", description: "Permite recolectar Cristal Mítico en Nodos Especiales." }]
      }
    });

    return unifiedInventory;
  } catch (error) {
    console.error("Critical fetching assets:", error);
    throw error;
  }
}