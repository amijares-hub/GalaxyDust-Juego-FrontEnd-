import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface InventoryItem {
  id: string;
  name: string;
  fullname: string;
  category: string;
  rarity: string;
  faction?: string;
  avatar_url: string;
  unlocked: boolean;
  quantity: number;
  level: number;
  stars: number;
  blueprints_owned: number;
  blueprints_required: number;
  crafting_costs?: any;
  tactical_stats?: any;
  skills?: any;
  set_skills?: string;
  effect?: string;
  stack_info?: string;
  duration_info?: string;
  power_score?: number;
  description?: string;
  favorite?: boolean;
  sound?: string;
  raw_seed?: any;
  is_in_flight?: boolean;
}

export function useInventory() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Obtener el UUID real de Supabase Auth (no del AuthContext que usa UserProfile sin id)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchInventory = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const currentUserId = userId;

      const { data: activeExps } = await supabase
        .from('active_expeditions')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('status', 'LAUNCHED');

      const hasActiveExpeditions = (activeExps || []).length > 0;
      const allItems: InventoryItem[] = [];

      const loadCategory = async (
        userTable: string,
        seedTable: string,
        categoryName: string,
        possibleFkCols: string[],
        pkSeedCol: string = 'id',
        nameCols: string[] = ['name', 'title']
      ) => {
        try {
          const { data: userRows } = await supabase
            .from(userTable)
            .select('*')
            .eq('user_id', currentUserId);

          if (!userRows || userRows.length === 0) return;

          const { data: seedRows } = await supabase.from(seedTable).select('*');
          if (!seedRows || seedRows.length === 0) return;

          const seedMap = new Map();
          seedRows.forEach((s: any) => {
            if (s[pkSeedCol]) seedMap.set(s[pkSeedCol].toString(), s);
            if (s.id) seedMap.set(s.id.toString(), s);
            if (s.ship_id) seedMap.set(s.ship_id.toString(), s);
            if (s.structure_id) seedMap.set(s.structure_id.toString(), s);
            if (s.technology_id) seedMap.set(s.technology_id.toString(), s);
            if (s.tool_id) seedMap.set(s.tool_id.toString(), s);
            if (s.astrobot_id) seedMap.set(s.astrobot_id.toString(), s);
            if (s.defense_id) seedMap.set(s.defense_id.toString(), s);
            if (s.blueprint_id) seedMap.set(s.blueprint_id.toString(), s);
          });

          userRows.forEach((row: any, idx: number) => {
            let targetId: string | null = null;
            const searchCols = [...possibleFkCols, 'ship_id', 'structure_id', 'technology_id', 'tool_id', 'astrobot_id', 'defense_id', 'blueprint_id', 'consumable_id', 'license_id', 'badge_id', 'seed_id', 'id'];

            for (const col of searchCols) {
              if (row[col]) {
                targetId = row[col].toString();
                break;
              }
            }

            if (!targetId) return;

            const seed = seedMap.get(targetId);
            if (!seed) return;

            let realName = 'ACTIVO';
            for (const col of nameCols) {
              if (seed[col]) {
                realName = seed[col];
                break;
              }
            }

            let parsedSkills = seed.skills;
            if (typeof parsedSkills === 'string') {
              try { parsedSkills = JSON.parse(parsedSkills); } catch (e) { }
            }

            const imageUrl = seed.image_url || seed.avatar_url || seed.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';

            const isInFlight = categoryName === 'Spaceships' && (
              (row.flight_state && row.flight_state !== 'IDLE' && row.flight_state !== 'LANDED') ||
              (hasActiveExpeditions && idx === 0)
            );

            allItems.push({
              id: row.id?.toString() || targetId,
              name: realName,
              fullname: realName,
              category: categoryName,
              rarity: seed.rarity || 'Common',
              faction: seed.company || seed.collection || seed.series || 'GD',
              avatar_url: imageUrl,
              unlocked: true,
              quantity: row.quantity || row.amount || 1,
              level: row.current_level || row.level || 1,
              stars: 3,
              blueprints_owned: 1,
              blueprints_required: 1,
              description: seed.description || 'Sin descripción disponible.',
              power_score: seed.power_score || 0,
              effect: seed.effect || null,
              set_skills: seed.set_skills || null,
              stack_info: seed.stack || seed.max_stack?.toString() || null,
              duration_info: seed.duration || null,
              skills: parsedSkills || null,
              is_in_flight: !!isInFlight,
              crafting_costs: {
                metal: seed.base_metal_cost || seed.req_metal || 0,
                crystal: seed.base_crystal_cost || seed.req_crystal || 0,
                deuterium: seed.req_deuterium || 0,
                dark_matter: seed.req_dark_matter || 0,
                gd_coins: seed.req_gd || 0
              },
              tactical_stats: {
                hp: seed.resistance || seed.base_hp || 1000,
                shield: seed.shield || 500,
                defense: seed.defense || 100,
                kinetic_attack: seed.attack_standard || 0,
                laser_attack: seed.attack_laser || 0,
                plasma_attack: seed.attack_plasma || 0,
                ionic_attack: seed.attack_ionic || 0,
                graviton_attack: seed.attack_graviton || 0,
                travel_speed: seed.speed_boost || 50,
                combat_speed: seed.speed_boost || 50,
                speed_boost: seed.speed_boost || 0,
                cargo_capacity: seed.cargo_capacity || 1000,
                fleet_space: seed.fleet_slots || 1,
                production: seed.production_min || 0
              },
              raw_seed: seed
            });
          });
        } catch (catErr) {
          console.warn(`Error al cargar categoría ${categoryName}:`, catErr);
        }
      };

      await Promise.all([
        loadCategory('user_ships', 'seed_ships', 'Spaceships', ['ship_id'], 'ship_id', ['ship_name', 'name']),
        loadCategory('user_structures', 'seed_structures', 'Structures', ['structure_id', 'building_id'], 'id', ['name', 'title']),
        loadCategory('user_technologies', 'seed_technologies', 'Tecnology', ['technology_id'], 'id', ['name', 'title']),
        loadCategory('user_tools', 'seed_tools', 'Tools', ['tool_id'], 'id', ['name', 'title']),
        loadCategory('user_astrobots', 'seed_astrobots', 'Astrobots', ['astrobot_id'], 'id', ['name', 'title']),
        loadCategory('user_defenses', 'seed_defenses', 'Defense', ['defense_id'], 'defense_id', ['defense_name', 'name']),
        loadCategory('user_blueprints', 'seed_blueprints', 'Blueprints', ['blueprint_id'], 'id', ['name', 'title']),
        loadCategory('user_consumibles', 'seed_consumables', 'Consumibles', ['consumable_id'], 'id', ['name', 'title']),
        loadCategory('user_licenses', 'seed_licenses', 'Licencia', ['license_id'], 'id', ['name', 'title']),
        loadCategory('user_badges_unlocked', 'seed_badges', 'Badges', ['badge_id'], 'id', ['name', 'title'])
      ]);

      setItems(allItems);
    } catch (err) {
      console.error("Error al cargar inventario:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);  // Re-ejecutar cuando cambie el usuario

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const toggleFavorite = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, favorite: !item.favorite } : item))
    );
  }, []);

  return { items, loading, refreshInventory: fetchInventory, toggleFavorite };
}
