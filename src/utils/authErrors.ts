/**
 * Traductor y normalizador de errores de autenticación de Supabase a Español.
 */
export function translateAuthError(error: any): string {
  if (!error) return "Ha ocurrido un error inesperado.";
  const rawMessage = typeof error === "string" ? error : typeof error?.message === "string" ? error.message : "";
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes("rate limit") ||
    lower.includes("over_email_send_rate_limit") ||
    lower.includes("too many requests")
  ) {
    return "Has superado el límite temporal de correos de Supabase (máx. 3-4 por hora en capa gratuita). Espera unos minutos antes de volver a intentar.";
  }

  if (
    lower.includes("user already registered") ||
    lower.includes("user already exists") ||
    lower.includes("already registered")
  ) {
    return "Este correo electrónico ya está registrado. Por favor, inicia sesión.";
  }

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    lower.includes("invalid_grant")
  ) {
    return "Correo o contraseña incorrectos. Verifica tus datos e intenta nuevamente.";
  }

  if (lower.includes("email not confirmed")) {
    return "Debes confirmar tu correo electrónico antes de ingresar. Revisa tu bandeja de entrada o spam.";
  }

  if (
    lower.includes("password should be at least") ||
    lower.includes("weak_password")
  ) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  if (
    (lower.includes("email address") && lower.includes("invalid")) ||
    lower.includes("email_address_invalid")
  ) {
    return "El correo electrónico no es válido. Ingresa una dirección de correo real (ej: Gmail, Outlook).";
  }

  if (lower.includes("signup requires a valid password")) {
    return "Por favor ingresa una contraseña válida.";
  }

  if (
    lower.includes("network request failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("timeout")
  ) {
    return "Error de conexión. Revisa tu conexión a internet e inténtalo de nuevo.";
  }

  return rawMessage || "Ha ocurrido un error inesperado.";
}
