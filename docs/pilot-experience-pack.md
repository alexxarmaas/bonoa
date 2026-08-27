# Bonoa · Pilot Experience Pack

Este bloque prepara Bonoa para demos y primeros pilotos comerciales sin añadir datos ficticios a Supabase.

## Escaparate público v2

`/c/[slug]` combina el perfil público del negocio con su club y sus reglas de fidelización. Un usuario puede crear cuenta/iniciar sesión y volver automáticamente a la misma página para añadir el carnet.

## PWA

- `manifest.webmanifest` sigue arrancando en `/wallet`.
- `public/sw.js` proporciona lifecycle de instalación sin cachear respuestas privadas.
- La wallet muestra instalación nativa cuando el navegador expone `beforeinstallprompt`.
- En iOS se muestran instrucciones `Compartir → Añadir a pantalla de inicio`.
- El aviso puede ocultarse durante 14 días y desaparece si Bonoa ya corre en modo standalone.

## Demo comercial

`/demo/business` es una vista pública, de solo lectura y con datos explícitamente ficticios. Sirve para enseñar radar de clientes, campañas, retorno, referidos y métricas antes de disponer de volumen real en un piloto.
