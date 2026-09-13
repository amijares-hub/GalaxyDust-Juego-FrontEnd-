import React from 'react';

interface IconProps {
  className?: string;
}

// 🔨 1. CONSTRUCCIÓN / ESTRUCTURAS (Inspirado en crafting.jpg)
export const SciFiCraftingIcon: React.FC<IconProps> = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg className={`${className} filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 13.5L9.5 18.7M14.7 13.5L18.2 17M14.7 13.5L10 8.8" />
    <path d="M5.5 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" strokeDasharray="2 2" />
    <path d="M12 2l3 3-4 4 1.5 1.5 4-4 3 3L17 12l4 4-3.5 3.5L14 16l-2.5 3.5" />
  </svg>
);

// 🚀 2. NAVE / VELOCIDAD (Inspirado en image (1).jpg y image (6).jpg)
export const SciFiSpeedIcon: React.FC<IconProps> = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg className={`${className} filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5l-2.5 3 4-1 3 3 3-2.5" />
    <path d="M12 3l9 9-4.5 1.5L12 9l-4.5 4.5L3 12l9-9z" />
    <path d="M2 12l4-4M5 15l4-4M8 18l4-4" />
  </svg>
);

// 🔫 3. ARMA / COMBATE (Inspirado en image (2).jpg)
export const SciFiWeaponIcon: React.FC<IconProps> = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg className={`${className} filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11h11v4H3zM14 12h5v2h-5zM6 15l-2 6h3l2-6zM19 10v6M21 11v4" />
    <path d="M8 8h4v3H8z" />
  </svg>
);

// 🌐 4. RED / C.A.N. NODES (Inspirado en image (3).jpg)
export const SciFiNodeIcon: React.FC<IconProps> = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg className={`${className} filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3" />
    <circle cx="5" cy="18" r="3" />
    <circle cx="19" cy="18" r="3" />
    <path d="M12 8v4M10 13.5L6.5 16M14 13.5l3.5 2.5" />
  </svg>
);

// ⚛️ 5. ÁTOMO / CIENCIA (Inspirado en image (4).jpg)
export const SciFiAtomIcon: React.FC<IconProps> = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg className={`${className} filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)" />
    <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(90 12 12)" />
    <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(150 12 12)" />
  </svg>
);

// 💥 6. LÁSER / ENERGÍA (Inspirado en image (5).jpg)
export const SciFiLaserIcon: React.FC<IconProps> = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg className={`${className} filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="12" r="3" />
    <path d="M9 12h12M18 6l3 6-3 6M15 8l3 4-3 4M21 12h-2" />
  </svg>
);

// ⏱️ 7. TEMPORIZADOR / TRÁNSITO (Inspirado en image (7).jpg)
export const SciFiTimerIcon: React.FC<IconProps> = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg className={`${className} filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l3 3M10 2h4M12 2v3M19 6l-1.5 1.5" />
  </svg>
);