import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Gift,
  CheckCircle2,
  Filter,
  Search,
  CheckCheck,
  ChevronLeft,
  ExternalLink
} from 'lucide-react';

interface NotificationItem {
  id: string;
  category: 'ANNOUNCEMENTS' | 'EXPEDITIONS' | 'MARKET' | 'ALLIANCE' | 'SYSTEM' | 'GD' | 'CARTOGRAPHIC' | 'RESOURCES';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  reward?: {
    type: 'resource' | 'asset';
    label: string;
    amount: string;
    claimed: boolean;
  };
  redirection?: {
    label: string;
    targetModule: 'AMI' | 'FIF' | 'MARKET' | 'EXPEDITION' | 'ALLIANCE';
  };
  alertLevel?: 'info' | 'success' | 'warning' | 'danger';
}

interface NotificationsViewProps {
  onBack: () => void;
  onNavigateModule?: (moduleName: string) => void;
  triggerNotification?: (text: string, e?: any) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onBack,
  onNavigateModule,
  triggerNotification
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Base Unificada de Notificaciones y Registros
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([
    {
      id: 'NOTIF-01',
      category: 'ANNOUNCEMENTS',
      title: '🎁 RECOMPENSA DE EVENTO COLOIDAL',
      message: 'El Staff Imperial ha distribuido suministros de apoyo para todas las flotas de vanguardia activas.',
      timestamp: 'HACE 10 MIN',
      isRead: false,
      alertLevel: 'success',
      reward: {
        type: 'resource',
        label: 'PAQUETE DE INICIO',
        amount: '+1,000 CRISTALES & 500 GD COINS',
        claimed: false
      }
    },
    {
      id: 'NOTIF-02',
      category: 'SYSTEM',
      title: '🤖 ACTUALIZACIÓN DEL MÓDULO A.M.I.',
      message: 'Se han recalibrado las pasivas del nódulo sináptico C.A.N. Revisa la matriz del operador.',
      timestamp: 'HACE 1 HORA',
      isRead: false,
      alertLevel: 'info',
      redirection: {
        label: 'IR A MÓDULO A.M.I.',
        targetModule: 'AMI'
      }
    },
    {
      id: 'NOTIF-03',
      category: 'EXPEDITIONS',
      title: '🚀 ALERTA DE FLOTA EN VUELO (F.I.F.)',
      message: 'Tu flota de exploración ha completado el salto hiperespacial y se encuentra recolectando datos.',
      timestamp: 'HACE 2 HORAS',
      isRead: true,
      alertLevel: 'warning',
      redirection: {
        label: 'IR A EXPEDICIONES EN VUELO (F.I.F.)',
        targetModule: 'FIF'
      }
    },
    {
      id: 'LOG-01',
      category: 'GD',
      title: 'CONSUMO DE GD COINS',
      message: 'Deducción automática de 1,500 GD Coins por compra en Marketplace.',
      timestamp: 'HACE 4 HORAS',
      isRead: true,
      alertLevel: 'info'
    },
    {
      id: 'LOG-02',
      category: 'RESOURCES',
      title: 'RESUMEN DE PRODUCCIÓN DIARIA',
      message: 'Generación por Ticks: +12.5K Metal, +8.2K Cristal, +3.1K Deuterio.',
      timestamp: 'HACE 1 DÍA',
      isRead: true,
      alertLevel: 'success'
    },
    {
      id: 'LOG-03',
      category: 'CARTOGRAPHIC',
      title: 'DISPOSITIVO CARTOGRÁFICO',
      message: 'Has recibido 1 mensaje codificado desde el sistema Cartographic. Accede al terminal C.A.N. para descifrar la ubicación.',
      timestamp: 'HACE 2 DÍAS',
      isRead: true,
      alertLevel: 'info'
    }
  ]);

  // Reclamar Recompensa
  const handleClaimReward = (id: string) => {
    setNotificationsList(prev => prev.map(item => {
      if (item.id === id && item.reward) {
        return {
          ...item,
          reward: { ...item.reward, claimed: true }
        };
      }
      return item;
    }));
    if (triggerNotification) triggerNotification('🎉 RECOMPENSA RECLAMADA Y TRANSFERIDA A TU VAULT');
  };

  // Marcar como Leído
  const handleMarkAsRead = (id: string) => {
    setNotificationsList(prev => prev.map(item => item.id === id ? { ...item, isRead: true } : item));
  };

  const handleMarkAllRead = () => {
    setNotificationsList(prev => prev.map(item => ({ ...item, isRead: true })));
    if (triggerNotification) triggerNotification('✓ TODAS LAS NOTIFICACIONES MARCADAS COMO LEÍDAS');
  };

  // Filtrado por Categoría y Búsqueda
  const getFilteredItems = () => {
    return notificationsList.filter(item => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.message.toLowerCase().includes(q);
      }

      return true;
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-[#080b0e] border border-cyan-500/30 p-5 rounded-2xl shadow-2xl relative overflow-hidden font-mono text-left select-none flex flex-col gap-4">
      
      {/* ─── ENCABEZADO SUPERIOR SÓLIDO Y COMPACTO ─── */}
      <div className="w-full bg-[#05070a] border border-cyan-500/30 p-3.5 rounded-xl flex flex-row justify-between items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="p-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-left">
            <span className="text-[7.5px] text-cyan-400 font-bold uppercase tracking-widest block leading-none">
              SISTEMA DE COMUNICACIONES TÁCTICAS
            </span>
            <h1 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mt-0.5">
              <Bell className="w-4 h-4 text-cyan-400 animate-pulse" />
              CENTRO DE NOTIFICACIONES
            </h1>
          </div>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-3 py-1.5 bg-[#0a0f14] hover:bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-[8px] font-bold uppercase rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>MARCAR TODO COMO LEÍDO</span>
        </button>
      </div>

      {/* ─── CONTENIDO EN 2 COLUMNAS (SIDEBAR VERTICAL Y CATÁLOGO) ─── */}
      <div className="w-full flex flex-col md:flex-row gap-3.5 items-start">
        
        {/* ─── PANEL IZQUIERDO: CATEGORÍAS & BÚSQUEDA ─── */}
        <div className="w-full md:w-56 shrink-0 bg-[#05070a] border border-cyan-500/20 p-3 rounded-xl flex flex-col gap-2.5">
          
          {/* Buscador */}
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-cyan-500" />
            <input
              type="text"
              placeholder="BUSCAR MENSAJES..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0f14] border border-cyan-950 rounded-lg pl-7 pr-2.5 py-1.5 text-[8px] text-cyan-200 placeholder-zinc-600 outline-none uppercase font-mono focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="h-[1px] w-full bg-cyan-950/80 my-0.5" />

          {/* Header Categorías */}
          <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
            <Filter className="w-3 h-3 text-cyan-400" />
            <span>CATEGORÍAS</span>
          </div>

          {/* Lista de Botones */}
          <div className="flex flex-col gap-1 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-950">
            {['ALL', 'ANNOUNCEMENTS', 'EXPEDITIONS', 'MARKET', 'ALLIANCE', 'SYSTEM', 'GD', 'CARTOGRAPHIC', 'RESOURCES'].map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = notificationsList.filter(n => cat === 'ALL' || n.category === cat).length;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-[8px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center justify-between border ${
                    isSelected
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.2)] font-black'
                      : 'bg-[#0a0f14] text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-[#0e1620]'
                  }`}
                >
                  <span className="truncate">{cat}</span>
                  <span className={`text-[7.5px] px-1.5 py-0.2 rounded font-black ${
                    isSelected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-black text-zinc-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

        </div>

        {/* ─── LADO DERECHO: CATÁLOGO DE TARJETAS / GRID DINÁMICO ─── */}
        <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-cyan-950">
          {getFilteredItems().length === 0 ? (
            <div className="col-span-full p-12 text-center text-zinc-500 text-[10px] uppercase tracking-widest bg-[#05070a] border border-cyan-500/10 rounded-xl">
              NO HAY NOTIFICACIONES EN ESTA CATEGORÍA
            </div>
          ) : (
            getFilteredItems().map((item) => (
              <div
                key={item.id}
                onClick={() => handleMarkAsRead(item.id)}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 relative cursor-pointer group min-h-[140px] ${
                  !item.isRead 
                    ? 'bg-[#050910] border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.15)] hover:border-cyan-400' 
                    : 'bg-[#05070a] border-cyan-950/80 hover:border-cyan-800'
                }`}
              >
                {/* Encabezado de la Tarjeta */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border ${
                      item.alertLevel === 'danger' ? 'bg-red-950 text-red-400 border-red-800' :
                      item.alertLevel === 'warning' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                      item.alertLevel === 'success' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                      'bg-cyan-950 text-cyan-300 border-cyan-800'
                    }`}>
                      {item.category}
                    </span>
                    {!item.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    )}
                  </div>

                  <span className="text-[7.5px] text-zinc-500 font-mono shrink-0">{item.timestamp}</span>
                </div>

                {/* Título y Mensaje */}
                <div className="flex flex-col gap-1 text-left flex-1">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-wider group-hover:text-cyan-200 transition-colors line-clamp-1">
                    {item.title}
                  </h4>

                  <p className="text-[8.5px] text-zinc-300 leading-snug font-sans normal-case line-clamp-3">
                    {item.message}
                  </p>
                </div>

                {/* Recompensas o Acciones Integradas en el Pie de la Tarjeta */}
                {item.reward && (
                  <div className="p-2 bg-[#020305] border border-amber-500/40 rounded-lg flex items-center justify-between gap-2 mt-auto">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <div className="p-1 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 shrink-0">
                        <Gift className="w-3.5 h-3.5 animate-pulse" />
                      </div>
                      <div className="flex flex-col text-left truncate">
                        <span className="text-[7px] text-amber-400 font-bold uppercase truncate">{item.reward.label}</span>
                        <span className="text-[8.5px] text-white font-extrabold uppercase truncate">{item.reward.amount}</span>
                      </div>
                    </div>

                    {item.reward.claimed ? (
                      <span className="text-[7.5px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-1 rounded flex items-center gap-1 uppercase shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> RECLAMADO
                      </span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleClaimReward(item.id); }}
                        className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-110 text-black font-black text-[8px] uppercase rounded shadow-[0_0_8px_rgba(245,158,11,0.3)] cursor-pointer transition-all animate-pulse shrink-0"
                      >
                        RECLAMAR
                      </button>
                    )}
                  </div>
                )}

                {item.redirection && !item.reward && (
                  <div className="flex justify-end mt-auto pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigateModule) onNavigateModule(item.redirection!.targetModule);
                        if (triggerNotification) triggerNotification(`🚀 REDIRIGIENDO A MÓDULO: ${item.redirection!.targetModule}`);
                      }}
                      className="w-full py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[8px] font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all group-hover:border-cyan-400"
                    >
                      <span>{item.redirection.label}</span>
                      <ExternalLink className="w-3 h-3 text-cyan-400" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
};