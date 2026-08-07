import React, { useState, useEffect } from 'react';
import { ChevronLeft, ShoppingBag, Clock } from 'lucide-react';

const PHANTOM_COIN_ASSET = "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Phantom%20Coin.png";

interface PhantomStationViewProps {
  playerGems?: number;
  setPlayerGems?: (v: any) => void;
  playerPower?: number;
  setPlayerPower?: (v: any) => void;
  playerGold?: number;
  setPlayerGold?: (v: any) => void;
  onBack: () => void;
  triggerNotification?: (text: string, e?: any) => void;
}

interface PhantomBlueprint {
  id: string;
  name: string;
  category: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  pricePH: number;
  description: string;
  image: string;
}

export const PhantomStationView: React.FC<PhantomStationViewProps> = ({
  onBack,
  triggerNotification
}) => {
  // Estado para el contador cíclico de 3 horas
  const [refreshCountdown, setRefreshCountdown] = useState<string>('03:00:00');

  // Catálogo de 8 Activos Exclusivos de la Phantom Station
  const [blueprints] = useState<PhantomBlueprint[]>([
    {
      id: 'PH-01',
      name: 'BLUEPRINT CRUCERO VOID-HUNTER',
      category: 'NAVES INSIGNIA',
      rarity: 'LEGENDARY',
      pricePH: 500,
      description: 'Plano de ensamblaje para crucero estelar de alta movilidad con cañones de pulso oscuro.',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300'
    },
    {
      id: 'PH-02',
      name: 'MATRIZ ESCUDO COLOIDAL MK-V',
      category: 'TECNOLOGÍA DEFENSIVA',
      rarity: 'EPIC',
      pricePH: 250,
      description: 'Dispositivo hiperdimensional que incrementa la absorción de daño cinético.',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300'
    },
    {
      id: 'PH-03',
      name: 'NÚCLEO SINÁPTICO C.A.N. ADVANCED',
      category: 'SISTEMAS C.A.N.',
      rarity: 'RARE',
      pricePH: 120,
      description: 'Módulo de aceleración para procesamiento de recursos y escaneo estelar.',
      image: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=300'
    },
    {
      id: 'PH-04',
      name: 'PROTOTIPO CAZADOR PHANTOM-X',
      category: 'NAVES LIGERAS',
      rarity: 'EPIC',
      pricePH: 350,
      description: 'Nave sigilosa con propulsión de materia oscura no detectable.',
      image: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=300'
    },
    {
      id: 'PH-05',
      name: 'REACTOR MATERIA OSCURA MK-II',
      category: 'MOTORES DE SALTO',
      rarity: 'LEGENDARY',
      pricePH: 650,
      description: 'Generador hiperespacial capaz de duplicar la velocidad en expediciones.',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300'
    },
    {
      id: 'PH-06',
      name: 'CAÑÓN IMPULSO QUANTUM',
      category: 'ARMAMENTO PESADO',
      rarity: 'EPIC',
      pricePH: 300,
      description: 'Artillería que perfora escudos gravitacionales con energía coloidal.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300'
    },
    {
      id: 'PH-07',
      name: 'SISTEMA DE SIGILO CORD-X',
      category: 'TECNOLOGÍA TÁCTICA',
      rarity: 'RARE',
      pricePH: 180,
      description: 'Módulo de camuflaje cuántico para evitar intercepciones hostiles.',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300'
    },
    {
      id: 'PH-08',
      name: 'DROIDE REPARADOR VOID MK-I',
      category: 'ASTROBOTS',
      rarity: 'COMMON',
      pricePH: 80,
      description: 'Unidad robótica especializada en la restauración de casco.',
      image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=300'
    }
  ]);

  // Lógica del contador regresivo de 3 horas
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
      const remainingMs = THREE_HOURS_MS - (now % THREE_HOURS_MS);

      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      setRefreshCountdown(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAcquireBlueprint = (bp: PhantomBlueprint) => {
    if (triggerNotification) {
      triggerNotification(`📜 ACTIVO VOID ADQUIRIDO: ${bp.name}`);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-[#080b0e] border border-cyan-500/30 p-3 rounded-2xl shadow-2xl relative overflow-hidden font-mono text-left select-none">
      
      <div className="w-full flex flex-col lg:flex-row gap-3 items-stretch">
        
        {/* ─── 1. COLUMNA IZQUIERDA: HERO POSTER COMPACTO ─── */}
        <div className="w-full lg:w-3/12 shrink-0 relative rounded-xl overflow-hidden border border-cyan-500/40 bg-[#05070a] flex flex-col justify-between p-3 min-h-[360px] shadow-2xl group">
          
          {/* Imagen de Fondo de la Phantom Station */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Phatom%20Station/Skin%20Original/phantom%20station.png"
              alt="Phantom Station"
              className="w-full h-full object-cover object-center brightness-75 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080b0e] via-[#080b0e]/40 to-black/60 z-10" />
            <div className="absolute inset-0 bg-cyan-950/20 mix-blend-overlay z-10" />
          </div>

          {/* Top Izquierdo: Botón Volver */}
          <div className="relative z-20 flex justify-between items-center">
            <button
              onClick={onBack}
              className="p-1.5 bg-black/80 hover:bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded-lg transition-all cursor-pointer backdrop-blur-md flex items-center gap-1 text-[8px] font-bold uppercase shadow-lg"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>VOLVER</span>
            </button>
          </div>

          {/* Bottom Izquierdo: Título, Descripción y Contador Discreto */}
          <div className="relative z-20 flex flex-col gap-1.5 mt-auto text-left">
            <h1 className="text-lg lg:text-xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
              PHANTOM STATION
            </h1>

            <p className="text-[8px] text-zinc-300 font-sans normal-case leading-tight">
              Estación espacial descentralizada para la adquisición de blueprints, prototipos de combate y tecnología coloidal.
            </p>

            {/* Contador Discreto de 3 Horas para Refresco de Inventario */}
            <div className="flex items-center gap-1.5 mt-1 bg-black/80 border border-cyan-500/40 px-2.5 py-1 rounded-lg backdrop-blur-md w-fit">
              <Clock className="w-3 h-3 text-cyan-400 animate-pulse shrink-0" />
              <div className="flex items-center gap-1 text-[7.5px] font-mono uppercase">
                <span className="text-zinc-400">REFRESCO EN:</span>
                <span className="text-amber-400 font-black tracking-wider">{refreshCountdown}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ─── 2. COLUMNA DERECHA: GRID DE 8 ITEMS EN MATRIZ 4x2 ─── */}
        <div className="flex-1 w-full lg:w-9/12 bg-[#05070a] border border-cyan-500/20 p-2.5 rounded-xl flex flex-col justify-between">
          
          {/* Grilla 4 Columnas x 2 Filas (8 Items Simultáneos) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full h-full">
            {blueprints.map((bp) => (
              <div
                key={bp.id}
                className="bg-[#050910] border border-cyan-500/30 hover:border-cyan-400 p-2 rounded-lg shadow-xl flex flex-col justify-between gap-1.5 transition-all relative group"
              >
                {/* Categoría y Rareza */}
                <div className="flex justify-between items-center border-b border-cyan-950 pb-1">
                  <span className="text-[6.5px] text-cyan-400/80 font-bold uppercase truncate max-w-[70px]">{bp.category}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[6px] font-black uppercase border shrink-0 ${
                    bp.rarity === 'LEGENDARY' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                    bp.rarity === 'EPIC' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                    'bg-cyan-950 text-cyan-300 border-cyan-800'
                  }`}>
                    {bp.rarity}
                  </span>
                </div>

                {/* Imagen e Info del Activo */}
                <div className="flex flex-col gap-1">
                  <div className="w-full h-16 bg-black border border-cyan-950 rounded p-0.5 overflow-hidden flex items-center justify-center">
                    <img
                      src={bp.image}
                      alt={bp.name}
                      className="w-full h-full object-cover rounded brightness-90 group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <h3 className="text-[8.5px] font-black text-white uppercase tracking-wider line-clamp-1">{bp.name}</h3>
                  <p className="text-[7.5px] text-zinc-400 font-sans normal-case line-clamp-1 leading-tight">{bp.description}</p>
                </div>

                {/* Bloque de Precio Exclusivo con Icono de Phantom Coin */}
                <div className="bg-[#020305] border border-cyan-950 p-1 rounded flex justify-between items-center text-[7.5px]">
                  <span className="text-[6.5px] text-zinc-500 uppercase font-bold">PRECIO</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9.5px] font-black text-cyan-300">{bp.pricePH.toLocaleString()}</span>
                    <img src={PHANTOM_COIN_ASSET} alt="Phantom Coin" className="w-3.5 h-3.5 object-contain" />
                  </div>
                </div>

                {/* Botón Adquirir */}
                <button
                  onClick={() => handleAcquireBlueprint(bp)}
                  className="w-full py-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-110 text-white font-black text-[7.5px] uppercase rounded transition-all cursor-pointer flex items-center justify-center gap-1 shadow-[0_0_6px_rgba(6,182,212,0.3)]"
                >
                  <ShoppingBag className="w-3 h-3" />
                  <span>ADQUIRIR ({bp.pricePH}</span>
                  <img src={PHANTOM_COIN_ASSET} alt="Phantom Coin" className="w-3 h-3 object-contain" />
                  <span>)</span>
                </button>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};