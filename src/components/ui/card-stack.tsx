import React from "react";
import { motion } from "framer-motion";

export interface CardStackItem {
  id: string | number;
  content?: React.ReactNode;
  [key: string]: any;
}

interface CardStackProps {
  items?: CardStackItem[];
  offset?: number;
  scaleFactor?: number;
}

export const CardStack: React.FC<CardStackProps> = ({
  items = [],
  offset = 10,
  scaleFactor = 0.06,
}) => {
  const springStiffness = 300;
  const springDamping = 20;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {items.map((card, index) => {
        const isActive = index === 0;
        return (
          <motion.div
            key={card.id}
            className="absolute w-full h-full rounded-2xl p-4 shadow-xl border border-white/10 bg-[#0c1017]"
            style={{
              transformOrigin: "top center",
            }}
            animate={{
              top: index * -offset,
              scale: 1 - index * scaleFactor,
              zIndex: items.length - index,
            }}
            transition={{
              x: { type: "spring", stiffness: springStiffness, damping: springDamping },
              y: { type: "spring", stiffness: springStiffness, damping: springDamping },
              rotateZ: { type: "spring", stiffness: springStiffness, damping: springDamping },
              scale: isActive
                ? {
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut",
                  }
                : { type: "tween", duration: 0.15, ease: "easeOut" },
            }}
          >
            {card.content}
          </motion.div>
        );
      })}
    </div>
  );
};

export default CardStack;