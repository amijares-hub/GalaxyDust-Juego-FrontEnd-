import React from 'react';
import { Check, X } from 'lucide-react';
import { validatePassword } from '../utils/passwordValidator';

interface PasswordChecklistProps {
  password: string;
  confirmPassword?: string;
  className?: string;
}

export const PasswordChecklist: React.FC<PasswordChecklistProps> = ({
  password,
  confirmPassword,
  className = '',
}) => {
  const result = validatePassword(password, confirmPassword);

  const rules = [
    { label: 'Mínimo 8 caracteres', met: result.minLength },
    { label: 'Una mayúscula (A-Z)', met: result.hasUpper },
    { label: 'Un número (0-9)', met: result.hasNumber },
    { label: 'Un símbolo especial (@, #, $, etc.)', met: result.hasSpecial },
  ];

  if (confirmPassword !== undefined && confirmPassword.length > 0) {
    rules.push({ label: 'Las claves coinciden', met: result.isMatching });
  }

  return (
    <div className={`grid grid-cols-2 gap-1.5 pt-1 ${className}`}>
      {rules.map((rule, idx) => {
        const isMet = rule.met;
        return (
          <div
            key={idx}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[8px] sm:text-[8.5px] font-mono tracking-wider transition-all duration-200 border ${
              isMet
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : 'bg-white/[0.02] text-zinc-500 border-white/5'
            }`}
          >
            {isMet ? (
              <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
            ) : (
              <span className="w-2.5 h-2.5 flex items-center justify-center shrink-0 text-zinc-600">
                •
              </span>
            )}
            <span className="truncate">{rule.label}</span>
          </div>
        );
      })}
    </div>
  );
};
