import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScrollerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  direction: 'left' | 'right';
}

export const ScrollerButton: React.FC<ScrollerButtonProps> = ({ direction, className = "", ...props }) => {
  return (
    <button
      className={`absolute top-1/2 -translate-y-1/2 z-10 p-2 bg-black/60 border border-cyan-500/50 text-cyan-400 hover:text-cyan-300 hover:bg-black/80 hover:border-cyan-400 transition-all shadow-[0_0_10px_rgba(6,182,212,0.5)] backdrop-blur-md rounded ${
        direction === 'left' ? 'left-2' : 'right-2'
      } ${className}`}
      {...props}
    >
      {direction === 'left' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
    </button>
  );
};
