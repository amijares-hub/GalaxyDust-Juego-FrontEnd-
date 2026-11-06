/**
 * ==============================================================================
 * GALAXYDUST — SCRIPT DE IMPORTACIÓN Y SINCRONIZACIÓN MASIVA DE ACTIVOS
 * Sasorilabs.io — Principal Software Engineering
 * ==============================================================================
 * Carga por streaming e inserción por lotes (upsert idempotente) de los CSVs de
 * respaldo para completar los inventarios de los más de 1.600 comandantes.
 *
 * REGLA ESTRICTA: NO toca recursos de metal, cristal, deuterio ni balances de GD Coins.
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';

// ── 1. CONFIGURACIÓN Y CREDENCIALES ──────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qldjeysusithpblfrmtq.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY.trim() === '' || SERVICE_ROLE_KEY.includes('TU_SERVICE_ROLE')) {
  console.error('\n❌ ERROR: SUPABASE_SERVICE_ROLE_KEY no está configurada.');
  console.error('Por favor, ejecuta el script proporcionando tu clave de servicio:');
  console.error('$env:SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key_aqui"; node scripts/import_remaining_assets.js\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Ruta por defecto donde residen los CSVs de respaldo
const CSV_DIRECTORY = process.env.CSV_DIR || 'C:\\Users\\wilma\\OneDrive\\Escritorio\\Galaxy Dust\\Docs Importantes\\Old Backup\\Backup Old Backend\\CSV';

// ── 2. LISTA BLANCA DE TABLAS Y MAPEOS (EXCLUYE resources.csv y gd.csv) ─────
const MIGRATION_TARGETS = [
  {
    fileName: 'astrobots_user.csv',
    tableName: 'user_astrobots',
    onConflict: 'legacy_id',
    transform: (row, userUuidMap) => {
      const uId = toInt(row.idUser);
      return {
        legacy_id: toInt(row.id),
        user_id: userUuidMap.get(uId) || null,
        id_user: uId,
        astrobot_id: cleanStr(row.idAstrobot),
        id_astrobot: toInt(row.idAstrobot),
        name: cleanStr(row.name),
        health: toInt(row.health, 100),
        total_health: toInt(row.totalHealth, 100),
        percentage_health: toInt(row.percentajeHealth, 100),
        id_planet: toInt(row.idPlanet),
        hash: cleanStr(row.hash),
        id_token: cleanStr(row.idToken),
        created_at: toIsoDate(row.created_at),
        updated_at: toIsoDate(row.updated_at)
      };
    }
  },
  {
    fileName: 'packs_user.csv',
    tableName: 'user_packs',
    onConflict: 'id',
    transform: (row) => ({
      id: toInt(row.id),
      id_user: toInt(row.idUser),
      id_pack: toInt(row.idPack),
      status: toInt(row.status, 0),
      hash: cleanStr(row.hash),
      id_token: cleanStr(row.idToken),
      created_at: toIsoDate(row.created_at),
      updated_at: toIsoDate(row.updated_at)
    })
  },
  {
    fileName: 'tickets_user.csv',
    tableName: 'user_tickets',
    onConflict: 'id',
    transform: (row) => ({
      id: toInt(row.id),
      id_user: toInt(row.idUser),
      id_ticket: toInt(row.idTicket),
      is_sell: toInt(row.isSell, 0),
      created_at: toIsoDate(row.created_at),
      updated_at: toIsoDate(row.updated_at)
    })
  },
  {
    fileName: 'tools_user.csv',
    tableName: 'user_tools',
    onConflict: 'legacy_id',
    transform: (row, userUuidMap) => {
      const uId = toInt(row.idUser);
      return {
        legacy_id: toInt(row.id),
        user_id: userUuidMap.get(uId) || null,
        id_user: uId,
        tool_id: cleanStr(row.idTool),
        id_tool: toInt(row.idTool),
        active: toInt(row.active, 1),
        hash: cleanStr(row.hash),
        id_token: cleanStr(row.idToken),
        created_at: toIsoDate(row.created_at),
        updated_at: toIsoDate(row.updated_at)
      };
    }
  },
  {
    fileName: 'defenses_user.csv',
    tableName: 'user_defenses',
    onConflict: 'id',
    transform: (row, userUuidMap) => {
      const uId = toInt(row.idUser);
      return {
        id: toInt(row.id),
        legacy_id: toInt(row.id),
        user_id: userUuidMap.get(uId) || null,
        id_user: uId,
        defense_id: cleanStr(row.idDefense),
        id_defense: toInt(row.idDefense),
        health: toInt(row.health, 100),
        total_health: toInt(row.totalHealth, 100),
        percentage_health: toInt(row.percentajeHealth, 100),
        id_planet: toInt(row.idPlanet),
        hash: cleanStr(row.hash),
        id_token: cleanStr(row.idToken),
        created_at: toIsoDate(row.created_at),
        updated_at: toIsoDate(row.updated_at)
      };
    }
  },
  {
    fileName: 'bags_user.csv',
    tableName: 'user_bags',
    onConflict: 'id',
    transform: (row) => ({
      id: toInt(row.id),
      id_user: toInt(row.idUser),
      id_bag: toInt(row.idBag),
      hash: cleanStr(row.hash),
      id_token: cleanStr(row.idToken),
      is_sell: toInt(row.isSell, 0),
      created_at: toIsoDate(row.created_at),
      updated_at: toIsoDate(row.updated_at)
    })
  },
  {
    fileName: 'materialicers_user.csv',
    tableName: 'user_materialicers',
    onConflict: 'id',
    transform: (row) => ({
      id: toInt(row.id),
      id_user: toInt(row.idUser),
      id_materialicer: toInt(row.idMaterialicer),
      uses: toInt(row.uses, 1),
      id_planet: toInt(row.idPlanet),
      created_at: toIsoDate(row.created_at),
      updated_at: toIsoDate(row.updated_at)
    })
  },
  {
    fileName: 'blueprints_user.csv',
    tableName: 'user_blueprints',
    onConflict: 'legacy_id',
    transform: (row, userUuidMap) => {
      const uId = toInt(row.idUser);
      return {
        legacy_id: toInt(row.id),
        user_id: userUuidMap.get(uId) || null,
        id_user: uId,
        blueprint_id: cleanStr(row.idBlueprint),
        id_blueprint: toInt(row.idBlueprint),
        uses: toInt(row.uses, 1),
        rarity: cleanStr(row.rarity) || 'COMMON',
        hash: cleanStr(row.hash),
        id_token: cleanStr(row.idToken),
        id_planet: toInt(row.idPlanet),
        name: cleanStr(row.name),
        created_at: toIsoDate(row.created_at),
        updated_at: toIsoDate(row.updated_at)
      };
    }
  },
  {
    fileName: 'qmps_user.csv',
    tableName: 'user_qmps',
    onConflict: 'id',
    transform: (row) => ({
      id: toInt(row.id),
      id_user: toInt(row.idUser),
      id_qmp: toInt(row.idQmp),
      uses: toInt(row.uses, 1),
      on_air: toInt(row.onAir, 0),
      created_at: toIsoDate(row.created_at),
      updated_at: toIsoDate(row.updated_at)
    })
  },
  {
    fileName: 'badges_user.csv',
    tableName: 'user_badges',
    onConflict: 'legacy_id',
    transform: (row, userUuidMap) => {
      const uId = toInt(row.idUser);
      return {
        legacy_id: toInt(row.id),
        user_id: userUuidMap.get(uId) || null,
        id_user: uId,
        badge_id: cleanStr(row.idBadge),
        id_badge: toInt(row.idBadge),
        level: 1,
        hash: cleanStr(row.hash),
        id_token: cleanStr(row.idToken),
        id_planet: toInt(row.idPlanet),
        name: cleanStr(row.name),
        active: toInt(row.active, 1),
        created_at: toIsoDate(row.created_at),
        updated_at: toIsoDate(row.updated_at)
      };
    }
  },
  {
    fileName: 'repair_kits_user.csv',
    tableName: 'user_repair_kits',
    onConflict: 'id',
    transform: (row) => ({
      id: toInt(row.id),
      id_user: toInt(row.idUser),
      id_kit: toInt(row.idKit),
      created_at: toIsoDate(row.created_at)
    })
  }
];

// ── 3. FUNCIONES HELPER DE SANITIZACIÓN ──────────────────────────────────────
function toIsoDate(val, fallback = null) {
  if (!val || val === 'NULL' || val === 'null' || val === 'NaN' || val === '0000-00-00 00:00:00') {
    return fallback;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? fallback : d.toISOString();
}

function toInt(val, fallback = null) {
  if (val === null || val === undefined || val === '' || val === 'NULL' || val === 'null' || val === 'NaN') {
    return fallback;
  }
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}

function cleanStr(val) {
  if (!val || val === 'NULL' || val === 'null') return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

// ── 4. STREAMING Y CARGA POR CHUNKS (MAX MEMORY EFFICIENCY) ─────────────────
async function processCsvStream(filePath, target, userUuidMap, batchSize = 1000) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠️ Archivo no encontrado en ruta: ${filePath}. Saltando.`);
      return resolve(0);
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let headers = null;
    let currentBatch = [];
    let totalImported = 0;
    let isPaused = false;

    const flushBatch = async () => {
      if (currentBatch.length === 0) return;
      const batchToUpload = currentBatch;
      currentBatch = [];

      let retries = 3;
      while (retries > 0) {
        try {
          const { error } = await supabase
            .from(target.tableName)
            .upsert(batchToUpload, { onConflict: target.onConflict });

          if (error) throw error;
          totalImported += batchToUpload.length;
          process.stdout.write(`  [${target.tableName}] ${totalImported.toLocaleString()} registros procesados...\r`);
          break;
        } catch (err) {
          retries--;
          if (retries === 0) {
            console.error(`\n  ❌ Error definitivo en lote de ${target.tableName}:`, err.message);
          } else {
            await new Promise((res) => setTimeout(res, 1000));
          }
        }
      }
    };

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (!headers) {
        headers = trimmed.split(',').map((h) => h.replace(/^"|"$/g, '').trim());
        return;
      }

      // Parser CSV seguro con soporte de comillas
      const values = [];
      let inQuotes = false;
      let currentVal = '';
      for (let i = 0; i < trimmed.length; i++) {
        const char = trimmed[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim());

      const rowObj = {};
      headers.forEach((h, i) => {
        let v = values[i] !== undefined ? values[i].replace(/^"|"$/g, '') : null;
        if (v === 'NULL' || v === 'null' || v === '') v = null;
        rowObj[h] = v;
      });

      const formatted = target.transform(rowObj, userUuidMap);
      currentBatch.push(formatted);

      if (currentBatch.length >= batchSize) {
        rl.pause();
        await flushBatch();
        rl.resume();
      }
    });

    rl.on('close', async () => {
      await flushBatch();
      console.log(`  ✅ [${target.tableName}] Finalizado: ${totalImported.toLocaleString()} registros totales.`);
      resolve(totalImported);
    });

    rl.on('error', (err) => reject(err));
  });
}

// ── 5. EJECUCIÓN PRINCIPAL DEL PIPELINE ──────────────────────────────────────
async function run() {
  console.log('\n================================================================');
  console.log('🚀 GALAXYDUST — INICIANDO MIGRACIÓN DE ACTIVOS FALTANTES');
  console.log(`📁 Directorio origen: ${CSV_DIRECTORY}`);
  console.log('================================================================\n');

  // 1. Obtener catálogo relacional de comandantes
  console.log('⏳ Cargando mapa de comandantes (user_profiles)...');
  const { data: profiles, error: profErr } = await supabase
    .from('user_profiles')
    .select('id, legacy_id');

  if (profErr || !profiles) {
    console.error('❌ Error fatal al cargar user_profiles:', profErr?.message);
    process.exit(1);
  }

  const userUuidMap = new Map();
  profiles.forEach((p) => {
    if (p.legacy_id) userUuidMap.set(Number(p.legacy_id), p.id);
  });
  console.log(`  ✅ Mapeados ${userUuidMap.size.toLocaleString()} comandantes con UUIDs activos.\n`);

  // 2. Procesar cada archivo en cola secuencial
  let grandTotal = 0;
  const startTime = Date.now();

  for (let i = 0; i < MIGRATION_TARGETS.length; i++) {
    const target = MIGRATION_TARGETS[i];
    const fullPath = path.join(CSV_DIRECTORY, target.fileName);
    console.log(`▶ (${i + 1}/${MIGRATION_TARGETS.length}) Migrando ${target.fileName} ➔ ${target.tableName}...`);

    try {
      const count = await processCsvStream(fullPath, target, userUuidMap, 1000);
      grandTotal += count;
    } catch (err) {
      console.error(`  ❌ Fallo en ${target.fileName}:`, err.message);
    }
    console.log('');
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('================================================================');
  console.log(`🏆 ¡MIGRACIÓN COMPLETADA CON ÉXITO!`);
  console.log(`📊 Registros totales sincronizados: ${grandTotal.toLocaleString()}`);
  console.log(`⏱️ Tiempo transcurrido: ${elapsedSec}s`);
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('\n💥 Error no controlado en el proceso:', err);
  process.exit(1);
});
