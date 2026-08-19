import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAudioEngine } from '../hooks/useAudioEngine';

interface SciFiButtonProps {
  label: string;
  variant: 'primary' | 'secondary';
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const SciFiButton: React.FC<SciFiButtonProps> = ({
  label,
  variant,
  onClick,
  isLoading = false,
  disabled = false,
  type = 'button'
}) => {
  const { playSfx } = useAudioEngine();
  const isPrimary = variant === 'primary';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    playSfx(isPrimary ? 880 : 660);
    onClick();
  };

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      disabled={disabled || isLoading}
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={`group relative w-full py-5 px-8 font-mono text-xs font-bold uppercase tracking-[0.2em] rounded-2xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        isPrimary
          ? 'bg-white text-[#0C0D0E] shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:bg-cyan-100'
          : 'border border-[#2D2F33] text-[#A0A2A5] bg-transparent hover:bg-[#151719] hover:text-white hover:border-[#404348]'
      }`}
    >
      {/* Loading state indicator */}
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className={`w-4 h-4 animate-spin ${isPrimary ? 'text-[#0C0D0E]' : 'text-white'}`} />
          <span>Procesando...</span>
        </span>
      ) : (
        <span>{label}</span>
      )}
    </motion.button>
  );
};

export default SciFiButton;