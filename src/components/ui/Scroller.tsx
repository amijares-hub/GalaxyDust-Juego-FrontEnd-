import React, { useRef } from 'react';
import { ScrollerButton } from './ScrollerButton';

interface ScrollerProps {
  children: React.ReactNode;
  overflow?: 'x' | 'y';
  withButtons?: boolean;
  className?: string;
}

export const Scroller: React.FC<ScrollerProps> = ({
  children,
  overflow = 'x',
  withButtons = false,
  className = ""
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = current.clientWidth * 0.75;
      current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const isX = overflow === 'x';

  return (
    <div className={`relative w-full ${className} group`}>
      {withButtons && isX && (
        <>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ScrollerButton direction="left" onClick={() => scroll('left')} />
            <ScrollerButton direction="right" onClick={() => scroll('right')} />
          </div>
        </>
      )}
      <div
        ref={scrollRef}
        className={`flex ${isX ? 'flex-row overflow-x-auto snap-x snap-mandatory px-4' : 'flex-col overflow-y-auto snap-y snap-mandatory py-4'} gap-4 hide-scrollbar`}
        style={{
          maskImage: isX 
            ? 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' 
            : 'linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)',
          WebkitMaskImage: isX 
            ? 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' 
            : 'linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)'
        }}
      >
        {children}
      </div>
    </div>
  );
};
