import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, KeyRound, AlertCircle, RefreshCw, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GalaxyFrame } from './CanView';
import { PasswordChecklist } from './PasswordChecklist';
import { validatePassword, getPasswordValidationError } from '../utils/passwordValidator';

export const NewPasswordModal: React.FC = () => {
  const { submitUpdatePassword, state, errorMessage } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const loading = state === 'resetting';
  const validationResult = validatePassword(newPassword, confirmPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    const validationError = getPasswordValidationError(cleanPass, cleanConfirm);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    await submitUpdatePassword(cleanPass);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md"
      >
        <GalaxyFrame className="w-full rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.25)] border border-cyan-500/30 overflow-hidden" innerPadding="p-5 sm:p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <KeyRound className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-black tracking-[0.2em] uppercase text-white">
                ACTUALIZAR CONTRASEÑA
              </h2>
              <p className="text-[10px] sm:text-xs text-zinc-400 font-mono leading-relaxed px-2">
                Por políticas de seguridad o recuperación de credenciales, debes configurar una nueva clave para continuar al sistema.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3 text-left mt-2">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">
                  NUEVA CONTRASEÑA
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    disabled={loading}
                    className="w-full bg-[#1A1C20] border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-white/20 focus:border-cyan-500/60 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50 font-mono"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">
                  CONFIRMAR CONTRASEÑA
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    disabled={loading}
                    className="w-full bg-[#1A1C20] border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-white/20 focus:border-cyan-500/60 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50 font-mono"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* CHECKLIST EN TIEMPO REAL */}
              <PasswordChecklist
                password={newPassword}
                confirmPassword={confirmPassword}
              />

              {(localError || errorMessage) && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg mt-1">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  <span className="text-[9.5px] font-mono text-red-400 uppercase leading-tight tracking-wider">
                    {localError || errorMessage}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !validationResult.isValid}
                className="mt-2 w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>ACTUALIZAR CONTRASEÑA Y ENTRAR</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </GalaxyFrame>
      </motion.div>
    </div>
  );
};
