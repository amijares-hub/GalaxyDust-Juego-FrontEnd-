import React from 'react';

interface SpinnerProps {
  className?: string;
  colorClass?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  className = "w-4 h-4",
  colorClass = "border-t-cyan-500 border-b-cyan-500"
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`animate-spin rounded-full border-2 border-transparent ${colorClass} ${className}`}
    >
      <span className="sr-only">Procesando telemetría...</span>
    </div>
  );
};