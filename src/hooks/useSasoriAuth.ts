import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { translateSupabaseAuthError } from '../utils/passwordValidator';

export type ScreenState =
  | 'menu'
  | 'login'
  | 'register'
  | 'forgot_password'
  | 'reset_password'
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
  id?: string;
  email: string;
  name: string;
  provider: 'password' | 'google' | 'github' | 'facebook';
  registrationDate: string;
  mfaEnabled: boolean;
  verified: boolean;
  avatarUrl: string;
  assignedToken: string;
  mustResetPassword?: boolean;
}

export interface UseSasoriAuthReturn {
  screen: ScreenState;
  state: AuthState;
  errorMessage: string | null;
  successMessage: string | null;
  user: UserProfile | null;
  tempEmail: string;
  isInitializing: boolean;
  showNewPasswordModal: boolean;
  setShowNewPasswordModal: (show: boolean) => void;
  setScreen: (screen: ScreenState) => void;
  submitLogin: (email: string, password: string, rememberMe: boolean) => Promise<boolean>;
  submitRegister: (email: string, password: string, metadata?: any) => Promise<boolean>;
  submitResetPassword: (email: string) => Promise<boolean>;
  submitUpdatePassword: (newPassword: string) => Promise<boolean>;
  triggerSocialLogin: (provider: 'google' | 'github' | 'facebook') => Promise<boolean>;
  verifyEmailCode: (code: string) => Promise<boolean>;
  verifyTwoFA: (code: string) => Promise<boolean>;
  logout: () => void;
  resetAuthStatus: () => void;
}

export const checkIsRecoveryUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash;
  const search = window.location.search;

  if (
    hash.includes('error=access_denied') ||
    hash.includes('error_code=otp_expired') ||
    search.includes('error=access_denied') ||
    search.includes('error_code=otp_expired')
  ) {
    return false;
  }

  return (
    hash.includes('type=recovery') ||
    hash.includes('access_token') ||
    search.includes('code=') ||
    search.includes('recovery=true')
  );
};

export const fetchUserProfileFromDb = async (userId: string) => {
  try {
    const { data: p2 } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (p2) return p2;

    const { data: p1 } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    return p1;
  } catch (err) {
    console.error('Error al consultar user_profiles:', err);
    return null;
  }
};

export function useSasoriAuth(): UseSasoriAuthReturn {
  const isInitialRecovery = checkIsRecoveryUrl();
  const [screen, setScreenState] = useState<ScreenState>(() => (isInitialRecovery ? 'reset_password' : 'login'));
  const [state, setState] = useState<AuthState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tempEmail, setTempEmail] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [showNewPasswordModal, setShowNewPasswordModal] = useState<boolean>(() => isInitialRecovery);

  // 🛡️ HIDRATACIÓN DE SESIÓN CON TIMEOUT
  useEffect(() => {
    let isMounted = true;

    const hydrateActiveSession = async () => {
      try {
        const isRecoveryUrl = checkIsRecoveryUrl();
        const { data: { session } } = await supabase.auth.getSession();

        if (session && session.user && isMounted) {
          const dbProfile = await fetchUserProfileFromDb(session.user.id);
          if (!isMounted) return;

          const mustReset = Boolean(dbProfile?.must_reset_password);

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: dbProfile?.username || session.user.email?.split('@')[0].toUpperCase() || 'PILOTO',
            provider: (session.user.app_metadata.provider || 'password') as any,
            registrationDate: dbProfile?.created_at ? new Date(dbProfile.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            mfaEnabled: dbProfile?.mfa_enabled ?? false,
            verified: true,
            avatarUrl: dbProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${session.user.email}`,
            assignedToken: 'GD-SEC-' + session.user.id.slice(0, 8).toUpperCase(),
            mustResetPassword: mustReset,
          });

          if (isRecoveryUrl || mustReset) {
            setShowNewPasswordModal(true);
            setScreenState('reset_password');
          } else {
            setScreenState('homepage');
            setState('connected');
          }
        } else if (isRecoveryUrl) {
          setShowNewPasswordModal(true);
          setScreenState('reset_password');
        } else {
          setScreenState('login');
          setState('idle');
        }
      } catch (err) {
        console.error("Error al hidratar sesión activa:", err);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
          setState('idle');
        }
      }
    };

    hydrateActiveSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isRecoveryUrl = checkIsRecoveryUrl();

      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && isRecoveryUrl)) {
        setShowNewPasswordModal(true);
        setScreenState('reset_password');
      }

      if (event === 'SIGNED_OUT' && isMounted) {
        setUser(null);
        setScreenState('login');
        setState('idle');
        setShowNewPasswordModal(false);
        setIsInitializing(false);
      } else if (event === 'SIGNED_IN' && session?.user && isMounted) {
        const dbProfile = await fetchUserProfileFromDb(session.user.id);
        if (!isMounted) return;

        const mustReset = Boolean(dbProfile?.must_reset_password);
        if (mustReset || isRecoveryUrl) {
          setShowNewPasswordModal(true);
          setScreenState('reset_password');
        }

        const provider = session.user.app_metadata?.provider || 'password';
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: dbProfile?.username || session.user.email?.split('@')[0].toUpperCase() || 'PILOTO',
          provider: provider as any,
          registrationDate: dbProfile?.created_at ? new Date(dbProfile.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          mfaEnabled: dbProfile?.mfa_enabled ?? false,
          verified: true,
          avatarUrl: dbProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${session.user.email}`,
          assignedToken: 'GD-SEC-' + session.user.id.slice(0, 8).toUpperCase(),
          mustResetPassword: mustReset,
        });

        if (!mustReset && !isRecoveryUrl) {
          setScreenState('homepage');
          setState('connected');
        }
        setIsInitializing(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const setScreen = useCallback((newScreen: ScreenState) => {
    if (checkIsRecoveryUrl() && newScreen !== 'reset_password') {
      return;
    }
    setScreenState(newScreen);
    setState('idle');
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  // 1. INICIAR SESIÓN CON TIMEOUT SEGURO (Nunca se queda colgado)
  const submitLogin = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    setState('authenticating');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const loginPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado al conectar con el servidor.')), 8000)
      );

      const { data, error } = (await Promise.race([loginPromise, timeoutPromise])) as any;
      if (error) throw error;

      setTempEmail(email);

      const dbProfile = await fetchUserProfileFromDb(data.user.id);
      const mustReset = Boolean(dbProfile?.must_reset_password);

      if ((dbProfile as any)?.mfa_enabled) {
        setScreenState('two_factor');
        setState('idle');
        setSuccessMessage('CREDENCIALES CORRECTAS • COMPILANDO VERIFICACIÓN MULTIFACTOR');
      } else {
        const loadedProfile: UserProfile = {
          id: data.user.id,
          email: data.user.email || '',
          name: dbProfile?.username || data.user.email?.split('@')[0].toUpperCase() || 'PILOTO',
          provider: 'password',
          registrationDate: new Date().toISOString().split('T')[0],
          mfaEnabled: false,
          verified: true,
          avatarUrl: dbProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${data.user.email}`,
          assignedToken: 'GD-SEC-' + data.user.id.slice(0, 8).toUpperCase(),
          mustResetPassword: mustReset,
        };
        setUser(loadedProfile);
        if (mustReset) {
          setShowNewPasswordModal(true);
        }
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

  // 2. REGISTRO
  const submitRegister = useCallback(async (email: string, password: string, metadata?: any) => {
    setState('registering');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const defaultUsername = email.split('@')[0].trim().toUpperCase();
      const metaPayload = {
        username: metadata?.username || defaultUsername,
        full_name: metadata?.full_name || defaultUsername,
        ...metadata,
      };

      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: metaPayload,
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        }
      });
      if (error) throw error;

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('Esta firma digital ya se encuentra registrada en los servidores centrales.');
      }

      setTempEmail(email);
      setScreenState('email_verification');
      setState('idle');
      setSuccessMessage('REGISTRO COMPLETADO • ENLACE REMITIDO A SU CORREO');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(translateSupabaseAuthError(err));
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

  // 4. VERIFICACIÓN SMTP DE EMAIL
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
      setErrorMessage(err.message || 'CÓDIGO DE VERIFICACIÓN INVÁLIDO O EXPIRADO');
      return false;
    }
  }, [tempEmail]);

  // 5. RESOLUCIÓN DE SEGUNDO FACTOR (MFA)
  const verifyTwoFA = useCallback(async (code: string) => {
    setState('verifying_2fa');
    setErrorMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user;
      if (!authUser || !authUser.email) throw new Error('No se detectó sesión activa en el cliente.');

      const { error } = await supabase.auth.verifyOtp({
        email: authUser.email,
        token: code,
        type: 'mfa'
      });

      if (error) {
        const { error: emailOtpErr } = await supabase.auth.verifyOtp({
          email: authUser.email,
          token: code,
          type: 'email'
        });
        if (emailOtpErr) throw error;
      }

      const dbProfile = await fetchUserProfileFromDb(authUser.id);
      const mustReset = Boolean(dbProfile?.must_reset_password);

      const loadedProfile: UserProfile = {
        id: authUser.id,
        email: authUser.email || '',
        name: dbProfile?.username || authUser.email.split('@')[0].toUpperCase(),
        provider: (authUser.app_metadata.provider || 'password') as any,
        registrationDate: dbProfile?.created_at ? new Date(dbProfile.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        mfaEnabled: true,
        verified: true,
        avatarUrl: dbProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${authUser.email}`,
        assignedToken: 'GD-SEC-' + authUser.id.slice(0, 8).toUpperCase(),
        mustResetPassword: mustReset,
      };

      setUser(loadedProfile);
      if (mustReset) {
        setShowNewPasswordModal(true);
      }
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
    setSuccessMessage(null);
    try {
      const cleanEmail = email.trim();
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/?recovery=true`
        : '/?recovery=true';
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      setState('idle');
      setSuccessMessage('Se ha transmitido un enlace de restablecimiento a tu bandeja de entrada.');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'RESTABLECIMIENTO RECHAZADO POR EL SERVIDOR');
      return false;
    }
  }, []);

  // 7. ACTUALIZAR CONTRASEÑA
  const submitUpdatePassword = useCallback(async (newPassword: string) => {
    setState('resetting');
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (!error) {
        if (data?.user?.id) {
          await supabase
            .from('user_profiles')
            .update({ must_reset_password: false })
            .eq('user_id', data.user.id);
        }

        setUser((prev) => (prev ? { ...prev, mustResetPassword: false } : null));
        setShowNewPasswordModal(false);
        setScreenState('homepage');
        setState('connected');
        setSuccessMessage('CONTRASEÑA ACTUALIZADA CON ÉXITO');

        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, '/');
          window.location.href = '/';
        }
        return true;
      }
      throw error;
    } catch (err: any) {
      setState('error');
      setErrorMessage(translateSupabaseAuthError(err));
      return false;
    }
  }, []);

  // 8. CIERRE DE SESIÓN
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTempEmail('');
    setShowNewPasswordModal(false);
    setScreenState('login');
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
    isInitializing,
    showNewPasswordModal,
    setShowNewPasswordModal,
    setScreen,
    submitLogin,
    submitRegister,
    submitResetPassword,
    submitUpdatePassword,
    triggerSocialLogin,
    verifyEmailCode,
    verifyTwoFA,
    logout,
    resetAuthStatus,
  };
}