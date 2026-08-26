# Bonoa

**Todos tus bonos, beneficios y fidelizaciones. Un solo QR.**

Bonoa es una plataforma de fidelización para negocios y una wallet digital para sus clientes. El comercio crea bonos, los asigna o consume mediante un QR universal y puede medir recurrencia, lanzar campañas y premiar automáticamente a quienes vuelven.

## Qué resuelve

### Para el cliente

- una sola wallet para sus bonos;
- un QR universal;
- saldo/usos y caducidad en tiempo real;
- historial de movimientos;
- campañas y recompensas reclamables;
- progreso visible hacia el siguiente premio (`te falta 1 visita para…`);
- identidad Bonoa independiente de cada comercio.

### Para el negocio

- catálogo de bonos por usos o saldo;
- emisión, consumo y cancelación con trazabilidad;
- modo mostrador y escáner móvil;
- equipo con roles owner/manager/staff;
- métricas operativas y comerciales;
- radar de clientes: nuevos, activos, fieles y en riesgo;
- campañas compartibles por enlace/QR, con límite y caducidad;
- recompensas automáticas (`cada X consumos → regalar Y`);
- escaparate público con branding;
- auditoría y exportaciones CSV.

Los pagos siguen fuera de Bonoa durante el piloto: la plataforma registra el valor emitido y consumido, pero no lo presenta como facturación cobrada.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase PostgreSQL + Auth + Storage + Realtime + RLS/RPC
- Vercel
- PWA mobile-first

## Seguridad y modelo de datos

La autorización real vive en PostgreSQL/Supabase, no únicamente en la interfaz.

- RLS activo en las tablas de datos.
- Operaciones sensibles de bonos y fidelización mediante RPCs autorizadas.
- Emisiones y consumos protegidos frente a reintentos duplicados.
- Campañas: una reclamación por wallet.
- Premios: idempotencia por `regla + wallet + hito`.
- Un fallo al emitir un premio automático nunca invalida un consumo correcto; el siguiente consumo puede recuperar hitos pendientes.
- El radar del comercio utiliza identificadores pseudónimos `CL-...` y no expone email, nombre ni token QR del cliente.
- El QR no transporta saldo ni PII.

Entidades principales:

- `profiles`
- `businesses`
- `business_members`
- `loyalty_products`
- `wallets`
- `passes`
- `redemptions`
- `business_audit_events`
- `loyalty_campaigns`
- `loyalty_campaign_claims`
- `loyalty_reward_rules`
- `loyalty_reward_grants`

## Tramassso

Tramassso **no es proveedor de identidad ni comparte cuentas con Bonoa**. Se utiliza únicamente como escaparate/canal externo de descubrimiento para eventos, empresas o accesos públicos a Bonoa.

Bonoa mantiene su autenticación, datos y autorización de forma independiente.

## Desarrollo local

```bash
npm install
npm run dev
```

Después abre `http://localhost:3000`.

Para validar la misma puerta que CI:

```bash
npm run check
npm run smoke
```

## Variables de entorno

Copia `.env.example` a `.env.local` y configura al menos:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_TRAMASSSO_URL=https://www.tramassso.com
```

`NEXT_PUBLIC_TRAMASSSO_URL` es únicamente navegación externa; Bonoa no depende de una sesión de Tramassso.

## Ramas y despliegue

- `main`: versión estable/release.
- `develop`: integración desplegable.
- `feat/*`, `fix/*`, etc.: trabajo validado por GitHub Actions sin preview automático de Vercel.

La estrategia de piloto es acumular una tanda verde, integrarla en `develop`, hacer un único deployment y ejecutar el E2E real antes de promover a `main`.

Consulta `docs/PILOT_RELEASE_CHECKLIST.md` para la puerta de release completa.
