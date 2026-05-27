import React from 'react';

export const Spinner: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => {
  return (
    <div className={`animate-spin rounded-full border-t-2 border-b-2 border-cyan-500 ${className}`}></div>
  );
};
