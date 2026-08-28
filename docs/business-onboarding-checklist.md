# Checklist de verificación del onboarding de negocios

Antes de fusionar cambios en el onboarding comprobar:

- Un negocio nuevo se crea con nombre y slug y redirige al onboarding.
- No se puede finalizar sin categoría.
- No se puede finalizar sin descripción, teléfono y dirección/zona.
- No se puede finalizar sin logotipo y color hexadecimal válido.
- No se puede finalizar sin datos del carnet.
- Si no existe regla de fidelización, se crea una plantilla y premio.
- Si ya existe una regla activa, no se duplica.
- La publicación en directorio ocurre únicamente después de guardar correctamente ficha, carnet y fidelización.
- Al finalizar se actualiza `onboarding_completed_at`.
- El comercio puede ocultarse posteriormente desde la sección Directorio.
