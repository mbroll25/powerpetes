export function getAuthErrorMessage(error: unknown) {
  const fallbackMessage =
    "Ocurrió un error inesperado. Intentá nuevamente en unos segundos.";

  if (!error || typeof error !== "object") {
    return fallbackMessage;
  }

  const maybeError = error as {
    message?: string;
    code?: string;
    status?: number;
  };

  const message = maybeError.message?.toLowerCase().trim() ?? "";
  const code = maybeError.code?.toLowerCase().trim() ?? "";

  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials")
  ) {
    return "El email o la contraseña son incorrectos.";
  }

  if (
    code === "email_not_confirmed" ||
    message.includes("email not confirmed")
  ) {
    return "Tenés que confirmar tu email antes de iniciar sesión.";
  }

  if (
    code === "user_already_exists" ||
    message.includes("user already registered") ||
    message.includes("already registered")
  ) {
    return "Ya existe una cuenta registrada con ese email.";
  }

  if (message.includes("password should be") || message.includes("password")) {
    return "La contraseña no cumple con los requisitos mínimos.";
  }

  if (
    message.includes("email") &&
    (message.includes("invalid") || message.includes("bad"))
  ) {
    return "Ingresá un email válido.";
  }

  if (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    maybeError.status === 429
  ) {
    return "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("failed to fetch")
  ) {
    return "No se pudo conectar con el servidor. Revisá tu conexión e intentá nuevamente.";
  }

  return fallbackMessage;
}
