import React from 'react';
import { Bell, Shield, Coins, Database, Zap, Settings, User } from 'lucide-react';

interface HeaderProps {
  userProfile?: any;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userProfile,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onOpenSettings
}) => {
  return (
    <header className="w-full bg-[#05080c]/95 border-b border-cyan-500/30 px-2 sm:px-4 py-1 flex items-center justify-between gap-2 shrink-0 select-none z-40 backdrop-blur-md h-10 sm:h-12 max-h-[10vh]">
      
      {/* 1. USUARIO Y NIVEL (IZQUIERDA) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-950 border border-cyan-400/60 flex items-center justify-center text-cyan-300 font-bold text-[9px] shadow-[0_0_8px_rgba(34,211,238,0.2)]">
          <User className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[9px] sm:text-[10px] font-extrabold text-white uppercase tracking-wider truncate max-w-[80px] sm:max-w-[120px]">
            {userProfile?.username || 'COMANDANTE'}
          </span>
          <span className="text-[7px] sm:text-[8px] font-mono text-cyan-400 uppercase">
            LVL {userProfile?.level || 1}
          </span>
        </div>
      </div>

      {/* 2. BARRA DE RECURSOS RESPONSIVE CON SCROLL INTERNO DISCRETO (CENTRO) */}
      <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-3 overflow-x-auto custom-scrollbar px-1 py-0.5 max-w-[60%]">
        {/* Metal */}
        <div className="flex items-center gap-1 bg-black/60 border border-cyan-900/60 px-1.5 py-0.5 rounded-md shrink-0 text-[8px] sm:text-[9.5px] font-mono">
          <Database className="w-3 h-3 text-cyan-400" />
          <span className="text-zinc-400 hidden md:inline">MET:</span>
          <span className="text-cyan-200 font-bold">{(userProfile?.metal || 0).toLocaleString()}</span>
        </div>

        {/* Cristal */}
        <div className="flex items-center gap-1 bg-black/60 border border-purple-900/60 px-1.5 py-0.5 rounded-md shrink-0 text-[8px] sm:text-[9.5px] font-mono">
          <Zap className="w-3 h-3 text-purple-400" />
          <span className="text-zinc-400 hidden md:inline">CRI:</span>
          <span className="text-purple-200 font-bold">{(userProfile?.crystal || 0).toLocaleString()}</span>
        </div>

        {/* GD Coin / Moneda */}
        <div className="flex items-center gap-1 bg-black/60 border border-amber-900/60 px-1.5 py-0.5 rounded-md shrink-0 text-[8px] sm:text-[9.5px] font-mono">
          <Coins className="w-3 h-3 text-amber-400" />
          <span className="text-zinc-400 hidden md:inline">GD:</span>
          <span className="text-amber-300 font-bold">{(userProfile?.gd_coin || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* 3. BOTONES DE ACCIÓN (DERECHA) */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Notificaciones */}
        <button
          onClick={onOpenNotifications}
          className="relative p-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded-lg transition-all cursor-pointer"
          title="Notificaciones"
        >
          <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center animate-pulse">
              {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Ajustes */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 bg-black/60 hover:bg-cyan-950 border border-cyan-900 text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer"
          title="Ajustes"
        >
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

    </header>
  );
};
