import { useState, useEffect, useCallback, useRef } from 'react';
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

// Cache estático en memoria para las semillas maestras (evita re-descargar datos idénticos en cada navegación)
let seedCache: {
  ships?: any[];
  tools?: any[];
  astrobots?: any[];
  structures?: any[];
  technologies?: any[];
  badges?: any[];
  defenses?: any[];
  blueprints?: any[];
  consumables?: any[];
} = {};

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

      // Obtener el legacy_id del usuario para garantizar la compatibilidad dual (UUID y entero migrado)
      let legacyId: number | null = null;
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('legacy_id')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.legacy_id) {
          legacyId = Number(profile.legacy_id);
        }
      } catch (err) {
        console.warn("No se pudo obtener legacy_id del perfil:", err);
      }

      // 1. OBTENER EXPEDICIONES ACTIVAS EN VUELO Y FLOTAS
      const [expeditionsRes, fleetsRes] = await Promise.all([
        supabase
          .from('active_expeditions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'LAUNCHED'),
        supabase
          .from('fleets')
          .select('*')
          .eq('user_id', user.id)
      ]);

      const activeExpeditions = expeditionsRes.data || [];
      const userFleets = fleetsRes.data || [];

      const inFlightIds = new Set<string>();
      const inFlightNames = new Set<string>();

      activeExpeditions.forEach((exp: any) => {
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

      // Helper para consultas seguras con resolución dual de usuario (user_id UUID o id_user legacy)
      const safeUserQuery = async (tableName: string) => {
        try {
          if (legacyId) {
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .or(`user_id.eq.${user.id},id_user.eq.${legacyId}`);
            if (!error && data) {
              const seen = new Set();
              return data.filter(item => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
              });
            }
          }

          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('user_id', user.id);
          if (error) return [];
          return data || [];
        } catch {
          return [];
        }
      };

      // Helper para semillas estáticas con memoria en caché
      const fetchSeed = async (cacheKey: keyof typeof seedCache, tableName: string) => {
        if (seedCache[cacheKey] && seedCache[cacheKey]!.length > 0) {
          return seedCache[cacheKey]!;
        }
        try {
          const { data } = await supabase.from(tableName).select('*');
          if (data && data.length > 0) {
            seedCache[cacheKey] = data;
            return data;
          }
        } catch {}
        return [];
      };

      // 2. CARGAR TODAS LAS TABLAS DE ACTIVOS RELACIONALES Y SEMILLAS EN PARALELO
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
        userDefenses,
        seedDefenses,
        userBlueprints,
        seedBlueprints,
        userLicenses,
        userConsumables,
        seedConsumables,
        userRepairKits,
        userQmps,
        userMaterialicers,
        userBags,
        userTickets,
        userPacks,
        userEssentials
      ] = await Promise.all([
        (async () => {
          try {
            let q = supabase.from('user_ships').select('*, seed_ships(*)');
            if (legacyId) {
              q = q.or(`user_id.eq.${user.id},id_user.eq.${legacyId}`);
            } else {
              q = q.eq('user_id', user.id);
            }
            const { data, error } = await q;
            if (!error && data && data.length > 0) {
              const seen = new Set();
              return data.filter(item => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
              });
            }
          } catch (e) {
            console.warn("Fallo en user_ships con join seed_ships, reintentando consulta estándar:", e);
          }
          return await safeUserQuery('user_ships');
        })(),
        fetchSeed('ships', 'seed_ships'),
        safeUserQuery('user_tools'),
        fetchSeed('tools', 'seed_tools'),
        safeUserQuery('user_astrobots'),
        fetchSeed('astrobots', 'seed_astrobots'),
        safeUserQuery('user_structures'),
        fetchSeed('structures', 'seed_structures'),
        safeUserQuery('user_technologies'),
        fetchSeed('technologies', 'seed_technologies'),
        (async () => {
          const badges = await safeUserQuery('user_badges');
          if (badges && badges.length > 0) return badges;
          return await safeUserQuery('user_badges_unlocked');
        })(),
        fetchSeed('badges', 'seed_badges'),
        safeUserQuery('user_defenses'),
        fetchSeed('defenses', 'seed_defenses'),
        safeUserQuery('user_blueprints'),
        fetchSeed('blueprints', 'seed_blueprints'),
        safeUserQuery('user_licenses'),
        safeUserQuery('user_consumibles'),
        fetchSeed('consumables', 'seed_consumables'),
        safeUserQuery('user_repair_kits'),
        safeUserQuery('user_qmps'),
        safeUserQuery('user_materialicers'),
        safeUserQuery('user_bags'),
        safeUserQuery('user_tickets'),
        safeUserQuery('user_packs'),
        safeUserQuery('user_essentials')
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

      // ── MAPEO DE NAVES (SPACESHIPS) ──
      (userShips || []).forEach((ship: any) => {
        const seedRel = ship.seed_ships;
        const seedFound = (seedShips || []).find((ss: any) => 
          ss.id === ship.ship_id || 
          ss.id === ship.seed_id || 
          ss.id === ship.id_ship ||
          ss.ship_id === ship.ship_id
        ) || {};
        const seed = (seedRel && typeof seedRel === 'object' && Object.keys(seedRel).length > 0) ? seedRel : seedFound;
        const shipName = seed.ship_name || seed.name || ship.seed_ships?.ship_name || ship.seed_ships?.name || ship.name_ship || ship.name || ship.custom_name || `Nave #${ship.id}`;
        const realId = String(ship.id);
        const seedId = String(ship.id_ship || ship.ship_id || ship.seed_id || seed.id || '');

        combinedItems.push({
          ...seed,
          ...ship,
          id: realId,
          seed_id: seedId,
          category: 'Spaceships',
          seed_ships: ship.seed_ships || seed,
          name: shipName,
          fullname: shipName,
          type: 'Naves',
          rarity: (seed.rarity || ship.rarity || 'COMMON').toUpperCase(),
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

      // ── MAPEO DE ESTRUCTURAS (STRUCTURES) ──
      (userStructures || []).forEach((st: any) => {
        const seed = (seedStructures || []).find((ss: any) => 
          ss.id === st.structure_id || 
          ss.id === st.seed_id || 
          ss.id === st.id_structure ||
          ss.building_id === st.building_id
        ) || {};
        const structName = st.name || seed.structure_name || seed.name || seed.title || `Estructura #${st.id}`;
        const realId = String(st.id);
        const seedId = String(st.structure_id || st.seed_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: structName,
          fullname: structName,
          category: 'Structures',
          type: 'Estructuras',
          rarity: (seed.rarity || 'COMMON').toUpperCase(),
          faction: seed.company || seed.faction || 'GD',
          level: st.current_level || st.lvl || st.level || 1,
          quantity: st.quantity || 1,
          unlocked: true,
          favorite: Boolean(st.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || seed.avatar_url || st.image_url),
          description: seed.description || 'Infraestructura de defensa y desarrollo planetario.',
          power_score: seed.power_score_base || 100
        });
      });

      // ── MAPEO DE DEFENSAS (DEFENSES) ──
      (userDefenses || []).forEach((d: any) => {
        const seed = (seedDefenses || []).find((sd: any) => 
          sd.id === d.defense_id || 
          sd.id === d.id_defense || 
          sd.defense_id === d.defense_id
        ) || {};
        const defName = d.name || d.name_defense || seed.defense_name || seed.name || `Defensa #${d.id}`;
        const realId = String(d.id);
        const seedId = String(d.defense_id || d.id_defense || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: defName,
          fullname: defName,
          category: 'Defense',
          type: 'Defensas',
          rarity: (seed.rarity || 'COMMON').toUpperCase(),
          faction: seed.faction || 'GD',
          level: d.level || 1,
          quantity: d.quantity || 1,
          unlocked: true,
          favorite: Boolean(d.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || seed.avatar_url || d.image_url),
          description: seed.description || 'Sistema de defensa táctica orbital.',
          power_score: seed.power_score_base || 50
        });
      });

      // ── MAPEO DE TECNOLOGÍAS (TECHNOLOGY) ──
      (userTech || []).forEach((tc: any) => {
        const seed = (seedTech || []).find((st: any) => 
          st.id === tc.technology_id || 
          st.id === tc.seed_id || 
          st.id === tc.id_technology ||
          st.technology_id === tc.technology_id
        ) || {};
        const techName = tc.name || seed.technology_name || seed.name || seed.title || `Tecnología #${tc.id}`;
        const realId = String(tc.id);
        const seedId = String(tc.technology_id || tc.seed_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: techName,
          fullname: techName,
          category: 'Tecnology',
          type: 'Tecnología',
          rarity: (seed.rarity || 'COMMON').toUpperCase(),
          faction: seed.company || seed.faction || 'GD',
          level: tc.current_level || tc.lvl || tc.level || 1,
          quantity: tc.quantity || 1,
          unlocked: true,
          favorite: Boolean(tc.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || seed.avatar_url || tc.image_url),
          description: seed.description || 'Avance científico y militar para la flota.',
          power_score: seed.power_score_base || 100
        });
      });

      // ── MAPEO DE ASTROBOTS (ASTROBOTS) ──
      (userAstrobots || []).forEach((a: any) => {
        const seed = (seedAstrobots || []).find((sa: any) => 
          sa.id === a.astrobot_id || 
          sa.id === a.seed_id || 
          sa.astrobot_id === a.astrobot_id
        ) || {};
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
          rarity: (seed.rarity || 'COMMON').toUpperCase(),
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

      // ── MAPEO DE HERRAMIENTAS (TOOLS) ──
      (userTools || []).forEach((t: any) => {
        const seed = (seedTools || []).find((st: any) => 
          st.id === t.tool_id || 
          st.id === t.seed_id || 
          st.tool_id === t.tool_id
        ) || {};
        const toolName = t.name || seed.name || seed.tool_name || seed.title || `Herramienta #${t.id}`;
        const realId = String(t.id);
        const seedId = String(t.tool_id || t.seed_id || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: toolName,
          fullname: toolName,
          category: 'Tools',
          type: 'Herramientas',
          rarity: (seed.rarity || 'COMMON').toUpperCase(),
          faction: seed.faction || 'GD',
          level: t.level || 1,
          quantity: t.quantity || 1,
          unlocked: true,
          favorite: Boolean(t.favorite),
          is_in_flight: checkIsInFlight(realId, seedId, toolName),
          avatar_url: resolveImageUrl(seed.image_url || t.image_url),
          description: seed.description || 'Herramienta de extracción y mantenimiento.',
          skills: seed.skills || []
        });
      });

      // ── MAPEO DE PLANOS (BLUEPRINTS) ──
      (userBlueprints || []).forEach((bp: any) => {
        const seed = (seedBlueprints || []).find((sb: any) => 
          sb.id === bp.blueprint_id || 
          sb.id === bp.id_blueprint || 
          sb.blueprint_id === bp.blueprint_id
        ) || {};
        const bpName = bp.name || seed.blueprint_name || seed.name || `Plano #${bp.id}`;
        const realId = String(bp.id);
        const seedId = String(bp.blueprint_id || bp.id_blueprint || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: bpName,
          fullname: bpName,
          category: 'Blueprints',
          type: 'Planos',
          rarity: (seed.rarity || bp.rarity || 'RARE').toUpperCase(),
          faction: 'GD',
          level: 1,
          quantity: bp.uses || bp.quantity || 1,
          unlocked: true,
          favorite: Boolean(bp.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || seed.avatar_url || bp.image_url),
          description: seed.description || 'Esquema de construcción de alta precisión.',
          power_score: 50
        });
      });

      // ── MAPEO DE INSIGNIAS (BADGES) ──
      (userBadges || []).forEach((b: any) => {
        const badgeKey = b.badge_id || b.id_badge || b.seed_id || '';
        const seed = (seedBadges || []).find((sb: any) => 
          sb.id === badgeKey || 
          sb.badge_id === badgeKey || 
          String(sb.id) === String(b.badge_id) || 
          String(sb.id) === String(b.id_badge) ||
          String(sb.id_badge) === String(b.id_badge)
        ) || {};
        const badgeName = b.name || seed.name || seed.badge_name || seed.title || `Insignia #${b.id_badge || b.badge_id || b.id}`;
        const realId = String(b.id);
        const seedId = String(badgeKey || seed.id || '');

        combinedItems.push({
          id: realId,
          seed_id: seedId,
          name: badgeName,
          fullname: badgeName,
          category: 'Badges',
          type: 'Insignia',
          rarity: (seed.rarity || 'RARE').toUpperCase(),
          faction: seed.company || seed.collection || 'GD',
          level: b.level || 1,
          quantity: b.quantity || 1,
          unlocked: true,
          favorite: Boolean(b.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(seed.image_url || seed.avatar_url || b.image_url),
          description: seed.description || 'Insignia de honor y distinción militar.',
          power_score: Number(seed.mining_bonus || seed.power_score || 50)
        });
      });

      // ── MAPEO DE LICENCIAS (LICENCIA) ──
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
          rarity: (seed.rarity || 'COMMON').toUpperCase(),
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

      // ── MAPEO DE CONSUMIBLES GENÉRICOS (CONSUMIBLES) ──
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
          rarity: (seed.rarity || 'COMMON').toUpperCase(),
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

      // ── MAPEO DE KITS DE REPARACIÓN (CONSUMIBLES) ──
      (userRepairKits || []).forEach((rk: any) => {
        const kitTier = rk.id_kit || 1;
        const kitName = `Kit de Reparación T${kitTier}`;
        const realId = `kit_${rk.id || `${rk.id_user}_${kitTier}`}`;

        combinedItems.push({
          id: realId,
          name: kitName,
          fullname: kitName,
          category: 'Consumibles',
          type: 'Kits Reparación',
          rarity: kitTier === 3 ? 'EPIC' : kitTier === 2 ? 'RARE' : 'COMMON',
          faction: 'GD',
          level: kitTier,
          quantity: rk.quantity || 1,
          unlocked: true,
          favorite: Boolean(rk.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl(`Assets/Consumibles/kit_t${kitTier}.webp`),
          description: `Restaura la integridad estructural de las naves dañadas (Tier ${kitTier}).`
        });
      });

      // ── MAPEO DE MÓDULOS QMP (CONSUMIBLES) ──
      (userQmps || []).forEach((qmp: any) => {
        const qmpName = `Módulo QMP #${qmp.id_qmp || qmp.id}`;
        const realId = `qmp_${qmp.id}`;

        combinedItems.push({
          id: realId,
          name: qmpName,
          fullname: qmpName,
          category: 'Consumibles',
          type: 'QMPs',
          rarity: 'UNCOMMON',
          faction: 'GD',
          level: 1,
          quantity: qmp.uses || 1,
          unlocked: true,
          favorite: Boolean(qmp.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl('Assets/Consumibles/qmp.webp'),
          description: 'Módulo de propulsión cuántica para saltos hiperespaciales.'
        });
      });

      // ── MAPEO DE MATERIALIZADORES (CONSUMIBLES) ──
      (userMaterialicers || []).forEach((mat: any) => {
        const matName = `Materializador #${mat.id_materialicer || mat.id}`;
        const realId = `mat_${mat.id}`;

        combinedItems.push({
          id: realId,
          name: matName,
          fullname: matName,
          category: 'Consumibles',
          type: 'Materializadores',
          rarity: 'RARE',
          faction: 'GD',
          level: 1,
          quantity: mat.uses || 1,
          unlocked: true,
          favorite: Boolean(mat.favorite),
          is_in_flight: false,
          avatar_url: resolveImageUrl('Assets/Consumibles/materialicer.webp'),
          description: 'Dispositivo cuántico para síntesis y condensación de materia prima.'
        });
      });

      // ── MAPEO DE BOLSAS, TICKETS, PACKS Y ESENCIALES ──
      (userBags || []).forEach((bag: any) => {
        const bagName = `Bolsa de Recursos #${bag.id_bag || bag.id}`;
        combinedItems.push({
          id: `bag_${bag.id}`,
          name: bagName,
          fullname: bagName,
          category: 'Consumibles',
          type: 'Bolsas',
          rarity: 'COMMON',
          faction: 'GD',
          level: 1,
          quantity: 1,
          unlocked: true,
          favorite: false,
          is_in_flight: false,
          avatar_url: resolveImageUrl('Assets/Consumibles/bag.webp'),
          description: 'Contenedor hermético de materias primas recolectadas.'
        });
      });

      (userTickets || []).forEach((tk: any) => {
        const tkName = `Ticket de Acceso #${tk.id_ticket || tk.id}`;
        combinedItems.push({
          id: `tk_${tk.id}`,
          name: tkName,
          fullname: tkName,
          category: 'Consumibles',
          type: 'Tickets',
          rarity: 'RARE',
          faction: 'GD',
          level: 1,
          quantity: 1,
          unlocked: true,
          favorite: false,
          is_in_flight: false,
          avatar_url: resolveImageUrl('Assets/Consumibles/ticket.webp'),
          description: 'Credencial de ingreso prioritario a eventos y bovedas.'
        });
      });

      (userPacks || []).forEach((pk: any) => {
        const pkName = `Pack Reclamable #${pk.id_pack || pk.id}`;
        combinedItems.push({
          id: `pack_${pk.id}`,
          name: pkName,
          fullname: pkName,
          category: 'Consumibles',
          type: 'Packs',
          rarity: 'EPIC',
          faction: 'GD',
          level: 1,
          quantity: 1,
          unlocked: true,
          favorite: false,
          is_in_flight: false,
          avatar_url: resolveImageUrl('Assets/Consumibles/pack.webp'),
          description: 'Paquete de suministros estratégicos de la corporación.'
        });
      });

      (userEssentials || []).forEach((es: any) => {
        const esName = `Ítem Esencial #${es.id_essential || es.id}`;
        combinedItems.push({
          id: `ess_${es.id}`,
          name: esName,
          fullname: esName,
          category: 'Consumibles',
          type: 'Esenciales',
          rarity: 'LEGENDARY',
          faction: 'GD',
          level: 1,
          quantity: 1,
          unlocked: true,
          favorite: false,
          is_in_flight: false,
          avatar_url: resolveImageUrl('Assets/Consumibles/essential.webp'),
          description: 'Componente vital para el funcionamiento del núcleo galáctico.'
        });
      });

      setItems(combinedItems);
    } catch (err: any) {
      console.error("Error al construir inventario unificado:", err);
      setError(err?.message || 'Error al conectar con la estación de inventario.');
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

  return { items, loading, error, refreshInventory: fetchInventory, toggleFavorite };
};

export default useInventory;