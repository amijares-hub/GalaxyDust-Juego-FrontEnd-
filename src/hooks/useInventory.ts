import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface InventoryItem {
  id: string;
  stacked_ids?: string[];
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

export const CDN_BASE_URL = 'https://pub-1bd09e3b60064904964a8775a482dc6d.r2.dev';

export const FALLBACK_HOLOGRAM_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <rect width="200" height="200" rx="16" fill="#050b14"/>
      <circle cx="100" cy="100" r="62" stroke="#06b6d4" stroke-opacity="0.25" stroke-width="1.5" stroke-dasharray="6 4"/>
      <circle cx="100" cy="100" r="38" stroke="#22d3ee" stroke-opacity="0.4" stroke-width="1.5"/>
      <polygon points="100,48 134,122 100,108 66,122" fill="#06b6d4" fill-opacity="0.2" stroke="#22d3ee" stroke-width="2"/>
      <line x1="100" y1="36" x2="100" y2="164" stroke="#06b6d4" stroke-opacity="0.18" stroke-width="1"/>
      <line x1="36" y1="100" x2="164" y2="100" stroke="#06b6d4" stroke-opacity="0.18" stroke-width="1"/>
    </svg>`
  );

export const resolveImageUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return FALLBACK_HOLOGRAM_SVG;
  }
  let clean = rawUrl.trim();

  if (clean.startsWith('data:')) return clean;

  // Redirigir cualquier URL antigua de Supabase (object o render) hacia Cloudflare R2
  if (clean.includes('qldjeysusithpblfrmtq.supabase.co')) {
    clean = clean
      .replace(
        /https:\/\/qldjeysusithpblfrmtq\.supabase\.co\/storage\/v1\/render\/image\/public\/(galaxy-assets\/)?/,
        `${CDN_BASE_URL}/`
      )
      .replace(
        /https:\/\/qldjeysusithpblfrmtq\.supabase\.co\/storage\/v1\/object\/public\/(galaxy-assets\/)?/,
        `${CDN_BASE_URL}/`
      )
      .replace(/\?width=.*$/, '');
    return clean;
  }

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  const stripped = clean.replace(/^\/+/, '').replace(/^galaxy-assets\//, '');
  return `${CDN_BASE_URL}/${stripped}`;
};

// Agrupa todos los activos repetidos en una sola tarjeta con su cantidad total (x2, x10, x450...)
const stackInventoryItems = (rawItems: InventoryItem[]): InventoryItem[] => {
  const map = new Map<string, InventoryItem>();

  for (const item of rawItems) {
    const cat = (item.category || 'Other').trim().toLowerCase();
    const type = (item.type || '').trim().toLowerCase();
    const canonicalKey =
      item.seed_id && item.seed_id.trim() !== ''
        ? item.seed_id.trim().toLowerCase()
        : (item.name || item.id).trim().toLowerCase();
    const lvl = Number(item.level || 1);
    const flightFlag = item.is_in_flight ? '1' : '0';

    const stackKey = `${cat}::${type}::${canonicalKey}::lvl${lvl}::f${flightFlag}`;

    const existing = map.get(stackKey);
    if (!existing) {
      map.set(stackKey, {
        ...item,
        quantity: Number(item.quantity || 1),
        stacked_ids:
          item.stacked_ids && item.stacked_ids.length > 0
            ? [...item.stacked_ids]
            : [item.id],
      });
    } else {
      existing.quantity += Number(item.quantity || 1);
      if (item.favorite) existing.favorite = true;
      if (item.stacked_ids && item.stacked_ids.length > 0) {
        existing.stacked_ids!.push(...item.stacked_ids);
      } else {
        existing.stacked_ids!.push(item.id);
      }
    }
  }

  // Ordenar mostrando primero los stacks más numerosos o favoritos
  return Array.from(map.values()).sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return (b.quantity || 1) - (a.quantity || 1);
  });
};

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
        console.warn('No se pudo obtener legacy_id del perfil:', err);
      }

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
            if (Array.isArray(a.stacked_ids)) {
              a.stacked_ids.forEach((sid: string) => inFlightIds.add(String(sid).trim().toLowerCase()));
            }
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
              if (Array.isArray(a.stacked_ids)) {
                a.stacked_ids.forEach((sid: string) => inFlightIds.add(String(sid).trim().toLowerCase()));
              }
              if (a.seed_id) inFlightIds.add(String(a.seed_id).trim().toLowerCase());
              if (a.id_ship) inFlightIds.add(String(a.id_ship).trim().toLowerCase());
              if (a.name) inFlightNames.add(String(a.name).trim().toLowerCase());
            });
          }
        }
      });

      // Descarga paginada por lotes de 1.000 para no cortar inventarios grandes
      const safeUserQuery = async (tableName: string, selectClause = '*') => {
        const allRows: any[] = [];
        const pageSize = 1000;
        let from = 0;

        try {
          while (true) {
            let query = supabase.from(tableName).select(selectClause).range(from, from + pageSize - 1);
            if (legacyId) {
              query = query.or(`user_id.eq.${user.id},id_user.eq.${legacyId}`);
            } else {
              query = query.eq('user_id', user.id);
            }

            const { data, error } = await query;
            if (error || !data || data.length === 0) break;

            allRows.push(...data);
            if (data.length < pageSize) break;
            from += pageSize;
          }

          const seen = new Set();
          return allRows.filter((item) => {
            if (!item.id) return true;
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        } catch {
          return allRows;
        }
      };

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
        userRepairKits,
        userQmps,
        userMaterialicers,
        userBags,
        userTickets,
        userPacks,
        userEssentials
      ] = await Promise.all([
        (async () => {
          const joined = await safeUserQuery('user_ships', '*, seed_ships(*)');
          if (joined.length > 0) return joined;
          return await safeUserQuery('user_ships', '*');
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

      // 1. Naves
      (userShips || []).forEach((ship: any) => {
        const seedRel = ship.seed_ships;
        const seedFound =
          (seedShips || []).find(
            (ss: any) =>
              ss.id === ship.ship_id ||
              ss.id === ship.seed_id ||
              ss.id === ship.id_ship ||
              ss.ship_id === ship.ship_id
          ) || {};
        const seed =
          seedRel && typeof seedRel === 'object' && Object.keys(seedRel).length > 0
            ? seedRel
            : seedFound;

        const rawShipName = ship.name_ship || ship.name || ship.custom_name || '';
        const isGenericNickname =
          !rawShipName ||
          !isNaN(Number(rawShipName)) ||
          ['sin uso', 'en uso', 'reserva', 'idle'].includes(rawShipName.trim().toLowerCase());

        const shipName =
          seed.ship_name ||
          seed.name ||
          ship.seed_ships?.ship_name ||
          (!isGenericNickname ? rawShipName : `Nave #${ship.id_ship || ship.ship_id || ship.id}`);

        const realId = String(ship.id);
        const seedId = String(seed.ship_id || seed.id || ship.ship_id || ship.id_ship || shipName);

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

      // 2. Estructuras
      (userStructures || []).forEach((st: any) => {
        const seed =
          (seedStructures || []).find(
            (ss: any) =>
              ss.id === st.structure_id ||
              ss.id === st.seed_id ||
              ss.id === st.id_structure ||
              ss.building_id === st.building_id
          ) || {};
        const structName = st.name || seed.structure_name || seed.name || seed.title || `Estructura #${st.structure_id || st.id_structure || st.id}`;
        const realId = String(st.id);
        const seedId = String(seed.id || st.structure_id || st.id_structure || structName);

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

      // 3. Defensas
      (userDefenses || []).forEach((d: any) => {
        const seed =
          (seedDefenses || []).find(
            (sd: any) =>
              sd.id === d.defense_id ||
              sd.id === d.id_defense ||
              sd.defense_id === d.defense_id
          ) || {};
        const defName = d.name || d.name_defense || seed.defense_name || seed.name || `Defensa #${d.defense_id || d.id_defense || d.id}`;
        const realId = String(d.id);
        const seedId = String(seed.id || d.defense_id || d.id_defense || defName);

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

      // 4. Tecnologías
      (userTech || []).forEach((tc: any) => {
        const seed =
          (seedTech || []).find(
            (st: any) =>
              st.id === tc.technology_id ||
              st.id === tc.seed_id ||
              st.id === tc.id_technology ||
              st.technology_id === tc.technology_id
          ) || {};
        const techName = tc.name || seed.technology_name || seed.name || seed.title || `Tecnología #${tc.technology_id || tc.id_technology || tc.id}`;
        const realId = String(tc.id);
        const seedId = String(seed.id || tc.technology_id || tc.id_technology || techName);

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

      // 5. Astrobots
      (userAstrobots || []).forEach((a: any) => {
        const seed =
          (seedAstrobots || []).find(
            (sa: any) =>
              sa.id === a.astrobot_id ||
              sa.id === a.seed_id ||
              sa.astrobot_id === a.astrobot_id
          ) || {};
        const botName = a.name || seed.name || seed.astrobot_name || `Astrobot #${a.astrobot_id || a.id_astrobot || a.id}`;
        const realId = String(a.id);
        const seedId = String(seed.id || a.astrobot_id || a.id_astrobot || botName);

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

      // 6. Herramientas
      (userTools || []).forEach((t: any) => {
        const seed =
          (seedTools || []).find(
            (st: any) =>
              st.id === t.tool_id ||
              st.id === t.seed_id ||
              st.tool_id === t.tool_id
          ) || {};
        const toolName = t.name || seed.name || seed.tool_name || seed.title || `Herramienta #${t.tool_id || t.id_tool || t.id}`;
        const realId = String(t.id);
        const seedId = String(seed.id || t.tool_id || t.id_tool || toolName);

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

      // 7. Blueprints
      (userBlueprints || []).forEach((bp: any) => {
        const seed =
          (seedBlueprints || []).find(
            (sb: any) =>
              sb.id === bp.blueprint_id ||
              sb.id === bp.id_blueprint ||
              sb.blueprint_id === bp.blueprint_id
          ) || {};
        const bpName = bp.name || seed.blueprint_name || seed.name || `Plano #${bp.blueprint_id || bp.id_blueprint || bp.id}`;
        const realId = String(bp.id);
        const seedId = String(seed.id || bp.blueprint_id || bp.id_blueprint || bpName);

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

      // 8. Insignias
      (userBadges || []).forEach((b: any) => {
        const badgeKey = b.badge_id || b.id_badge || b.seed_id || '';
        const seed =
          (seedBadges || []).find(
            (sb: any) =>
              sb.id === badgeKey ||
              sb.badge_id === badgeKey ||
              String(sb.id) === String(b.badge_id) ||
              String(sb.id) === String(b.id_badge) ||
              String(sb.id_badge) === String(b.id_badge)
          ) || {};
        const badgeName = b.name || seed.name || seed.badge_name || seed.title || `Insignia #${b.id_badge || b.badge_id || b.id}`;
        const realId = String(b.id);
        const seedId = String(seed.id || badgeKey || badgeName);

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

      // 9. Licencias
      (userLicenses || []).forEach((l: any) => {
        const seed = l.seed_licenses || {};
        const licName = l.name || seed.name || `Licencia #${l.license_id || l.id}`;
        const realId = String(l.id);
        const seedId = String(seed.id || l.license_id || licName);

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

      // 10. Consumibles generales
      (userConsumables || []).forEach((co: any) => {
        const seed = co.seed_consumables || {};
        const consName = co.name || seed.name || `Consumible #${co.consumable_id || co.id}`;
        const realId = String(co.id);
        const seedId = String(seed.id || co.consumable_id || consName);

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

      // 11. Kits de reparación
      (userRepairKits || []).forEach((rk: any) => {
        const kitTier = rk.id_kit || 1;
        const kitName = `Kit de Reparación T${kitTier}`;
        const realId = `kit_${rk.id || `${rk.id_user}_${kitTier}`}`;

        combinedItems.push({
          id: realId,
          seed_id: `repair_kit_${kitTier}`,
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

      // 12. QMPs
      (userQmps || []).forEach((qmp: any) => {
        const qmpCode = qmp.id_qmp || 1;
        const qmpName = `Módulo QMP #${qmpCode}`;

        combinedItems.push({
          id: `qmp_${qmp.id}`,
          seed_id: `qmp_${qmpCode}`,
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

      // 13. Materializadores
      (userMaterialicers || []).forEach((mat: any) => {
        const matCode = mat.id_materialicer || 1;
        const matName = `Materializador #${matCode}`;

        combinedItems.push({
          id: `mat_${mat.id}`,
          seed_id: `materialicer_${matCode}`,
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

      // 14. Bolsas, Tickets, Packs y Esenciales
      (userBags || []).forEach((bag: any) => {
        const code = bag.id_bag || 1;
        const bagName = `Bolsa de Recursos #${code}`;
        combinedItems.push({
          id: `bag_${bag.id}`,
          seed_id: `bag_${code}`,
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
        const code = tk.id_ticket || 1;
        const tkName = `Ticket de Acceso #${code}`;
        combinedItems.push({
          id: `tk_${tk.id}`,
          seed_id: `ticket_${code}`,
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
          description: 'Credencial de ingreso prioritario a eventos y bóvedas.'
        });
      });

      (userPacks || []).forEach((pk: any) => {
        const code = pk.id_pack || 1;
        const pkName = `Pack Reclamable #${code}`;
        combinedItems.push({
          id: `pack_${pk.id}`,
          seed_id: `pack_${code}`,
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
        const code = es.id_essential || 1;
        const esName = `Ítem Esencial #${code}`;
        combinedItems.push({
          id: `ess_${es.id}`,
          seed_id: `essential_${code}`,
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

      // Apilar todos los repetidos en tarjetas consolidadas
      setItems(stackInventoryItems(combinedItems));
    } catch (err: any) {
      console.error('Error al construir inventario unificado:', err);
      setError(err?.message || 'Error al conectar con la estación de inventario.');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFavorite = async (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId || item.stacked_ids?.includes(itemId)
          ? { ...item, favorite: !item.favorite }
          : item
      )
    );
  };

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return { items, loading, error, refreshInventory: fetchInventory, toggleFavorite };
};

export default useInventory;