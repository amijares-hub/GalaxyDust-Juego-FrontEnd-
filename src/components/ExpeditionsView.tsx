import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExpeditionEngine, Expedition } from "../hooks/useExpeditionEngine";
import { useAuth } from "../context/AuthContext";
import {
  ChevronLeft,
  ChevronRight,
  Radar,
  AlertTriangle,
  Globe,
  Layers,
  Plus,
  X,
  RefreshCw,
  Navigation,
  Satellite,
  Zap,
  Wind,
  Map,
  Users,
  Check,
} from "lucide-react";
import { supabase } from "../lib/supabase";

// ─── INTERFACES ─────────────────────────────────────────────────────────────

interface SasoriFleet {
  id: string;
  user_id: string;
  name: string;
  total_power_score: number;
  ships: any[];
}

interface Galaxy {
  name: string;
  type: string;
}

interface GalaxyCluster {
  id: string;
  name: string;
  galaxies: Galaxy[];
  risk_base: number;
  duration_hours: number;
  colorClass: string;
  glowColor: string;
  description: string;
}

interface CelestialNode {
  id: string;
  cluster_name: string;
  galaxy_name: string;
  node_name: string;
  node_type: string;
  discovered_by_username: string;
  risk_factor: number;
}

// ─── THE 8 GALAXY CLUSTERS ──────────────────────────────────────────────────

const GALAXY_CLUSTERS: GalaxyCluster[] = [
  {
    id: "INARA", name: "INARA",
    description: "Zona comercial del anillo interno. Alta densidad de estaciones de retransmisión.",
    galaxies: [
      { name: "Inara-Prime", type: "Zona Comercial" },
      { name: "Inara-Secundus", type: "Cinturón Asteroide" },
      { name: "Inara-Drift", type: "Zona de Escombros" },
    ],
    risk_base: 0.10, duration_hours: 2,
    colorClass: "text-cyan-400", glowColor: "rgba(6,182,212,0.9)",
  },
  {
    id: "QUEOPS", name: "QUEOPS",
    description: "Cúmulo de asteroides ricos en Deuterio. Patrullado por la flota mercante independiente.",
    galaxies: [
      { name: "Queops-Alpha", type: "Yacimiento Deuterio" },
      { name: "Queops-Sector VII", type: "Relay Cuántico" },
      { name: "Queops-Void", type: "Espacio Vacío" },
    ],
    risk_base: 0.20, duration_hours: 4,
    colorClass: "text-emerald-400", glowColor: "rgba(52,211,153,0.9)",
  },
  {
    id: "ORIOUS", name: "ORIOUS",
    description: "Frontera del territorio conocido. Zona de tensión entre facciones mineras.",
    galaxies: [
      { name: "Orious-Belt", type: "Cinturón Mineral" },
      { name: "Orious-Deep", type: "Espacio Profundo" },
      { name: "Orious-Halo", type: "Halo Estelar" },
    ],
    risk_base: 0.30, duration_hours: 6,
    colorClass: "text-blue-400", glowColor: "rgba(96,165,250,0.9)",
  },
  {
    id: "ANHECLETHUS", name: "ANHECL.",
    description: "Anomalía gravitacional permanente. Fuente de Orichaltron concentrado.",
    galaxies: [
      { name: "Anheclethus-Core", type: "Anomalía Orichaltron" },
      { name: "Anheclethus-Fringe", type: "Zona de Radiación" },
      { name: "Anheclethus-Nebula", type: "Nebulosa Densa" },
    ],
    risk_base: 0.42, duration_hours: 8,
    colorClass: "text-purple-400", glowColor: "rgba(167,139,250,0.9)",
  },
  {
    id: "DIMERTRA", name: "DIMERTRA",
    description: "Nodo de tráfico de flotas corsarias. Acceso a artefactos exclusivos.",
    galaxies: [
      { name: "Dimertra-Station", type: "Estación Corsaria" },
      { name: "Dimertra-Outpost", type: "Puesto Avanzado" },
      { name: "Dimertra-Rift", type: "Fisura Espacial" },
    ],
    risk_base: 0.52, duration_hours: 12,
    colorClass: "text-orange-400", glowColor: "rgba(251,146,60,0.9)",
  },
  {
    id: "AVRENIM", name: "AVRENIM",
    description: "Zona de guerra activa entre dos superpotencias estelares. Riesgo extremo.",
    galaxies: [
      { name: "Avrenim-Apex", type: "Zona de Guerra" },
      { name: "Avrenim-Lower", type: "Trinchera Orbital" },
      { name: "Avrenim-Shadow", type: "Sector Sombra" },
    ],
    risk_base: 0.65, duration_hours: 18,
    colorClass: "text-yellow-400", glowColor: "rgba(250,204,21,0.9)",
  },
  {
    id: "CASSIO", name: "CASSIO",
    description: "Frontera del vacío cósmico. Solo naves de clase capital sobreviven aquí.",
    galaxies: [
      { name: "Cassio-Main", type: "Vacío Cósmico" },
      { name: "Cassio-Twin", type: "Sistema Binario" },
      { name: "Cassio-Dark", type: "Sector Oscuro" },
    ],
    risk_base: 0.75, duration_hours: 24,
    colorClass: "text-red-400", glowColor: "rgba(248,113,113,0.9)",
  },
  {
    id: "MENESIA", name: "MENESIA",
    description: "El abismo final. Sede del Infinite Core. Retorno garantizado: 10%.",
    galaxies: [
      { name: "Menesia-Abyss", type: "Abismo Final" },
      { name: "Menesia-Singularity", type: "Singularidad Cuántica" },
      { name: "Menesia-Void", type: "El Gran Vacío" },
    ],
    risk_base: 0.90, duration_hours: 48,
    colorClass: "text-pink-400", glowColor: "rgba(244,114,182,0.9)",
  },
];

// ─── DISCOVERED NODES MODAL ──────────────────────────────────────────────────

interface DiscoveredNodesModalProps {
  cluster: GalaxyCluster;
  galaxyName: string | null;
  onClose: () => void;
  onLaunchFromNode: (node: CelestialNode) => void;
}

const DiscoveredNodesModal: React.FC<DiscoveredNodesModalProps> = ({
  cluster, galaxyName, onClose, onLaunchFromNode,
}) => {
  const [nodes, setNodes] = useState<CelestialNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNodes = async () => {
      setLoading(true);
      let query = supabase
        .from("discovered_celestial_nodes")
        .select("*")
        .eq("cluster_name", cluster.id);
      if (galaxyName) query = query.eq("galaxy_name", galaxyName);
      const { data } = await query;
      setNodes((data || []) as CelestialNode[]);
      setLoading(false);
    };
    fetchNodes();
  }, [cluster.id, galaxyName]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-md mx-4 bg-[#0a0b0c] border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_50px_rgba(6,182,212,0.12)]"
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[8px] text-cyan-500 uppercase tracking-[0.3em] font-mono">Nodos Mapeados</div>
            <div className={`font-black text-sm uppercase tracking-wider ${cluster.colorClass}`}>
              {cluster.name} — {galaxyName || "Todos los sectores"}
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors cursor-pointer p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <RefreshCw className="w-5 h-5 text-cyan-500 animate-spin" />
          </div>
        ) : nodes.length === 0 ? (
          <div className="text-center py-10 text-white/25 font-mono text-[9px] uppercase tracking-[0.3em]">
            Sin nodos registrados en este sector
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {nodes.map((node) => (
              <div key={node.id} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-[11px] font-bold truncate">{node.node_name}</div>
                  <div className="text-cyan-400/70 text-[8px] font-mono uppercase tracking-wider">{node.node_type}</div>
                  <div className="text-white/25 text-[7px] font-mono">Desc: {node.discovered_by_username || "Anónimo"}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5 ml-3">
                  <span className={`text-[8px] font-mono font-bold ${node.risk_factor > 0.5 ? "text-red-400" : node.risk_factor > 0.3 ? "text-yellow-400" : "text-emerald-400"}`}>
                    {Math.round(node.risk_factor * 100)}% RIESGO
                  </span>
                  <button
                    onClick={() => onLaunchFromNode(node)}
                    className="text-[7px] font-black uppercase tracking-[0.15em] bg-cyan-600/80 hover:bg-cyan-500 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    LANZAR
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── EXPEDITION ROW ──────────────────────────────────────────────────────────

interface ExpeditionRowProps {
  flight: Expedition;
  onClaim: (id: string, e: React.MouseEvent) => void;
  isClaiming: boolean;
}

const ExpeditionRow: React.FC<ExpeditionRowProps> = ({ flight, onClaim, isClaiming }) => {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    const returnDate = new Date(flight.estimated_return_time).getTime();
    const launchDate = new Date(flight.launch_time).getTime();
    const totalDuration = returnDate - launchDate;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = returnDate - now;
      if (remaining <= 0) {
        setIsReady(true); setTimeLeftMs(0); setProgress(100); return false;
      }
      setIsReady(false); setTimeLeftMs(remaining);
      setProgress(Math.min(100, Math.max(0, ((now - launchDate) / totalDuration) * 100)));
      return true;
    };

    if (!updateTimer()) return;
    const id = setInterval(() => { if (!updateTimer()) clearInterval(id); }, 1000);
    return () => clearInterval(id);
  }, [flight.estimated_return_time, flight.launch_time]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const displayName = flight.fleet_name || flight.ship_type || "Flota Desconocida";

  return (
    <div className="bg-black/60 border border-white/10 rounded-xl p-3 font-mono flex flex-col space-y-2 relative overflow-hidden">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-cyan-400 font-bold uppercase text-[10px] tracking-wider">{flight.sector_name}</span>
          <span className="text-white/40 text-[8px] mt-0.5">{displayName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {flight.is_adrift && (
            <motion.span
              className="text-[7px] font-black text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded uppercase tracking-widest"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              A LA DERIVA
            </motion.span>
          )}
        </div>
      </div>

      {isReady ? (
        <button
          onClick={(e) => onClaim(flight.id, e)}
          disabled={isClaiming}
          className="w-full text-[9px] font-mono font-black tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2 mt-1 flex justify-center items-center cursor-pointer transition-colors disabled:opacity-60"
        >
          {isClaiming ? (
            <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />PROCESANDO...</>
          ) : "⚡ RECOLECTAR BOTÍN"}
        </button>
      ) : (
        <div className="space-y-1.5">
          <div className="text-red-400/90 font-bold uppercase flex justify-between bg-red-500/10 px-2 py-1.5 rounded-lg items-center text-[8px]">
            <span className="animate-pulse flex items-center gap-1"><Radar className="w-2.5 h-2.5" />EN TRÁNSITO</span>
            <span className="font-mono">{formatTime(timeLeftMs)}</span>
          </div>
          <div className="h-1 w-full bg-neutral-900 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${flight.is_adrift ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"}`}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear", duration: 1 }}
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {isClaiming && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center z-20 pointer-events-none"
          >
            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

interface ExpeditionsViewProps {
  playerGems: number;
  setPlayerGems: React.Dispatch<React.SetStateAction<number>>;
  playerPower: number;
  setPlayerPower: React.Dispatch<React.SetStateAction<number>>;
  onClaimResource: (type: "currency" | "resource", key: string, label: string, e: any) => void;
  onBack: () => void;
  triggerNotification: (text: string, e: any) => void;
  onNavigateToTab?: (tabName: string) => void;
}

type ViewMode = "FLEET_SELECT" | "CLUSTER_SELECT" | "GALAXY_NAV";

export const ExpeditionsView: React.FC<ExpeditionsViewProps> = ({
  onBack,
  triggerNotification,
  onNavigateToTab,
}) => {
  const { user } = useAuth();
  const userId = user?.id;

  const { activeFlights, isLaunching, isClaiming, launchExpedition, claimExpeditionLoot } =
    useExpeditionEngine(userId);

  // ── Navigation state machine ─────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("FLEET_SELECT");
  const [selectedFleet, setSelectedFleet] = useState<SasoriFleet | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<GalaxyCluster | null>(null);
  const [selectedGalaxy, setSelectedGalaxy] = useState<string | null>(null);

  // ── Fleet data ───────────────────────────────────────────────────────────
  const [fleets, setFleets] = useState<SasoriFleet[]>([]);
  const [loadingFleets, setLoadingFleets] = useState(true);

  // ── Modal ────────────────────────────────────────────────────────────────
  const [showNodesModal, setShowNodesModal] = useState(false);

  // ── Audio ────────────────────────────────────────────────────────────────
  const playSfx = useCallback((freq: number, duration = 0.3) => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }, []);

  // ── Load fleets ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoadingFleets(true);
      const { data } = await supabase.from("sasori_fleets").select("*").eq("user_id", userId);
      setFleets((data || []) as SasoriFleet[]);
      setLoadingFleets(false);
    };
    load();
  }, [userId]);

  // ── Navigation handlers ──────────────────────────────────────────────────
  const handleSelectFleet = (fleet: SasoriFleet) => {
    playSfx(660);
    setSelectedFleet(fleet);
    setViewMode("CLUSTER_SELECT");
  };

  const handleSelectCluster = (cluster: GalaxyCluster) => {
    playSfx(880);
    setSelectedCluster(cluster);
    setSelectedGalaxy(null);
    setViewMode("GALAXY_NAV");
  };

  const handleBack = () => {
    if (viewMode === "GALAXY_NAV") { setViewMode("CLUSTER_SELECT"); setSelectedGalaxy(null); }
    else if (viewMode === "CLUSTER_SELECT") { setViewMode("FLEET_SELECT"); setSelectedFleet(null); }
    else onBack();
  };

  // ── Launch handlers ──────────────────────────────────────────────────────
  const handleLaunchAdrift = async (e: React.MouseEvent) => {
    if (!selectedFleet || !selectedCluster) return;
    playSfx(440);
    const galaxyTarget = selectedGalaxy || `${selectedCluster.name}-${Math.floor(Math.random() * 999)}`;
    const res = await launchExpedition(
      `${selectedCluster.name} / ${galaxyTarget}`,
      selectedCluster.duration_hours,
      selectedFleet.name,
      selectedCluster.risk_base,
      true,
      selectedFleet.id
    );
    if (res.success) {
      playSfx(1200, 0.5);
      triggerNotification(`🌀 FLOTA "${selectedFleet.name}" A LA DERIVA — RIESGO ELEVADO`, e);
    } else {
      triggerNotification(`⚠️ ERROR: ${res.error}`, e);
    }
  };

  const handleLaunchFromNode = async (node: CelestialNode) => {
    if (!selectedFleet || !selectedCluster) return;
    setShowNodesModal(false);
    playSfx(880);
    const res = await launchExpedition(
      `${node.galaxy_name} / ${node.node_name}`,
      selectedCluster.duration_hours,
      selectedFleet.name,
      node.risk_factor,
      false,
      selectedFleet.id
    );
    if (res.success) {
      playSfx(1200, 0.5);
      triggerNotification(`🚀 FLOTA "${selectedFleet.name}" → ${node.node_name}`, {} as any);
    }
  };

  const handleClaimLoot = async (expeditionId: string, e: React.MouseEvent) => {
    playSfx(660);
    const res = await claimExpeditionLoot(expeditionId);
    if (res.success) {
      playSfx(1400, 0.6);
      triggerNotification(
        res.status === "SUCCESS"
          ? `✅ BOTÍN EXTRAÍDO: +${res.rewards?.metal || 0} Metal, +${res.rewards?.crystal || 0} Cristal`
          : `💀 MISIÓN FALLIDA — LA FLOTA NO REGRESÓ`,
        e
      );
    } else {
      triggerNotification(`⚠️ ERROR: ${res.error}`, e);
    }
  };

  // ── Breadcrumb info ──────────────────────────────────────────────────────
  const stepLabels: Record<ViewMode, string> = {
    FLEET_SELECT: "SELECCIÓN DE FLOTA",
    CLUSTER_SELECT: "DESTINO: CÚMULO",
    GALAXY_NAV: `NAVEGACIÓN: ${selectedCluster?.name || ""}`,
  };

  return (
    <div className="flex flex-col h-full bg-[#080909] text-white font-sans overflow-hidden">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors cursor-pointer text-[10px] font-mono uppercase tracking-widest"
          >
            <ChevronLeft className="w-4 h-4" />
            {viewMode === "FLEET_SELECT" ? "NÚCLEO" : "ATRÁS"}
          </button>
          <div className="w-px h-4 bg-white/10" />
          <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/50">
            SISTEMA DE EXPEDICIONES
          </span>
        </div>
        {/* Stepper */}
        <div className="hidden sm:flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest">
          {(["FLEET_SELECT", "CLUSTER_SELECT", "GALAXY_NAV"] as ViewMode[]).map((step, i) => (
            <React.Fragment key={step}>
              <span className={`px-2 py-0.5 rounded ${viewMode === step ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/30" : "text-white/20"}`}>
                {i + 1}
              </span>
              {i < 2 && <ChevronRight className="w-3 h-3 text-white/15" />}
            </React.Fragment>
          ))}
        </div>
        <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest hidden md:block">
          {stepLabels[viewMode]}
        </span>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ════════════════════════════════════════════════════════════════
              ÁREA 1 — FLEET SELECT
          ════════════════════════════════════════════════════════════════ */}
          {viewMode === "FLEET_SELECT" && (
            <motion.div
              key="fleet-select"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="p-4"
            >
              <div className="mb-4">
                <h2 className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/40 mb-1">Paso 1 de 3</h2>
                <p className="text-base font-black uppercase tracking-wider text-white">Selecciona tu Flota</p>
                <p className="text-[9px] text-white/30 font-mono mt-0.5">Elige el deck de combate que despachará la misión.</p>
              </div>

              {loadingFleets ? (
                <div className="flex justify-center items-center py-20">
                  <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin" />
                </div>
              ) : fleets.length === 0 ? (
                /* ── EMPTY STATE ─────────────────────────────────────────── */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full border border-white/10 bg-white/[0.02] flex items-center justify-center mb-5">
                    <Layers className="w-7 h-7 text-white/20" />
                  </div>
                  <div className="text-[9px] font-mono uppercase tracking-[0.4em] text-red-400/80 mb-2 animate-pulse">
                    ⚠ NO SE DETECTAN FLOTAS ACTIVAS EN EL HANGAR
                  </div>
                  <p className="text-white/30 text-[10px] font-mono max-w-xs mb-6 leading-relaxed">
                    Necesitas crear un Deck antes de lanzar expediciones. Agrupa naves, astrobots y herramientas bajo un nombre de flota.
                  </p>
                  <button onClick={() => onNavigateToTab?.('inventario')} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] uppercase tracking-[0.2em] px-5 py-3 rounded-xl transition-colors cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                    <Plus className="w-4 h-4" />
                    ADQUIRIR LICENCIA Y CREAR FLOTA
                  </button>
                </div>
              ) : (
                /* ── FLEET CARDS ─────────────────────────────────────────── */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fleets.map((fleet) => {
                    const isSelected = selectedFleet?.id === fleet.id;
                    return (
                      <motion.button
                        key={fleet.id}
                        onClick={() => handleSelectFleet(fleet)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "border-yellow-400 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.25)]"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                            <Check className="w-3 h-3 text-black" />
                          </div>
                        )}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-white/40" />
                          </div>
                          <div>
                            <div className="text-white font-black text-sm uppercase tracking-wider">{fleet.name}</div>
                            <div className="text-white/40 text-[8px] font-mono">{fleet.ships?.length || 0} unidades</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-mono text-white/30 uppercase tracking-wider">PODER TOTAL</span>
                          <span className="text-cyan-400 font-black text-sm font-mono">{fleet.total_power_score.toLocaleString()}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              ÁREA 2 — CLUSTER SELECT (Los 8 Gigantes)
          ════════════════════════════════════════════════════════════════ */}
          {viewMode === "CLUSTER_SELECT" && (
            <motion.div
              key="cluster-select"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="p-4"
            >
              <div className="mb-5">
                <h2 className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/40 mb-1">Paso 2 de 3</h2>
                <p className="text-base font-black uppercase tracking-wider text-white">Los 8 Cúmulos Galácticos</p>
                <p className="text-[9px] text-white/30 font-mono mt-0.5">
                  Flota: <span className="text-cyan-400">{selectedFleet?.name}</span>
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {GALAXY_CLUSTERS.map((cluster) => (
                  <motion.button
                    key={cluster.id}
                    onClick={() => handleSelectCluster(cluster)}
                    whileHover={{ scale: 1.08, rotate: 5 }}
                    whileTap={{ scale: 0.94 }}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                  >
                    {/* Orbital Circle */}
                    <div className="relative">
                      {/* Outer pulse ring */}
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ boxShadow: `0 0 0 0 ${cluster.glowColor}` }}
                        animate={{ boxShadow: [`0 0 0 0 ${cluster.glowColor}`, `0 0 0 8px rgba(0,0,0,0)`, `0 0 0 0 ${cluster.glowColor}`] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <div
                        className="w-14 h-14 rounded-full border-2 flex items-center justify-center relative overflow-hidden transition-all duration-300"
                        style={{
                          borderColor: cluster.glowColor,
                          background: `radial-gradient(circle at 35% 35%, ${cluster.glowColor.replace("0.9", "0.15")}, #050506 70%)`,
                          boxShadow: `0 0 16px ${cluster.glowColor.replace("0.9", "0.3")}, inset 0 0 10px ${cluster.glowColor.replace("0.9", "0.1")}`,
                        }}
                      >
                        <Globe className={`w-5 h-5 ${cluster.colorClass} group-hover:scale-110 transition-transform`} />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-[8px] font-black uppercase tracking-wider ${cluster.colorClass}`}>{cluster.name}</span>
                      <span className="text-[6px] font-mono text-white/30 uppercase">{cluster.duration_hours}H · {Math.round(cluster.risk_base * 100)}%</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Cluster legend */}
              <div className="mt-6 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                <div className="text-[8px] font-mono text-white/30 uppercase tracking-[0.3em] mb-2">Escala de Riesgo</div>
                <div className="flex items-center gap-1">
                  {GALAXY_CLUSTERS.map((c) => (
                    <div key={c.id} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: c.glowColor }} />
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[7px] font-mono text-cyan-400">BAJO</span>
                  <span className="text-[7px] font-mono text-pink-400">EXTREMO</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              ÁREA 3 — GALAXY NAV (Núcleo Explorador)
          ════════════════════════════════════════════════════════════════ */}
          {viewMode === "GALAXY_NAV" && selectedCluster && (
            <motion.div
              key="galaxy-nav"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="p-4 flex flex-col gap-4"
            >
              {/* Cluster header */}
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-white/[0.02]"
                style={{ borderColor: selectedCluster.glowColor.replace("0.9", "0.3"), boxShadow: `0 0 20px ${selectedCluster.glowColor.replace("0.9", "0.08")}` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `radial-gradient(circle, ${selectedCluster.glowColor.replace("0.9","0.2")}, transparent)`, border: `1.5px solid ${selectedCluster.glowColor}` }}>
                  <Globe className={`w-5 h-5 ${selectedCluster.colorClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-black uppercase tracking-wider ${selectedCluster.colorClass}`}>{selectedCluster.name}</div>
                  <div className="text-white/30 text-[8px] font-mono leading-relaxed truncate">{selectedCluster.description}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[7px] font-mono text-white/30 uppercase">Duración</div>
                  <div className="text-white font-black text-sm">{selectedCluster.duration_hours}H</div>
                  <div className={`text-[8px] font-mono font-bold ${selectedCluster.colorClass}`}>{Math.round(selectedCluster.risk_base * 100)}% riesgo</div>
                </div>
              </div>

              {/* Galaxy selector */}
              <div>
                <div className="text-[8px] font-mono text-white/30 uppercase tracking-[0.3em] mb-2">Galaxias disponibles</div>
                <div className="space-y-1.5">
                  {selectedCluster.galaxies.map((galaxy) => {
                    const isSelected = selectedGalaxy === galaxy.name;
                    return (
                      <button
                        key={galaxy.name}
                        onClick={() => { playSfx(550); setSelectedGalaxy(isSelected ? null : galaxy.name); }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-cyan-500/60 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                            : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Satellite className={`w-3.5 h-3.5 ${isSelected ? "text-cyan-400" : "text-white/30"}`} />
                          <div>
                            <div className="text-white text-[10px] font-bold">{galaxy.name}</div>
                            <div className="text-white/30 text-[7px] font-mono uppercase tracking-wider">{galaxy.type}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2.5">
                {/* Button 1: Discovered Nodes */}
                <button
                  onClick={() => { playSfx(660); setShowNodesModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-cyan-500/30 bg-cyan-500/[0.05] hover:bg-cyan-500/10 transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                    <Map className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-cyan-400 font-black text-[10px] uppercase tracking-wider">Nodos Concurridos</div>
                    <div className="text-white/30 text-[8px] font-mono">Rutas comerciales conocidas · Riesgo controlado</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-cyan-500/50 group-hover:text-cyan-400 transition-colors" />
                </button>

                {/* Button 2: Adrift */}
                <button
                  onClick={handleLaunchAdrift}
                  disabled={isLaunching}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-red-500/40 bg-red-500/[0.06] hover:bg-red-500/10 transition-all cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/40 flex items-center justify-center flex-shrink-0">
                    {isLaunching ? (
                      <RefreshCw className="w-4 h-4 text-red-400 animate-spin" />
                    ) : (
                      <motion.div
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      </motion.div>
                    )}
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-red-400 font-black text-[10px] uppercase tracking-wider flex items-center gap-2">
                      Exploración a la Deriva
                      <motion.span
                        className="text-[7px] bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 rounded text-red-400"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      >⚠ ALTO RIESGO</motion.span>
                    </div>
                    <div className="text-white/30 text-[8px] font-mono">Coordenadas aleatorias · Riesgo x2 · Recompensa x2</div>
                  </div>
                  <Wind className="w-4 h-4 text-red-500/50 group-hover:text-red-400 transition-colors" />
                </button>
              </div>

              {/* Selected fleet pill */}
              <div className="flex items-center gap-2 p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <Users className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[8px] font-mono text-white/40 uppercase tracking-wider">Flota asignada:</span>
                <span className="text-yellow-400 font-black text-[9px] uppercase">{selectedFleet?.name}</span>
                <span className="ml-auto text-[7px] font-mono text-white/25">{selectedFleet?.total_power_score.toLocaleString()} POW</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── ACTIVE EXPEDITIONS ─────────────────────────────────────────────── */}
      {activeFlights.length > 0 && (
        <div className="border-t border-white/[0.06] bg-black/20 flex-shrink-0">
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center gap-2 mb-2">
              <Radar className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/40">
                Rutas en Órbita <span className="text-cyan-400 font-bold">({activeFlights.length})</span>
              </span>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto pb-2">
              {activeFlights.map((flight) => (
                <ExpeditionRow
                  key={flight.id}
                  flight={flight}
                  onClaim={handleClaimLoot}
                  isClaiming={isClaiming === flight.id}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── DISCOVERED NODES MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showNodesModal && selectedCluster && (
          <DiscoveredNodesModal
            cluster={selectedCluster}
            galaxyName={selectedGalaxy}
            onClose={() => setShowNodesModal(false)}
            onLaunchFromNode={handleLaunchFromNode}
          />
        )}
      </AnimatePresence>
    </div>
  );
};