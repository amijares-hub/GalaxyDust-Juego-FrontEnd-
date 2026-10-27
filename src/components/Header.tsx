import React, { useState, useRef, useEffect } from 'react';
import { Bell, Settings, User, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  userProfile?: any;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  utcTime?: string;
}

// 🖼️ HELPER: Garantiza que la URL del avatar sea siempre pública y funcional
// Respaldo garantizado vía CDN que NUNCA devuelve 404
const SAFE_FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=200&auto=format&fit=crop';

const resolveAvatarUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return SAFE_FALLBACK_AVATAR;
  }
  const clean = rawUrl.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/galaxy-assets/${clean.replace(/^\//, '')}`;
};

// 🎯 COMPROBACIÓN FLEXIBLE DE PESTAÑAS (SOPORTA MAYÚSCULAS/MINÚSCULAS Y ALIAS)
const isTabActive = (currentActive: string = '', tabId: string): boolean => {
  const cleanActive = currentActive.trim().toUpperCase();
  const cleanTab = tabId.trim().toUpperCase();

  if (cleanActive === cleanTab) return true;

  if (cleanTab === 'MARKET') {
    return ['MARKET', 'MARKETPLACE', 'MARKETPLACE_P2P', 'P2P'].includes(cleanActive);
  }
  if (cleanTab === 'EXPEDITIONS' || cleanTab === 'EXPEDITION') {
    return ['EXPEDITION', 'EXPEDITIONS', 'FLIGHTS', 'EXPEDICION', 'EXPEDICIONES'].includes(cleanActive);
  }
  if (cleanTab === 'CAN') {
    return ['CAN', 'C.A.N.', 'C.A.N'].includes(cleanActive);
  }
  if (cleanTab === 'INVENTORY') {
    return ['INVENTORY', 'INVENTARIO'].includes(cleanActive);
  }
  if (cleanTab === 'MISSION') {
    return ['MISSION', 'MISSIONS', 'MISION', 'MISIONES'].includes(cleanActive);
  }
  if (cleanTab === 'MAIN') {
    return ['MAIN', 'HOME', 'INICIO'].includes(cleanActive);
  }
  if (cleanTab === 'PHANTOM') {
    return ['PHANTOM', 'PHANTOM_STATION'].includes(cleanActive);
  }

  return false;
};

export const Header: React.FC<HeaderProps> = ({
  userProfile,
  activeTab = 'MAIN',
  onSelectTab,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onOpenSettings,
  onOpenProfile,
  utcTime
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'es').startsWith('en') ? 'en' : 'es';

  const [openDropdown, setOpenDropdown] = useState<'MONEDA' | 'RECURSOS' | null>(null);

  const currencyRef = useRef<HTMLDivElement>(null);
  const resourceRef = useRef<HTMLDivElement>(null);

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

  // 🌐 RESOLUCIÓN FLEXIBLE DE MONEDAS DEL USUARIO (Soporta singular/plural de DB)
  const currencies = [
    { label: 'GD COIN', value: userProfile?.gd_coin ?? userProfile?.gd_coins ?? 0, color: 'text-amber-300' },
    { label: 'QUANTUM CREDIT', value: userProfile?.quantum_credits ?? userProfile?.quantum_credit ?? 0, color: 'text-cyan-300' },
    { label: 'PHANTOM COIN', value: userProfile?.phantom_coin ?? userProfile?.phantom_coins ?? 0, color: 'text-purple-300' },
    { label: 'HALLOWEEN COIN', value: userProfile?.halloween_coins ?? userProfile?.halloween_coin ?? 0, color: 'text-orange-400' },
    { label: 'XMAS COIN', value: userProfile?.xmas_coins ?? userProfile?.xmas_coin ?? 0, color: 'text-red-400' },
    { label: 'VALENTINE COIN', value: userProfile?.valentine_coins ?? userProfile?.valentine_coin ?? 0, color: 'text-pink-400' }
  ];

  // 🌐 RESOLUCIÓN FLEXIBLE DE RECURSOS DEL USUARIO
  const resources = [
    { label: 'METAL', value: userProfile?.metal ?? 0, color: 'text-cyan-200' },
    { label: 'CRISTAL', value: userProfile?.crystal ?? 0, color: 'text-purple-200' },
    { label: 'DEUTERIO', value: userProfile?.deuterium ?? 0, color: 'text-blue-300' },
    { label: 'MATERIA OSCURA', value: userProfile?.dark_matter ?? 0, color: 'text-indigo-400' },
    { label: 'OMNIPLATE', value: userProfile?.omniplate ?? 0, color: 'text-emerald-300' },
    { label: 'ORICHALTRON', value: userProfile?.orichaltron ?? 0, color: 'text-yellow-300' },
    { label: 'LUNAR FIBER', value: userProfile?.lunar_fiber ?? 0, color: 'text-slate-200' },
    { label: 'INFINITE CORE', value: userProfile?.infinite_core ?? userProfile?.infinity_core ?? 0, color: 'text-teal-300' },
    { label: 'PRIMAL TOKEN', value: userProfile?.primal_token ?? 0, color: 'text-amber-400' },
    { label: 'XENOPLASM', value: userProfile?.xenoplasm ?? 0, color: 'text-green-400' },
    { label: 'ORGANIUM', value: userProfile?.organium ?? 0, color: 'text-lime-300' },
    { label: 'MANA', value: userProfile?.mana ?? 0, color: 'text-blue-400' },
    { label: 'WOOD', value: userProfile?.wood ?? 0, color: 'text-amber-600' }
  ];

  const tabs = [
    { id: 'MAIN', label: t('nav.main') },
    { id: 'CAN', label: t('nav.can') },
    { id: 'EXPEDITIONS', label: t('nav.expedition') },
    { id: 'INVENTORY', label: t('nav.inventory') },
    { id: 'MISSION', label: t('nav.mission'), locked: true },
  ];

  return (
    <header
      className="w-full h-11 sm:h-12 bg-[#05080c]/98 border-b border-cyan-500/40 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 select-none z-50 font-mono backdrop-blur-md sticky top-0 shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
      style={{
        paddingLeft: 'max(10px, env(safe-area-inset-left))',
        paddingRight: 'max(10px, env(safe-area-inset-right))',
      }}
    >
      
      {/* 1. PERFIL DEL COMANDANTE (IZQUIERDA) */}
      <div
        className="flex items-center gap-2 shrink-0 cursor-pointer group"
        onClick={() => onOpenProfile && onOpenProfile()}
        title="Ver Perfil"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-black border-2 border-cyan-400 group-hover:border-cyan-300 flex items-center justify-center text-cyan-300 font-bold shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all overflow-hidden shrink-0">
          <img
            src={resolveAvatarUrl(userProfile?.avatar_url)}
            alt="Piloto Avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== SAFE_FALLBACK_AVATAR) {
                target.src = SAFE_FALLBACK_AVATAR;
              }
            }}
          />
        </div>
        <div className="flex flex-col text-left leading-tight">
          <span className="text-xs sm:text-sm font-bold font-mono tracking-wider text-white group-hover:text-cyan-200 uppercase truncate max-w-[85px] sm:max-w-[140px]">
            {userProfile?.username || 'COMANDANTE'}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-mono font-bold">
            <span>LVL {userProfile?.level || 1}</span>
            {utcTime && (
              <span className="text-zinc-500 hidden md:inline">| {utcTime}</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. PESTAÑAS DE NAVEGACIÓN CENTRALES */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-1 shrink min-w-0 h-full flex-1">
        {tabs.map(tab => {
          const isActive = isTabActive(activeTab, tab.id);
          const isLocked = (tab as any).locked;

          if (isLocked) {
            return (
              <button
                key={tab.id}
                disabled
                className="text-xs sm:text-sm font-bold tracking-wider px-3 sm:px-4 py-1.5 rounded-md uppercase whitespace-nowrap shrink-0 bg-black/40 text-zinc-600 border border-zinc-800/60 cursor-not-allowed opacity-50 flex items-center gap-1.5 select-none"
              >
                <Lock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab && onSelectTab(tab.id)}
              className={`text-xs sm:text-sm font-bold tracking-wider px-3 sm:px-4 py-1.5 rounded-md uppercase transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)] font-black'
                  : 'bg-black/50 text-zinc-400 border border-transparent hover:text-white hover:bg-cyan-950/40 hover:border-cyan-800/40'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. BALANCES Y SELECTOR DE IDIOMA (DERECHA) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        
        {/* DROPDOWN MONEDA */}
        <div className="relative" ref={currencyRef}>
          <button
            onClick={() => toggleDropdown('MONEDA')}
            className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
              openDropdown === 'MONEDA'
                ? 'bg-amber-950/90 text-amber-300 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                : 'bg-black/60 text-amber-400 border-amber-900/60 hover:border-amber-500/80 hover:bg-amber-950/30'
            }`}
          >
            {t('nav.currency')}
          </button>

          {openDropdown === 'MONEDA' && (
            <div className="absolute right-0 mt-1.5 w-48 sm:w-60 bg-[#05080c]/98 border border-amber-500/50 rounded-xl p-2 shadow-[0_0_20px_rgba(0,0,0,0.9)] z-50 backdrop-blur-md space-y-1">
              <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                {currencies.map((curr, idx) => (
                  <div key={idx} className="flex justify-between items-center px-2 py-1 bg-black/60 rounded border border-amber-950/60 text-[8.5px] sm:text-[9.5px]">
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
            className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
              openDropdown === 'RECURSOS'
                ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                : 'bg-black/60 text-cyan-300 border-cyan-900/60 hover:border-cyan-500/80 hover:bg-cyan-950/30'
            }`}
          >
            {t('nav.resources')}
          </button>

          {openDropdown === 'RECURSOS' && (
            <div className="absolute right-0 mt-1.5 w-52 sm:w-64 bg-[#05080c]/98 border border-cyan-500/50 rounded-xl p-2 shadow-[0_0_20px_rgba(0,0,0,0.9)] z-50 backdrop-blur-md space-y-1">
              <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                {resources.map((res, idx) => (
                  <div key={idx} className="flex justify-between items-center px-2 py-1 bg-black/60 rounded border border-cyan-950/60 text-[8.5px] sm:text-[9.5px]">
                    <span className="text-zinc-400 uppercase font-bold">{res.label}</span>
                    <span className={`font-mono font-bold ${res.color}`}>{(res.value || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </header>
  );
};

export default Header;