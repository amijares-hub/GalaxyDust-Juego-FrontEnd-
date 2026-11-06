/**
 * ==============================================================================
 * GALAXYDUST — SCRIPT DE IMPORTACIÓN FINAL (FASE 2 RESTANTE)
 * Sasorilabs.io — Principal Software Engineering
 * ==============================================================================
 * Carga mediante streaming asíncrono nativo (for await...of readline)
 * para Node.js v24+, evitando errores de ERR_USE_AFTER_CLOSE.
 *
 * PROCESA EXCLUSIVAMENTE LAS 3 TABLAS PENDIENTES:
 * 1. materialicers_user.csv  ➔ user_materialicers (19.731 filas)
 * 2. qmps_user.csv           ➔ user_qmps         (57.664 filas)
 * 3. repair_kits_user.csv    ➔ user_repair_kits  (1.12M filas agregadas a 1.207 registros)
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

const CSV_DIRECTORY = process.env.CSV_DIR || 'C:\\Users\\wilma\\OneDrive\\Escritorio\\Galaxy Dust\\Docs Importantes\\Old Backup\\Backup Old Backend\\CSV';

// ── 2. FUNCIONES HELPER DE SANITIZACIÓN ──────────────────────────────────────
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

// ── 3. STREAMING POR LOTES PARA MATERIALICERS Y QMPS ────────────────────────
async function processCsvTable(fileName, tableName, onConflict, transformRow, estimatedRows, batchSize = 1000) {
  const filePath = path.join(CSV_DIRECTORY, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️ Archivo no encontrado en ruta: ${filePath}. Saltando.`);
    return 0;
  }

  console.log(`▶ Migrando ${fileName} ➔ ${tableName} (~${estimatedRows.toLocaleString()} filas)...`);
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let headers = null;
  let currentBatch = [];
  let totalImported = 0;
  const startTime = Date.now();

  const flushBatch = async () => {
    if (currentBatch.length === 0) return;
    const batchToUpload = currentBatch;
    currentBatch = [];

    let retries = 3;
    while (retries > 0) {
      try {
        const { error } = await supabase
          .from(tableName)
          .upsert(batchToUpload, { onConflict });

        if (error) throw error;
        totalImported += batchToUpload.length;

        const pct = estimatedRows > 0
          ? Math.min(100, ((totalImported / estimatedRows) * 100)).toFixed(1)
          : '100';
        const rate = (totalImported / ((Date.now() - startTime) / 1000 || 1)).toFixed(0);

        process.stdout.write(`  [${tableName}] ${totalImported.toLocaleString()} registros (${pct}%) ~ ${rate} reg/s...\r`);
        break;
      } catch (err) {
        retries--;
        if (retries === 0) {
          console.error(`\n  ❌ Error definitivo en lote de ${tableName}:`, err.message);
          throw err;
        } else {
          await new Promise((res) => setTimeout(res, 1000));
        }
      }
    }
  };

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!headers) {
      headers = trimmed.split(',').map((h) => h.replace(/^"|"$/g, '').trim());
      continue;
    }

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

    currentBatch.push(transformRow(rowObj));

    if (currentBatch.length >= batchSize) {
      await flushBatch();
    }
  }

  await flushBatch();
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  ✅ [${tableName}] Completada: ${totalImported.toLocaleString()} registros sincronizados en ${totalTime}s.\n`);
  return totalImported;
}

// ── 4. AGREGACIÓN EN MEMORIA PARA REPAIR KITS (1.12M ➔ 1.207 ROWS) ───────────
async function processRepairKitsAggregated() {
  const fileName = 'repair_kits_user.csv';
  const filePath = path.join(CSV_DIRECTORY, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️ Archivo no encontrado en ruta: ${filePath}. Saltando.`);
    return 0;
  }

  console.log(`▶ Procesando y agregando ${fileName} (1.121.255 filas en streaming)...`);
  const startTime = Date.now();
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const kitMap = new Map();
  let lineCount = 0;
  let isFirst = true;

  for await (const line of rl) {
    if (isFirst) {
      isFirst = false;
      continue;
    }
    lineCount++;
    const parts = line.split(',');
    const idUser = parseInt(parts[1], 10);
    const idKit = parseInt(parts[2], 10);
    if (!isNaN(idUser) && !isNaN(idKit)) {
      const key = `${idUser}_${idKit}`;
      kitMap.set(key, (kitMap.get(key) || 0) + 1);
    }
  }

  console.log(`  📊 ${lineCount.toLocaleString()} filas leídas consolidadas en ${kitMap.size.toLocaleString()} registros únicos (id_user, id_kit).`);
  console.log(`  ⏳ Insertando en user_repair_kits con onConflict 'id_user,id_kit'...`);

  const payload = [];
  for (const [key, qty] of kitMap.entries()) {
    const [uStr, kStr] = key.split('_');
    payload.push({
      id_user: parseInt(uStr, 10),
      id_kit: parseInt(kStr, 10),
      quantity: qty
    });
  }

  const batchSize = 500;
  let uploaded = 0;
  for (let i = 0; i < payload.length; i += batchSize) {
    const chunk = payload.slice(i, i + batchSize);
    const { error } = await supabase
      .from('user_repair_kits')
      .upsert(chunk, { onConflict: 'id_user,id_kit' });

    if (error) {
      console.error(`\n  ❌ Error en lote de user_repair_kits:`, error.message);
      throw error;
    }
    uploaded += chunk.length;
    process.stdout.write(`  [user_repair_kits] ${uploaded} / ${payload.length} registros insertados...\r`);
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  ✅ [user_repair_kits] Completada con éxito: ${uploaded.toLocaleString()} registros agregados en ${elapsedSec}s.\n`);
  return uploaded;
}

// ── 5. PIPELINE PRINCIPAL ───────────────────────────────────────────────────
async function run() {
  console.log('\n================================================================');
  console.log('🚀 GALAXYDUST — IMPORTACIÓN FINAL DE LAS 3 TABLAS PENDIENTES');
  console.log(`📁 Directorio origen: ${CSV_DIRECTORY}`);
  console.log('================================================================\n');

  let grandTotal = 0;
  const globalStart = Date.now();

  // 1. Materialicers
  const countMat = await processCsvTable(
    'materialicers_user.csv',
    'user_materialicers',
    'id',
    (row) => ({
      id: toInt(row.id),
      id_user: toInt(row.idUser),
      id_materialicer: toInt(row.idMaterialicer),
      uses: toInt(row.uses, 1),
      id_planet: toInt(row.idPlanet),
      created_at: toIsoDate(row.created_at),
      updated_at: toIsoDate(row.updated_at)
    }),
    19730,
    1000
  );
  grandTotal += countMat;

  // 2. QMPs
  const countQmps = await processCsvTable(
    'qmps_user.csv',
    'user_qmps',
    'id',
    (row) => ({
      id: toInt(row.id),
      id_user: toInt(row.idUser),
      id_qmp: toInt(row.idQmp),
      uses: toInt(row.uses, 1),
      on_air: toInt(row.onAir, 0),
      created_at: toIsoDate(row.created_at),
      updated_at: toIsoDate(row.updated_at)
    }),
    57663,
    1000
  );
  grandTotal += countQmps;

  // 3. Repair Kits (Agregados en memoria)
  const countKits = await processRepairKitsAggregated();
  grandTotal += countKits;

  const elapsedSec = ((Date.now() - globalStart) / 1000).toFixed(1);
  console.log('================================================================');
  console.log(`🏆 ¡MIGRACIÓN AL 100% CULMINADA DE FORMA EXITOSA!`);
  console.log(`📊 Registros totales sincronizados en esta etapa: ${grandTotal.toLocaleString()}`);
  console.log(`⏱️ Tiempo total: ${elapsedSec}s`);
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('\n💥 Error no controlado en el proceso:', err);
  process.exit(1);
});
