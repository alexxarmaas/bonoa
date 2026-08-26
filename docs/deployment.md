# Despliegue de Bonoa

## Arquitectura

Bonoa se mantiene como aplicación Next.js independiente, aunque la entrada pública forme parte del ecosistema Tramassso.

- Repositorio: `alexxarmaas/bonoa`
- Hosting: Vercel
- Backend/Auth: Supabase
- Desarrollo integrado: rama `develop`
- Producción futura: rama `main`
- Dominio final previsto: `https://bonoa.tramassso.com`

## Proyecto Vercel

Importar el repositorio `alexxarmaas/bonoa` en el equipo `alexxarmaas' projects` con nombre de proyecto `bonoa`.

Durante desarrollo:

- Framework Preset: Next.js (autodetectado)
- Root Directory: repositorio raíz
- Node.js: 22 (también fijado mediante `package.json` y `.nvmrc`)
- Production Branch temporal: `develop`
- Preview Deployments: activados para ramas/PRs

Cuando Bonoa pase a producción estable, cambiar Production Branch de `develop` a `main`.

## Variables de entorno Vercel

Configurar tanto para Preview como Production:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dssxekvsmrlpkoqtgtmw.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key-del-proyecto-bonoa>
```

Nunca añadir una Service Role Key al frontend ni a variables `NEXT_PUBLIC_*`.

## Supabase Auth

La aplicación usa `window.location.origin` para generar el destino de confirmación de registro, por lo que funciona sin cambios de código entre localhost, previews y dominio final.

En Supabase > Authentication > URL Configuration:

### Mientras se desarrolla

Añadir a Additional Redirect URLs:

```text
http://localhost:3000/**
https://*-alexxarmaas-projects.vercel.app/**
```

Si el slug real generado por Vercel difiere, adaptar el patrón al dominio de preview real.

### Producción

Site URL:

```text
https://bonoa.tramassso.com
```

Additional Redirect URL exacta:

```text
https://bonoa.tramassso.com/**
```

Mantener los patrones de preview mientras se sigan utilizando deployments de desarrollo.

## Dominio en Nominalia

Cuando se quiera activar `bonoa.tramassso.com`:

1. Añadir `bonoa.tramassso.com` como dominio del proyecto Bonoa en Vercel.
2. Vercel mostrará el registro DNS requerido.
3. En Nominalia, crear el registro DNS para el host `bonoa` exactamente con el destino indicado por Vercel. Para un subdominio normalmente será un CNAME.
4. Esperar a que Vercel marque el dominio como válido.
5. Vercel emitirá y renovará automáticamente el certificado HTTPS.
6. Actualizar Site URL y Redirect URLs en Supabase como se indica arriba.

No hace falta mover DNS de `tramassso.com` completo a Vercel: se puede delegar únicamente el subdominio `bonoa` mediante el registro indicado.

## Integración con Tramassso

Tramassso será la puerta de entrada visible:

- Área cliente -> Mis bonos -> `https://bonoa.tramassso.com/`
- Área negocio -> Bonoa Business -> `https://bonoa.tramassso.com/business`

La autenticación compartida/SSO entre Tramassso y Bonoa se tratará como una fase posterior. Hasta entonces, Bonoa mantiene su propia sesión Supabase.
