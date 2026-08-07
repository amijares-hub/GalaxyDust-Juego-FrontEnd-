import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Compass, Timer, ShieldAlert, Gauge, RefreshCw, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useExpeditionEngine } from '../hooks/useExpeditionEngine';

interface UnlockedShip {
  id: string;
  name: string;
  rarity: string;
  speed_boost: number;
}

export const ExpeditionsView: React.FC = () => {
  const { activeExpeditions, loading: loadingEngine } = useExpeditionEngine();
  const [ships, setShips] = useState<UnlockedShip[]>([]);
  const [selectedShipId, setSelectedShipId] = useState<string>('');
  const [targetCluster, setTargetCluster] = useState<string>('Alfa Centauri');
  const [distanceType, setDistanceType] = useState<'short' | 'medium' | 'long'>('short');
  const [deploying, setDeploying] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 📡 Carga de hangares disponibles para el despliegue
  useEffect(() => {
    const fetchAvailableShips = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Unimos los datos reales que el jugador posee
      const { data: userInv } = await supabase
        .from('user_inventory')
        .select('asset_id, unlocked')
        .eq('user_id', user.id)
        .eq('unlocked', true);

      const { data: seedShips } = await supabase.from('seed_ships').select('*');

      if (seedShips) {
        const userAssetIds = new Set(userInv?.map(i => i.asset_id) || []);
        const available = seedShips
          .filter(s => s.rarity !== 'Legendary' || userAssetIds.has(s.ship_id))
          .map(s => ({
            id: s.ship_id,
            name: s.ship_name,
            rarity: s.rarity,
            speed_boost: parseInt(s.skills_modifiers?.speed_boost || '0')
          }));

        setShips(available);
        if (available.length > 0) setSelectedShipId(available[0].id);
      }
    };

    fetchAvailableShips();
  }, [activeExpeditions]);

  // ⏱️ Cálculos tácticos de tiempos y motores basados en tu documento de diseño
  const calculateTravelMetrics = () => {
    let baseHours = distanceType === 'short' ? 2 : distanceType === 'medium' ? 6 : 12; // Medianas de tus rangos (1-3, 4-8, 10-16)
    const ship = ships.find(s => s.id === selectedShipId);
    
    // Simulación de reducción de motores (Combustion/Impulse) hasta un tope de 75%
    const engineReduction = ship ? Math.min(0.75, ship.speed_boost / 200) : 0;
    const skillReduction = 0.15; // 15% fijo de habilidades pasivas de tu especificación
    
    const totalReduction = engineReduction + skillReduction;
    const realHours = baseHours * (1 - totalReduction);
    const totalSeconds = Math.max(60, Math.floor(realHours * 3600)); // Mínimo 1 minuto para pruebas ágiles

    return {
      durationSeconds: totalSeconds,
      reductionPercent: Math.floor(totalReduction * 100)
    };
  };

  const { durationSeconds, reductionPercent } = calculateTravelMetrics();

  // 🚀 DISPARADOR DE EXPEDICIÓN: Envío real de datos al servidor de Supabase
  const handleDeployFleet = async () => {
    if (!selectedShipId || deploying) return;
    setDeploying(true);
    setStatusMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Firma digital del comandante no detectada.");

      const ship = ships.find(s => s.id === selectedShipId);
      
      // Estructuramos tiempos absolutos reales en la línea temporal
      const now = new Date();
      const arrivalTime = new Date(now.getTime() + durationSeconds * 1000);
      const returnTime = new Date(arrivalTime.getTime() + durationSeconds * 1000); // Retorno simétrico

      const { error } = await supabase.from('user_expeditions').insert({
        user_id: user.id,
        fleet_assets: { ship_id: selectedShipId, ship_name: ship?.name },
        phase: 'traveling',
        target_cluster: `${targetCluster} [${distanceType.toUpperCase()}]`,
        start_time: now.toISOString(),
        arrival_time: arrivalTime.toISOString(),
        return_time: returnTime.toISOString(),
        is_instant_travel: false
      });

      if (error) throw error;

      setStatusMsg({ type: 'success', text: `🚀 FLOTA DESPLEGADA CON ÉXITO RUMBO A ${targetCluster.toUpperCase()}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || "Error al solicitar ventana de lanzamiento." });
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="w-full h-full bg-[#070809] text-white p-8 font-sans select-none overflow-y-auto flex flex-col gap-8">
      
      {/* Cabecera del Panel */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
          <Compass className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-widest uppercase">Monitor de Expediciones</h1>
          <p className="text-xs text-neutral-400 font-mono">ESTADO ACTUAL DE FLOTAS EN ESPACIO PROFUNDO</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        
        {/* CONSOLA DE LANZAMIENTO (IZQUIERDA) */}
        <div className="col-span-12 lg:col-span-5 bg-[#0C0D0E] border border-white/5 rounded-2xl p-6 flex flex-col gap-5 relative">
          <h2 className="text-xs font-black tracking-[0.2em] text-cyan-400 uppercase border-b border-white/5 pb-2">Nueva Orden de Vuelo</h2>
          
          {/* Selector de Nave */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">Seleccionar Nave de Vanguardia</label>
            <select 
              value={selectedShipId} 
              onChange={(e) => setSelectedShipId(e.target.value)}
              className="w-full bg-[#141517] border border-white/10 rounded-xl p-3 text-sm font-medium outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              {ships.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.rarity})</option>
              ))}
            </select>
          </div>

          {/* Selector de Destino */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">Vector Estelar (Destino)</label>
            <select 
              value={targetCluster} 
              onChange={(e) => setTargetCluster(e.target.value)}
              className="w-full bg-[#141517] border border-white/10 rounded-xl p-3 text-sm font-medium outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              <option value="Alfa Centauri">Alfa Centauri // Sector Minero</option>
              <option value="Clúster Orion">Clúster Orion // Cinturón de Chatarra</option>
              <option value="Nébula Némesis">Nébula Némesis // Ruinas Xenogon</option>
            </select>
          </div>

          {/* Selector de Rango de Distancia */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">Profundidad del Salto (Distancia)</label>
            <div className="grid grid-cols-3 gap-2.5 font-mono text-[10px] font-bold">
              {(['short', 'medium', 'long'] as const).map((type) => (
                <button
                  key={type} type="button" onClick={() => setDistanceType(type)}
                  className={`py-2.5 rounded-xl border transition-all cursor-pointer uppercase ${distanceType === type ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-white/5 bg-[#141517] text-neutral-400 hover:text-white'}`}
                >
                  {type === 'short' ? 'Corta' : type === 'medium' ? 'Media' : 'Larga'}
                </button>
              ))}
            </div>
          </div>

          {/* Cuadro de Telemetría Predictiva */}
          <div className="bg-[#141517] border border-white/5 rounded-xl p-4 font-mono text-[11px] space-y-2 text-neutral-400">
            <div className="flex justify-between"><span className="flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> Tiempo Base:</span><span className="text-white font-bold">{distanceType === 'short' ? '2h 00m' : distanceType === 'medium' ? '6h 00m' : '12h 00m'}</span></div>
            <div className="flex justify-between"><span className="flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5" /> Reducción Motores + Skills:</span><span className="text-emerald-400 font-bold">-{reductionPercent}%</span></div>
            <div className="flex justify-between border-t border-white/5 pt-2 mt-1 text-xs"><span className="text-white font-bold">Duración Real de Vuelo:</span><span className="text-cyan-400 font-black">{(durationSeconds / 60).toFixed(1)} Minutos</span></div>
          </div>

          {/* Alertas del Kernel */}
          <AnimatePresence>
            {statusMsg && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className={`flex items-center gap-2 p-3 border rounded-xl font-mono text-[10px] uppercase ${statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <ShieldAlert className="w-4 h-4 flex-shrink-0" />}
                <span>{statusMsg.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button" onClick={handleDeployFleet} disabled={deploying || ships.length === 0}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 font-black text-xs tracking-[0.2em] rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] text-center flex items-center justify-center cursor-pointer uppercase"
          >
            {deploying ? <RefreshCw className="w-4 h-4 animate-spin" /> : "INICIAR INSERCIÓN HIPERESPACIAL"}
          </button>
        </div>

        {/* MONITOR TÁCTICO EN VUELO (DERECHA) */}
        <div className="col-span-12 lg:col-span-7 bg-[#0C0D0E] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 min-h-[460px]">
          <h2 className="text-xs font-black tracking-[0.2em] text-cyan-400 uppercase border-b border-white/5 pb-2">Radar de Coordenadas Activas</h2>

          {loadingEngine ? (
            <div className="my-auto flex flex-col items-center justify-center gap-2 text-neutral-500 font-mono text-xs"><RefreshCw className="w-6 h-6 animate-spin text-cyan-500" /> Sincronizando Radar...</div>
          ) : activeExpeditions.length === 0 ? (
            <div className="my-auto flex flex-col items-center justify-center gap-3 border border-dashed border-white/5 rounded-2xl py-20 text-center select-none text-neutral-500">
              <Rocket className="w-8 h-8 text-neutral-700 stroke-[1.5]" />
              <div className="font-mono text-[10px] uppercase tracking-widest">Sin señales térmicas detectadas<br/><span className="text-cyan-500/50">Todas las flotas se encuentran ancladas en la C.A.N.</span></div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activeExpeditions.map((exp) => (
                <div key={exp.id} className="relative w-full border border-white/5 bg-[#141517] rounded-xl p-5 overflow-hidden flex flex-col gap-3 group">
                  
                  {/* 🛡️ REGLA DE ORO: Máscara roja parpadeante de "TRANSITANDO" en fase Traveling */}
                  {exp.phase === 'traveling' && (
                    <div className="absolute inset-0 bg-red-950/20 pointer-events-none border border-red-500/20 rounded-xl z-20 animate-pulse">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500/40 animate-[bounce_1.8s_infinite]" />
                      <div className="absolute bottom-3 right-4 font-mono font-black text-[9px] text-red-500 tracking-[0.2em] uppercase animate-pulse">
                        TRANSITANDO // SECURE LOCK
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-start select-none relative z-10">
                    <div>
                      <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 uppercase tracking-widest font-black">
                        ID: {exp.id.slice(0, 8).toUpperCase()}
                      </span>
                      <h4 className="text-sm font-black tracking-wide text-white mt-1.5 uppercase">DESTINO: {exp.target_cluster}</h4>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-[10px] font-black animate-pulse text-cyan-400 uppercase block">
                        🛰️ VIAJANDO AL CLUSTER...
                      </span>
                      <span className="text-xs text-white font-bold mt-1 block">
                        T-MINUS: {Math.floor(exp.timeLeft / 60)}m {exp.timeLeft % 60}s
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso táctica en tiempo real */}
                  <div className="w-full h-1 bg-black rounded-full overflow-hidden relative z-10">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: exp.timeLeft, ease: "linear" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
