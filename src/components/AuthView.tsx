import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle, RefreshCw, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthView: React.FC = () => {
  // 🛰️ Acoplamiento al motor de autenticación de Sasori / Supabase Auth
  const {
    screen,
    state,
    errorMessage,
    successMessage,
    setScreen,
    submitLogin,
    submitRegister,
    verifyTwoFA
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const loading = state === 'authenticating' || state === 'registering' || state === 'verifying_2fa';

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setScreen(tab);
    setLocalError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setLocalError("Todos los campos son obligatorios.");
      return;
    }

    if (activeTab === 'login') {
      await submitLogin(cleanEmail, cleanPassword, true);
    } else {
      if (cleanPassword.length < 6) {
        setLocalError("La clave de seguridad requiere un mínimo de 6 caracteres.");
        return;
      }
      await submitRegister(cleanEmail, cleanPassword);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (otpCode.length !== 6) {
      setLocalError("El token de seguridad debe constar de 6 dígitos.");
      return;
    }
    await verifyTwoFA(otpCode);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0C0D0E] flex flex-col justify-center items-center font-sans select-none text-white">

      {/* ─── FONDO ESPACIAL ─── */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none z-0 transition-opacity duration-700"
        style={{
          backgroundImage: `url('https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20(Ambientes%20)/23.jpg')`,
        }}
      />

      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none z-0">
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#1C1E22] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-[#111214] rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm px-6">

        {/* ─── LOGO Y TÍTULO ─── */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Logo/1.png"
            alt="GalaxyDust Logo"
            className="w-20 h-20 mb-2 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]"
          />
          <h1 className="text-xl font-black uppercase tracking-[0.4em] text-white">GALAXYDUST</h1>
        </div>

        <div className="bg-[#121315]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">

          <AnimatePresence mode="wait">

            {/* ─── FASE 1: FORMULARIO DE ACCESO ─── */}
            {(screen === 'menu' || screen === 'login' || screen === 'register') && (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2 }}
              >
                {/* Selector de Pestañas */}
                <div className="flex w-full mb-6 relative">
                  <div className="flex-1 text-center">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleTabChange('login')}
                      className={`w-full pb-2 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${activeTab === 'login' ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'}`}
                    >
                      Iniciar Sesión
                    </button>
                  </div>
                  <div className="flex-1 text-center">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleTabChange('register')}
                      className={`w-full pb-2 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${activeTab === 'register' ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'}`}
                    >
                      Registro
                    </button>
                  </div>
                  <motion.div
                    className="absolute bottom-0 h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                    animate={{ left: activeTab === 'login' ? '0%' : '50%', width: '50%' }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                  <div className="absolute bottom-0 w-full h-[1px] bg-white/10 -z-10" />
                </div>

                <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">Correo Electrónico</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Mail className="w-4 h-4" /></span>
                      <input
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        disabled={loading}
                        className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50"
                        placeholder="comandante@galaxydust.io"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">Clave de Seguridad</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Lock className="w-4 h-4" /></span>
                      <input
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        disabled={loading}
                        className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {(localError || errorMessage) && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg mt-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span className="text-[10px] font-mono text-red-400 uppercase leading-tight tracking-wider">{localError || errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg mt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-[10px] font-mono text-emerald-400 uppercase leading-tight tracking-wider">{successMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit" 
                    disabled={loading}
                    className="mt-2 w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (activeTab === 'login' ? 'INICIAR SESIÓN' : 'REGISTRAR FIRMA')}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ─── FASE 2: VERIFICACIÓN MULTI-FACTOR (MFA) ─── */}
            {screen === 'two_factor' && (
              <motion.div
                key="mfa-form"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4 text-center"
              >
                <div className="flex flex-col items-center gap-2 mb-2">
                  <KeyRound className="w-8 h-8 text-cyan-400 animate-pulse" />
                  <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-white">REQUISITO MULTI-FACTOR</h3>
                  <p className="text-[10px] text-neutral-400 font-mono leading-relaxed px-2">INGRESE EL CÓDIGO OTP REQUERIDO POR EL KERNEL DE SEGURIDAD PARA VALIDAR LA SESIÓN.</p>
                </div>

                <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
                  <input
                    type="text" 
                    maxLength={6} 
                    value={otpCode} 
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                    disabled={loading}
                    className="w-full bg-[#1A1C20] border border-white/10 rounded-xl py-3.5 text-center text-xl font-mono font-black tracking-[0.5em] text-cyan-400 focus:border-cyan-500 outline-none transition-all disabled:opacity-50"
                    placeholder="000000"
                  />

                  {(localError || errorMessage) && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">{localError || errorMessage}</span>
                    </div>
                  )}

                  <div className="flex gap-2.5 mt-2">
                    <button
                      type="button" 
                      onClick={() => setScreen('login')}
                      className="flex-1 py-3 border border-white/10 text-neutral-400 hover:text-white text-[9px] font-mono font-bold tracking-widest uppercase rounded-xl transition-all cursor-pointer"
                    >
                      ABORTAR
                    </button>
                    <button
                      type="submit" 
                      disabled={loading}
                      className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-[9px] font-bold tracking-widest uppercase rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="w-3 h-3 animate-spin mx-auto" /> : "VERIFICAR"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </div>
    </div>
  );
};