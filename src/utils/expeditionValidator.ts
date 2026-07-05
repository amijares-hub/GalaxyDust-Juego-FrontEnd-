export interface FleetAsset {
  id: string;
  name: string;
  type: 'ship' | 'robot' | 'tool' | 'tech' | 'structure';
  is_nft: boolean; // true = Quantum, false = Non-Quantum
  hp: number;
  max_hp: number;
  fleet_space?: number; // Peso volumétrico de la nave
  engine_type?: 'IMPULSE' | 'HYPERSPACE' | 'NONE';
  tech_type?: string;   // Tipo/Familia de tecnología
  is_armed?: boolean;   // Si posee cañones KIN, LAS, PLA, etc.
}

interface ValidationContext {
  fleet: {
    ships: FleetAsset[];
    astrobots: FleetAsset[];
    tools: FleetAsset[];
  };
  completedExpeditionsByGC: Record<string, number>; // Ej: { "GC1": 250, "GC2": 10 }
  hasStorageDeposits: boolean;
  activeFlightsCount: number;
}

export const validateExpeditionDispatch = (
  clusterName: string,
  ctx: ValidationContext
): { canLaunch: boolean; reason?: string } => {
  const { fleet, completedExpeditionsByGC, hasStorageDeposits, activeFlightsCount } = ctx;
  
  // ─── REGLA 1: CONTROL CRÍTICO DE HERRAMIENTAS ───
  if (fleet.tools.length === 0) {
    return { canLaunch: false, reason: "Bloqueo Logístico: No se pueden enviar expediciones sin herramientas (Tools)." };
  }
  if (fleet.tools.length > 1) {
    return { canLaunch: false, reason: "Restricción de Bahía: No se puede equipar más de una herramienta por expedición." };
  }

  // ─── REGLA 2: ARMAMENTO SEGURO ───
  const isArmedFleet = fleet.ships.some(s => s.is_armed);
  if (isArmedFleet && fleet.tools.length === 0) {
    return { canLaunch: false, reason: "Protocolo Militar: No se puede enviar una flota armada si no se añade una herramienta." };
  }

  // ─── REGLA 3: ANÁLISIS DE ESPACIO VOLUMÉTRICO DE FLOTA ───
  const maxAllowedSpace = 30; // Este límite puede leerse dinámicamente de la Licencia
  const totalOccupiedSpace = fleet.ships.reduce((acc, s) => acc + (s.fleet_space || 0), 0);
  if (totalOccupiedSpace > maxAllowedSpace) {
    return { canLaunch: false, reason: `Exceso de Carga: La flota supera el máximo de espacios disponibles (${totalOccupiedSpace}/${maxAllowedSpace}).` };
  }

  // ─── REGLA 4: ALMACENAMIENTO DE RECURSOS ───
  if (!hasStorageDeposits) {
    // Alerta visual de desbordamiento de almacenes en el frontend
    console.warn("Advertencia: Al no poseer depósitos, los recursos que excedan el tope se destruirán.");
  }

  // ─── 🧭 REQUISITOS DE ACCESO SELECTIVO POR CÚMULO GALÁCTICO (GC) ───
  const gc = clusterName.toUpperCase();
  const hasShips = fleet.ships.length > 0;
  const hasTools = fleet.tools.length === 1;

  if (gc === 'PELA') {
    const hasNonNftShip = fleet.ships.some(s => !s.is_nft);
    if (!hasNonNftShip) return { canLaunch: false, reason: "Requisito PELA: Debes tener al menos una nave No-NFT por flota." };
  }

  if (gc === 'GC1' && (!hasShips || !hasTools)) {
    return { canLaunch: false, reason: "Requisito GC1: Requiere un mazo compuesto por Nave + Herramienta." };
  }

  if (gc === 'GC2') {
    if ((completedExpeditionsByGC['GC1'] || 0) < 200) {
      return { canLaunch: false, reason: `Acceso Denegado: Requiere 200 expediciones completadas en GC1 (Llevas: ${completedExpeditionsByGC['GC1'] || 0}).` };
    }
    if (!hasShips || !hasTools) return { canLaunch: false, reason: "Requisito GC2: Requiere Nave + Herramienta." };
  }

  if (gc === 'GC3') {
    if ((completedExpeditionsByGC['GC2'] || 0) < 300) {
      return { canLaunch: false, reason: "Acceso Denegado: Requiere 300 expediciones completadas en GC2." };
    }
    // La validación de licencia se asume superada al entrar al panel de despacho
  }

  if (gc === 'GC4' || gc === 'GC5' || gc === 'GC6') {
    const minRequired = gc === 'GC4' ? 400 : gc === 'GC5' ? 500 : 100;
    const previousGC = gc === 'GC4' ? 'GC3' : gc === 'GC5' ? 'GC4' : 'GC5';
    
    if ((completedExpeditionsByGC[previousGC] || 0) < minRequired) {
      return { canLaunch: false, reason: `Acceso Denegado: Requiere ${minRequired} misiones en ${previousGC}.` };
    }
    
    const hasValidEngine = fleet.ships.some(s => s.engine_type === 'IMPULSE' || s.engine_type === 'HYPERSPACE');
    if (!hasValidEngine) return { canLaunch: false, reason: `Requisito ${gc}: Al menos una nave debe portar un motor Impulse o Hyperspace.` };
  }

  if (gc === 'GC7' || gc === 'GC8') {
    const minRequired = gc === 'GC7' ? 200 : 300;
    const previousGC = gc === 'GC7' ? 'GC6' : 'GC7';

    if ((completedExpeditionsByGC[previousGC] || 0) < minRequired) {
      return { canLaunch: false, reason: `Acceso Denegado: Requiere ${minRequired} misiones en ${previousGC}.` };
    }

    const hasHSEngine = fleet.ships.some(s => s.engine_type === 'HYPERSPACE');
    if (!hasHSEngine) return { canLaunch: false, reason: `Requisito de Salto Extremo ${gc}: Requiere estrictamente motores Hyperspace (HS Engine).` };
  }

  return { canLaunch: true };
};

// ─── REGLAS COMPLEMENTARIAS DE C.A.N. Y RESTRICCIONES DE TECNOLOGÍA ───
export const validateCanModification = (activeFlightsCount: number): boolean => {
  return activeFlightsCount === 0; // Falso si hay naves en vuelo
};

export const validateTechnologyEquip = (equippedTechs: FleetAsset[], newTech: FleetAsset): boolean => {
  return !equippedTechs.some(t => t.tech_type === newTech.tech_type);
};
