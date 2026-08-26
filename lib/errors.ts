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
    ["businesses_name_length_check", "El nombre del negocio debe tener entre 2 y 120 caracteres."],
    ["businesses_slug_format_check", "El identificador del negocio solo puede contener letras minúsculas, números y guiones."],
    ["businesses_description_length_check", "La descripción del negocio no puede superar 1.000 caracteres."],
    ["businesses_phone_length_check", "El teléfono es demasiado largo."],
    ["businesses_website_url_check", "La web debe ser una URL completa que empiece por http:// o https://."],
    ["businesses_instagram_url_check", "El enlace de Instagram debe ser una URL completa que empiece por http:// o https://."],
    ["businesses_address_length_check", "La dirección no puede superar 300 caracteres."],
    ["businesses_logo_url_check", "La URL del logotipo no es válida."],
    ["loyalty_products_name_length_check", "El nombre del bono debe tener entre 2 y 120 caracteres."],
    ["loyalty_products_description_length_check", "La descripción del bono no puede superar 500 caracteres."],
    ["loyalty_products_initial_units_upper_check", "La cantidad inicial del bono es demasiado alta."],
    ["loyalty_products_validity_days_upper_check", "La validez máxima admitida es de 3.650 días."],
    ["loyalty_products_sale_price_upper_check", "El precio indicado es demasiado alto."],
    ["duplicate key value", "Ya existe un registro con esos datos."],
    ["wallet qr is invalid or expired", "Ese QR ya no es válido. Pide al cliente que abra su QR actual."],
    ["wallet not found", "No encontramos la wallet asociada a esta cuenta."],
    ["active product not found", "Ese tipo de bono ya no está disponible."],
    ["business is not active", "Este negocio no está activo en Bonoa."],
    ["not authorized for this business", "No tienes permisos para realizar esta acción en el negocio."],
    ["owner role required", "Esta acción solo puede realizarla un propietario del negocio."],
    ["only owners can assign elevated roles", "Solo un propietario puede añadir managers u otros propietarios."],
    ["user is not registered in bonoa", "Ese email todavía no tiene una cuenta Bonoa. Debe registrarse primero."],
    ["user is already a business member", "Ese usuario ya pertenece al equipo del negocio."],
    ["business member not found", "Ese miembro ya no pertenece al equipo."],
    ["business must keep at least one owner", "El negocio debe conservar al menos un propietario."],
    ["managers can only remove staff", "Un manager solo puede retirar miembros con rol staff."],
    ["member email is required", "Introduce el email del miembro que quieres añadir."],
    ["pass not found", "No encontramos ese bono."],
    ["pass is not active", "Este bono ya no está activo."],
    ["pass is expired", "Este bono ha caducado."],
    ["insufficient remaining units", "El bono no tiene saldo o usos suficientes."],
    ["use-based passes require whole units", "Los bonos por usos solo permiten consumir unidades completas."],
    ["units_to_redeem supports at most two decimals", "El importe puede tener como máximo dos decimales."],
    ["request_id has already been used for another issuance", "Ese identificador de operación ya se utilizó para otra emisión. Vuelve a iniciar la operación."],
    ["request_id has already been used for another redemption", "Ese identificador de operación ya se utilizó para otro consumo. Vuelve a iniciar la operación."],
    ["request_id is required", "No se pudo identificar la operación de forma segura. Inténtalo de nuevo."],
    ["issuance could not be completed", "No pudimos confirmar la emisión. Inténtalo de nuevo; Bonoa evitará duplicarla."],
    ["authentication required", "Tu sesión ha caducado. Vuelve a iniciar sesión."],
    ["permission denied", "No tienes permisos para realizar esta acción."],
  ];

  const match = mappings.find(([needle]) => message.includes(needle));
  return match?.[1] ?? (raw || fallback);
}
