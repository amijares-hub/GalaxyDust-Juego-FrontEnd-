import React, { useState } from 'react';
import { 
  ChevronDown, ChevronUp, Bell, Settings, User, 
  Database, Zap, Coins, Shield, Sparkles 
} from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <header className="w-full bg-[#05080c]/98 border-b border-cyan-500/40 font-mono text-left select-none sticky top-0 z-50 backdrop-blur-md transition-all duration-300">
      
      {/* ─── BARRA COMPACTA PERMANENTE (SOLO 32px-36px DE ALTO) ─── */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-2 py-1 flex items-center justify-between gap-2 cursor-pointer hover:bg-cyan-950/40 transition-colors"
      >
        {/* Usuario + Estado Rápido */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-6 h-6 rounded bg-cyan-950 border border-cyan-400/80 flex items-center justify-center text-cyan-300 font-bold text-[9px] shadow-[0_0_6px_rgba(34,211,238,0.3)]">
            <User className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="text-[9.5px] font-black text-white uppercase tracking-wider truncate max-w-[100px]">
            {userProfile?.username || 'COMANDANTE'}
          </span>
          <span className="text-[7.5px] bg-cyan-950 border border-cyan-800 text-cyan-300 px-1 py-0.2 rounded font-mono font-bold">
            LVL {userProfile?.level || 1}
          </span>
        </div>

        {/* Resumen Rápido de Moneda Principal (Vista previa) */}
        <div className="flex items-center gap-2 text-[8.5px] font-bold">
          <div className="flex items-center gap-1 text-amber-300 bg-black/60 px-1.5 py-0.5 rounded border border-amber-900/60">
            <Coins className="w-3 h-3 text-amber-400" />
            <span>{(userProfile?.gd_coin || 0).toLocaleString()} GD</span>
          </div>
        </div>

        {/* Botón Indicador de Acordeón */}
        <div className="flex items-center gap-1 shrink-0 bg-cyan-950/80 border border-cyan-500/50 px-2 py-0.5 rounded text-[8px] text-cyan-300 font-bold uppercase tracking-wider">
          <span>{isExpanded ? 'CERRAR' : 'RECURSOS'}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
          )}
        </div>
      </div>

      {/* ─── PANEL ACORDEÓN DESPLEGABLE (MENÚ Y BILLETERA HARMONIOSA) ─── */}
      <div 
        className={`w-full overflow-hidden transition-all duration-300 ease-in-out bg-[#03060a] border-t border-cyan-900/50 ${
          isExpanded ? 'max-h-[280px] p-2 sm:p-3 opacity-100' : 'max-h-0 p-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-5xl mx-auto flex flex-col gap-2.5">
          
          {/* GRIDA DE RECURSOS Y MONEDAS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[8.5px] font-mono">
            
            {/* Metal */}
            <div className="bg-[#050a0f] border border-cyan-900/80 p-1.5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-1 text-zinc-400">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>METAL:</span>
              </div>
              <span className="text-cyan-200 font-bold">{(userProfile?.metal || 0).toLocaleString()}</span>
            </div>

            {/* Cristal */}
            <div className="bg-[#050a0f] border border-purple-900/80 p-1.5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-1 text-zinc-400">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>CRISTAL:</span>
              </div>
              <span className="text-purple-200 font-bold">{(userProfile?.crystal || 0).toLocaleString()}</span>
            </div>

            {/* Deuterio */}
            <div className="bg-[#050a0f] border border-blue-900/80 p-1.5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-1 text-zinc-400">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>DEUTERIO:</span>
              </div>
              <span className="text-blue-200 font-bold">{(userProfile?.deuterium || 0).toLocaleString()}</span>
            </div>

            {/* GD Coins */}
            <div className="bg-[#050a0f] border border-amber-900/80 p-1.5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-1 text-zinc-400">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>GD COIN:</span>
              </div>
              <span className="text-amber-300 font-bold">{(userProfile?.gd_coin || 0).toLocaleString()}</span>
            </div>

          </div>

          {/* OPCIONES DE PANEL Y ACCIONES HARMONIOSAS */}
          <div className="flex items-center justify-between pt-1 border-t border-cyan-950">
            <div className="flex items-center gap-2 text-[8px] text-zinc-400 font-bold uppercase">
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>FACCIÓN: {userProfile?.faction || 'ALACRÁN'}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Botón Notificaciones */}
              <button
                onClick={() => {
                  if (onOpenNotifications) onOpenNotifications();
                  setIsExpanded(false);
                }}
                className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 rounded-lg text-[8.5px] font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-cyan-400" />
                <span>NOTIFICACIONES</span>
                {unreadNotificationsCount > 0 && (
                  <span className="bg-red-600 text-white text-[7px] font-black px-1 rounded-full">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Botón Ajustes */}
              <button
                onClick={() => {
                  if (onOpenSettings) onOpenSettings();
                  setIsExpanded(false);
                }}
                className="px-2.5 py-1 bg-black/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg text-[8.5px] font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span>AJUSTES</span>
              </button>
            </div>
          </div>

        </div>
      </div>

    </header>
  );
};