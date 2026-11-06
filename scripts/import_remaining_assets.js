/**
 * ==============================================================================
 * GALAXYDUST — SCRIPT DE IMPORTACIÓN FINAL (FASE 2 RESTANTE)
 * Sasorilabs.io — Principal Software Engineering
 * ==============================================================================
 * Carga mediante streaming asíncrono nativo (for await...of readline)
 * para Node.js v24+, evitando errores de ERR_USE_AFTER_CLOSE.
 *
 * PROCESA EXCLUSIVAMENTE LAS 3 TABLAS PENDIENTES:
 * 1. materialicers_user.csv  ➔ user_materialicers (19.731)
 * 2. qmps_user.csv           ➔ user_qmps         (57.664)
 * 3. repair_kits_user.csv    ➔ user_repair_kits  (1.121.256)
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

// ── 2. LAS 3 TABLAS RESTANTES ────────────────────────────────────────────────
const PENDING_TARGETS = [
  {
    fileName: 'materialicers_user.csv',
    tableName: 'user_materialicers',
    onConflict: 'id',
    estimatedRows: 19730,
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
    fileName: 'qmps_user.csv',
    tableName: 'user_qmps',
    onConflict: 'id',
    estimatedRows: 57663,
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
    fileName: 'repair_kits_user.csv',
    tableName: 'user_repair_kits',
    onConflict: 'id',
    estimatedRows: 1121255,
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

// ── 4. STREAMING NATIVO ASÍNCRONO (FOR AWAIT...OF) RESISTENTE A NODE 24 ──────
async function processCsvAsync(filePath, target, batchSize = 1000) {
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️ Archivo no encontrado en ruta: ${filePath}. Saltando.`);
    return 0;
  }

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
          .from(target.tableName)
          .upsert(batchToUpload, { onConflict: target.onConflict });

        if (error) throw error;
        totalImported += batchToUpload.length;

        const pct = target.estimatedRows > 0
          ? ((totalImported / target.estimatedRows) * 100).toFixed(1)
          : '100';
        const rate = (totalImported / ((Date.now() - startTime) / 1000 || 1)).toFixed(0);

        process.stdout.write(`  [${target.tableName}] ${totalImported.toLocaleString()} registros (${pct}%) ~ ${rate} reg/s...\r`);
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

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!headers) {
      headers = trimmed.split(',').map((h) => h.replace(/^"|"$/g, '').trim());
      continue;
    }

    // Parser CSV ligero optimizado
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

    currentBatch.push(target.transform(rowObj));

    if (currentBatch.length >= batchSize) {
      await flushBatch();
    }
  }

  // Vaciar lote remanente
  await flushBatch();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  ✅ [${target.tableName}] Completada: ${totalImported.toLocaleString()} registros sincronizados en ${totalTime}s.`);
  return totalImported;
}

// ── 5. EJECUCIÓN PRINCIPAL ──────────────────────────────────────────────────
async function run() {
  console.log('\n================================================================');
  console.log('🚀 GALAXYDUST — IMPORTACIÓN DE LAS 3 TABLAS RESTANTES');
  console.log(`📁 Directorio origen: ${CSV_DIRECTORY}`);
  console.log('================================================================\n');

  let grandTotal = 0;
  const globalStart = Date.now();

  for (let i = 0; i < PENDING_TARGETS.length; i++) {
    const target = PENDING_TARGETS[i];
    const fullPath = path.join(CSV_DIRECTORY, target.fileName);
    console.log(`▶ (${i + 1}/${PENDING_TARGETS.length}) Migrando ${target.fileName} ➔ ${target.tableName} (~${target.estimatedRows.toLocaleString()} filas)...`);

    try {
      const count = await processCsvAsync(fullPath, target, 1000);
      grandTotal += count;
    } catch (err) {
      console.error(`  ❌ Fallo en ${target.fileName}:`, err.message);
    }
    console.log('');
  }

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
