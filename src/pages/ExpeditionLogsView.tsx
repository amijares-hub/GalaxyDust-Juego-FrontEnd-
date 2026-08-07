import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Terminal, Radio, ShieldX, Sparkles, Coins, Skull } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ExpeditionLog {
  id: string;
  expedition_id: string;
  event_type: 'nominal' | 'anomaly' | 'hostile' | 'discovery' | 'rescue';
  title: string;
  message: string;
  rewards_looted: {
    metal?: number;
    crystal?: number;
    dark_matter?: number;
    phantom_coins?: number;
  };
  damage_sustained: number;
  created_at: string;
}

export const ExpeditionLogsView: React.FC = () => {
  const [logs, setLogs] = useState<ExpeditionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let channel: any;

    const fetchBitacoras = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('expedition_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && isMounted) {
        setLogs(data);
        setLoading(false);
      }
    };

    fetchBitacoras();

    // 🛰️ TRANSMISIÓN EN TIEMPO REAL: Si el backend genera un encuentro, la terminal reacciona al instante
    const listenToIncomingEvents = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`cinematic_logs_channel_${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'expedition_logs', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (isMounted) {
              setLogs(prev => [payload.new as ExpeditionLog, ...prev]);
            }
          }
        )
        .subscribe();
    };

    listenToIncomingEvents();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Mapeador estético de firmas térmicas e iconos de la terminal
  const getEventCosmetics = (type: ExpeditionLog['event_type']) => {
    switch (type) {
      case 'hostile':
        return { icon: <Skull className="w-4 h-4 text-red-500" />, border: 'border-red-500/20 bg-red-950/5', text: 'text-red-400' };
      case 'anomaly':
        return { icon: <ShieldAlert className="w-4 h-4 text-amber-500" />, border: 'border-amber-500/20 bg-amber-950/5', text: 'text-amber-400' };
      case 'discovery':
        return { icon: <Sparkles className="w-4 h-4 text-emerald-500" />, border: 'border-emerald-500/20 bg-emerald-950/5', text: 'text-emerald-400' };
      case 'rescue':
        return { icon: <Radio className="w-4 h-4 text-cyan-500" />, border: 'border-cyan-500/20 bg-cyan-950/5', text: 'text-cyan-400' };
      default:
        return { icon: <Terminal className="w-4 h-4 text-neutral-400" />, border: 'border-white/5 bg-[#141517]', text: 'text-neutral-200' };
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-[#070809] flex flex-col items-center justify-center gap-2 font-mono text-xs text-cyan-500">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="tracking-widest uppercase">Abriendo canales de telemetría...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#070809] text-white p-8 font-sans select-none overflow-y-auto flex flex-col gap-6">
      
      {/* Cabecera Táctica */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-4 select-none">
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          <Radio className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-widest uppercase">Canal de Comunicaciones</h1>
          <p className="text-xs text-neutral-400 font-mono">FEED CRONOLÓGICO DE INCIDENTES EN FLOTA</p>
        </div>
      </div>

      {/* Listado de Bitácoras Cinemáticas */}
      <div className="w-full max-w-4xl flex flex-col gap-4 font-mono">
        <AnimatePresence initial={false}>
          {logs.length === 0 ? (
            <div className="text-center py-20 text-neutral-600 text-xs border border-dashed border-white/5 rounded-2xl uppercase tracking-widest">
              Canal limpio. Sin transmisiones de radio de flotas exteriores.
            </div>
          ) : (
            logs.map((log) => {
              const style = getEventCosmetics(log.event_type);
              const hasRewards = Object.values(log.rewards_looted || {}).some(v => v > 0);

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`w-full border rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-300 hover:border-white/10 ${style.border}`}
                >
                  {/* Encabezado del Log */}
                  <div className="flex justify-between items-start text-[11px] font-black tracking-wide">
                    <div className="flex items-center gap-2">
                      {style.icon}
                      <span className={`uppercase ${style.text}`}>{log.title}</span>
                    </div>
                    <span className="text-neutral-500 text-[10px]">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Cuerpo del Mensaje Emitido */}
                  <p className="text-xs text-neutral-300 leading-relaxed font-sans font-medium pl-6">
                    {log.message}
                  </p>

                  {/* Desglose de Daños o Botín del Encuentro */}
                  {(log.damage_sustained > 0 || hasRewards) && (
                    <div className="ml-6 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase select-none mt-1">
                      
                      {log.damage_sustained > 0 && (
                        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 px-2.5 py-1 rounded">
                          <ShieldX className="w-3.5 h-3.5" />
                          Daño Casco: -{log.damage_sustained} HP
                        </div>
                      )}

                      {log.rewards_looted?.metal && (
                        <div className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 text-neutral-300 px-2.5 py-1 rounded">
                          Metal: +{log.rewards_looted.metal}
                        </div>
                      )}

                      {log.rewards_looted?.crystal && (
                        <div className="flex items-center gap-1.5 bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 px-2.5 py-1 rounded">
                          Cristal: +{log.rewards_looted.crystal}
                        </div>
                      )}

                      {log.rewards_looted?.dark_matter && (
                        <div className="flex items-center gap-1.5 bg-purple-950/30 border border-purple-500/20 text-purple-400 px-2.5 py-1 rounded shadow-[0_0_8px_rgba(168,85,247,0.15)]">
                          Materia Oscura: +{log.rewards_looted.dark_matter}
                        </div>
                      )}

                      {log.rewards_looted?.phantom_coins && (
                        <div className="flex items-center gap-1.5 bg-amber-950/30 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded">
                          <Coins className="w-3.5 h-3.5" />
                          Phantom: +{log.rewards_looted.phantom_coins}
                        </div>
                      )}

                    </div>
                  )}
                  
                  {/* Decoración Estética de Margen Lateral Cyberpunk */}
                  <div className={`absolute top-0 left-0 w-[2px] h-full ${
                    log.event_type === 'hostile' ? 'bg-red-500' : log.event_type === 'anomaly' ? 'bg-amber-500' : log.event_type === 'discovery' ? 'bg-emerald-500' : log.event_type === 'rescue' ? 'bg-cyan-500' : 'bg-neutral-800'
                  }`} />
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
