import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface InventoryItem {
  id: string;
  seed_id?: string;
  name: string;
  fullname?: string;
  category: string;
  type?: string;
  rarity: string;
  faction?: string;
  level: number;
  stars?: number;
  quantity: number;
  unlocked: boolean;
  favorite: boolean;
  is_in_flight: boolean;
  avatar_url: string;
  image_url?: string;
  description?: string;
  power_score?: number;
  effect?: string | number;
  stack_info?: string;
  duration_info?: string;
  set_skills?: string;
  skills?: any;
  sound?: string;
  tactical_stats?: {
    hp?: number;
    shield?: number;
    defense?: number;
    speed_boost?: number;
    kinetic_attack?: number;
    laser_attack?: number;
    plasma_attack?: number;
    ionic_attack?: number;
    graviton_attack?: number;
  };
  seed_data?: any;
  seed_ships?: any;
  raw_data?: any;
  company?: string;
  collection?: string;
  size?: string;
  engine?: string;
  cargo?: number;
  production?: number;
  defense?: number;
  speed?: number;
  attack?: number;
  ionAttack?: number;
  laserAttack?: number;
  plasmaAttack?: number;
  gravitonAttack?: number;
}

const resolveImageUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';
  }
  const clean = rawUrl.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;

  if (clean.startsWith('Assets') || clean.startsWith('Monedas') || clean.includes('Assets%20para')) {
    return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/${clean.replace(/^\//, '')}`;
  }

  return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/galaxy-assets/${clean.replace(/^\//, '')}`;
};

export const useInventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setItems([]);
        return;
      }
      
      console.log("Cargando inventario para user:", user.id);

      // 1. OBTENER EXPEDICIONES ACTIVAS EN VUELO
      const { data: activeExpeditions } = await supabase
        .from('active_expeditions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'LAUNCHED');

      // 2. OBTENER FLOTAS DEL USUARIO
      const { data: userFleets } = await supabase
        .from('fleets')
        .select('*')
        .eq('user_id', user.id);

      const inFlightIds = new Set<string>();
      const inFlightNames = new Set<string>();

      (activeExpeditions || []).forEach((exp: any) => {
        const deployed = exp.equipped_assets || exp.assets || exp.ships || [];
        if (Array.isArray(deployed)) {
          deployed.forEach((a: any) => {
            if (a.id) inFlightIds.add(String(a.id).trim().toLowerCase());
            if (a.seed_id) inFlightIds.add(String(a.seed_id).trim().toLowerCase());
            if (a.id_ship) inFlightIds.add(String(a.id_ship).trim().toLowerCase());
            if (a.name) inFlightNames.add(String(a.name).trim().toLowerCase());
          });
        }

        if (exp.fleet_id && userFleets) {
          const fleet = userFleets.find((f: any) => String(f.id) === String(exp.fleet_id));
          if (fleet) {
            const fleetMembers = [
              ...(fleet.ships || []),
              ...(fleet.tools || []),
              ...(fleet.licenses || [])
            ];
            fleetMembers.forEach((a: any) => {
              if (a.id) inFlightIds.add(String(a.id).trim().toLowerCase());
              if (a.seed_id) inFlightIds.add(String(a.seed_id).trim().toLowerCase());
              if (a.id_ship) inFlightIds.add(String(a.id_ship).trim().toLowerCase());
              if (a.name) inFlightNames.add(String(a.name).trim().toLowerCase());
            });
          }
        }
      });

      // Helper para consultas seguras
      const safeQuery = async (tableName: string, filterUserId = false) => {
        try {
          let q = supabase.from(tableName).select('*');
          if (filterUserId) q = q.eq('user_id', user.id);
          const { data, error } = await q;
          if (error) return [];
          return data || [];
        } catch {
          return [];
        }
      };

      // 3. CARGAR TODAS LAS TABLAS DE ACTIVOS DEL USUARIO (CONECTADO Y COMPLETO)
      const [
        userShips,
        seedShips,
        userTools,
        seedTools,
        userAstrobots,
        seedAstrobots,
        userStructures,
        seedStructures,
        userTech,
        seedTech,
        userBadges,
        seedBadges,
        userLicenses,
        userConsumables
      ] = await Promise.all([
        (async () => {
          try {
            const { data: shipsData, error: shipsErr } = await supabase
              .from('user_ships')
              .select('*, seed_ships(*)')
              .eq('user_id', user.id);
            if (!shipsErr && shipsData && shipsData.length > 0) {
              return shipsData;
            }
          } catch (e) {
            console.warn("Error en user_ships con relación seed_ships:", e);
          }
          return await safeQuery('user_ships', true);
        })(),
        safeQuery('seed_ships'),
        safeQuery('user_tools', true),
        safeQuery('seed_tools'),
        safeQuery('user_astrobots', true),
        safeQuery('seed_astrobots'),
        safeQuery('user_structures', true),
        safeQuery('seed_structures'),
        safeQuery('user_technologies', true),
        safeQuery('seed_technologies'),
        safeQuery('user_badges_unlocked', true),
        safeQuery('seed_badges'),
        safeQuery('user_licenses', true),
        safeQuery('user_consumibles', true)
      ]);

      const combinedItems: InventoryItem[] = [];

      const checkIsInFlight = (rowId?: any, seedId?: any, name?: string): boolean => {
        const idStr = rowId ? String(rowId).trim().toLowerCase() : '';
        const seedStr = seedId ? String(seedId).trim().toLowerCase() : '';
        const nameStr = name ? String(name).trim().toLowerCase() : '';

        return (
          (idStr !== '' && inFlightIds.has(idStr)) ||
          (seedStr !== '' && inFlightIds.has(seedStr)) ||
          (nameStr !== '' && inFlightNames.has(nameStr))
        );
      };

      // Mapear Naves con seed_ships completo
      (userShips || []).forEach((ship: any) => {
        const seedRel = ship.seed_ships;
        const seedFound = (seedShips || []).find((ss: any) => ss.id === ship.ship_id || ss.id === ship.seed_id || ss.id === ship.id_ship) || {};
        const seed = (seedRel && typeof seedRel === 'object' && Object.keys(seedRel).length > 0) ? seedRel : seedFound;
        const shipName = seed.name || ship.seed_ships?.name || ship.name || ship.name_ship || ship.custom_name || `Nave #${ship.id}`;
        const realId = String(ship.id);
        const seedId = String(ship.id_ship || ship.ship_id || ship.seed_id || seed.id || '');

        combinedItems.push({
          id: ship.id,
          name: ship.seed_ships?.name || ship.name || shipName,
          category: 'Spaceships',
          seed_ships: ship.seed_ships || seed,
          ...seed,
          ...ship,
          seed_id: seedId,
          fullname: shipName,
          type: 'Naves',
          rarity: seed.rarity || ship.rarity || 'COMMON',
          faction: seed.company || seed.faction || ship.company || ship.faction || 'NOVA',
          company: seed.company || ship.company || 'NOVA',
          collection: seed.collection || ship.collection || 'ESTÁNDAR',
          size: seed.size || ship.size || 'MEDIUM',
          engine: seed.engine || ship.engine || 'WARP DRIVE CLASS I',
          level: ship.current_level || ship.level || 1,
          stars: seed.stars || ship.stars || 1,
          quantity: ship.quantity || ship.amount || 1,
          unlocked: true,
          favorite: Boolean(ship.favorite),
          is_in_flight: checkIsInFlight(realId, seedId, shipName),
          avatar_url: resolveImageUrl(seed.image_url || seed.avatar_url || ship.image_url || ship.avatar_url),
          description: seed.description || ship.description || 'Sin especificaciones tácticas archivadas.',
          skills: seed.skills || ship.skills || [],
          seed_data: seed,
          raw_data: { ...seed, ...ship },
          cargo: Number(seed.cargo ?? ship.cargo ?? 0),
          production: Number(seed.production ?? ship.production ?? 0),
          defense: Number(seed.defense ?? ship.defense ?? 0),
          speed: Number(seed.speed ?? ship.speed ?? 0),
          attack: Number(seed.attack ?? ship.attack ?? 0),
          ionAttack: Number(seed.ion_attack ?? seed.ionAttack ?? ship.ion_attack ?? ship.ionAttack ?? 0),
          laserAttack: Number(seed.laser_attack ?? seed.laserAttack ?? ship.laser_attack ?? ship.laserAttack ?? 0),
          plasmaAttack: Number(seed.plasma_attack ?? seed.plasmaAttack ?? ship.plasma_attack ?? ship.plasmaAttack ?? 0),
          gravitonAttack: Number(seed.graviton_attack ?? seed.gravitonAttack ?? ship.graviton_attack ?? ship.gravitonAttack ?? 0),
          tactical_stats: {
            hp: Number(seed.health ?? seed.hp ?? ship.health ?? ship.hp ?? 100),
            shield: Number(seed.shield ?? ship.shield ?? 0),
            defense: Number(seed.defense ?? ship.defense ?? 0),
            speed_boost: Number(seed.speed ?? ship.speed ?? 0),
            kinetic_attack: Number(seed.attack ?? ship.attack ?? 0),
            laser_attack: Number(seed.laser_attack ?? seed.laserAttack ?? ship.laser_attack ?? ship.laserAttack ?? 0),
            plasma_attack: Number(seed.plasma_attack ?? seed.plasmaAttack ?? ship.plasma_attack ?? ship.plasmaAttack ?? 0),
            ionic_attack: Number(seed.ion_attack ?? seed.ionAttack ?? ship.ion_attack ?? ship.ionAttack ?? 0),
            graviton_attack: Number(seed.graviton_attack ?? seed.gravitonAttack ?? ship.graviton_attack ?? ship.gravitonAttack ?? 0)
          }
        });
      });

      // Mapear Herramientas
      (userTools || []).forEach((t: any) => {
        const seed = (seedTools || []).find((st: any) => st.id === t.tool_id || st.id === t.seed_id || st.tool_id === t.tool_id) || {};
        const toolName = t.name || seed.name || seed.tool_name || seed.title || seed.id || `Tool #${t.id}`;
        const realId = String(t.id);
        const seedId = String(t.tool_id || t.seed_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: toolName,
          fullname: toolName,
          category: 'Tools',
          type: 'Herramientas',
          rarity: seed.rarity || 'COMMON',
          faction: seed.faction || 'GD',
          level: t.level || 1,
          quantity: t.quantity || 1,
          unlocked: true,
          favorite: Boolean(t.favorite),
          is_in_flight: checkIsInFlight(realId, seedId, toolName),
          avatar_url: resolveImageUrl(seed.image_url || t.image_url),
          description: seed.description || 'Herramienta de extracción de recursos.',
          skills: seed.skills || []
        });
      });

      // Mapear Astrobots
      (userAstrobots || []).forEach((a: any) => {
        const seed = (seedAstrobots || []).find((sa: any) => sa.id === a.astrobot_id || sa.id === a.seed_id) || {};
        const botName = a.name || seed.name || seed.astrobot_name || `Astrobot #${a.id}`;
        const realId = String(a.id);
        const seedId = String(a.astrobot_id || a.seed_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: botName,
          fullname: botName,
          category: 'Astrobots',
          type: 'Astrobots',
          rarity: seed.rarity || 'COMMON',
          faction: seed.company || seed.faction || 'GD',
          level: a.level || 1,
          quantity: a.quantity || 1,
          unlocked: true,
          favorite: Boolean(a.favorite),
          is_in_flight: checkIsInFlight(realId, seedId, botName),
          avatar_url: resolveImageUrl(seed.image_url || seed.avatar_url || a.image_url),
          description: seed.description || 'Unidad robótica autónoma de asistencia táctica.'
        });
      });

      // Mapear Estructuras
      (userStructures || []).forEach((st: any) => {
        const seed = (seedStructures || []).find((ss: any) => ss.id === st.structure_id || ss.id === st.seed_id) || {};
        const structName = st.name || seed.structure_name || seed.name || seed.title || st.structure_id || `Estructura #${st.id}`;
        const realId = String(st.id);
        const seedId = String(st.structure_id || st.seed_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: structName,
          fullname: structName,
          category: 'Structures',
          type: 'Estructuras',
          rarity: seed.rarity || 'COMMON',
          faction: seed.company || seed.faction || 'GD',
          level: st.current_level || st.level || 1,
          quantity: st.quantity || 1,
          unlocked: true,
          favorite: Boolean(st.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || seed.avatar_url || st.image_url),
          description: seed.description || 'Infraestructura de defensa y desarrollo planetario.',
          power_score: seed.power_score_base || 100
        });
      });

      // Mapear Tecnologías
      (userTech || []).forEach((tc: any) => {
        const seed = (seedTech || []).find((st: any) => st.id === tc.technology_id || st.id === tc.seed_id) || {};
        const techName = tc.name || seed.technology_name || seed.name || seed.title || tc.technology_id || `Tecnología #${tc.id}`;
        const realId = String(tc.id);
        const seedId = String(tc.technology_id || tc.seed_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: techName,
          fullname: techName,
          category: 'Technologies',
          type: 'Tecnología',
          rarity: seed.rarity || 'COMMON',
          faction: seed.company || seed.faction || 'GD',
          level: tc.level || 1,
          quantity: tc.quantity || 1,
          unlocked: true,
          favorite: Boolean(tc.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || seed.avatar_url || tc.image_url),
          description: seed.description || 'Avance científico y militar para la flota.',
          power_score: seed.power_score_base || 100
        });
      });

      // Mapear Insignias (Badges)
      (userBadges || []).forEach((b: any) => {
        const seed = (seedBadges || []).find((sb: any) => sb.id === b.badge_id || sb.id === b.seed_id) || {};
        const badgeName = b.name || seed.name || b.badge_id || `Insignia #${b.id}`;
        const realId = String(b.id);
        const seedId = String(b.badge_id || b.seed_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: badgeName,
          fullname: badgeName,
          category: 'Badges',
          type: 'Insignia',
          rarity: seed.rarity || 'RARE',
          faction: seed.company || 'GD',
          level: 1,
          quantity: 1,
          unlocked: true,
          favorite: Boolean(b.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || b.image_url),
          description: seed.description || 'Insignia de honor y logro galáctico.',
          power_score: seed.mining_bonus || 50
        });
      });

      // Mapear Licencias
      (userLicenses || []).forEach((l: any) => {
        const seed = l.seed_licenses || {};
        const licName = l.name || seed.name || `Licencia #${l.id}`;
        const realId = String(l.id);
        const seedId = String(l.license_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: licName,
          fullname: licName,
          category: 'Licencia',
          type: 'Licencia',
          rarity: seed.rarity || 'COMMON',
          faction: 'GD',
          level: 1,
          quantity: l.quantity || 1,
          unlocked: true,
          favorite: Boolean(l.favorite),
          is_in_flight: checkIsInFlight(realId, seedId, licName),
          avatar_url: resolveImageUrl(seed.image_url || l.image_url),
          description: seed.description || 'Permiso oficial de navegación e industrialización.'
        });
      });

      // Mapear Consumibles
      (userConsumables || []).forEach((co: any) => {
        const seed = co.seed_consumables || {};
        const consName = co.name || seed.name || `Consumible #${co.id}`;
        const realId = String(co.id);
        const seedId = String(co.consumable_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: consName,
          fullname: consName,
          category: 'Consumibles',
          type: 'Consumibles',
          rarity: seed.rarity || 'COMMON',
          faction: 'GD',
          level: 1,
          quantity: co.quantity || co.amount || 1,
          unlocked: true,
          favorite: Boolean(co.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || co.image_url),
          description: seed.description || 'Recurso consumible de apoyo logístico.'
        });
      });

      setItems(combinedItems);
    } catch (err) {
      console.error("Error al construir inventario unificado:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFavorite = async (itemId: string) => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, favorite: !item.favorite } : item));
    return () => {};
  };

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return { items, loading, error, refreshInventory: fetchInventory, toggleFavorite };
};