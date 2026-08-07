import React, { useRef } from 'react';
import { ScrollerButton } from './ScrollerButton';

interface ScrollerProps {
  children: React.ReactNode;
  overflow?: 'x' | 'y';
  withButtons?: boolean;
  className?: string;
  gapClass?: string;
}

export const Scroller: React.FC<ScrollerProps> = ({
  children,
  overflow = 'x',
  withButtons = false,
  className = "",
  gapClass = "gap-4"
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isX = overflow === 'x';

  const scroll = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = isX ? current.clientWidth * 0.75 : current.clientHeight * 0.75;

      if (isX) {
        current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
      } else {
        current.scrollBy({ top: direction === 'up' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className={`relative w-full ${className} group select-none`}>

      {withButtons && isX && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="pointer-events-auto">
            <ScrollerButton direction="left" onClick={() => scroll('left')} />
            <ScrollerButton direction="right" onClick={() => scroll('right')} />
          </div>
        </div>
      )}

      {withButtons && !isX && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="pointer-events-auto">
            <ScrollerButton direction="up" onClick={() => scroll('up')} className="absolute top-2 left-1/2 -translate-x-1/2 rotate-90 z-40" />
            <ScrollerButton direction="down" onClick={() => scroll('down')} className="absolute bottom-2 left-1/2 -translate-x-1/2 rotate-90 z-40" />
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className={`flex ${isX ? 'flex-row overflow-x-auto snap-x snap-mandatory px-4' : 'flex-col overflow-y-auto snap-y snap-mandatory py-4 h-full'} ${gapClass} hide-scrollbar`}
        style={{
          maskImage: isX ? 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' : 'linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)',
          WebkitMaskImage: isX ? 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' : 'linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)'
        }}
      >
        {/* 🛡️ INYECCIÓN DE ESCUDO ANTI-APLASTAMIENTO: Forzamos la integridad estructural de los componentes hijos */}
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return <div className="shrink-0 snap-start">{child}</div>;
          }
          return child;
        })}
      </div>
    </div>
  );
};