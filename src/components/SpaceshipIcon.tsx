import React from 'react';
import { motion } from 'framer-motion';

export const SpaceshipIcon: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-4 select-none">
      {/* Dynamic thrust fire glow aura */}
      <div className="absolute inset-x-0 bottom-4 h-48 bg-gradient-to-t from-fuchsia-600/15 via-purple-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Futuristic spacecraft core hull vector rendering */}
      <div className="relative w-52 h-52 md:w-60 md:h-60 flex items-center justify-center">
        {/* Plasma Flame Jet Embers Particles */}
        <div className="absolute top-[75%] left-[45%] w-2 h-14 bg-gradient-to-t from-transparent via-fuchsia-500 to-white rounded-full blur-[2px] animate-pulse" />
        <div className="absolute top-[75%] left-[53%] w-2 h-14 bg-gradient-to-t from-transparent via-fuchsia-500 to-white rounded-full blur-[2px] animate-pulse [animation-delay:0.2s]" />
        
        <motion.svg
          viewBox="0 0 240 240"
          className="w-full h-full drop-shadow-[0_0_30px_rgba(168,85,247,0.35)]"
          animate={{
            y: [0, -4, 0],
            rotateX: [12, 16, 12],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ transformStyle: 'preserve-3d', perspective: 800 }}
        >
          <defs>
            {/* Dark Metallic armor fill */}
            <linearGradient id="hullDark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E1625" />
              <stop offset="50%" stopColor="#0B0912" />
              <stop offset="100%" stopColor="#251E32" />
            </linearGradient>

            {/* Glowing neon purple panels */}
            <linearGradient id="neonPurple" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D946EF" />
              <stop offset="100%" stopColor="#701A75" />
            </linearGradient>

            {/* Wing armor plate highlights */}
            <linearGradient id="platingShade" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B2654" />
              <stop offset="100%" stopColor="#180C26" />
            </linearGradient>

            {/* Glowing thruster vector plasma */}
            <linearGradient id="thrusterPlasma" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#E879F9" />
              <stop offset="70%" stopColor="#A21CAF" />
              <stop offset="100%" stopColor="#4A044E" stopOpacity="0" />
            </linearGradient>

            {/* Cockpit holographic shield */}
            <linearGradient id="canopyGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F472B6" />
              <stop offset="100%" stopColor="#581C87" />
            </linearGradient>
            
            <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* BACKGROUND ENERGY FIELD RINGS */}
          <ellipse cx="120" cy="180" rx="45" ry="12" fill="none" stroke="#D946EF" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3, 5" />
          <ellipse cx="120" cy="195" rx="30" ry="8" fill="none" stroke="#D946EF" strokeWidth="0.8" strokeOpacity="0.15" />

          {/* THRUST PLASMA PLUMES */}
          <path d="M 103,172 L 107,240 L 111,172 Z" fill="url(#thrusterPlasma)" opacity="0.9" />
          <path d="M 129,172 L 133,240 L 137,172 Z" fill="url(#thrusterPlasma)" opacity="0.9" />

          {/* SPACESHIP GEOMETRY */}
          {/* 1. Tail Fins / Back stabilizers */}
          <polygon points="120,45 110,95 120,85 130,95" fill="#1E0E2E" stroke="#701A75" strokeWidth="1" />
          <polygon points="120,45 120,85 130,95" fill="#14071F" />

          {/* 2. Left Wing */}
          <polygon points="120,95 35,160 55,178 100,165" fill="url(#hullDark)" stroke="#4A1D6D" strokeWidth="1" />
          <polygon points="110,110 48,158 60,168 100,158" fill="url(#platingShade)" />
          <polyline points="55,157 95,145 100,155" fill="none" stroke="#D946EF" strokeWidth="1.5" strokeLinecap="round" filter="url(#purpleGlow)" />

          {/* 3. Right Wing */}
          <polygon points="120,95 205,160 185,178 140,165" fill="url(#hullDark)" stroke="#4A1D6D" strokeWidth="1" />
          <polygon points="130,110 192,158 180,168 140,158" fill="url(#platingShade)" />
          <polyline points="185,157 145,145 140,155" fill="none" stroke="#D946EF" strokeWidth="1.5" strokeLinecap="round" filter="url(#purpleGlow)" />

          {/* 4. Thruster Engine Cowlings and Mounts */}
          <rect x="98" y="154" width="14" height="20" rx="3" fill="#0D0714" stroke="#D946EF" strokeWidth="1.2" />
          <rect x="128" y="154" width="14" height="20" rx="3" fill="#0D0714" stroke="#D946EF" strokeWidth="1.2" />

          {/* 5. Main Mid Fuselage */}
          <polygon points="120,50 90,140 105,165 135,165 150,140" fill="url(#hullDark)" stroke="#701A75" strokeWidth="1.2" />
          
          {/* 6. Nose Plating */}
          <polygon points="120,50 100,140 120,158" fill="#1D122D" stroke="#A21CAF" strokeWidth="0.8" />
          <polygon points="120,50 120,158 140,140" fill="#120B1D" stroke="#A21CAF" strokeWidth="0.8" />

          {/* 7. Canopy Glass */}
          <polygon points="120,78 110,125 120,140" fill="url(#canopyGlass)" opacity="0.9" stroke="#E879F9" strokeWidth="0.8" filter="url(#purpleGlow)" />
          <polygon points="120,78 120,140 130,125" fill="#701A75" opacity="0.8" stroke="#E879F9" strokeWidth="0.8" />

          {/* 8. Laser Emitters */}
          <line x1="39" y1="162" x2="33" y2="152" stroke="#F472B6" strokeWidth="1.5" strokeLinecap="round" filter="url(#purpleGlow)" />
          <line x1="201" y1="162" x2="207" y2="152" stroke="#F472B6" strokeWidth="1.5" strokeLinecap="round" filter="url(#purpleGlow)" />

          {/* 9. Core Center Module */}
          <circle cx="120" cy="148" r="4.5" fill="#FFFFFF" filter="url(#purpleGlow)" />
          <circle cx="120" cy="148" r="2" fill="#D946EF" />
        </motion.svg>
      </div>

      {/* Cybernetic HUD elements */}
      <div className="absolute top-2 left-2 text-[7px] font-mono text-purple-400/40 uppercase tracking-widest pointer-events-none">
        ENG_BURN::95_KW
      </div>
      <div className="absolute bottom-2 right-2 text-[7px] font-mono text-fuchsia-400/40 uppercase tracking-widest pointer-events-none">
        WEAP_SYS::STA_OFF
      </div>
    </div>
  );
};

export default SpaceshipIcon;