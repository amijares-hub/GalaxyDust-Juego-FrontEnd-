import React from 'react';

export interface HudBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  chamfer?: boolean;
  active?: boolean;
  glow?: boolean;
}

export const HudBox: React.FC<HudBoxProps> = ({ 
  children, 
  chamfer = true, 
  active = false, 
  glow = true,
  className = '', 
  ...props 
}) => {
  return (
    <div 
      className={`
        relative hud-panel hud-corners transition-all duration-300
        ${chamfer ? 'hud-chamfer-sm' : 'rounded-lg'}
        ${active ? 'border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Línea de escaneo holográfica sutil superior */}
      <div className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />
      {children}
    </div>
  );
};

export default HudBox;
