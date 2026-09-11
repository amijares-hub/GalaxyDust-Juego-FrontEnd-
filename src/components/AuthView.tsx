import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle, RefreshCw, ShieldCheck, KeyRound, Calendar, CheckSquare, Square, MailCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export const AuthView: React.FC = () => {
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
  
  // Campos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Estado del Pop-Up de Verificación de Correo
  const [isRegisteredSuccess, setIsRegisteredSuccess] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Captcha anti-bots
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [userCaptchaInput, setUserCaptchaInput] = useState('');

  const loading = state === 'authenticating' || state === 'registering' || state === 'verifying_2fa';

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    setUserCaptchaInput('');
  };

  useEffect(() => {
    generateCaptcha();
  }, [activeTab]);

  // Temporizador regresivo de 10 segundos tras registro exitoso
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRegisteredSuccess && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isRegisteredSuccess && countdown === 0) {
      handleReturnToLogin();
    }
    return () => clearInterval(timer);
  }, [isRegisteredSuccess, countdown]);

  // Expiración de "Recuérdame" (7 días)
  useEffect(() => {
    const checkRememberMeExpiration = async () => {
      const isRemembered = localStorage.getItem('gd_remember_me') === 'true';
      const expireTime = localStorage.getItem('gd_remember_expire');

      if (isRemembered && expireTime) {
        if (Date.now() > Number(expireTime)) {
          localStorage.removeItem('gd_remember_me');
          localStorage.removeItem('gd_remember_expire');
          await supabase.auth.signOut();
          setLocalError('Tu sesión de 7 días ha expirado. Inicia sesión de nuevo.');
        }
      } else {
        const sessionActive = sessionStorage.getItem('gd_active_session');
        if (!sessionActive) {
          await supabase.auth.signOut();
        }
      }
    };

    checkRememberMeExpiration();
  }, []);

  const handleReturnToLogin = () => {
    setIsRegisteredSuccess(false);
    setActiveTab('login');
    setScreen('login');
    setPassword('');
    setConfirmPassword('');
    setUserCaptchaInput('');
  };

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
      if (rememberMe) {
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        localStorage.setItem('gd_remember_me', 'true');
        localStorage.setItem('gd_remember_expire', (Date.now() + sevenDaysMs).toString());
      } else {
        localStorage.removeItem('gd_remember_me');
        localStorage.removeItem('gd_remember_expire');
        sessionStorage.setItem('gd_active_session', 'true');
      }

      await submitLogin(cleanEmail, cleanPassword, rememberMe);
    } else {
      if (!confirmPassword || !birthDate) {
        setLocalError("Por favor completa la fecha de cumpleaños y la confirmación de clave.");
        return;
      }

      if (cleanPassword !== confirmPassword) {
        setLocalError("Las claves de seguridad no coinciden.");
        return;
      }

      if (cleanPassword.length < 6) {
        setLocalError("La clave de seguridad requiere un mínimo de 6 caracteres.");
        return;
      }

      if (parseInt(userCaptchaInput, 10) !== captchaNum1 + captchaNum2) {
        setLocalError("Resultado de Captcha incorrecto.");
        generateCaptcha();
        return;
      }

      try {
        await submitRegister(cleanEmail, cleanPassword, {
          birth_date: birthDate,
          name: cleanEmail.split('@')[0]
        } as any);

        // Desplegar pop-up de confirmación si no hubo errores
        if (!errorMessage) {
          setIsRegisteredSuccess(true);
          setCountdown(10);
        }
      } catch (err: any) {
        setLocalError(err.message || "Error al completar el registro.");
      }
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

            {/* ─── FASE 0: POP-UP DE VERIFICACIÓN DE CORREO ─── */}
            {isRegisteredSuccess ? (
              <motion.div
                key="register-success-popup"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center text-center gap-4 py-2"
              >
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                  <MailCheck className="w-8 h-8 text-cyan-400 animate-pulse" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-sm font-black tracking-[0.2em] uppercase text-white">
                    ¡CONFIRMA TU CORREO!
                  </h2>
                  <p className="text-[10px] text-zinc-400 font-mono leading-relaxed px-1">
                    Transmisión enviada a <strong className="text-cyan-300 font-bold">{email}</strong>. Revisa tu bandeja de entrada o SPAM para activar tu comandante.
                  </p>
                </div>

                <div className="w-full bg-[#1A1C20] border border-white/5 rounded-xl p-3 flex justify-between items-center text-[10px] font-mono">
                  <span className="text-zinc-400 uppercase">Redirigiendo en:</span>
                  <span className="text-cyan-400 font-black text-xs">{countdown}s</span>
                </div>

                <button
                  type="button"
                  onClick={handleReturnToLogin}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>IR AL INICIO DE SESIÓN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (screen === 'menu' || screen === 'login' || screen === 'register') && (
              /* ─── FASE 1: FORMULARIO DE ACCESO Y REGISTRO ─── */
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

                <form onSubmit={handleFormSubmit} className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">Correo Electrónico</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Mail className="w-4 h-4" /></span>
                      <input
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        disabled={loading}
                        className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50"
                        placeholder="comandante@galaxydust.io"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">Clave de Seguridad</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Lock className="w-4 h-4" /></span>
                      <input
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        disabled={loading}
                        className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {/* CAMPOS ADICIONALES PARA REGISTRO */}
                  {activeTab === 'register' && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">Confirmar Clave</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Lock className="w-4 h-4" /></span>
                          <input
                            type="password" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            disabled={loading}
                            className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">Fecha de Cumpleaños</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Calendar className="w-4 h-4" /></span>
                          <input
                            type="date" 
                            value={birthDate} 
                            onChange={(e) => setBirthDate(e.target.value)} 
                            disabled={loading}
                            className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white outline-none focus:border-cyan-500/50 focus:bg-[#1C1E22] transition-all disabled:opacity-50 [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {/* CAPTCHA ANTI-BOT */}
                      <div className="flex flex-col gap-1 pt-1">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-[9px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium">Captcha Anti-Bot</label>
                          <button
                            type="button"
                            onClick={generateCaptcha}
                            className="text-[8px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> REGENERAR
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-[#1A1C20] border border-white/10 px-3 py-2 rounded-xl text-cyan-400 font-mono font-black text-xs shrink-0 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{captchaNum1} + {captchaNum2} = ?</span>
                          </div>
                          <input
                            type="number"
                            value={userCaptchaInput}
                            onChange={(e) => setUserCaptchaInput(e.target.value)}
                            disabled={loading}
                            placeholder="RESPUESTA"
                            className="w-full bg-[#1A1C20] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* OPCIÓN RECUÉRDAME (SOLO EN LOGIN) */}
                  {activeTab === 'login' && (
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setRememberMe(!rememberMe)}
                        className="flex items-center gap-2 text-[10px] text-white/50 hover:text-cyan-300 transition-colors cursor-pointer"
                      >
                        {rememberMe ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Square className="w-4 h-4 text-white/20" />
                        )}
                        <span>RECUÉRDAME (MÁXIMO 7 DÍAS)</span>
                      </button>
                    </div>
                  )}

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