import React from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

interface ScrollerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  direction: 'left' | 'right' | 'up' | 'down';
}

export const ScrollerButton: React.FC<ScrollerButtonProps> = ({
  direction,
  className = "",
  ...props
}) => {
  const isHorizontal = direction === 'left' || direction === 'right';

  // 🛰️ MATRIZ POSICIONAL: Evita el solapamiento de clases calculando los ejes por separado
  const positionClasses = isHorizontal
    ? `top-1/2 -translate-y-1/2 ${direction === 'left' ? 'left-2' : 'right-2'}`
    : `left-1/2 -translate-x-1/2 ${direction === 'up' ? 'top-2' : 'bottom-2'}`;

  // Diccionario para el escudo de accesibilidad en terminales tácticas
  const labelMap = {
    left: "Desplazar hacia la izquierda",
    right: "Desplazar hacia la derecha",
    up: "Desplazar hacia arriba",
    down: "Desplazar hacia abajo"
  };

  return (
    <button
      type="button"
      aria-label={labelMap[direction]}
      className={`absolute z-10 p-2 bg-black/60 border border-cyan-500/50 text-cyan-400 hover:text-cyan-300 hover:bg-black/80 hover:border-cyan-400 transition-all shadow-[0_0_10px_rgba(6,182,212,0.5)] backdrop-blur-md rounded active:scale-95 ${positionClasses} ${className}`}
      {...props}
    >
      {direction === 'left' && <ChevronLeft className="w-5 h-5" />}
      {direction === 'right' && <ChevronRight className="w-5 h-5" />}
      {direction === 'up' && <ChevronUp className="w-5 h-5" />}
      {direction === 'down' && <ChevronDown className="w-5 h-5" />}
    </button>
  );
};