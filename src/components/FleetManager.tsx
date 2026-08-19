import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, ChevronRight, Check, Zap, ArrowLeft, RefreshCw, Layers } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { InventoryItem } from "../lib/inventoryService";

export interface SasoriFleet {
  id: string;
  name: string;
  total_power_score: number;
  ships?: any[];
}

type FleetViewMode = "LIST" | "CREATE_WIZARD";
type WizardStep = 0 | 1 | 2 | 3 | 4;

interface FleetManagerProps {
  characters: InventoryItem[];
  triggerNotification: (text: string, e?: any) => void;
}

export const FleetManager: React.FC<FleetManagerProps> = ({ characters, triggerNotification }) => {
  const { user } = useAuth();
  const userId = user?.id;

  const [viewMode, setViewMode] = useState<FleetViewMode>("LIST");
  const [fleets, setFleets] = useState<SasoriFleet[]>([]);
  const [loadingFleets, setLoadingFleets] = useState(true);

  // Wizard State
  const [wizardStep, setWizardStep] = useState<WizardStep>(0);
  const [fleetName, setFleetName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("ALL");

  const [selectedShips, setSelectedShips] = useState<InventoryItem[]>([]);
  const [selectedAstrobots, setSelectedAstrobots] = useState<InventoryItem[]>([]);
  const [selectedTools, setSelectedTools] = useState<InventoryItem[]>([]);
  const [selectedConsumables, setSelectedConsumables] = useState<InventoryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const playSfx = (freq: number) => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } catch (_) {}
  };

  const loadFleets = async () => {
    if (!userId) return;
    setLoadingFleets(true);
    
    // Consulta unificada a la tabla de flotas
    const { data, error } = await supabase
      .from("fleets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      const { data: fallbackData } = await supabase
        .from("sasori_fleets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setFleets((fallbackData || []) as SasoriFleet[]);
    } else {
      setFleets(data as SasoriFleet[]);
    }

    setLoadingFleets(false);
  };

  useEffect(() => {
    if (viewMode === "LIST") {
      loadFleets();
    }
  }, [viewMode, userId]);

  const resetWizard = () => {
    setFleetName("");
    setSelectedShips([]);
    setSelectedAstrobots([]);
    setSelectedTools([]);
    setSelectedConsumables([]);
    setWizardStep(0);
    setSearchQuery("");
    setRarityFilter("ALL");
  };

  const handleStartWizard = () => {
    playSfx(880);
    resetWizard();
    setViewMode("CREATE_WIZARD");
  };

  const handleNextStep = (e: React.MouseEvent) => {
    if (wizardStep === 0 && fleetName.trim().length < 3) {
      triggerNotification("⚠️ EL NOMBRE DE LA FLOTA DEBE TENER AL MENOS 3 CARACTERES", e);
      return;
    }
    if (wizardStep === 1 && selectedShips.length === 0) {
      triggerNotification("⚠️ DEBES ASIGNAR AL MENOS UNA NAVE PRINCIPAL", e);
      return;
    }
    playSfx(660);
    setSearchQuery("");
    setRarityFilter("ALL");
    setWizardStep((prev) => (prev + 1) as WizardStep);
  };

  const toggleItemSelection = (item: InventoryItem, step: WizardStep) => {
    playSfx(1200);
    if (step === 1) {
      if (selectedShips.find(s => s.id === item.id)) setSelectedShips(prev => prev.filter(s => s.id !== item.id));
      else setSelectedShips(prev => [...prev, item]);
    } else if (step === 2) {
      if (selectedAstrobots.find(s => s.id === item.id)) setSelectedAstrobots(prev => prev.filter(s => s.id !== item.id));
      else setSelectedAstrobots(prev => [...prev, item]);
    } else if (step === 3) {
      if (selectedTools.find(s => s.id === item.id)) setSelectedTools(prev => prev.filter(s => s.id !== item.id));
      else setSelectedTools(prev => [...prev, item]);
    } else if (step === 4) {
      if (selectedConsumables.find(s => s.id === item.id)) setSelectedConsumables(prev => prev.filter(s => s.id !== item.id));
      else setSelectedConsumables(prev => [...prev, item]);
    }
  };

  // 🛡️ SUBMISIÓN DE FLOTA ZERO-TRUST VIA RPC
  const handleSubmitFleet = async (e: React.MouseEvent) => {
    if (!userId) return;
    setIsSubmitting(true);
    playSfx(440);

    try {
      const shipIds = selectedShips.map(s => s.id);
      const astrobotIds = selectedAstrobots.map(a => a.id);
      const toolIds = selectedTools.map(t => t.id);
      const consumableIds = selectedConsumables.map(c => c.id);

      // 🛡️ LLAMADA AL SERVIDOR PASANDO ÚNICAMENTE ARREGLOS DE ARRAYS
      const { data, error } = await supabase.rpc("create_custom_fleet_secure", {
        p_fleet_name: fleetName.trim(),
        p_ship_ids: shipIds,
        p_astrobot_ids: astrobotIds,
        p_tool_ids: toolIds,
        p_consumable_ids: consumableIds
      });

      if (error) throw error;

      if (data && data.success) {
        triggerNotification(`✅ FLOTA "${fleetName.toUpperCase()}" REGISTRADA EXITOSAMENTE (${data.total_power} POW)`, e);
        playSfx(1400);
        setViewMode("LIST");
      } else {
        throw new Error(data?.error || "Transacción rechazada por la red.");
      }
    } catch (err: any) {
      console.error("Error al registrar flota:", err);
      triggerNotification(`⚠️ ERROR AL REGISTRAR FLOTA: ${err.message}`, e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPhaseItems = () => {
    let category = "";
    if (wizardStep === 1) category = "Spaceships";
    else if (wizardStep === 2) category = "Astrobots";
    else if (wizardStep === 3) category = "Tools";
    else if (wizardStep === 4) category = "Consumibles";

    let filtered = characters.filter(c => {
      const catLower = (c.category || '').toLowerCase();
      if (wizardStep === 1) return catLower.includes('ship') || catLower.includes('nave') || catLower.includes('spaceships');
      if (wizardStep === 2) return catLower.includes('astrobot');
      if (wizardStep === 3) return catLower.includes('tool') || catLower.includes('herramienta');
      if (wizardStep === 4) return catLower.includes('consumable') || catLower.includes('consumible');
      return false;
    });

    if (rarityFilter !== "ALL") {
      filtered = filtered.filter(c => (c.rarity || '').toUpperCase() === rarityFilter.toUpperCase());
    }

    if (searchQuery.trim() !== "") {
      const sq = searchQuery.toLowerCase();
      filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(sq) || (c.fullname || '').toLowerCase().includes(sq));
    }

    return filtered;
  };

  const phaseItems = getPhaseItems();

  const renderSelectionGrid = (step: WizardStep) => {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="flex flex-wrap items-center gap-3 bg-cyan-950/20 border border-cyan-900/40 p-3 rounded-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-cyan-500" />
            <input 
              type="text" 
              placeholder="BUSCAR COMPONENTE..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/60 border border-cyan-800 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono tracking-wider text-cyan-100 placeholder-cyan-900 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/50 uppercase"
            />
          </div>
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="bg-black/60 border border-cyan-800 text-cyan-400 text-[10px] font-mono tracking-widest px-3 py-2 rounded-lg outline-none focus:border-cyan-400 appearance-none uppercase"
          >
            <option value="ALL">TODAS LAS RAREZAS</option>
            <option value="COMMON">COMMON (Gris)</option>
            <option value="UNCOMMON">UNCOMMON (Verde)</option>
            <option value="RARE">RARE (Cian)</option>
            <option value="EPIC">EPIC (Morado)</option>
            <option value="LEGENDARY">LEGENDARY (Dorado)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-cyan-900 p-1">
          {phaseItems.length === 0 ? (
            <div className="col-span-full text-center py-10 font-mono text-xs text-cyan-800/60 uppercase">No hay activos disponibles con estos filtros.</div>
          ) : (
            phaseItems.map(item => {
              const isSelected = 
                (step === 1 && selectedShips.find(s => s.id === item.id)) ||
                (step === 2 && selectedAstrobots.find(s => s.id === item.id)) ||
                (step === 3 && selectedTools.find(s => s.id === item.id)) ||
                (step === 4 && selectedConsumables.find(s => s.id === item.id));

              return (
                <div 
                  key={item.id} 
                  onClick={() => toggleItemSelection(item, step)}
                  className={`relative flex flex-col items-center bg-black border rounded-xl p-3 cursor-pointer transition-all ${
                    isSelected 
                      ? "border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] bg-cyan-950/30" 
                      : "border-cyan-900/40 hover:border-cyan-700 hover:bg-cyan-950/10"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-black" />
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-full border-2 border-cyan-800 overflow-hidden mb-2 bg-neutral-900">
                    <img src={item.avatar_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[9px] font-sans font-bold text-center uppercase leading-tight">{item.name}</span>
                  <span className="text-[8px] font-mono text-cyan-500 mt-1">{item.rarity}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-auto flex justify-between items-center border-t border-cyan-900/40 pt-4">
          <button 
            onClick={() => setWizardStep(prev => (prev - 1) as WizardStep)}
            className="px-4 py-2 text-[10px] font-mono text-zinc-400 hover:text-white uppercase tracking-widest"
          >
            Atrás
          </button>
          
          {step === 4 ? (
             <button
              onClick={handleSubmitFleet}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-[0.2em] px-6 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-50 cursor-pointer"
             >
               {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
               COMPILAR Y FIRMAR FLOTA
             </button>
          ) : (
            <button 
              onClick={handleNextStep}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] uppercase tracking-[0.2em] px-6 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] cursor-pointer"
            >
              {step > 1 &&
               ((step === 2 && selectedAstrobots.length === 0) ||
                (step === 3 && selectedTools.length === 0))
                ? "OMITIR FASE"
                : "SIGUIENTE FASE"
              } <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#030608]/90 border border-cyan-900/25 p-5 sm:p-7 rounded-2xl shadow-inner min-h-[420px] text-white">
      
      {viewMode === "LIST" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-6 border-b border-cyan-900/40 pb-3">
            <div>
              <h3 className="text-sm font-sans font-black tracking-widest text-white uppercase">Hangar de Flotas Activas</h3>
              <p className="text-[10px] font-mono text-cyan-600 uppercase mt-1">Sistemas de combate preconfigurados</p>
            </div>
            {fleets.length > 0 && (
              <button 
                onClick={handleStartWizard}
                className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> CREAR FLOTA
              </button>
            )}
          </div>

          {loadingFleets ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin" />
              <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-500 animate-pulse">Consultando Registros...</span>
            </div>
          ) : fleets.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-full border border-white/10 bg-white/[0.02] flex items-center justify-center mb-5">
                <Layers className="w-7 h-7 text-white/20" />
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.4em] text-red-400/80 mb-3 animate-pulse">
                ⚠ NO SE DETECTAN FLOTAS ACTIVAS
              </div>
              <p className="text-white/30 text-[11px] font-mono max-w-sm mb-6 leading-relaxed">
                Necesitas crear un Deck antes de lanzar expediciones o participar en combates tácticos.
              </p>
              <button 
                onClick={handleStartWizard}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[11px] uppercase tracking-[0.2em] px-6 py-3.5 rounded-xl transition-all cursor-pointer shadow-[0_0_25px_rgba(6,182,212,0.4)]"
              >
                <Plus className="w-4 h-4" />
                + REGISTRAR NUEVA FLOTA DE COMBATE
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fleets.map(fleet => (
                <div key={fleet.id} className="bg-black/60 border border-cyan-900/40 rounded-xl p-4 flex flex-col gap-3 hover:border-cyan-700 transition-colors text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">{fleet.name}</h4>
                      <div className="text-[9px] font-mono text-cyan-500 mt-1">POWER: {fleet.total_power_score?.toLocaleString()} POW</div>
                    </div>
                    <div className="bg-cyan-950/50 px-2 py-1 rounded text-[8px] font-mono text-cyan-300 border border-cyan-800/50">
                      FLOTA ACTIVA
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {viewMode === "CREATE_WIZARD" && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6 border-b border-cyan-900/40 pb-3">
            <button onClick={() => setViewMode("LIST")} className="p-1.5 text-zinc-500 hover:text-white bg-black rounded-lg border border-cyan-900/50 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-left">
              <h3 className="text-sm font-sans font-black tracking-widest text-white uppercase">Asistente de Ensamblaje</h3>
              <p className="text-[10px] font-mono text-cyan-600 uppercase mt-1">
                {wizardStep === 0 && "PASO 0: IDENTIFICADOR"}
                {wizardStep === 1 && "FASE 1: ACOPLAMIENTO DE NAVES"}
                {wizardStep === 2 && "FASE 2: ASIGNACIÓN DE ASTROBOTS"}
                {wizardStep === 3 && "FASE 3: CARGA DE TOOLS"}
                {wizardStep === 4 && "FASE 4: CONSUMIBLES DE EMERGENCIA"}
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {wizardStep === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center justify-center flex-1">
                <Layers className="w-12 h-12 text-cyan-500/50 mb-6" />
                <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Designa tu Flota</h4>
                <p className="text-[10px] font-mono text-zinc-400 mb-6 text-center max-w-sm">Establece un código de identificación táctico para agrupar tus activos.</p>
                <input 
                  type="text" 
                  value={fleetName}
                  onChange={(e) => setFleetName(e.target.value)}
                  placeholder="Ej: FLOTA DE ASALTO SASORI"
                  className="bg-black border-2 border-cyan-900 rounded-xl px-5 py-3 text-sm font-mono tracking-widest text-center text-white placeholder-cyan-900/50 focus:outline-none focus:border-cyan-400 w-full max-w-md uppercase mb-8 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]"
                />
                <button 
                  onClick={handleNextStep}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] cursor-pointer"
                >
                  INICIAR ENSAMBLAJE <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {wizardStep === 1 && <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">{renderSelectionGrid(1)}</motion.div>}
            {wizardStep === 2 && <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">{renderSelectionGrid(2)}</motion.div>}
            {wizardStep === 3 && <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">{renderSelectionGrid(3)}</motion.div>}
            {wizardStep === 4 && <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">{renderSelectionGrid(4)}</motion.div>}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};