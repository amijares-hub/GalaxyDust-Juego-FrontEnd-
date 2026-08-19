import React from 'react';
import { motion } from 'framer-motion';

export const SpaceCompass: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-4 select-none">
      {/* Glow aura background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-red-500/10 blur-3xl rounded-full" />

      {/* Outer Rotating Compass Frame */}
      <motion.svg
        viewBox="0 0 200 200"
        className="w-48 h-48 md:w-56 md:h-56 drop-shadow-[0_0_25px_rgba(34,211,238,0.25)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      >
        <defs>
          <radialGradient id="compassGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0E1726" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#030712" stopOpacity="0.95" />
          </radialGradient>
          <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
          <linearGradient id="neonRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Base dark backdrop plate */}
        <circle cx="100" cy="100" r="90" fill="url(#compassGlow)" stroke="#1F2937" strokeWidth="1.5" />
        
        {/* Holographic orbital paths */}
        <circle cx="100" cy="100" r="78" fill="none" stroke="#22D3EE" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3, 3" />
        <circle cx="100" cy="100" r="66" fill="none" stroke="#EF4444" strokeOpacity="0.1" strokeWidth="0.8" />

        {/* Radial tick marks */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 360) / 24;
          const isMajor = i % 6 === 0;
          const r1 = isMajor ? 82 : 85;
          const r2 = 88;
          const rad = (angle * Math.PI) / 180;
          const x1 = 100 + r1 * Math.cos(rad);
          const y1 = 100 + r1 * Math.sin(rad);
          const x2 = 100 + r2 * Math.cos(rad);
          const y2 = 100 + r2 * Math.sin(rad);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isMajor ? '#22D3EE' : '#374151'}
              strokeWidth={isMajor ? 1.5 : 0.8}
              strokeOpacity={isMajor ? 0.8 : 0.5}
            />
          );
        })}

        {/* Cardinal Directions Text */}
        <text x="100" y="24" textAnchor="middle" fill="#22D3EE" fontSize="9" fontWeight="bold" fontFamily="monospace" letterSpacing="0.1em">N</text>
        <text x="100" y="184" textAnchor="middle" fill="#EF4444" fontSize="9" fontWeight="bold" fontFamily="monospace" letterSpacing="0.1em">S</text>
        <text x="178" y="103" textAnchor="middle" fill="#9CA3AF" fontSize="8" fontWeight="semibold" fontFamily="monospace">E</text>
        <text x="22" y="103" textAnchor="middle" fill="#9CA3AF" fontSize="8" fontWeight="semibold" fontFamily="monospace">W</text>

        {/* Outer Ring Telemetry markers */}
        <path d="M 100,5 A 95,95 0 0,1 182.25,52.25" fill="none" stroke="#22D3EE" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="5, 15" />
        <path d="M 100,195 A 95,95 0 0,1 17.75,147.75" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="5, 15" />
      </motion.svg>

      {/* Layer 2: Inner Compass Rose */}
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute w-48 h-48 md:w-56 md:h-56 pointer-events-none"
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      >
        {/* Glowing holographic nodes */}
        {Array.from({ length: 4 }).map((_, i) => {
          const angle = i * 90 + 45;
          const rad = (angle * Math.PI) / 180;
          const cx = 100 + 55 * Math.cos(rad);
          const cy = 100 + 55 * Math.sin(rad);
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="2"
              fill="#22D3EE"
              className="animate-pulse"
              style={{ animationDelay: `${i * 0.4}s` }}
            />
          );
        })}

        {/* Compass main needles */}
        <polygon points="100,100 92,100 100,32" fill="url(#neonCyan)" filter="url(#glow)" />
        <polygon points="100,100 108,100 100,32" fill="#0891B2" opacity="0.9" />

        <polygon points="100,100 92,100 100,168" fill="url(#neonRed)" />
        <polygon points="100,100 108,100 100,168" fill="#991B1B" opacity="0.9" />

        {/* Center brass pivot & digital coordinate target ring */}
        <circle cx="100" cy="100" r="14" fill="#070A0F" stroke="#22D3EE" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="8" fill="none" stroke="#EF4444" strokeWidth="1" strokeDasharray="3, 3" />
        <circle cx="100" cy="100" r="3" fill="#22D3EE" />
      </motion.svg>

      {/* Cybernetic telemetry display vectors */}
      <div className="absolute top-2 left-2 text-[7px] font-mono text-cyan-400/40 uppercase tracking-widest pointer-events-none">
        HEADING_LOCK::E_O2
      </div>
      <div className="absolute bottom-2 right-2 text-[7px] font-mono text-red-500/40 uppercase tracking-widest pointer-events-none">
        ORBIT_DEV::73.4°
      </div>
    </div>
  );
};

export default SpaceCompass;