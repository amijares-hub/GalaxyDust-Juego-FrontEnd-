"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { SquareArrowOutUpRight, ChevronLeft, ChevronRight, Eye, X, Info, Sparkles, Shield, Cpu } from "lucide-react";

function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export type CardStackItem = {
  id: string | number;
  title: string;
  description?: string;
  imageSrc?: string;
  href?: string;
  ctaLabel?: string;
  tag?: string;
};

export type CardStackProps<T extends CardStackItem> = {
  items: T[];

  /** Selected index on mount */
  initialIndex?: number;

  /** How many cards are visible around the active (odd recommended) */
  maxVisible?: number;

  /** Card sizing */
  cardWidth?: number;
  cardHeight?: number;

  /** How much cards overlap each other (0..0.8). Higher = more overlap */
  overlap?: number;

  /** Total fan angle (deg). Higher = wider arc */
  spreadDeg?: number;

  /** 3D / depth feel */
  perspectivePx?: number;
  depthPx?: number;
  tiltXDeg?: number;

  /** Active emphasis */
  activeLiftPx?: number;
  activeScale?: number;
  inactiveScale?: number;

  /** Motion */
  springStiffness?: number;
  springDamping?: number;

  /** Behavior */
  loop?: boolean;
  autoAdvance?: boolean;
  intervalMs?: number;
  pauseOnHover?: boolean;

  /** UI */
  showDots?: boolean;
  className?: string;

  /** Hooks */
  onChangeIndex?: (index: number, item: T) => void;
  onCtaClick?: (item: T, e: React.MouseEvent) => void;

  /** Custom renderer (optional) */
  renderCard?: (item: T, state: { active: boolean }) => React.ReactNode;
};

function wrapIndex(n: number, len: number) {
  if (len <= 0) return 0;
  return ((n % len) + len) % len;
}

/** Minimal signed offset from active index to i, with wrapping (for loop behavior). */
function signedOffset(i: number, active: number, len: number, loop: boolean) {
  const raw = i - active;
  if (!loop || len <= 1) return raw;

  // consider wrapped alternative
  const alt = raw > 0 ? raw - len : raw + len;
  return Math.abs(alt) < Math.abs(raw) ? alt : raw;
}

export function CardStack<T extends CardStackItem>({
  items,
  initialIndex = 0,
  maxVisible = 7,

  cardWidth = 520,
  cardHeight = 320,

  overlap = 0.48,
  spreadDeg = 48,

  perspectivePx = 1100,
  depthPx = 140,
  tiltXDeg = 12,

  activeLiftPx = 22,
  activeScale = 1.03,
  inactiveScale = 0.94,

  springStiffness = 280,
  springDamping = 28,

  loop = true,
  autoAdvance = false,
  intervalMs = 2800,
  pauseOnHover = true,

  showDots = true,
  className,

  onChangeIndex,
  onCtaClick,
  renderCard,
}: CardStackProps<T>) {
  const reduceMotion = useReducedMotion();
  const len = items.length;

  const [active, setActive] = React.useState(() =>
    wrapIndex(initialIndex, len),
  );
  const [hovering, setHovering] = React.useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = React.useState<T | null>(null);

  // keep active in bounds if items change
  React.useEffect(() => {
    setActive((a) => wrapIndex(a, len));
  }, [len]);

  React.useEffect(() => {
    if (!len) return;
    onChangeIndex?.(active, items[active]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const maxOffset = Math.max(0, Math.floor(maxVisible / 2));

  const cardSpacing = Math.max(10, Math.round(cardWidth * (1 - overlap)));
  const stepDeg = maxOffset > 0 ? spreadDeg / maxOffset : 0;

  const canGoPrev = loop || active > 0;
  const canGoNext = loop || active < len - 1;

  const prev = React.useCallback(() => {
    if (!len) return;
    if (!canGoPrev) return;
    setActive((a) => wrapIndex(a - 1, len));
  }, [canGoPrev, len]);

  const next = React.useCallback(() => {
    if (!len) return;
    if (!canGoNext) return;
    setActive((a) => wrapIndex(a + 1, len));
  }, [canGoNext, len]);

  // keyboard navigation (when container focused)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  };

  // autoplay
  React.useEffect(() => {
    if (!autoAdvance) return;
    if (reduceMotion) return;
    if (!len) return;
    if (pauseOnHover && hovering) return;

    const id = window.setInterval(
      () => {
        if (loop || active < len - 1) next();
      },
      Math.max(700, intervalMs),
    );

    return () => window.clearInterval(id);
  }, [
    autoAdvance,
    intervalMs,
    hovering,
    pauseOnHover,
    reduceMotion,
    len,
    loop,
    active,
    next,
  ]);

  if (!len) return null;

  const activeItem = items[active]!;

  return (
    <div
      className={cn("w-full", className)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Stage */}
      <div
        className="relative w-full outline-none"
        style={{ height: Math.max(380, cardHeight + 80) }}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {/* background wash / spotlight (unique feel) */}
        <div
          className="pointer-events-none absolute inset-x-0 top-6 mx-auto h-48 w-[70%] rounded-full bg-[#E53E3E]/5 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-40 w-[76%] rounded-full bg-black/40 blur-3xl"
          aria-hidden="true"
        />

        <div
          className="absolute inset-0 flex items-end justify-center"
          style={{
            perspective: `${perspectivePx}px`,
          }}
        >
          <AnimatePresence initial={false}>
            {items.map((item, i) => {
              const off = signedOffset(i, active, len, loop);
              const abs = Math.abs(off);
              const visible = abs <= maxOffset;

              // hide far-away cards cleanly
              if (!visible) return null;

              // fan geometry
              const rotateZ = off * stepDeg;
              const x = off * cardSpacing;
              const y = abs * 10; // subtle arc-down feel
              const z = -abs * depthPx;

              const isActive = off === 0;

              const scale = isActive ? activeScale : inactiveScale;
              const lift = isActive ? -activeLiftPx : 0;

              const rotateX = isActive ? 0 : tiltXDeg;

              const zIndex = 100 - abs;

              // drag only on the active card
              const dragProps = isActive
                ? {
                    drag: "x" as const,
                    dragConstraints: { left: 0, right: 0 },
                    dragElastic: 0.18,
                    onDragEnd: (
                      _e: any,
                      info: { offset: { x: number }; velocity: { x: number } },
                    ) => {
                      if (reduceMotion) return;
                      const travel = info.offset.x;
                      const v = info.velocity.x;
                      const threshold = Math.min(160, cardWidth * 0.22);

                      // swipe logic
                      if (travel > threshold || v > 650) prev();
                      else if (travel < -threshold || v < -650) next();
                    },
                  }
                : {};

              return (
                <motion.div
                  key={item.id}
                  className={cn(
                    "absolute bottom-0 rounded-2xl border-4 overflow-hidden bg-[#0C0D0E] will-change-transform select-none",
                    isActive
                      ? "border-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.95),0_0_35px_rgba(229,62,62,0.18)] cursor-grab active:cursor-grabbing"
                      : "border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] cursor-pointer",
                  )}
                  style={{
                    width: cardWidth,
                    height: cardHeight,
                    zIndex,
                    transformStyle: "preserve-3d",
                  }}
                  initial={
                    reduceMotion
                      ? false
                      : {
                          opacity: 0,
                          y: y + 40,
                          x,
                          rotateZ,
                          rotateX,
                          scale,
                        }
                  }
                  animate={isActive ? {
                    opacity: 1,
                    x,
                    y: y + lift,
                    rotateZ,
                    rotateX,
                    scale: [activeScale, activeScale * 1.015, activeScale],
                  } : {
                    opacity: 1,
                    x,
                    y: y + lift,
                    rotateZ,
                    rotateX,
                    scale,
                  }}
                  whileHover={!isActive ? {
                    scale: inactiveScale * 1.055,
                    transition: { duration: 0.15, ease: "easeOut" }
                  } : {}}
                  transition={{
                    scale: isActive ? {
                      repeat: Infinity,
                      duration: 3,
                      ease: "easeInOut"
                    } : { type: "tween", duration: 0.15, ease: "easeOut" },
                    type: "tween",
                    duration: 0.12,
                    ease: "linear",
                  }}
                  onClick={() => setActive(i)}
                  role="button"
                  tabIndex={isActive ? 0 : -1}
                  aria-selected={isActive}
                  aria-label={`${isActive ? 'Tarjeta activa' : 'Tarjeta inactiva'}: ${item.title}`}
                  {...dragProps}
                >
                  <div
                    className="h-full w-full"
                    style={{
                      transform: `translateZ(${z}px)`,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    {renderCard ? (
                      renderCard(item, { active: isActive })
                    ) : (
                      <DefaultFanCard 
                        item={item} 
                        active={isActive} 
                        onViewDetails={(it) => setSelectedDetailItem(it as T)} 
                        onCtaClick={onCtaClick}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Dots navigation centered at bottom */}
      {showDots ? (
        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            {items.map((it, idx) => {
              const on = idx === active;
              return (
                <motion.button
                  key={it.id}
                  onClick={() => setActive(idx)}
                  whileHover={{ scale: 1.35 }}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300 cursor-pointer block focus:outline-none",
                    on
                      ? "bg-[#E53E3E] w-5"
                      : "bg-white/20 hover:bg-white/40 w-1.5",
                  )}
                  aria-label={`Go to ${it.title}`}
                />
              );
            })}
          </div>
          {activeItem.href ? (
            <a
              href={activeItem.href}
              target="_blank"
              rel="noreferrer"
              className="text-white/40 hover:text-white transition-colors"
              aria-label="Open link"
            >
              <SquareArrowOutUpRight className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Cinematic Detail Disclosure Modal */}
      <AnimatePresence>
        {selectedDetailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg bg-[#0C0D0E] border border-white/10 rounded-2xl overflow-hidden shadow-[0_45px_100px_rgba(0,0,0,0.95)] p-7 text-left"
            >
              {/* Red glow accent top */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#E53E3E] to-transparent animate-pulse" />

              {/* Close Button */}
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="absolute top-4 right-4 p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5 hover:border-white/15 cursor-pointer outline-none"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Content Header */}
              <div className="flex items-center gap-3.5 border-b border-white/5 pb-4.5 mb-5 select-none">
                <div className="w-10 h-10 rounded-xl bg-[#E53E3E]/10 border border-[#E53E3E]/20 flex items-center justify-center text-[#E53E3E]">
                  {selectedDetailItem.title === "EXPEDICIONES" ? (
                    <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                  ) : selectedDetailItem.title === "INVENTARIO" ? (
                    <Cpu className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Shield className="w-5 h-5 text-[#E53E3E]" />
                  )}
                </div>
                <div>
                  <span className="text-[7.5px] font-mono text-[#E53E3E] tracking-[0.25em] uppercase font-black block">
                    SISTEMA SEGURO // DISPOSITIVO {selectedDetailItem.id}
                  </span>
                  <h3 className="text-sm font-black text-white tracking-widest uppercase">
                    {selectedDetailItem.title}
                  </h3>
                </div>
              </div>

              {/* Description visual card */}
              <div className="relative h-40 w-full rounded-xl overflow-hidden mb-5 border border-white/5 select-none">
                {selectedDetailItem.imageSrc ? (
                  <img src={selectedDetailItem.imageSrc} alt={selectedDetailItem.title} className="w-full h-full object-cover" style={{ filter: "brightness(0.65)" }} />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-4 inset-x-4">
                  <span className="text-[8px] font-mono px-2 py-0.5 border border-[#E53E3E]/30 bg-[#E53E3E]/10 text-[#E53E3E] rounded uppercase tracking-widest font-bold">
                    ESTADO: NOMINAL
                  </span>
                  <p className="text-[11px] text-white/90 font-medium leading-relaxed mt-1.5 font-sans">
                    {selectedDetailItem.description}
                  </p>
                </div>
              </div>

              {/* Unique Specifications Table */}
              <div className="space-y-2.5 font-mono text-[9px] uppercase select-none">
                <h4 className="text-[7.5px] font-mono tracking-widest text-white/30 border-b border-white/5 pb-1">ESPECIFICACIONES DEL SECTOR TRABAJO</h4>
                {selectedDetailItem.title === "EXPEDICIONES" ? (
                  <>
                    <div className="flex justify-between border-b border-white/5 pb-1.5 text-white/70">
                      <span>SECTOR ESTELAR:</span>
                      <span className="text-white font-bold text-right">Sector-97 // Gamma</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1.5 text-white/70">
                      <span>COORDENADAS:</span>
                      <span className="text-white font-bold text-right">X: 38.411, Y: -120.908</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1.5 text-white/70">
                      <span>RECURSOS ESPERADOS:</span>
                      <span className="text-emerald-400 font-bold text-right">Helio Líquido / Kristalio-X</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1.5 text-white/70">
                      <span>EFICIENCIA DE ESCUDOS:</span>
                      <span className="text-[#E53E3E] font-bold text-right">98.4% NOMINAL</span>
                    </div>
                  </>
                ) : selectedDetailItem.title === "INVENTARIO" ? (
                  <>
                    <div className="flex justify-between border-b border-white/5 pb-1.5 text-white/70">
                      <span>SISTEMA INTEGRAL:</span>
                      <span className="text-white font-bold text-right">SasoriCore V-18.4</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1.5 text-white/70">
                      <span>CAPACIDAD CUÁNTICA:</span>
                      <span className="text-white font-bold text-right">8,192 Qubits Encriptados</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1.5 text-white/70">
                      <span>TECNOLOGÍA DEFLECTORA:</span>
                      <span className="text-emerald-400 font-bold text-right">Escudos Neón Cuánticos</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1.5 text-white/70">
                      <span>RENDIMIENTO CRÍTICO:</span>
                      <span className="text-white font-bold text-right">99.98% ESTABILIZADO</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between border-b border-white/5 pb-1.5 text-white/70">
                      <span>ALCANCE ANTENA:</span>
                      <span className="text-white font-bold text-right">14.2 Años Luz</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1.5 text-white/70">
                      <span>FACCIONES EN ENLACE:</span>
                      <span className="text-white font-bold text-right">5 Células Activas</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1.5 text-white/70">
                      <span>ENCRIPTACIÓN INTEGRADA:</span>
                      <span className="text-white font-bold text-right">MFA Criptográfica TLS-3</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1.5 text-white/70">
                      <span>VELOCIDAD TRANSMISIÓN:</span>
                      <span className="text-emerald-400 font-bold text-right">2.4 Zimbibytes / seg</span>
                    </div>
                  </>
                )}
              </div>

              {/* Action */}
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="mt-6 w-full py-3 bg-[#E53E3E] hover:bg-[#FF4A4A] text-white font-mono text-[9px] font-black uppercase tracking-widest rounded-xl transition-colors cursor-pointer text-center block"
              >
                CERRAR SISTEMA MONITOR
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DefaultFanCard({
  item,
  active,
  onViewDetails,
  onCtaClick,
}: {
  item: CardStackItem;
  active: boolean;
  onViewDetails?: (item: CardStackItem) => void;
  onCtaClick?: (item: CardStackItem, e: React.MouseEvent) => void;
}) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleCtaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCtaClick) {
      onCtaClick(item, e);
      return;
    }
    if (!item.href) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      window.open(item.href, "_blank", "noopener,noreferrer");
    }, 1250);
  };

  return (
    <div className="relative h-full w-full bg-[#0C0D0E]/90 group">
      {/* Link processing loading overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0C0D0E]/95 backdrop-blur-md z-30 flex flex-col items-center justify-center select-none rounded-2xl"
          >
            {/* Spinning indicator */}
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#E53E3E] animate-spin" />
              <div className="absolute w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              </div>
            </div>
            
            <p className="mt-4 text-[9px] font-mono tracking-[0.2em] text-[#E53E3E] uppercase font-black">
              PROCESANDO ENLACE...
            </p>
            <p className="mt-1 text-[8.5px] font-mono tracking-widest text-white/40 uppercase">
              CARGANDO SECTOR DE COMBATE
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* image */}
      <div className="absolute inset-0 z-0">
        {item.imageSrc ? (
          <img
            src={item.imageSrc}
            alt={item.title}
            className={cn(
              "h-full w-full object-cover transition-transform duration-700",
              active ? "scale-105 animate-pulse" : "scale-100 group-hover:scale-102"
            )}
            style={{ filter: "brightness(0.7) contrast(1.1)", animationDuration: active ? "6s" : "0" }}
            draggable={false}
            loading="eager"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-xs font-mono text-white/20">
            [SIN ASIGNAR]
          </div>
        )}
      </div>

      {/* INACTIVE CARD: subtle overlay with light blur on hover */}
      {!active && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-1" />
      )}

      {/* ACTIVE CARD: more pronounced overlay with light blur */}
      {active && (
        <div className="absolute inset-0 bg-black/35 backdrop-blur-[1.5px] pointer-events-none z-1" />
      )}

      {/* subtle gradient overlay at bottom for text readability */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-2" />
      
      {/* active border outline inside */}
      <div className={cn(
        "absolute inset-0 border transition-colors duration-500 rounded-xl pointer-events-none z-10",
        active ? "border-[#E53E3E]/30" : "border-transparent"
      )} />

      {/* Swipe Assistance indicators on Active Card */}
      {active && (
        <>
          {/* Swiping helper - Left arrow */}
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: [0.3, 0.8, 0.3], x: [3, -5, 3] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20 pointer-events-none bg-black/60 border border-white/10 rounded-full p-1.5 backdrop-blur-sm shadow-md"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-white/90" />
          </motion.div>
          {/* Swiping helper - Right arrow */}
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: [0.3, 0.8, 0.3], x: [-3, 5, -3] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 pointer-events-none bg-black/60 border border-white/10 rounded-full p-1.5 backdrop-blur-sm shadow-md"
          >
            <ChevronRight className="w-3.5 h-3.5 text-white/90" />
          </motion.div>
        </>
      )}

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-end p-6 select-none">
        {/* Dynamic Tag */}
        {item.tag && (
          <div className="mb-2 h-5 flex items-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.92 }}
              animate={active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-[7.5px] font-mono tracking-[0.2em] bg-[#E53E3E]/10 border border-[#E53E3E]/30 px-2.5 py-1 text-[#E53E3E] rounded uppercase inline-block"
            >
              {item.tag}
            </motion.span>
          </div>
        )}

        <div className="truncate text-base font-sans font-black tracking-wider text-white uppercase">
          {item.title}
        </div>
        
        {item.description ? (
          <div className="mt-1.5 relative overflow-hidden text-[11px] leading-relaxed text-[#A0A2A5] font-sans font-medium max-h-[34px]">
            <div className="line-clamp-2 pr-1">{item.description}</div>
            <div className="absolute inset-x-0 bottom-0 h-3.5 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
          </div>
        ) : null}

        {/* Action & Detail Controls Box */}
        {active && (
          <div className="mt-4 flex flex-wrap items-center gap-2.5 animate-fade-in-up duration-300">
            {/* View Details Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onViewDetails) onViewDetails(item);
              }}
              className="inline-flex items-center gap-1.5 text-[8.5px] font-mono tracking-[0.15em] text-white/80 hover:text-white font-extrabold uppercase bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all cursor-pointer"
              aria-label={`Ver detalles para ${item.title}`}
            >
              <Eye className="w-3.5 h-3.5 text-[#E53E3E]" aria-hidden="true" />
              VER DETALLES
            </button>

            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[8.5px] font-mono tracking-[0.15em] text-[#E53E3E] hover:text-[#FF5A5A] font-extrabold uppercase bg-[#E53E3E]/5 hover:bg-[#E53E3E]/12 px-3 py-1.5 rounded-lg border border-[#E53E3E]/30 transition-all"
                onClick={handleCtaClick}
                aria-label={`Abrir enlace para ${item.title}`}
              >
                {item.ctaLabel || "INICIAR INTERRUPCIÓN"}
                <SquareArrowOutUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
