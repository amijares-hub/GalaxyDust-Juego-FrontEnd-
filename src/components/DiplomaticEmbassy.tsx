import React from 'react';
import { motion } from 'motion/react';

export const DiplomaticEmbassy: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-4 select-none">
      {/* Light aura ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-rose-500/10 blur-3xl rounded-full" />

      {/* Cybernetic Diplomatic Embassy / Embassy Tower */}
      <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
        
        {/* Slow floating structural rings */}
        <motion.div
          className="absolute inset-0 border border-fuchsia-500/10 rounded-full"
          animate={{
            scale: [0.95, 1.05, 0.95],
            rotate: [360, 0, 360],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />

        <motion.svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-[0_0_25px_rgba(244,63,94,0.25)]"
          animate={{
            y: [0, -3, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <defs>
            {/* Glossy glass facade gradient */}
            <linearGradient id="embassyGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#0F172A" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.8" />
            </linearGradient>

            {/* Glowing neon red highlights */}
            <linearGradient id="neonRose" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#BE123C" />
            </linearGradient>

            {/* Glowing hologram platform */}
            <radialGradient id="hollowRing" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FB7185" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#9F1239" stopOpacity="0" />
            </radialGradient>

            <filter id="roseGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* BASE MATRIX HASH & ALIGNMENT TARGETS */}
          <ellipse cx="100" cy="175" rx="72" ry="14" fill="url(#hollowRing)" stroke="#F43F5E" strokeOpacity="0.25" strokeWidth="1.2" />
          <ellipse cx="100" cy="175" rx="55" ry="10" fill="none" stroke="#F43F5E" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="4, 4" />
          
          {/* BASE FOUNDATION PLATES */}
          <polygon points="45,175 155,175 140,165 60,165" fill="#1E1E24" stroke="#4C1D24" strokeWidth="1" />
          <polygon points="52,165 148,165 136,155 64,155" fill="#0C0A0F" stroke="#F43F5E" strokeOpacity="0.4" strokeWidth="0.8" />

          {/* TOWER COLUMN ARCHITECTURES */}
          
          {/* Left Wing Consulate Offices */}
          <polygon points="56,155 78,155 70,110 52,110" fill="url(#embassyGlass)" stroke="#F43F5E" strokeOpacity="0.3" strokeWidth="1" />
          <line x1="62" y1="155" x2="58" y2="110" stroke="#F43F5E" strokeOpacity="0.5" strokeWidth="1" />
          <line x1="68" y1="155" x2="64" y2="110" stroke="#F43F5E" strokeOpacity="0.5" strokeWidth="1" />

          {/* Right Wing Consulate Offices */}
          <polygon points="122,155 144,155 148,110 130,110" fill="url(#embassyGlass)" stroke="#F43F5E" strokeOpacity="0.3" strokeWidth="1" />
          <line x1="132" y1="155" x2="136" y2="110" stroke="#F43F5E" strokeOpacity="0.5" strokeWidth="1" />
          <line x1="138" y1="155" x2="142" y2="110" stroke="#F43F5E" strokeOpacity="0.5" strokeWidth="1" />

          {/* Floating Command Ring surrounding center tower */}
          <path d="M 40,105 Q 100,120 160,105" fill="none" stroke="#FB7185" strokeWidth="1.5" strokeOpacity="0.8" strokeDasharray="3, 3" filter="url(#roseGlow)" />

          {/* Central Main Diplomatic Spire Tower */}
          <polygon points="80,155 120,155 110,65 90,65" fill="#140D17" stroke="#9F1239" strokeWidth="1.5" />
          <polygon points="85,155 115,155 106,75 94,75" fill="url(#embassyGlass)" />
          
          {/* Central Glowing Power Core column */}
          <line x1="100" y1="155" x2="100" y2="78" stroke="#F43F5E" strokeWidth="2.5" filter="url(#roseGlow)" strokeLinecap="round" />
          <line x1="100" y1="155" x2="100" y2="78" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" />

          {/* Upper Consulate Dome structure */}
          <polygon points="85,65 115,65 108,45 92,45" fill="url(#embassyGlass)" stroke="#BE123C" strokeWidth="1" />
          <circle cx="100" cy="45" r="4.5" fill="url(#neonRose)" />
          
          {/* Main Antenna transmitter beacon */}
          <line x1="100" y1="41" x2="100" y2="24" stroke="#F43F5E" strokeWidth="1" />
          <circle cx="100" cy="24" r="2" fill="#FFFFFF" filter="url(#roseGlow)" />
          
          {/* Beacon transmission wave arcs */}
          <path d="M 96,20 A 4,4 0 0,1 104,20" fill="none" stroke="#F43F5E" strokeWidth="1" strokeOpacity="0.8" />
          <path d="M 92,16 A 8,8 0 0,1 108,16" fill="none" stroke="#F43F5E" strokeWidth="0.8" strokeOpacity="0.5" />

          {/* Side Floating Satellite Sentinels orbiting base */}
          <g>
            {/* Left sentinel */}
            <circle cx="36" cy="130" r="3.5" fill="#111827" stroke="#F43F5E" strokeWidth="1" />
            <circle cx="36" cy="130" r="1.5" fill="#FFFFFF" filter="url(#roseGlow)" />
            <line x1="36" y1="133.5" x2="36" y2="142" stroke="#F43F5E" strokeOpacity="0.6" strokeWidth="0.8" />
          </g>
          <g>
            {/* Right sentinel */}
            <circle cx="164" cy="130" r="3.5" fill="#111827" stroke="#F43F5E" strokeWidth="1" />
            <circle cx="164" cy="130" r="1.5" fill="#FFFFFF" filter="url(#roseGlow)" />
            <line x1="164" y1="133.5" x2="164" y2="142" stroke="#F43F5E" strokeOpacity="0.6" strokeWidth="0.8" />
          </g>
        </motion.svg>
      </div>

      {/* Futuristic status text indicators */}
      <div className="absolute top-2 left-2 text-[7px] font-mono text-rose-400/40 uppercase tracking-widest pointer-events-none">
        AMB_SHIELD::ACTIVE
      </div>
      <div className="absolute bottom-2 right-2 text-[7px] font-mono text-fuchsia-400/40 uppercase tracking-widest pointer-events-none">
        LINK_CON::99.4%
      </div>
    </div>
  );
};
