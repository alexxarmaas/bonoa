export function friendlyError(cause: unknown, fallback = "Ha ocurrido un error. Inténtalo de nuevo.") {
  const raw = cause instanceof Error
    ? cause.message
    : typeof cause === "object" && cause && "message" in cause
      ? String((cause as { message?: unknown }).message ?? "")
      : typeof cause === "string"
        ? cause
        : "";

  const message = raw.toLowerCase();

  const mappings: Array<[string, string]> = [
    ["invalid login credentials", "Email o contraseña incorrectos."],
    ["email not confirmed", "Confirma tu email antes de iniciar sesión."],
    ["user already registered", "Ya existe una cuenta con este email."],
    ["email rate limit exceeded", "Se han enviado demasiados correos. Inténtalo de nuevo en unos minutos."],
    ["for security purposes", "Espera unos segundos antes de volver a intentarlo."],
    ["password should be at least", "La contraseña debe tener al menos 6 caracteres."],
    ["business name is too short", "El nombre del negocio es demasiado corto."],
    ["invalid business slug", "El identificador del negocio no es válido."],
    ["businesses_slug_key", "Ese identificador de negocio ya está en uso."],
    ["duplicate key value", "Ya existe un registro con esos datos."],
    ["wallet qr is invalid or expired", "Ese QR ya no es válido. Pide al cliente que abra su QR actual."],
    ["wallet not found", "No encontramos la wallet asociada a esta cuenta."],
    ["active product not found", "Ese tipo de bono ya no está disponible."],
    ["business is not active", "Este negocio no está activo en Bonoa."],
    ["not authorized for this business", "No tienes permisos para realizar esta acción en el negocio."],
    ["pass not found", "No encontramos ese bono."],
    ["pass is not active", "Este bono ya no está activo."],
    ["pass is expired", "Este bono ha caducado."],
    ["insufficient remaining units", "El bono no tiene saldo o usos suficientes."],
    ["use-based passes require whole units", "Los bonos por usos solo permiten consumir unidades completas."],
    ["units_to_redeem supports at most two decimals", "El importe puede tener como máximo dos decimales."],
    ["authentication required", "Tu sesión ha caducado. Vuelve a iniciar sesión."],
    ["permission denied", "No tienes permisos para realizar esta acción."],
  ];

  const match = mappings.find(([needle]) => message.includes(needle));
  return match?.[1] ?? (raw || fallback);
}
