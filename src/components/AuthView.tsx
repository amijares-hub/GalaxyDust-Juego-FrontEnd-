import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle, RefreshCw, ShieldCheck, KeyRound, Calendar, CheckSquare, Square, MailCheck, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { GalaxyFrame } from './CanView';
import { PasswordChecklist } from './PasswordChecklist';
import { validatePassword, getPasswordValidationError } from '../utils/passwordValidator';
import { ScreenState } from '../hooks/useSasoriAuth';

// Traductor de errores de autenticación de Supabase a español claro
const translateSupabaseAuthError = (err: any): string => {
  if (!err) return 'Error desconocido al procesar la solicitud.';
  const msg = typeof err === 'string' ? err : err.message || '';
  const lower = msg.toLowerCase();
  if (lower.includes('auth session missing') || lower.includes('session missing') || lower.includes('session_missing')) {
    return 'La sesión de recuperación ha expirado o no está activa. Por favor solicita un nuevo enlace desde el login.';
  }
  if (lower.includes('password should be different')) {
    return 'La nueva contraseña debe ser diferente a la anterior.';
  }
  if (lower.includes('password should be at least')) {
    return 'La contraseña no cumple con la longitud mínima requerida (mínimo 8 caracteres).';
  }
  if (lower.includes('user not found')) {
    return 'Usuario no encontrado en el sistema.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Has superado el límite de intentos. Por favor espera unos minutos.';
  }
  return msg || 'Error al actualizar la contraseña.';
};

interface AuthViewProps {
  initialScreen?: ScreenState;
}

export const AuthView: React.FC<AuthViewProps> = ({ initialScreen }) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'es').startsWith('en') ? 'en' : 'es';

  const {
    screen,
    state,
    errorMessage,
    successMessage,
    showNewPasswordModal,
    user,
    setScreen,
    submitLogin,
    submitRegister,
    submitResetPassword,
    submitUpdatePassword,
    verifyTwoFA
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Campos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Campos para reset de contraseña
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Estado del Pop-Up de Verificación de Correo
  const [isRegisteredSuccess, setIsRegisteredSuccess] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Captcha anti-bots
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [userCaptchaInput, setUserCaptchaInput] = useState('');

  // Sesión de recuperación capturada localmente (hash implícito o PKCE)
  const [recoverySession, setRecoverySession] = useState<any>(null);
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(false);
  const [expiredLinkError, setExpiredLinkError] = useState<string | null>(null);

  const loading = state === 'authenticating' || state === 'registering' || state === 'verifying_2fa' || state === 'resetting';

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    setUserCaptchaInput('');
  };

  useEffect(() => {
    generateCaptcha();
  }, [activeTab]);

  // ─── DETECCIÓN DE ERRORES Y FLUJO DE RECUPERACIÓN ───
  const hasUrlError = typeof window !== 'undefined' && (
    window.location.hash.includes('error=access_denied') ||
    window.location.hash.includes('error_code=otp_expired') ||
    window.location.search.includes('error=access_denied') ||
    window.location.search.includes('error_code=otp_expired')
  );

  const isRecoveryFlow = !hasUrlError && (
    initialScreen === 'reset_password' ||
    (typeof window !== 'undefined' && (
      window.location.search.includes('recovery=true') ||
      window.location.hash.includes('type=recovery') ||
      window.location.hash.includes('access_token') ||
      window.location.search.includes('code=')
    )) ||
    screen === 'reset_password' ||
    showNewPasswordModal === true ||
    Boolean(user?.mustResetPassword)
  );

  // Pantalla activa garantizada: si es recuperación válida, forzar 'reset_password' sin destellos
  const activeViewScreen = (isRecoveryFlow || initialScreen === 'reset_password') && !hasUrlError
    ? 'reset_password'
    : screen;

  // 🔴 Efecto 1: Detección Temprana de Errores de Supabase en la URL (AuthView.tsx)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    const search = window.location.search;

    if (
      hash.includes('error=access_denied') ||
      hash.includes('error_code=otp_expired') ||
      search.includes('error=access_denied') ||
      search.includes('error_code=otp_expired')
    ) {
      setExpiredLinkError(
        'El enlace de recuperación ha expirado o ya fue utilizado. ' +
        'Si solicitaste varios correos, asegúrate de abrir únicamente el más reciente.'
      );
      setActiveTab('login');
      setScreen('login');
      // Limpiar URL para evitar estados corruptos
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (isRecoveryFlow && screen !== 'reset_password') {
      setScreen('reset_password');
    }
  }, [isRecoveryFlow, screen, setScreen]);

  // Efecto 2: Captura y activación de sesión de recuperación (hash, PKCE, sesión existente)
  useEffect(() => {
    const establishRecoverySession = async () => {
      try {
        setIsSessionLoading(true);
        if (typeof window === 'undefined') return;

        const hash = window.location.hash;
        const search = window.location.search;
        const urlParams = new URLSearchParams(search);

        // Si hay error en la URL, detener la ejecución de inmediato
        if (
          hash.includes('error=access_denied') ||
          hash.includes('error_code=otp_expired') ||
          search.includes('error=access_denied') ||
          search.includes('error_code=otp_expired')
        ) {
          return;
        }

        // Caso A: Token implícito en el Hash (#access_token=...&refresh_token=...)
        if (hash && (hash.includes('access_token') || hash.includes('type=recovery'))) {
          const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!error && data?.session) {
              setRecoverySession(data.session);
              setScreen('reset_password');
              return;
            }
          }
        }

        // Caso B: Código PKCE (?code=...)
        const code = urlParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data?.session) {
            setRecoverySession(data.session);
            setScreen('reset_password');
            window.history.replaceState({}, document.title, window.location.pathname + '?recovery=true');
            return;
          }
        }

        // Caso C: Sesión ya establecida en el cliente de Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setRecoverySession(session);
          if (urlParams.get('recovery') === 'true' || hash.includes('type=recovery')) {
            setScreen('reset_password');
          }
        }
      } catch (err) {
        console.error('Error al establecer sesión de recuperación:', err);
      } finally {
        setIsSessionLoading(false);
      }
    };

    establishRecoverySession();
  }, [setScreen]);

  // Efecto 3: Intercambio Seguro de Tokens vía onAuthStateChange
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isRecovery = event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && isRecoveryFlow);
      if (isRecovery && session) {
        setRecoverySession(session);
        setScreen('reset_password');
      }
    });
    return () => subscription.unsubscribe();
  }, [isRecoveryFlow, setScreen]);

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
    setLocalError(null);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setLocalError('Introduce tu correo electrónico registrado.');
      return;
    }
    await submitResetPassword(cleanEmail);
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmNewPassword.trim();

    const validationError = getPasswordValidationError(cleanNew, cleanConfirm);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    // Asegurar la sesión si recoverySession está presente
    let currentSession = recoverySession;
    if (!currentSession) {
      const { data: sessionData } = await supabase.auth.getSession();
      currentSession = sessionData.session;
    } else {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session && recoverySession.access_token && recoverySession.refresh_token) {
        await supabase.auth.setSession({
          access_token: recoverySession.access_token,
          refresh_token: recoverySession.refresh_token,
        });
      }
    }

    const { data, error } = await supabase.auth.updateUser({ password: cleanNew });
    if (!error) {
      const userId = data?.user?.id || currentSession?.user?.id;
      if (userId) {
        await supabase
          .from('user_profiles')
          .update({ must_reset_password: false })
          .eq('user_id', userId);
      }
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, '/');
        window.location.href = '/';
      }
    } else {
      setLocalError(translateSupabaseAuthError(error));
    }
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

      const validationError = getPasswordValidationError(cleanPassword, confirmPassword.trim());
      if (validationError) {
        setLocalError(validationError);
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
    <div className="relative w-screen h-dvh overflow-hidden bg-[#0C0D0E] flex flex-col justify-start sm:justify-center items-center font-sans select-none text-white">

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

      <div className="relative z-10 w-full max-w-md max-h-[calc(100dvh-0.5rem)] overflow-y-auto flex flex-col justify-center my-auto px-2 sm:px-4 py-2 sm:py-0">

        {/* ─── LOGO Y TÍTULO ─── */}
        <div className="flex flex-col items-center mb-1 sm:mb-3">
          <img
            src="https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Logo/1.png"
            alt="GalaxyDust Logo"
            className="h-6 sm:h-10 w-auto mb-0.5 sm:mb-1 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]"
          />
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-base font-black uppercase tracking-[0.3em] text-white">GALAXYDUST</h1>
            <div className="flex items-center border border-cyan-500/40 bg-black/70 rounded px-1 py-0.5 text-[7px] sm:text-[8px] font-mono font-bold tracking-wider">
              <button
                type="button"
                onClick={() => {
                  i18n.changeLanguage('es');
                  try { localStorage.setItem('gd_preferred_language', 'es'); } catch {}
                }}
                className={`px-1 py-0.2 rounded transition-all cursor-pointer ${
                  currentLang === 'es'
                    ? 'bg-cyan-500/30 text-cyan-300 font-black shadow-[0_0_6px_rgba(34,211,238,0.5)]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                ES
              </button>
              <span className="text-cyan-500/40 px-0.5 select-none">|</span>
              <button
                type="button"
                onClick={() => {
                  i18n.changeLanguage('en');
                  try { localStorage.setItem('gd_preferred_language', 'en'); } catch {}
                }}
                className={`px-1 py-0.2 rounded transition-all cursor-pointer ${
                  currentLang === 'en'
                    ? 'bg-cyan-500/30 text-cyan-300 font-black shadow-[0_0_6px_rgba(34,211,238,0.5)]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        <GalaxyFrame className="w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(86dvh-3.5rem)]" innerPadding="p-2.5 sm:p-4">
          <div className="overflow-y-auto pr-0.5">
          <AnimatePresence mode="wait">

            {/* ─── FASE 0: POP-UP DE VERIFICACIÓN DE CORREO ─── */}
            {isRegisteredSuccess ? (
              <motion.div
                key="register-success-popup"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center text-center gap-3 py-1"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                  <MailCheck className="w-6 h-6 text-cyan-400 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xs font-black tracking-[0.2em] uppercase text-white">
                    ¡CONFIRMA TU CORREO!
                  </h2>
                  <p className="text-[9px] text-zinc-400 font-mono leading-relaxed px-1">
                    Transmisión enviada a <strong className="text-cyan-300 font-bold">{email}</strong>. Revisa tu bandeja de entrada o SPAM para activar tu comandante.
                  </p>
                </div>

                <div className="w-full bg-[#1A1C20] border border-white/5 rounded-xl p-2 flex justify-between items-center text-[9px] font-mono">
                  <span className="text-zinc-400 uppercase">Redirigiendo en:</span>
                  <span className="text-cyan-400 font-black text-xs">{countdown}s</span>
                </div>

                <button
                  type="button"
                  onClick={handleReturnToLogin}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-[0.2em] text-[9.5px] rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>IR AL INICIO DE SESIÓN</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (activeViewScreen === 'menu' || activeViewScreen === 'login' || activeViewScreen === 'register') && (
              /* ─── FASE 1: FORMULARIO DE ACCESO Y REGISTRO ─── */
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2 }}
              >
                {/* ─── ALERTA DE ENLACE EXPIRADO ─── */}
                {expiredLinkError && (
                  <div className="flex items-start gap-2.5 bg-red-500/15 border border-red-500/40 p-3 rounded-xl mb-3 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[9.5px] font-mono text-red-300 leading-relaxed tracking-wider font-semibold">
                      {expiredLinkError}
                    </span>
                  </div>
                )}

                {/* Selector de Pestañas */}
                <div className="flex w-full mb-3 sm:mb-4 relative">
                  <div className="flex-1 text-center">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleTabChange('login')}
                      className={`w-full pb-1.5 text-[9.5px] sm:text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${activeTab === 'login' ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'}`}
                    >
                      {t('auth.login_tab')}
                    </button>
                  </div>
                  <div className="flex-1 text-center">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleTabChange('register')}
                      className={`w-full pb-1.5 text-[9.5px] sm:text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${activeTab === 'register' ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'}`}
                    >
                      {t('auth.register_tab')}
                    </button>
                  </div>
                  <motion.div
                    className="absolute bottom-0 h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                    animate={{ left: activeTab === 'login' ? '0%' : '50%', width: '50%' }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                  <div className="absolute bottom-0 w-full h-[1px] bg-white/10 -z-10" />
                </div>

                <form onSubmit={handleFormSubmit} className="flex flex-col gap-2.5 text-left">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[8.5px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">{t('auth.email_label')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Mail className="w-3.5 h-3.5" /></span>
                      <input
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        disabled={loading}
                        className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50"
                        placeholder={t('auth.email_placeholder')}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <label className="text-[8.5px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">{t('auth.password_label')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Lock className="w-3.5 h-3.5" /></span>
                      <input
                        type={showPassword ? 'text' : 'password'} 
                        value={password} 
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (localError) setLocalError(null);
                        }} 
                        disabled={loading}
                        className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-9 pr-9 py-1.5 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-cyan-400 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* CAMPOS ADICIONALES PARA REGISTRO */}
                  {activeTab === 'register' && (
                    <>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[8.5px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">Confirmar Clave</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Lock className="w-3.5 h-3.5" /></span>
                          <input
                            type={showConfirmPassword ? 'text' : 'password'} 
                            value={confirmPassword} 
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              if (localError) setLocalError(null);
                            }} 
                            disabled={loading}
                            className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-9 pr-9 py-1.5 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-cyan-400 transition-colors cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* CHECKLIST EN TIEMPO REAL PARA REGISTRO */}
                      <PasswordChecklist password={password} confirmPassword={confirmPassword} />

                      <div className="flex flex-col gap-0.5">
                        <label className="text-[8.5px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">Fecha de Cumpleaños</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Calendar className="w-3.5 h-3.5" /></span>
                          <input
                            type="date" 
                            value={birthDate} 
                            onChange={(e) => setBirthDate(e.target.value)} 
                            disabled={loading}
                            className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500/50 focus:bg-[#1C1E22] transition-all disabled:opacity-50 [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {/* CAPTCHA ANTI-BOT */}
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-[8.5px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium">Captcha Anti-Bot</label>
                          <button
                            type="button"
                            onClick={generateCaptcha}
                            className="text-[7.5px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> REGENERAR
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-[#1A1C20] border border-white/10 px-2.5 py-1.5 rounded-xl text-cyan-400 font-mono font-black text-xs shrink-0 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-cyan-400" />
                            <span>{captchaNum1} + {captchaNum2} = ?</span>
                          </div>
                          <input
                            type="number"
                            value={userCaptchaInput}
                            onChange={(e) => setUserCaptchaInput(e.target.value)}
                            disabled={loading}
                            placeholder="RESPUESTA"
                            className="w-full bg-[#1A1C20] border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* OPCIÓN RECUÉRDAME Y RECUPERACIÓN (SOLO EN LOGIN) */}
                  {activeTab === 'login' && (
                    <div className="flex items-center justify-between pt-0.5">
                      <button
                        type="button"
                        onClick={() => setRememberMe(!rememberMe)}
                        className="flex items-center gap-1.5 text-[9px] text-white/50 hover:text-cyan-300 transition-colors cursor-pointer"
                      >
                        {rememberMe ? (
                          <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-white/20" />
                        )}
                        <span>{t('auth.remember_me')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLocalError(null);
                          setScreen('forgot_password');
                        }}
                        className="text-[8.5px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer underline underline-offset-2"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  )}

                  {(localError || errorMessage) && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-2 rounded-lg mt-0.5">
                      <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                      <span className="text-[9px] font-mono text-red-400 uppercase leading-tight tracking-wider">{localError || errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      <span className="text-[9px] font-mono text-emerald-400 uppercase leading-tight tracking-wider">{successMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit" 
                    disabled={loading}
                    className="mt-1 w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-[0.15em] text-xs rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : (activeTab === 'login' ? t('auth.submit_login') : t('auth.submit_register'))}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ─── FASE 2: VERIFICACIÓN MULTI-FACTOR (MFA) ─── */}
            {activeViewScreen === 'two_factor' && (
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

            {/* ─── FASE RECUPERACIÓN DE CONTRASEÑA ─── */}
            {activeViewScreen === 'forgot_password' && (
              <motion.div
                key="forgot-password-form"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-3 py-1"
              >
                <div className="flex flex-col items-center text-center gap-2 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <KeyRound className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                  <h2 className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase text-white">
                    RECUPERAR ACCESO AL SISTEMA
                  </h2>
                  <p className="text-[9px] sm:text-[10px] text-zinc-400 font-mono leading-relaxed px-1">
                    Introduce tu correo electrónico registrado para enviarte un enlace de restablecimiento de credenciales.
                  </p>
                </div>

                <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-2.5 text-left">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[8.5px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">
                      CORREO ELECTRÓNICO
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                        <Mail className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50 font-mono"
                        placeholder="comandante@galaxydust.io"
                      />
                    </div>
                  </div>

                  {(localError || errorMessage) && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-2 rounded-lg mt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span className="text-[9px] font-mono text-red-400 uppercase leading-tight tracking-wider">
                        {localError || errorMessage}
                      </span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-[9px] font-mono text-emerald-400 uppercase leading-tight tracking-wider">
                        {successMessage}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-1 w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-[0.15em] text-xs rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>ENVIAR ENLACE DE RECUPERACIÓN</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleReturnToLogin}
                    disabled={loading}
                    className="w-full py-2 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white border border-white/10 font-mono uppercase tracking-[0.15em] text-[9.5px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>VOLVER AL INICIO DE SESIÓN</span>
                  </button>
                </form>
              </motion.div>
            )}

            {/* ─── FASE 4: ESTABLECER NUEVA CONTRASEÑA ─── */}
            {activeViewScreen === 'reset_password' && (
              <motion.div
                key="reset-password-screen"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-3 py-1"
              >
                <div className="flex flex-col items-center text-center gap-1.5 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <KeyRound className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                  <h2 className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase text-white">
                    ESTABLECER NUEVA CONTRASEÑA
                  </h2>
                  <p className="text-[9px] sm:text-[10px] text-zinc-400 font-mono leading-relaxed px-1">
                    Introduce tus nuevas credenciales de acceso para proteger tu flota.
                  </p>
                </div>

                <form onSubmit={handleSetNewPassword} className="flex flex-col gap-2.5 text-left">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[8.5px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">
                      NUEVA CONTRASEÑA
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (localError) setLocalError(null);
                        }}
                        disabled={loading}
                        className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50 font-mono"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-cyan-400 transition-colors cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <label className="text-[8.5px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">
                      CONFIRMAR NUEVA CONTRASEÑA
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => {
                          setConfirmNewPassword(e.target.value);
                          if (localError) setLocalError(null);
                        }}
                        disabled={loading}
                        className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all disabled:opacity-50 font-mono"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-cyan-400 transition-colors cursor-pointer"
                      >
                        {showConfirmNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* CHECKLIST EN TIEMPO REAL */}
                  <PasswordChecklist password={newPassword} confirmPassword={confirmNewPassword} />

                  {(localError || errorMessage) && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-2 rounded-lg mt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span className="text-[9px] font-mono text-red-400 uppercase leading-tight tracking-wider">
                        {localError || errorMessage}
                      </span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-[9px] font-mono text-emerald-400 uppercase leading-tight tracking-wider">
                        {successMessage}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || isSessionLoading || !validatePassword(newPassword, confirmNewPassword).isValid}
                    className="mt-1 w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-[0.15em] text-xs rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {(loading || isSessionLoading) ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>ACTUALIZAR CONTRASEÑA Y ENTRAR</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleReturnToLogin}
                    disabled={loading}
                    className="w-full py-2 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white border border-white/10 font-mono uppercase tracking-[0.15em] text-[9.5px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>VOLVER AL INICIO DE SESIÓN</span>
                  </button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
          </div>
        </GalaxyFrame>

      </div>
    </div>
  );
};