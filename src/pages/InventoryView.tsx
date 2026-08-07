import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Rocket, Flame, Eye, Lock, Layers, RefreshCw } from 'lucide-react';
import { inventoryService, InventoryItem } from '../services/inventoryService';
import { useExpeditionEngine } from '../hooks/useExpeditionEngine';

export const InventoryView: React.FC = () => {
  const { activeExpeditions } = useExpeditionEngine();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // 📡 Sincronización e hidratación del hangar de activos relacionales
  useEffect(() => {
    const loadHangarData = async () => {
      try {
        setLoading(true);
        const data = await inventoryService.fetchAllInventory();
        setItems(data);
      } catch (err) {
        console.error("Fallo al sincronizar bahías de carga:", err);
      } finally {
        setLoading(false);
      }
    };
    loadHangarData();
  }, [activeExpeditions]);

  // 🛰️ Mapeo de colisiones: Registra qué naves están listadas en las expediciones activas de Supabase
  const inFlightAssetIds = new Set(
    activeExpeditions
      .filter(exp => exp.phase === 'traveling' || exp.phase === 'active' || exp.phase === 'returning')
      .map(exp => {
        // Extraemos de forma segura el ID de la nave guardado en el JSONB del servidor
        const assets = (exp as any).fleet_assets;
        return assets?.ship_id || null;
      })
      .filter(Boolean)
  );

  // Filtros de categoría extendidos para incluir tu pestaña personalizada de vuelo
  const filters = [
    { id: 'ALL', label: 'TODOS' },
    { id: 'Spaceships', label: 'NAVES' },
    { id: 'IN_FLIGHT', label: 'FLOTAS EN VUELO' }, // 🛡️ Tu filtro de especificación de diseño
    { id: 'Structures', label: 'ESTRUCTURAS' },
    { id: 'Technology', label: 'TECNOLOGÍA' }
  ];

  // Lógica de segmentación del inventario
  const filteredItems = items.filter(item => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'IN_FLIGHT') return inFlightAssetIds.has(item.id);
    return item.category === activeFilter;
  });

  if (loading) {
    return (
      <div className="w-full h-full bg-[#070809] flex flex-col items-center justify-center gap-2 font-mono text-xs text-cyan-500">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span>ESCANEANDO BAHÍAS DE CARGA C.A.N...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#070809] text-white p-8 font-sans select-none overflow-y-auto flex flex-col gap-6">
      
      {/* Barra superior de pestañas tácticas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4 font-mono text-[10px] font-black tracking-widest">
        {filters.map(f => (
          <button
            key={f.id} type="button" onClick={() => setActiveFilter(f.id)}
            className={`px-4 py-2 rounded-xl border transition-all cursor-pointer uppercase ${
              activeFilter === f.id 
                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                : 'border-white/5 bg-[#0C0D0E] text-neutral-400 hover:text-white hover:border-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Rejilla de tarjetas de inventario */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {filteredItems.map(item => {
          const isItemInFlight = inFlightAssetIds.has(item.id);

          return (
            <div 
              key={item.id} 
              className={`relative bg-[#0C0D0E] border rounded-2xl p-4 flex flex-col gap-4 overflow-hidden group transition-all duration-300 ${
                isItemInFlight ? 'border-red-500/20' : 'border-white/5 hover:border-white/10'
              }`}
            >
              {/* 🛡️ REGLA DE OROFrontend: Borde rojo discontinuo giratorio en naves en vuelo exterior */}
              {isItemInFlight && (
                <div className="absolute inset-0 border-2 border-dashed border-red-500 rounded-2xl pointer-events-none z-30 animate-[spin_5s_linear_infinite] scale-[0.98]" />
              )}

              {/* Encabezado de la tarjeta */}
              <div className="flex justify-between items-start select-none relative z-10">
                <div className="flex gap-3 items-center">
                  <div className={`w-10 h-10 rounded-xl bg-neutral-900 border flex items-center justify-center ${
                    isItemInFlight ? 'border-red-500/30 text-red-400' : 'border-white/10 text-cyan-400'
                  }`}>
                    {item.category === 'Spaceships' ? <Rocket className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-wider text-white uppercase">{item.name}</h3>
                    <span className="text-[9px] font-mono font-bold uppercase text-neutral-500 tracking-widest">{item.category}</span>
                  </div>
                </div>
                
                {/* Badge de Estado Dinámico */}
                <span className={`text-[8px] font-mono font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                  isItemInFlight 
                    ? 'bg-red-500/10 border border-red-500/30 text-red-400 animate-pulse' 
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                }`}>
                  {isItemInFlight ? 'EN VUELO' : 'ANCLADO'}
                </span>
              </div>

              {/* Vista previa / Avatar de la nave */}
              <div className="h-32 w-full rounded-xl bg-[#141517] border border-white/5 overflow-hidden relative select-none">
                <img 
                  src={item.avatar_url} alt={item.name} 
                  className={`w-full h-full object-contain p-4 transition-transform duration-500 ${
                    isItemInFlight ? 'brightness-[0.3] scale-95' : 'group-hover:scale-105'
                  }`} 
                />
                
                {/* Capa de bloqueo visual si la flota está transitando */}
                {isItemInFlight && (
                  <div className="absolute inset-0 bg-red-950/20 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5 text-red-400">
                    <Lock className="w-5 h-5 animate-bounce" />
                    <span className="font-mono font-black text-[8px] tracking-[0.2em] uppercase">MÓDULOS CONGELADOS</span>
                  </div>
                )}
              </div>

              {/* Lista de Especificaciones Técnicas */}
              <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-neutral-400 select-none">
                <div className="bg-[#141517] p-2 rounded-xl border border-white/5 flex items-center justify-between">
                  <span>NIVEL:</span>
                  <span className="text-white font-bold">{item.level}</span>
                </div>
                <div className="bg-[#141517] p-2 rounded-xl border border-white/5 flex items-center justify-between">
                  <span>ESTRELLAS:</span>
                  <span className="text-amber-400 font-bold">★ {item.stars}</span>
                </div>
              </div>

              {/* Botonera de Acción Comprimida */}
              <div className="flex gap-2 mt-2 relative z-10">
                <button
                  type="button"
                  className="flex-1 py-2 bg-[#141517] hover:bg-[#1C1D21] border border-white/5 hover:border-white/10 text-[9px] font-mono font-bold tracking-widest text-neutral-400 hover:text-white rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> INSPECCIÓN
                </button>
                <button
                  type="button"
                  disabled={isItemInFlight} // 🛡️ REGLA DE ORO: Bloqueo físico de interacciones si viaja
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-800 disabled:border-transparent disabled:text-neutral-500 disabled:opacity-40 text-[9px] font-mono font-black tracking-widest text-white rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5" /> MEJORAR
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
