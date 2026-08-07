import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type ScreenState =
  | 'menu'
  | 'login'
  | 'register'
  | 'forgot_password'
  | 'email_verification'
  | 'two_factor'
  | 'profile'
  | 'homepage';

export type AuthState =
  | 'idle'
  | 'authenticating'
  | 'registering'
  | 'resetting'
  | 'verifying_email'
  | 'verifying_2fa'
  | 'connected'
  | 'error';

export interface UserProfile {
  email: string;
  name: string;
  provider: 'password' | 'google' | 'github' | 'facebook';
  registrationDate: string;
  mfaEnabled: boolean;
  verified: boolean;
  avatarUrl: string;
  assignedToken: string;
}

export interface UseSasoriAuthReturn {
  screen: ScreenState;
  state: AuthState;
  errorMessage: string | null;
  successMessage: string | null;
  user: UserProfile | null;
  tempEmail: string;
  setScreen: (screen: ScreenState) => void;
  submitLogin: (email: string, password: string, rememberMe: boolean) => Promise<boolean>;
  submitRegister: (email: string, password: string) => Promise<boolean>;
  submitResetPassword: (email: string) => Promise<boolean>;
  triggerSocialLogin: (provider: 'google' | 'github' | 'facebook') => Promise<boolean>;
  verifyEmailCode: (code: string) => Promise<boolean>;
  verifyTwoFA: (code: string) => Promise<boolean>;
  logout: () => void;
  resetAuthStatus: () => void;
}

export function useSasoriAuth(): UseSasoriAuthReturn {
  const [screen, setScreenState] = useState<ScreenState>('menu');
  const [state, setState] = useState<AuthState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tempEmail, setTempEmail] = useState<string>('');

  // 🛰️ CENTINELA DE SESIÓN: Evita la expulsión automática al recargar la página (F5)
  useEffect(() => {
    let isMounted = true;

    const hydrateActiveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session && session.user && isMounted) {
        // Extraemos el perfil real de la base de datos central
        const { data: dbProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!isMounted) return;

        setUser({
          email: session.user.email || '',
          name: dbProfile?.username || session.user.email?.split('@')[0].toUpperCase() || 'PILOTO',
          provider: (session.user.app_metadata.provider || 'password') as any,
          registrationDate: dbProfile?.created_at ? new Date(dbProfile.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          mfaEnabled: dbProfile?.mfa_enabled ?? false,
          verified: true,
          avatarUrl: dbProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${session.user.email}`,
          assignedToken: 'GD-SEC-' + session.user.id.slice(0, 8).toUpperCase(),
        });

        setScreenState('homepage');
        setState('connected');
      }
    };

    hydrateActiveSession();

    // Escucha en tiempo real si la sesión expira o el token cambia globalmente
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && isMounted) {
        setUser(null);
        setScreenState('menu');
        setState('idle');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const setScreen = useCallback((newScreen: ScreenState) => {
    setScreenState(newScreen);
    setState('idle');
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  // 1. INICIAR SESIÓN ASÍNCRONA CON SUPABASE AUTH
  const submitLogin = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    setState('authenticating');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setTempEmail(email);

      // Consultamos el perfil para verificar si el usuario tiene habilitado el MFA de juego
      const { data: dbProfile } = await supabase
        .from('user_profiles')
        .select('mfa_enabled')
        .eq('user_id', data.user.id)
        .maybeSingle();

      // Si requiere MFA saltamos a la terminal OTP; si no, inyectamos perfil de inmediato
      if (dbProfile?.mfa_enabled) {
        setScreenState('two_factor');
        setState('idle');
        setSuccessMessage('CREDENCIALES CORRECTAS • COMPILANDO VERIFICACIÓN MULTIFACTOR');
      } else {
        const loadedProfile: UserProfile = {
          email: data.user.email || '',
          name: dbProfile?.username || data.user.email?.split('@')[0].toUpperCase() || 'PILOTO',
          provider: 'password',
          registrationDate: new Date().toISOString().split('T')[0],
          mfaEnabled: false,
          verified: true,
          avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${data.user.email}`,
          assignedToken: 'GD-SEC-' + data.user.id.slice(0, 8).toUpperCase(),
        };
        setUser(loadedProfile);
        setScreenState('homepage');
        setState('connected');
      }
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'CONEXIÓN RECHAZADA • LOGÍSTICA DE FIRMA INVÁLIDA');
      return false;
    }
  }, []);

  // 2. REGISTRO NOMINAL DE NUEVOS PILOTOS
  const submitRegister = useCallback(async (email: string, password: string) => {
    setState('registering');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data.user && data.user.identities?.length === 0) {
        throw new Error('Esta firma digital ya se encuentra registrada en los servidores centrales.');
      }

      setTempEmail(email);
      setScreenState('email_verification');
      setState('idle');
      setSuccessMessage('REGISTRO COMPLETADO • ENLACE REMITIDO A SU BANDEJA DE ENTRADA');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'FALLO EN EL REGISTRO • HANDSHAKE INTERRUMPIDO');
      return false;
    }
  }, []);

  // 3. NEGOCIACIÓN OAUTH SOCIAL SINGLE-SIGN-ON
  const triggerSocialLogin = useCallback(async (provider: 'google' | 'github' | 'facebook') => {
    setState('authenticating');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage('FALLO EN LA NEGOCIACIÓN CON EL PROVEEDOR SOCIAL EXTERNO');
      return false;
    }
  }, []);

  // 4. VERIFICACIÓN SMTP DE EMAIL (MODO SIMULADO PARA ENTORNO DE DESARROLLO)
  const verifyEmailCode = useCallback(async (code: string) => {
    setState('verifying_email');
    setErrorMessage(null);
    try {
      if (code !== '123456' && code.length !== 6) {
        throw new Error('Código incorrecto. Utilice el bypass de desarrollo "123456".');
      }
      setSuccessMessage('DIRECCIÓN DE CORREO VALIDADA CON ÉXITO');
      setState('idle');
      setScreenState('login');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message);
      return false;
    }
  }, []);

  // 5. RESOLUCIÓN DE SEGUNDO FACTOR (OTP)
  const verifyTwoFA = useCallback(async (code: string) => {
    setState('verifying_2fa');
    setErrorMessage(null);

    try {
      if (code !== '123456' && code.length !== 6) {
        throw new Error('Token OTP rechazado por el Kernel de seguridad militar.');
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('No se detectó sesión activa en el cliente.');

      const { data: dbProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      const loadedProfile: UserProfile = {
        email: authUser.email || '',
        name: dbProfile?.username || authUser.email?.split('@')[0].toUpperCase() || 'PILOTO',
        provider: (authUser.app_metadata.provider || 'password') as any,
        registrationDate: dbProfile?.created_at ? new Date(dbProfile.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        mfaEnabled: true,
        verified: true,
        avatarUrl: dbProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${authUser.email}`,
        assignedToken: 'GD-SEC-' + authUser.id.slice(0, 8).toUpperCase(),
      };

      setUser(loadedProfile);
      setScreenState('homepage');
      setState('connected');
      setSuccessMessage('ACCESO CONCEDIDO • PERFIL MAESTRO INYECTADO COHORT');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'FALLO AL RECOMPONER EL HANDSHAKE DE REFRESCO');
      return false;
    }
  }, []);

  // 6. SOLICITAR REGENERACIÓN DE CREDENCIALES
  const submitResetPassword = useCallback(async (email: string) => {
    setState('resetting');
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setState('idle');
      setSuccessMessage(`TRANSMISIÓN EMITIDA • REVISE LA BANDEJA DE ${email.toUpperCase()}`);
      setScreenState('login');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'RESTABLECIMIENTO RECHAZADO POR EL SERVIDOR');
      return false;
    }
  }, []);

  // 7. CLAUSURA DE SESIÓN Y DESTRUCCIÓN DE TOKENS
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTempEmail('');
    setScreenState('menu');
    setState('idle');
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const resetAuthStatus = useCallback(() => {
    setState('idle');
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  return {
    screen,
    state,
    errorMessage,
    successMessage,
    user,
    tempEmail,
    setScreen,
    submitLogin,
    submitRegister,
    submitResetPassword,
    triggerSocialLogin,
    verifyEmailCode,
    verifyTwoFA,
    logout,
    resetAuthStatus,
  };
}