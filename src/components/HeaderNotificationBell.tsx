import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "../lib/supabase";

interface HeaderNotificationBellProps {
  onClick: () => void;
  isActive: boolean;
}

export const HeaderNotificationBell: React.FC<HeaderNotificationBellProps> = ({ onClick, isActive }) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // ─── CONSULTAR NOTIFICACIONES NO LEÍDAS ───
  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '9abc737e-9c3d-4349-a976-59af24f51f4d';

      const { count, error } = await supabase
        .from('user_notifications')
        .select('notification_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    } catch (err) {
      console.error("Error obteniendo conteo de notificaciones:", err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Reconsultar periódicamente cada 10 segundos
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={() => {
        onClick();
        fetchUnreadCount(); // Refrescar al hacer clic
      }}
      className={`relative p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer shadow-lg group ${
        isActive
          ? "bg-cyan-950/90 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-105"
          : "bg-black/80 text-cyan-400 border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-950/80 hover:scale-110"
      }`}
      title="Notificaciones"
    >
      <Bell className="w-5 h-5 text-cyan-400 animate-pulse" />
      
      {/* CÍRCULO ROJO DINÁMICO */}
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-mono text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-black animate-bounce">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}

      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center bg-black/90 border border-cyan-500/60 text-cyan-300 text-[8px] font-mono font-bold uppercase px-2 py-1 rounded shadow-2xl whitespace-nowrap pointer-events-none">
        NOTIFICACIONES
      </div>
    </button>
  );
};
