import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResourceEngine } from '../hooks/useResourceEngine';
import { Hexagon } from 'lucide-react';

// Formato militar corto para números grandes (ej. 1500 -> 1.5K)
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return Math.floor(num).toString();
};

// Umbral mínimo de incremento para disparar el glow (evita parpadeo por producción pasiva).
// El glow solo se activa si el salto es mayor a 5 unidades (ej. un botín de expedición).
const GLOW_THRESHOLD = 5;

export const ResourceHUD: React.FC = () => {
  const { metal, crystal } = useResourceEngine();

  const prevMetalRef = useRef<number>(metal);
  const prevCrystalRef = useRef<number>(crystal);

  const [metalGlow, setMetalGlow] = useState(false);
  const [crystalGlow, setCrystalGlow] = useState(false);

  // Partículas flotantes al cobrar botín
  const [metalParticles, setMetalParticles] = useState<number[]>([]);
  const [crystalParticles, setCrystalParticles] = useState<number[]>([]);

  // Detector de saltos grandes en METAL (cobro de botín)
  useEffect(() => {
    const prev = prevMetalRef.current;
    const delta = metal - prev;

    if (delta >= GLOW_THRESHOLD) {
      setMetalGlow(true);
      setMetalParticles([Date.now(), Date.now() + 1, Date.now() + 2]);
      const timer = setTimeout(() => {
        setMetalGlow(false);
        setMetalParticles([]);
      }, 900);
      prevMetalRef.current = metal;
      return () => clearTimeout(timer);
    }

    prevMetalRef.current = metal;
  }, [metal]);

  // Detector de saltos grandes en CRISTAL (cobro de botín)
  useEffect(() => {
    const prev = prevCrystalRef.current;
    const delta = crystal - prev;

    if (delta >= GLOW_THRESHOLD) {
      setCrystalGlow(true);
      setCrystalParticles([Date.now(), Date.now() + 1, Date.now() + 2]);
      const timer = setTimeout(() => {
        setCrystalGlow(false);
        setCrystalParticles([]);
      }, 900);
      prevCrystalRef.current = crystal;
      return () => clearTimeout(timer);
    }

    prevCrystalRef.current = crystal;
  }, [crystal]);

  return (
    <div className="fixed top-2 left-0 w-full z-50 flex justify-center pointer-events-none px-4">
      <div className="bg-[#0c0d0e]/95 backdrop-blur-lg border border-white/10 rounded-full px-5 py-2 flex items-center gap-6 shadow-[0_0_20px_rgba(0,0,0,0.6)] pointer-events-auto">

        {/* === CONTENEDOR METAL === */}
        <motion.div
          className="relative flex items-center gap-2"
          animate={{ scale: metalGlow ? 1.12 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          <div className={`flex items-center justify-center w-7 h-7 rounded-md bg-[#131518] transition-all duration-300 ${metalGlow ? 'border border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]' : 'border border-emerald-500/20'}`}>
            <Hexagon className={`w-4 h-4 transition-colors duration-300 ${metalGlow ? 'text-emerald-300' : 'text-emerald-500'}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest leading-none">Metal</span>
            <span className={`font-mono text-sm font-black leading-none mt-0.5 transition-colors duration-300 ${metalGlow ? 'text-emerald-300 drop-shadow-[0_0_5px_rgba(52,211,153,0.9)]' : 'text-white'}`}>
              {formatNumber(metal)}
            </span>
          </div>
          {/* Partículas de botín para Metal */}
          <AnimatePresence>
            {metalParticles.map((key, i) => (
              <motion.span
                key={key}
                className="absolute -top-4 left-1/2 text-[10px] font-black text-emerald-400 pointer-events-none font-mono"
                initial={{ opacity: 1, y: 0, x: (i - 1) * 10 }}
                animate={{ opacity: 0, y: -20 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                +
              </motion.span>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* === SEPARADOR ESTRUCTURAL === */}
        <div className="w-[2px] h-6 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

        {/* === CONTENEDOR CRISTAL === */}
        <motion.div
          className="relative flex items-center gap-2"
          animate={{ scale: crystalGlow ? 1.12 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          <div className={`flex items-center justify-center w-7 h-7 rounded-md bg-[#131518] transition-all duration-300 ${crystalGlow ? 'border border-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.9)]' : 'border border-cyan-500/20'}`}>
            {/* Gema de cristal (cuadrado rotado) */}
            <div className={`w-2.5 h-2.5 rotate-45 transition-all duration-300 ${crystalGlow ? 'border-[1.5px] border-cyan-300 bg-cyan-400/30' : 'border-[1.5px] border-cyan-500 bg-cyan-500/10'}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-cyan-500/80 uppercase tracking-widest leading-none">Cristal</span>
            <span className={`font-mono text-sm font-black leading-none mt-0.5 transition-colors duration-300 ${crystalGlow ? 'text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.9)]' : 'text-white'}`}>
              {formatNumber(crystal)}
            </span>
          </div>
          {/* Partículas de botín para Cristal */}
          <AnimatePresence>
            {crystalParticles.map((key, i) => (
              <motion.span
                key={key}
                className="absolute -top-4 left-1/2 text-[10px] font-black text-cyan-400 pointer-events-none font-mono"
                initial={{ opacity: 1, y: 0, x: (i - 1) * 10 }}
                animate={{ opacity: 0, y: -20 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                +
              </motion.span>
            ))}
          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  );
};
