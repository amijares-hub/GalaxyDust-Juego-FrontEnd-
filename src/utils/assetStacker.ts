export interface StackedInstance<T = any> {
  rowId: string;
  quantity: number;
  raw: T;
}

export interface StackedAsset<T = any> {
  stackKey: string;
  representative: T;
  instances: StackedInstance<T>[];
  totalQuantity: number;
}

export const RARITY_WEIGHT: Record<string, number> = {
  MYTHIC: 7,
  EXCLUSIVE: 6,
  LEGENDARY: 5,
  EPIC: 4,
  RARE: 3,
  UNCOMMON: 2,
  COMMON: 1,
};

/**
 * Resuelve de forma exhaustiva el identificador de plantilla del activo
 */
export function resolveTemplateId(item: any): string {
  if (!item || typeof item !== 'object') return 'unknown_template';

  const raw = item.seed_data || item.seed_ships || item.raw_data || item.seed || {};

  const candidate =
    item.ship_id ||
    item.id_ship ||
    item.astrobot_id ||
    item.id_astrobot ||
    item.tool_id ||
    item.id_tool ||
    item.license_id ||
    item.consumable_id ||
    item.structure_id ||
    item.technology_id ||
    item.defense_id ||
    item.blueprint_id ||
    item.badge_id ||
    item.seed_id ||
    raw.ship_id ||
    raw.id_ship ||
    raw.astrobot_id ||
    raw.id_astrobot ||
    raw.tool_id ||
    raw.id_tool ||
    raw.license_id ||
    raw.consumable_id ||
    raw.structure_id ||
    raw.technology_id ||
    raw.defense_id ||
    raw.blueprint_id ||
    raw.badge_id ||
    raw.seed_id ||
    item.name ||
    raw.name ||
    'unknown';

  return String(candidate).trim().toLowerCase();
}

/**
 * Genera la clave canónica de apilamiento:
 * ${categoria}::${templateId}::${rarity}::${level}::${isSoulbound ? 1 : 0}
 */
export function buildStackKey(item: any, categoryHint?: string): string {
  if (!item) return 'empty_stack_key';

  const category = (
    categoryHint ||
    item.category ||
    item.type ||
    'ASSET'
  ).toString().trim().toLowerCase();

  const templateId = resolveTemplateId(item);

  const rarity = (
    item.rarity ||
    item.seed_ships?.rarity ||
    item.seed_data?.rarity ||
    'COMMON'
  ).toString().trim().toUpperCase();

  const level = Number(item.level ?? item.seed_ships?.level ?? 1);
  const isSoulbound = Boolean(item.is_soulbound || item.soulbound || item.is_bound) ? 1 : 0;

  return `${category}::${templateId}::${rarity}::${level}::${isSoulbound}`;
}

/**
 * Agrupa los activos preservando todas las instancias individuales de base de datos
 */
export function stackAssets<T extends { id?: string | number }>(
  items: T[],
  categoryResolver?: (item: T) => string
): StackedAsset<T>[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const map = new Map<string, StackedAsset<T>>();

  for (const item of items) {
    if (!item) continue;

    const rowId = String((item as any).id || (item as any).rowId || (item as any).uuid || Math.random());
    const qty = Math.max(1, Number((item as any).quantity ?? 1));
    const catHint = categoryResolver ? categoryResolver(item) : undefined;
    const key = buildStackKey(item, catHint);

    let stack = map.get(key);
    if (!stack) {
      stack = {
        stackKey: key,
        representative: item,
        instances: [],
        totalQuantity: 0,
      };
      map.set(key, stack);
    }

    stack.instances.push({
      rowId,
      quantity: qty,
      raw: item,
    });
    stack.totalQuantity += qty;
  }

  const result = Array.from(map.values());

  // Ordenamiento táctico: Rareza DESC -> Level DESC -> Nombre ASC
  result.sort((a, b) => {
    const rawA = a.representative as any;
    const rawB = b.representative as any;

    const rarityA = (rawA.rarity || '').toString().trim().toUpperCase();
    const rarityB = (rawB.rarity || '').toString().trim().toUpperCase();
    const weightA = RARITY_WEIGHT[rarityA] ?? 0;
    const weightB = RARITY_WEIGHT[rarityB] ?? 0;

    if (weightA !== weightB) {
      return weightB - weightA;
    }

    const lvlA = Number(rawA.level ?? 1);
    const lvlB = Number(rawB.level ?? 1);
    if (lvlA !== lvlB) {
      return lvlB - lvlA;
    }

    const nameA = (rawA.name || '').toString().toLowerCase();
    const nameB = (rawB.name || '').toString().toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return result;
}

