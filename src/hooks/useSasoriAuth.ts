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

  // 🛡️ HIDRATACIÓN Y CENTINELA DE SESIÓN ZERO-TRUST
  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async (userId: string) => {
      const { data: p1 } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (p1) return p1;

      const { data: p2 } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      return p2;
    };

    const hydrateActiveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session && session.user && isMounted) {
        const dbProfile = await fetchUserProfile(session.user.id);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && isMounted) {
        setUser(null);
        setScreenState('menu');
        setState('idle');
      } else if (event === 'SIGNED_IN' && session?.user && isMounted) {
        const provider = session.user.app_metadata?.provider;
        if (provider && provider !== 'email') {
          fetchUserProfile(session.user.id).then((dbProfile) => {
            if (!isMounted) return;
            setUser({
              email: session.user.email || '',
              name: dbProfile?.username || session.user.email?.split('@')[0].toUpperCase() || 'PILOTO',
              provider: provider as any,
              registrationDate: dbProfile?.created_at ? new Date(dbProfile.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              mfaEnabled: dbProfile?.mfa_enabled ?? false,
              verified: true,
              avatarUrl: dbProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${session.user.email}`,
              assignedToken: 'GD-SEC-' + session.user.id.slice(0, 8).toUpperCase(),
            });
            setScreenState('homepage');
            setState('connected');
          });
        }
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

  // 1. INICIAR SESIÓN CON SUPABASE AUTH
  const submitLogin = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    setState('authenticating');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setTempEmail(email);

      const { data: dbProfile } = await supabase
        .from('user_profiles')
        .select('mfa_enabled, username, avatar_url')
        .eq('id', data.user.id)
        .maybeSingle();

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
          avatarUrl: dbProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${data.user.email}`,
          assignedToken: 'GD-SEC-' + data.user.id.slice(0, 8).toUpperCase(),
        };
        setUser(loadedProfile);
        setScreenState('homepage');
        setState('connected');
      }
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'CONEXIÓN RECHAZADA • FIRMA INVÁLIDA');
      return false;
    }
  }, []);

  // 2. REGISTRO DE NUEVOS PILOTOS
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
      setSuccessMessage('REGISTRO COMPLETADO • ENLACE REMITIDO A SU CORREO');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'FALLO EN EL REGISTRO • HANDSHAKE INTERRUMPIDO');
      return false;
    }
  }, []);

  // 3. NEGOCIACIÓN OAUTH SOCIAL
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

  // 4. VERIFICACIÓN SMTP DE EMAIL ZERO-TRUST VÍA SUPABASE OTP
  const verifyEmailCode = useCallback(async (code: string) => {
    setState('verifying_email');
    setErrorMessage(null);

    try {
      if (!tempEmail) throw new Error('No se encontró dirección de correo para verificación.');

      const { error } = await supabase.auth.verifyOtp({
        email: tempEmail,
        token: code,
        type: 'signup'
      });

      if (error) throw error;

      setSuccessMessage('DIRECCIÓN DE CORREO VALIDADA CON ÉXITO');
      setState('idle');
      setScreenState('login');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'CÓDIGO DE VERIFICACIÓN INVÁLIDO O EXSPIRADO');
      return false;
    }
  }, [tempEmail]);

  // 5. RESOLUCIÓN DE SEGUNDO FACTOR (OTP) ZERO-TRUST
  const verifyTwoFA = useCallback(async (code: string) => {
    setState('verifying_2fa');
    setErrorMessage(null);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !authUser.email) throw new Error('No se detectó sesión activa en el cliente.');

      const { error } = await supabase.auth.verifyOtp({
        email: authUser.email,
        token: code,
        type: 'mfa'
      });

      if (error) {
        // Fallback a verificación por email si el factor es OTP estándar
        const { error: emailOtpErr } = await supabase.auth.verifyOtp({
          email: authUser.email,
          token: code,
          type: 'email'
        });
        if (emailOtpErr) throw error;
      }

      const { data: dbProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const loadedProfile: UserProfile = {
        email: authUser.email || '',
        name: dbProfile?.username || authUser.email.split('@')[0].toUpperCase(),
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
      setSuccessMessage('ACCESO CONCEDIDO • PERFIL MAESTRO INYECTADO');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'TOKEN OTP RECHAZADO POR EL KERNEL DE SEGURIDAD');
      return false;
    }
  }, []);

  // 6. RESTABLECER CREDENCIALES
  const submitResetPassword = useCallback(async (email: string) => {
    setState('resetting');
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setState('idle');
      setSuccessMessage(`TRANSMISIÓN EMITIDA • REVISE SU BANDEJA EN ${email.toUpperCase()}`);
      setScreenState('login');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'RESTABLECIMIENTO RECHAZADO POR EL SERVIDOR');
      return false;
    }
  }, []);

  // 7. CIERRE DE SESIÓN
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