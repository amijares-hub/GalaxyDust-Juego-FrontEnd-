import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Rocket,
  Skull,
  UserPlus,
  ShoppingBag,
  Users,
  Compass,
  AlertTriangle,
  X
} from "lucide-react";
import { Button } from "./ui/joly-button";
import { useNotifications, NotificationRecord } from "../hooks/useNotifications";
import { GalaxyFrame } from "./CanView";

export type { NotificationRecord } from "../hooks/useNotifications";

// 🎯 FILTRO EXCLUSIVO Y ESTRICTO PARA COMUNICADOS OFICIALES (ÚNICAMENTE 5 CASOS)
export const isOfficialComunicado = (n: NotificationRecord): boolean => {
  const cat = (n.category || n.box_type || "").toUpperCase();
  const title = (n.title || "").toUpperCase();
  const msg = (n.message || "").toUpperCase();

  // 1. Envío o regreso de expedición
  const isExpedition = 
    cat.includes("EXPEDITION") || 
    title.includes("EXPEDICIÓN") || 
    title.includes("DESPLIEGUE") || 
    title.includes("RETORNO") || 
    msg.includes("HA LLEGADO A SU DESTINO") || 
    msg.includes("EN RUTA") || 
    msg.includes("REGRESO A LA BASE");

  // 2. Compras / Ventas / Subastas en Marketplace o Phantom Station
  const isMarketOrPhantom = 
    cat.includes("MARKET") || 
    cat.includes("PHANTOM") || 
    title.includes("COMPRA") || 
    title.includes("VENTA") || 
    title.includes("SUBASTA") || 
    msg.includes("MARKETPLACE") || 
    msg.includes("PHANTOM STATION");

  // 3. Solicitud de amistad o alianza
  const isSocialRequest = 
    title.includes("SOLICITUD DE AMISTAD") || 
    title.includes("SOLICITUD DE ALIANZA") || 
    msg.includes("SOLICITUD DE AMISTAD") || 
    msg.includes("SOLICITUD DE ALIANZA");

  // 4. Descubrimiento de un Sistema Solar (SS)
  const isSSDiscovery = 
    title.includes("SISTEMA SOLAR DESCUBIERTO") || 
    title.includes("DESCUBRIMIENTO DE SS") || 
    msg.includes("SISTEMA SOLAR") || 
    msg.includes("SS DESCUBIERTO") || 
    (cat.includes("DISCOVERY") && (msg.includes("SISTEMA") || msg.includes("SS")));

  // 5. Destrucción de un Asset
  const isAssetDestroyed = 
    title.includes("ACTIVO DESTRUIDO") || 
    title.includes("NAVE DESTRUIDA") || 
    title.includes("HERRAMIENTA DESTRUIDA") || 
    msg.includes("DESTRUIDO POR COMPLETO") || 
    msg.includes("DESTRUIDA EN COMBATE");

  return isExpedition || isMarketOrPhantom || isSocialRequest || isSSDiscovery || isAssetDestroyed;
};

export const NotificationsView: React.FC<{
  triggerNotification?: (text: string, e?: any) => void;
  onBack: () => void;
}> = ({ triggerNotification, onBack }) => {
  const { t } = useTranslation();
  const {
    notifications,
    loading: isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [filterRead, setFilterRead] = useState<"ALL" | "UNREAD">("ALL");
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);

  // Filtrado único de comunicados legítimos
  const comunicadosList = useMemo(() => {
    return notifications.filter(isOfficialComunicado);
  }, [notifications]);

  // Conteo exclusivo de comunicados no leídos
  const unreadComunicadosCount = useMemo(() => {
    return comunicadosList.filter(n => !n.is_read).length;
  }, [comunicadosList]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
    if (triggerNotification) triggerNotification("✓ COMUNICADO MARCADO COMO LEÍDO");
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    if (triggerNotification) triggerNotification("✓ TODOS LOS COMUNICADOS MARCADOS COMO LEÍDOS");
  };

  const handleDeleteNotification = async (notificationId: string) => {
    await deleteNotification(notificationId);
    if (triggerNotification) triggerNotification("🗑️ COMUNICADO ELIMINADO DE LA RED");
  };

  const handleConfirmDeleteAll = async () => {
    try {
      if (deleteAllNotifications) {
        await deleteAllNotifications();
      }
      setShowDeleteConfirmModal(false);
      if (triggerNotification) triggerNotification("🗑️ CANAL DE COMUNICADOS PURGADO");
    } catch (err: any) {
      if (triggerNotification) triggerNotification(`⛔ ERROR AL PURGAR COMUNICADOS: ${err.message}`);
    }
  };

  const filteredNotifications = useMemo(() => {
    let list = [...comunicadosList];

    if (filterRead === "UNREAD") {
      list = list.filter((n) => !n.is_read);
    }

    if (activeTab !== "ALL") {
      list = list.filter((n) => {
        const cat = (n.category || n.box_type || "").toUpperCase();
        const t = (n.title || "").toUpperCase();
        const msg = (n.message || "").toUpperCase();

        if (activeTab === "EXPEDITION") {
          return cat.includes("EXPEDITION") || t.includes("EXPEDICIÓN") || t.includes("DESPLIEGUE") || t.includes("RETORNO");
        }
        if (activeTab === "MARKET") {
          return cat.includes("MARKET") || cat.includes("PHANTOM") || t.includes("COMPRA") || t.includes("VENTA") || t.includes("SUBASTA");
        }
        if (activeTab === "SOCIAL") {
          return t.includes("AMISTAD") || t.includes("ALIANZA") || msg.includes("SOLICITUD");
        }
        if (activeTab === "DISCOVERY") {
          return t.includes("DESCUBRIMIENTO") || msg.includes("SISTEMA SOLAR") || msg.includes("SS");
        }
        if (activeTab === "DESTRUCTION") {
          return t.includes("DESTRUIDO") || t.includes("DESTRUIDA") || msg.includes("DESTRUIDO");
        }
        return true;
      });
    }

    return list;
  }, [comunicadosList, activeTab, filterRead]);

  const getComunicadoIcon = (category: string, boxType: string, title?: string) => {
    const t = (title || "").toUpperCase();

    if (t.includes("DESTRUIDO") || t.includes("DESTRUIDA")) {
      return <Skull className="w-4 h-4 text-red-500 animate-pulse" />;
    }
    if (t.includes("AMISTAD")) return <UserPlus className="w-4 h-4 text-cyan-400" />;
    if (t.includes("ALIANZA")) return <Users className="w-4 h-4 text-indigo-400" />;
    if (t.includes("COMPRA") || t.includes("VENTA") || t.includes("SUBASTA")) return <ShoppingBag className="w-4 h-4 text-amber-400" />;
    if (t.includes("SISTEMA SOLAR") || t.includes("DESCUBRIMIENTO")) return <Compass className="w-4 h-4 text-emerald-400" />;
    return <Rocket className="w-4 h-4 text-cyan-400" />;
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
    <GalaxyFrame className="w-full max-w-5xl mx-auto my-2 text-white font-sans select-none h-[calc(100vh-6rem)] max-h-[620px]" innerPadding="p-3.5 sm:p-5">
      <div id="swgoh-notifications-screen" className="relative w-full h-full flex flex-col justify-between overflow-hidden">
        
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
                {t('notifications.title')}
                <span className="text-[8px] bg-cyan-950 font-mono text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40">
                  {t('notifications.feed_badge')}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadComunicadosCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-xl text-[8.5px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                {t('notifications.mark_all_read')} ({unreadComunicadosCount})
              </button>
            )}

            {comunicadosList.length > 0 && (
              <button
                onClick={() => setShowDeleteConfirmModal(true)}
                className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-300 hover:text-white rounded-xl text-[8.5px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                {t('notifications.delete_all')}
              </button>
            )}
          </div>
        </div>

        {/* BARRA DE PESTAÑAS Y FILTROS */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0a0f14]/85 border border-cyan-900/35 px-3 py-1.5 rounded-xl mb-2.5 shrink-0 font-mono text-[8.5px]">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            {[
              { id: "ALL", label: t('notifications.tabs.all') },
              { id: "EXPEDITION", label: t('notifications.tabs.expedition') },
              { id: "MARKET", label: t('notifications.tabs.market') },
              { id: "SOCIAL", label: t('notifications.tabs.social') },
              { id: "DISCOVERY", label: t('notifications.tabs.discovery') },
              { id: "DESTRUCTION", label: t('notifications.tabs.destruction') }
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
              {t('notifications.view_all')}
            </button>
            <span className="text-zinc-700">|</span>
            <button
              onClick={() => setFilterRead("UNREAD")}
              className={`px-2.5 py-0.5 rounded uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                filterRead === "UNREAD" ? "text-amber-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t('notifications.unread')}
              {unreadComunicadosCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* LISTA DE COMUNICADOS */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-cyan-500 py-16">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[9px] font-mono tracking-widest uppercase animate-pulse">
                {t('notifications.loading')}
              </span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500 text-[9.5px] font-mono uppercase tracking-widest py-16">
              <Bell className="w-8 h-8 text-zinc-700 mb-1" />
              <span>{t('notifications.empty')}</span>
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
                    {getComunicadoIcon(n.category, n.box_type, n.title)}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[8px] font-mono font-black text-cyan-400 uppercase tracking-widest bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-900/60">
                        {n.category || n.box_type || "COMUNICADO"}
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
                    title="Eliminar comunicado"
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
        <div className="border-t border-cyan-950/80 pt-2.5 mt-2 flex justify-between items-center shrink-0 font-mono">
          <span className="text-[8px] text-zinc-500 uppercase">
            Comunicados Totales: {comunicadosList.length} | Sin Leer: {unreadComunicadosCount}
          </span>
          <Button variant="secondary" size="sm" onClick={onBack} className="text-[8.5px] font-mono font-bold uppercase cursor-pointer">
            [VOLVER]
          </Button>
        </div>
      </div>

      {/* MODAL CONFIRMACIÓN DE PURGA TOTAL ENMARCADO CON GALAXYFRAME */}
      <AnimatePresence>
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[120] flex items-center justify-center p-4 font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md relative"
            >
              <GalaxyFrame className="w-full shadow-[0_0_40px_rgba(239,68,68,0.25)]" innerPadding="p-5 sm:p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="flex justify-between items-center w-full border-b border-red-900/40 pb-2.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                        {t('notifications.modal_alert')}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirmModal(false)}
                      className="text-zinc-500 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-500/60 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">
                      {t('notifications.modal_title')}
                    </h3>
                    <p className="text-[9.5px] text-zinc-300 leading-relaxed font-sans normal-case bg-black/60 p-3 rounded-xl border border-red-950/80">
                      {t('notifications.modal_desc')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
                    <button
                      onClick={handleConfirmDeleteAll}
                      className="py-2.5 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-[9px] font-black uppercase rounded-lg border border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)] cursor-pointer active:scale-95 transition-all"
                    >
                      {t('notifications.confirm_purge')}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirmModal(false)}
                      className="py-2.5 bg-black border border-zinc-800 text-zinc-400 hover:border-zinc-700 text-[9px] font-bold uppercase rounded-lg hover:text-white cursor-pointer transition-all"
                    >
                      {t('notifications.cancel')}
                    </button>
                  </div>
                </div>
              </GalaxyFrame>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </GalaxyFrame>
  );
};

export default NotificationsView;