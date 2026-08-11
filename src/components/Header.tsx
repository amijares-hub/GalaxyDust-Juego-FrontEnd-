import React, { useState, useRef, useEffect } from 'react';
import { Bell, Settings, User } from 'lucide-react';

interface HeaderProps {
  userProfile?: any;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userProfile,
  activeTab = 'MAIN',
  onSelectTab,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onOpenSettings,
  onOpenProfile
}) => {
  const [openDropdown, setOpenDropdown] = useState<'MONEDA' | 'RECURSOS' | null>(null);

  const currencyRef = useRef<HTMLDivElement>(null);
  const resourceRef = useRef<HTMLDivElement>(null);

  // Cerrar desplegables al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        currencyRef.current && !currencyRef.current.contains(event.target as Node) &&
        resourceRef.current && !resourceRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (type: 'MONEDA' | 'RECURSOS') => {
    setOpenDropdown(prev => (prev === type ? null : type));
  };

  const currencies = [
    { label: 'GD COIN', value: userProfile?.gd_coin || 0, color: 'text-amber-300' },
    { label: 'QUANTUM CREDIT', value: userProfile?.quantum_credit || 0, color: 'text-cyan-300' },
    { label: 'PHANTOM COIN', value: userProfile?.phantom_coin || 0, color: 'text-purple-300' },
    { label: 'HALLOWEEN COIN', value: userProfile?.halloween_coin || 0, color: 'text-orange-400' },
    { label: 'XMAS COIN', value: userProfile?.xmas_coin || 0, color: 'text-red-400' },
    { label: 'VALENTINE COIN', value: userProfile?.valentine_coin || 0, color: 'text-pink-400' }
  ];

  const resources = [
    { label: 'METAL', value: userProfile?.metal || 0, color: 'text-cyan-200' },
    { label: 'CRISTAL', value: userProfile?.crystal || 0, color: 'text-purple-200' },
    { label: 'DEUTERIO', value: userProfile?.deuterium || 0, color: 'text-blue-300' },
    { label: 'MATERIA OSCURA', value: userProfile?.dark_matter || 0, color: 'text-indigo-400' },
    { label: 'OMNIPLATE', value: userProfile?.omniplate || 0, color: 'text-emerald-300' },
    { label: 'ORICHALTRON', value: userProfile?.orichaltron || 0, color: 'text-yellow-300' },
    { label: 'LUNAR FIBER', value: userProfile?.lunar_fiber || 0, color: 'text-slate-200' },
    { label: 'INFINITE CORE', value: userProfile?.infinite_core || 0, color: 'text-teal-300' }
  ];

  const tabs = [
    { id: 'MAIN', label: 'MAIN' },
    { id: 'CAN', label: 'C.A.N.' },
    { id: 'EXPEDITIONS', label: 'EXPEDITION' },
    { id: 'MARKET', label: 'MARKET' },
    { id: 'PHANTOM', label: 'PHANTOM' },
    { id: 'INVENTORY', label: 'INVENTORY' },
    { id: 'MISSION', label: 'MISSION' },
  ];

  return (
    <header className="w-full bg-[#05080c]/98 border-b border-cyan-500/40 px-2 sm:px-3 py-1 flex items-center justify-between gap-1 sm:gap-2 shrink-0 select-none z-50 font-mono backdrop-blur-md sticky top-0 shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
      
      {/* ─── 1. ESQUINA IZQUIERDA: PERFIL / AVATAR ─── */}
      <div
        className="flex items-center gap-1.5 shrink-0 cursor-pointer group"
        onClick={() => onOpenProfile && onOpenProfile()}
        title="Ver Perfil"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-950 border border-cyan-400/80 group-hover:border-cyan-300 flex items-center justify-center text-cyan-300 font-bold shadow-[0_0_8px_rgba(34,211,238,0.3)] transition-all overflow-hidden">
          {userProfile?.avatar_url ? (
            <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <User className="w-3.5 h-3.5 text-cyan-400" />
          )}
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[8.5px] sm:text-[10px] font-black text-white group-hover:text-cyan-200 uppercase tracking-wider truncate max-w-[70px] sm:max-w-[120px]">
            {userProfile?.username || 'COMANDANTE'}
          </span>
          <span className="text-[7px] sm:text-[8px] font-mono font-bold text-cyan-400 uppercase">
            LVL {userProfile?.level || 1}
          </span>
        </div>
      </div>

      {/* ─── 2. CENTRO: PESTAÑAS (Scroll Horizontal Silencioso) ─── */}
      <div className="flex-1 flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none px-1 py-0.5 min-w-0">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab && onSelectTab(tab.id)}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-[8px] sm:text-[9.5px] font-bold tracking-widest uppercase transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                isActive
                  ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)] font-black'
                  : 'bg-black/50 text-zinc-400 border-transparent hover:text-white hover:bg-cyan-950/30'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── 3. ESQUINA DERECHA: MONEDA, RECURSOS Y CONTROLES ─── */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        
        {/* DROPDOWN MONEDA */}
        <div className="relative" ref={currencyRef}>
          <button
            onClick={() => toggleDropdown('MONEDA')}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-[8px] sm:text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
              openDropdown === 'MONEDA'
                ? 'bg-amber-950/90 text-amber-300 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                : 'bg-black/60 text-amber-400 border-amber-900/60 hover:border-amber-500/80 hover:bg-amber-950/30'
            }`}
          >
            Moneda
          </button>

          {openDropdown === 'MONEDA' && (
            <div className="absolute right-0 mt-1.5 w-44 sm:w-56 bg-[#05080c]/98 border border-amber-500/50 rounded-xl p-2 shadow-[0_0_20px_rgba(0,0,0,0.9)] z-50 backdrop-blur-md space-y-1.5">
              <span className="text-[7px] text-amber-400/80 font-black uppercase tracking-widest block pb-1 border-b border-amber-900/40 text-left px-1">
                // SALDO DE MONEDAS
              </span>
              <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                {currencies.map((curr, idx) => (
                  <div key={idx} className="flex justify-between items-center px-1.5 py-0.5 bg-black/60 rounded border border-amber-950/60 text-[8px] sm:text-[9px]">
                    <span className="text-zinc-400 uppercase font-bold">{curr.label}</span>
                    <span className={`font-mono font-bold ${curr.color}`}>{(curr.value || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* DROPDOWN RECURSOS */}
        <div className="relative" ref={resourceRef}>
          <button
            onClick={() => toggleDropdown('RECURSOS')}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-[8px] sm:text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
              openDropdown === 'RECURSOS'
                ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                : 'bg-black/60 text-cyan-300 border-cyan-900/60 hover:border-cyan-500/80 hover:bg-cyan-950/30'
            }`}
          >
            Recursos
          </button>

          {openDropdown === 'RECURSOS' && (
            <div className="absolute right-0 mt-1.5 w-48 sm:w-60 bg-[#05080c]/98 border border-cyan-500/50 rounded-xl p-2 shadow-[0_0_20px_rgba(0,0,0,0.9)] z-50 backdrop-blur-md space-y-1.5">
              <span className="text-[7px] text-cyan-400/80 font-black uppercase tracking-widest block pb-1 border-b border-cyan-900/40 text-left px-1">
                // RESERVA DE RECURSOS
              </span>
              <div className="space-y-1 max-h-52 overflow-y-auto custom-scrollbar">
                {resources.map((res, idx) => (
                  <div key={idx} className="flex justify-between items-center px-1.5 py-0.5 bg-black/60 rounded border border-cyan-950/60 text-[8px] sm:text-[9px]">
                    <span className="text-zinc-400 uppercase font-bold">{res.label}</span>
                    <span className={`font-mono font-bold ${res.color}`}>{(res.value || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* NOTIFICACIONES */}
        <button
          onClick={onOpenNotifications}
          className="relative p-1 sm:p-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded-md transition-all cursor-pointer"
          title="Notificaciones"
        >
          <Bell className="w-3.5 h-3.5 text-cyan-300" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center animate-pulse">
              {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* AJUSTES */}
        <button
          onClick={onOpenSettings}
          className="p-1 sm:p-1.5 bg-black/60 hover:bg-cyan-950 border border-cyan-900 text-zinc-400 hover:text-white rounded-md transition-all cursor-pointer"
          title="Ajustes"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

      </div>

    </header>
  );
};

export default Header;