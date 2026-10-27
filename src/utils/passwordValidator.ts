export interface PasswordValidationResult {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isMatching: boolean;
  isValid: boolean;
}

export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

export const validatePassword = (
  password: string,
  confirmPassword?: string
): PasswordValidationResult => {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = SPECIAL_CHAR_REGEX.test(password);
  const isMatching = confirmPassword !== undefined ? password === confirmPassword && password.length > 0 : true;

  const isValid = minLength && hasUpper && hasLower && hasNumber && hasSpecial && isMatching;

  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isMatching,
    isValid,
  };
};

export const getPasswordValidationError = (
  password: string,
  confirmPassword?: string
): string | null => {
  if (!password) {
    return 'Por favor ingresa una clave de seguridad.';
  }

  const result = validatePassword(password, confirmPassword);

  if (!result.minLength) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (!result.hasUpper) {
    return 'La contraseña debe contener al menos una letra mayúscula (A-Z).';
  }
  if (!result.hasLower) {
    return 'La contraseña debe contener al menos una letra minúscula (a-z).';
  }
  if (!result.hasNumber) {
    return 'La contraseña debe contener al menos un número (0-9).';
  }
  if (!result.hasSpecial) {
    return 'La contraseña debe contener al menos un carácter especial (@, #, $, etc.).';
  }
  if (confirmPassword !== undefined && !result.isMatching) {
    return 'Las contraseñas no coinciden. Asegúrate de escribirlas idénticas.';
  }

  return null;
};

export const translateSupabaseAuthError = (err: any): string => {
  const msg = typeof err === 'string' ? err : err?.message || '';

  if (msg.includes('weak_password') || msg.includes('Password should be at least')) {
    return 'La clave de seguridad no cumple los requisitos mínimos (8 caracteres, mayúscula, minúscula, número y símbolo especial).';
  }
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'Este correo electrónico ya se encuentra registrado en el sistema central.';
  }
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
    return 'Credenciales inválidas. Verifica tu correo y contraseña.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Tu correo no ha sido confirmado. Revisa tu bandeja de entrada o spam.';
  }
  if (msg.includes('over_email_send_rate_limit') || msg.includes('rate limit')) {
    return 'Demasiadas solicitudes en poco tiempo. Espera unos minutos antes de reintentar.';
  }
  if (msg.includes('Auth session missing') || msg.includes('session has expired')) {
    return 'La sesión de recuperación ha expirado. Por favor solicita un nuevo enlace.';
  }
  if (msg.includes('Database error saving new user')) {
    return 'Error en la base de datos al registrar el perfil. Contacta con soporte técnico.';
  }

  return msg || 'Ocurrió un error inesperado en la red. Intenta nuevamente.';
};
