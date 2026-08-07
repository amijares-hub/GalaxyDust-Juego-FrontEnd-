import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import * as React from "react";

const buttonVariants = cva(
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-xl font-semibold text-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[#E53E3E] via-[#C53030] to-[#9B2C2C] text-white shadow-lg shadow-red-500/25 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity hover:shadow-red-500/30 hover:shadow-xl hover:before:opacity-100",
        destructive:
          "bg-gradient-to-br from-destructive via-destructive to-destructive/80 text-destructive-foreground shadow-destructive/25 shadow-lg before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity hover:shadow-destructive/30 hover:shadow-xl hover:before:opacity-100",
        outline:
          "border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white shadow-sm backdrop-blur-sm hover:shadow-md",
        secondary:
          "bg-[#090a0e]/80 border border-white/5 text-white shadow-lg shadow-black/20 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent before:opacity-0 before:transition-opacity hover:before:opacity-100 hover:border-white/10",
        ghost:
          "backdrop-blur-sm hover:bg-white/5 hover:text-white",
        link: "text-white underline-offset-4 transition-colors hover:text-white/80 hover:underline",
        shimmer:
          "relative animate-shimmer border border-slate-800/50 bg-[length:200%_100%] bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] text-white shadow-2xl shadow-primary/30 before:absolute before:inset-0 before:translate-x-[-200%] before:animate-shimmer-slide before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent hover:shadow-primary/50",
        glow: "relative animate-gradient-x bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50 before:absolute before:inset-[-2px] before:-z-10 before:rounded-xl before:bg-gradient-to-r before:from-violet-600 before:via-purple-600 before:to-fuchsia-600 before:opacity-75 before:blur-md hover:shadow-2xl hover:shadow-purple-500/60",
      },
      size: {
        default: "h-9 px-5 py-2",
        sm: "h-7 rounded-lg px-3.5 text-xs",
        lg: "h-11 rounded-xl px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    // 🛡️ CORRECCIÓN: Forzamos la inyección dinámica sobre motion para heredar tipos en ambos modos (Botón nativo o Slot externo)
    const ComponentNode = asChild ? Slot : "button";
    const MotionComponent = motion(ComponentNode as any);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (variant === "link" || variant === "ghost") return;
      const { left, top } = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - left);
      mouseY.set(e.clientY - top);
    };

    const background = useMotionTemplate`radial-gradient(circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.12), transparent 80%)`;

    return (
      <MotionComponent
        className={`${buttonVariants({ variant, size })} ${className || ""}`}
        ref={ref}
        onMouseMove={handleMouseMove}
        whileHover={{ scale: variant === "link" ? 1 : 1.02 }}
        whileTap={{ scale: variant === "link" ? 1 : 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        {...(props as any)}
      >
        {variant !== "link" && variant !== "ghost" && (
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-0"
            style={{ background }}
          />
        )}
        <span className="relative z-10 flex items-center justify-center gap-2 pointer-events-none">
          {children}
        </span>
      </MotionComponent>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };