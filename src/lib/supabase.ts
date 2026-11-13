import { createClient } from '@supabase/supabase-js';

// 🌌 Extracción y validación de las coordenadas de red de la terminal
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://qldjeysusithpblfrmtq.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZGpleXN1c2l0aHBibGZybXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDgxMzQsImV4cCI6MjA5NDkyNDEzNH0.7kjQa-swcnkPDHjgf3oilj4_loGIY7tSbj1yeXIfar4').trim();

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "⚠️ [GALAXYDUST KERNEL]: Las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no se detectaron directamente en import.meta.env. " +
    "Se activaron las credenciales maestras de reserva para garantizar la conectividad de la terminal."
  );
}

// 🛰️ Inicialización del cliente con persistencia de sesión blindada y soporte MFA
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// 🔧 Aumentar límite de listeners para soporte de múltiples hooks con Realtime simultáneo
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
    if (error && error.code === 'PGRST116') return true;
    return !error;
  } catch {
    return false;
  }
};
