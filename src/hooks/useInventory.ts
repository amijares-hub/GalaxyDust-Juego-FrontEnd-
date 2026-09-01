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

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setItems([]);
        return;
      }

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

      // 3. CARGAR TODAS LAS TABLAS DE ACTIVOS DEL USUARIO
      const [
        { data: userShips },
        { data: userTools },
        { data: userAstrobots },
        { data: userStructures },
        { data: userTech },
        { data: userLicenses },
        { data: userConsumables }
      ] = await Promise.all([
        supabase.from('user_ships').select('*, seed_ships(*)').eq('user_id', user.id),
        supabase.from('user_tools').select('*, seed_tools(*)').eq('user_id', user.id),
        supabase.from('user_astrobots').select('*, seed_astrobots(*)').eq('user_id', user.id),
        supabase.from('user_structures').select('*, seed_structures(*)').eq('user_id', user.id),
        supabase.from('user_technologies').select('*, seed_technologies(*)').eq('user_id', user.id),
        supabase.from('user_licenses').select('*, seed_licenses(*)').eq('user_id', user.id),
        supabase.from('user_consumibles').select('*, seed_consumables(*)').eq('user_id', user.id)
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

      // Mapear Naves
      (userShips || []).forEach((s: any) => {
        const seed = s.seed_ships || {};
        const shipName = s.custom_name || s.name_ship || seed.ship_name || seed.name || `Nave #${s.id}`;
        const realId = String(s.id);
        const seedId = String(s.id_ship || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: shipName,
          fullname: shipName,
          category: 'Spaceships',
          type: 'Naves',
          rarity: seed.rarity || 'COMMON',
          faction: seed.company || seed.faction || 'NOVA',
          level: s.current_level || s.level || 1,
          stars: seed.stars || 1,
          quantity: s.quantity || s.amount || 1,
          unlocked: true,
          favorite: Boolean(s.favorite),
          is_in_flight: checkIsInFlight(realId, seedId, shipName),
          avatar_url: resolveImageUrl(seed.image_url || seed.avatar_url || s.image_url),
          description: seed.description || 'Nave espacial de combate e investigación.'
        });
      });

      // Mapear Herramientas
      (userTools || []).forEach((t: any) => {
        const seed = t.seed_tools || {};
        const toolName = t.name || seed.name || seed.title || `Tool #${t.id}`;
        const realId = String(t.id);
        const seedId = String(t.tool_id || seed.id || '');

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
          description: seed.description || 'Herramienta de extracción de recursos.'
        });
      });

      // Mapear Astrobots
      (userAstrobots || []).forEach((a: any) => {
        const seed = a.seed_astrobots || {};
        const botName = a.name || seed.name || `Astrobot #${a.id}`;
        const realId = String(a.id);
        const seedId = String(a.astrobot_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: botName,
          fullname: botName,
          category: 'Astrobots',
          type: 'Astrobots',
          rarity: seed.rarity || 'COMMON',
          faction: 'GD',
          level: a.level || 1,
          quantity: a.quantity || 1,
          unlocked: true,
          favorite: Boolean(a.favorite),
          is_in_flight: checkIsInFlight(realId, seedId, botName),
          avatar_url: resolveImageUrl(seed.image_url || a.image_url),
          description: seed.description || 'Unidad robótica autónoma de asistencia táctica.'
        });
      });

      // Mapear Estructuras / Defensas
      (userStructures || []).forEach((st: any) => {
        const seed = st.seed_structures || {};
        const structName = st.name || seed.name || seed.title || `Estructura #${st.id}`;
        const realId = String(st.id);
        const seedId = String(st.structure_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: structName,
          fullname: structName,
          category: 'Structures',
          type: 'Estructuras',
          rarity: seed.rarity || 'COMMON',
          faction: 'GD',
          level: st.level || 1,
          quantity: st.quantity || 1,
          unlocked: true,
          favorite: Boolean(st.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || st.image_url),
          description: seed.description || 'Infraestructura de defensa y desarrollo planetario.'
        });
      });

      // Mapear Tecnologías
      (userTech || []).forEach((tc: any) => {
        const seed = tc.seed_technologies || {};
        const techName = tc.name || seed.name || seed.title || `Tecnología #${tc.id}`;
        const realId = String(tc.id);
        const seedId = String(tc.technology_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: techName,
          fullname: techName,
          category: 'Technologies',
          type: 'Tecnología',
          rarity: seed.rarity || 'COMMON',
          faction: 'GD',
          level: tc.level || 1,
          quantity: tc.quantity || 1,
          unlocked: true,
          favorite: Boolean(tc.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || tc.image_url),
          description: seed.description || 'Avance científico y militar para la flota.'
        });
      });

      // Mapear Licencias / Blueprints
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
  };

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return { items, loading, refreshInventory: fetchInventory, toggleFavorite };
};