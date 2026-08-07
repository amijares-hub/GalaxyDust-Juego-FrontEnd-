import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle, RefreshCw, ShieldCheck, KeyRound } from 'lucide-react';
import { useSasoriAuth } from '../hooks/useSasoriAuth';
import spaceBackground from '../assets/images/space_background_1779360172256.png';

export const AuthView: React.FC = () => {
  // 🛰️ Acoplamiento total al motor de estados unificado de Sasori
  const {
    screen,
    state,
    errorMessage,
    successMessage,
    setScreen,
    submitLogin,
    submitRegister,
    verifyTwoFA
  } = useSasoriAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const loading = state === 'authenticating' || state === 'registering' || state === 'verifying_2fa';

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError("Todos los campos son obligatorios.");
      return;
    }

    if (activeTab === 'login') {
      await submitLogin(email, password, true);
    } else {
      if (password.length < 6) {
        setLocalError("La firma de acceso requiere un mínimo de 6 caracteres.");
        return;
      }
      await submitRegister(email, password);
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

      {/* Fondo espacial coloidal */}
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none z-0"
        style={{
          backgroundImage: `url(${spaceBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none z-0">
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#1C1E22] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-[#111214] rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm px-6">

        {/* Cabecera del Kernel */}
        <div className="flex flex-col items-center mb-6">
          <ShieldCheck className="w-10 h-10 text-cyan-500 mb-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
          <h1 className="text-xl font-black uppercase tracking-[0.4em] text-white">GALAXYDUST</h1>
          <p className="text-[10px] tracking-widest text-cyan-400 mt-1 uppercase">Terminal de Acceso Seguro</p>
        </div>

        <div className="bg-[#121315]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">

          <AnimatePresence mode="wait">

            {/* ─── FASE 1: FORMULARIO DE ACCESO (LOGIN / REGISTRO) ─── */}
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
                      onClick={() => { setActiveTab('login'); setScreen('login'); }}
                      className={`w-full pb-2 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${activeTab === 'login' ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'}`}
                    >
                      Iniciar Sesión
                    </button>
                  </div>
                  <div className="flex-1 text-center">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('register'); setScreen('register'); }}
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
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading}
                        className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all"
                        placeholder="comandante@galaxydust.io"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">Clave de Seguridad</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Lock className="w-4 h-4" /></span>
                      <input
                        type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading}
                        className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {/* Renderizado de Alertas de Error / Éxito */}
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
                    type="submit" disabled={loading}
                    className="mt-2 w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (activeTab === 'login' ? 'ESTABLECER CONEXIÓN' : 'REGISTRAR FIRMA')}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ─── FASE 2: VERIFICACIÓN SEGUNDO FACTOR (MFA/2FA) ─── */}
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
                    type="text" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} disabled={loading}
                    className="w-full bg-[#1A1C20] border border-white/10 rounded-xl py-3.5 text-center text-xl font-mono font-black tracking-[0.5em] text-cyan-400 focus:border-cyan-500 outline-none transition-all"
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
                      type="button" onClick={() => setScreen('login')}
                      className="flex-1 py-3 border border-white/10 text-neutral-400 hover:text-white text-[9px] font-mono font-bold tracking-widest uppercase rounded-xl transition-all cursor-pointer"
                    >
                      ABORTAR
                    </button>
                    <button
                      type="submit" disabled={loading}
                      className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-[9px] font-bold tracking-widest uppercase rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
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