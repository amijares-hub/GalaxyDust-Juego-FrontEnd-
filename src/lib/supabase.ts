import { createClient } from '@supabase/supabase-js';

// 🌌 Extracción y validación de las coordenadas de red de la terminal
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ [GALAXYDUST KERNEL]: Las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están definidas en el archivo .env. " +
    "El sistema iniciará en modo simulado local."
  );
}

// 🛰️ Inicialización del cliente con persistencia de sesión blindada y soporte MFA
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce' // Garantiza compatibilidad con flujos de autenticación modernos y seguros
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// 🔧 Aumentar límite de listeners para soporte de múltiples hooks con Realtime simultáneo
// Evita MaxListenersExceededWarning cuando varios hooks suscriben canales en paralelo
if (typeof process !== 'undefined' && process.setMaxListeners) {
  process.setMaxListeners(50);
}

/**
 * 🛠️ HELPER: Validador de estado del canal de comunicación.
 * Permite a cualquier vista comprobar rápidamente si la pasarela con Supabase está activa.
 */
export const checkKernelConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true }).limit(1);
    if (error && error.code === 'PGRST116') return true; // La tabla existe pero está vacía (Conexión OK)
    return !error;
  } catch {
    return false;
  }
};