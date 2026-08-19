import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Bell,
  CheckCheck,
  Trash2,
  Inbox,
  ShieldAlert,
  Compass,
  Radio,
  ExternalLink,
  CheckCircle2,
  Clock,
  Rocket,
  Skull
} from "lucide-react";
import { Button } from "./ui/joly-button";
import { useNotifications } from "../hooks/useNotifications";
export type { NotificationRecord } from "../hooks/useNotifications";

interface NotificationsViewProps {
  triggerNotification?: (text: string, e?: any) => void;
  onBack: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  triggerNotification,
  onBack
}) => {
  const {
    notifications,
    unreadCount,
    loading: isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [filterRead, setFilterRead] = useState<"ALL" | "UNREAD">("ALL");

  // 🛡️ Acciones delegadas al hook maestro
  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
    if (triggerNotification) triggerNotification("✓ NOTIFICACIÓN MARCADA COMO LEÍDA");
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    if (triggerNotification) triggerNotification("✓ TODAS LAS NOTIFICACIONES MARCADAS COMO LEÍDAS");
  };

  const handleDeleteNotification = async (notificationId: string) => {
    await deleteNotification(notificationId);
    if (triggerNotification) triggerNotification("🗑️ NOTIFICACIÓN ELIMINADA DE LA RED");
  };

  const filteredNotifications = useMemo(() => {
    let list = [...notifications];

    if (filterRead === "UNREAD") {
      list = list.filter((n) => !n.is_read);
    }

    if (activeTab !== "ALL") {
      list = list.filter(
        (n) => (n.box_type || n.category || "").toUpperCase().includes(activeTab.toUpperCase())
      );
    }

    return list;
  }, [notifications, activeTab, filterRead]);

  // unreadCount ya viene del hook

  const getCategoryIcon = (category: string, boxType: string, title?: string) => {
    const type = (boxType || category || "").toUpperCase();
    const t = (title || "").toUpperCase();

    if (t.includes("DESTRUIDA") || t.includes("DAÑO") || t.includes("ALERTA")) {
      return <Skull className="w-4 h-4 text-red-500 animate-pulse" />;
    }
    if (type.includes("SYSTEM")) return <Radio className="w-4 h-4 text-cyan-400" />;
    if (type.includes("EXPEDITION") || type.includes("EXPEDICION")) {
      if (t.includes("SALIDA") || t.includes("DESPLIEGUE")) return <Rocket className="w-4 h-4 text-cyan-400" />;
      return <Compass className="w-4 h-4 text-emerald-400" />;
    }
    if (type.includes("COMBAT") || type.includes("BATTLE")) return <ShieldAlert className="w-4 h-4 text-red-400" />;
    return <Inbox className="w-4 h-4 text-amber-400" />;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).toUpperCase();
    } catch (e) {
      return "RECIENTE";
    }
  };

  return (
    <div
      id="swgoh-notifications-screen"
      className="relative w-full max-w-5xl mx-auto bg-black text-white rounded-3xl border border-cyan-500/20 overflow-hidden font-sans select-none shadow-[0_0_40px_rgba(6,182,212,0.1)] p-3.5 sm:p-5 h-[calc(100vh-6rem)] max-h-[620px] flex flex-col"
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-600/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-600/[0.04] rounded-full blur-3xl pointer-events-none" />

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-cyan-800/25 pb-2.5 mb-2.5 gap-3 relative shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-950 to-neutral-900 border-2 border-cyan-400 text-white flex items-center justify-center hover:bg-cyan-900 transition-all cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.3)] hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-cyan-300 drop-shadow-[0_0_3px_cyan]" />
          </button>
          <div className="text-left">
            <h2 className="text-lg font-bold tracking-widest text-[#e8f1f5] uppercase font-sans flex items-center gap-2">
              COMUNICACIONES
              <span className="text-[8px] bg-cyan-950 font-mono text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40">
                TAC-NET FEED
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-xl text-[8.5px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
              Marcar todo como leído ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE PESTAÑAS Y FILTROS */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0a0f14]/85 border border-cyan-900/35 px-3 py-1.5 rounded-xl mb-2.5 shrink-0 font-mono text-[8.5px]">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {[
            { id: "ALL", label: "TODOS" },
            { id: "SYSTEM", label: "SISTEMA" },
            { id: "EXPEDITION", label: "EXPEDICIONES" },
            { id: "COMBAT", label: "COMBATE" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer font-bold ${
                activeTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.3)]"
                  : "bg-black/40 text-zinc-400 hover:text-white border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => setFilterRead("ALL")}
            className={`px-2.5 py-0.5 rounded uppercase tracking-wider transition-all cursor-pointer ${
              filterRead === "ALL" ? "text-cyan-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Ver Todas
          </button>
          <span className="text-zinc-700">|</span>
          <button
            onClick={() => setFilterRead("UNREAD")}
            className={`px-2.5 py-0.5 rounded uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
              filterRead === "UNREAD" ? "text-amber-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            No Leídas
            {unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* LISTA DE NOTIFICACIONES */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-cyan-500 py-16">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] font-mono tracking-widest uppercase animate-pulse">
              CONECTANDO CON SUB-RED DE NOTIFICACIONES...
            </span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500 text-[9.5px] font-mono uppercase tracking-widest py-16">
            <Bell className="w-8 h-8 text-zinc-700 mb-1" />
            <span>NO HAY REGISTROS EN ESTE CANAL</span>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <motion.div
              key={n.notification_id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                !n.is_read
                  ? "bg-[#08121a]/90 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.12)]"
                  : "bg-[#05080c]/60 border-cyan-950/60 opacity-80 hover:opacity-100"
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                  !n.is_read
                    ? "bg-cyan-950/80 border-cyan-400/60 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                    : "bg-black/50 border-cyan-950"
                }`}>
                  {getCategoryIcon(n.category, n.box_type, n.title)}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[8px] font-mono font-black text-cyan-400 uppercase tracking-widest bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-900/60">
                      {n.category || n.box_type || "SISTEMA"}
                    </span>
                    <span className="text-[8px] font-mono text-zinc-500 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(n.created_at)}
                    </span>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-pulse" />
                    )}
                  </div>

                  <h4 className="text-[11px] font-bold text-white uppercase tracking-wide truncate">
                    {n.title}
                  </h4>
                  <p className="text-[9.5px] font-sans text-zinc-300 uppercase leading-relaxed mt-0.5">
                    {n.message}
                  </p>

                  {n.action_url && (
                    <a
                      href={n.action_url}
                      className="inline-flex items-center gap-1 text-[8px] font-mono text-cyan-400 hover:text-cyan-300 uppercase tracking-wider mt-1.5 underline"
                    >
                      <span>Ejecutar Acción</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(n.notification_id)}
                    title="Marcar como leída"
                    className="p-1.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded-lg transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteNotification(n.notification_id)}
                  title="Eliminar notificación"
                  className="p-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400 rounded-lg transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* FOOTER */}
      <div className="border-t border-cyan-950/80 pt-2.5 mt-2 flex justify-between items-center shrink-0">
        <span className="text-[8px] font-mono text-zinc-500 uppercase">
          Registros Totales: {notifications.length} | Sin Leer: {unreadCount}
        </span>
        <Button variant="secondary" size="sm" onClick={onBack} className="text-[8.5px] font-mono font-bold uppercase cursor-pointer">
          [VOLVER]
        </Button>
      </div>
    </div>
  );
};

export default NotificationsView;