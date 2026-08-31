# Bonōa · corte de piloto

Este documento define el mínimo que debe mantenerse verde antes de incorporar negocios reales.

## 1. CI obligatorio

Cada PR ejecuta:

1. lint + typecheck + build;
2. smoke tests;
3. contrato estructural del piloto;
4. navegador headless con Playwright.

El navegador comprueba siempre:

- `/api/health`;
- carga de `/login`;
- redirección a login de `/wallet`, `/business`, `/admin` y `/negocios`;
- carga del escaparate público `/c/tramassso`.

## 2. E2E autenticado opcional

El mismo script amplía automáticamente las pruebas cuando GitHub Actions tenga estos secrets:

- `E2E_BUSINESS_EMAIL`
- `E2E_BUSINESS_PASSWORD`
- `E2E_BUSINESS_ID` (recomendado)
- `E2E_CLIENT_EMAIL`
- `E2E_CLIENT_PASSWORD`

Con ellos valida también:

- login de negocio;
- pantalla `Tus negocios`;
- dashboard y modo mostrador del negocio indicado;
- login del cliente;
- wallet, QR, historial, notificaciones y directorio.

Las cuentas deben ser cuentas QA dedicadas. No usar credenciales personales ni cuentas de clientes reales.

## 3. Onboarding obligatorio

`businesses.onboarding_completed_at` es la fuente de verdad para habilitar la operativa.

Mientras sea `NULL`:

- owner/manager es dirigido a `/business/[id]/onboarding`;
- staff no puede usar las rutas operativas;
- la pantalla `Tus negocios` no ofrece Panel ni Mostrador;
- el backend rechaza nuevas membresías, pases, eventos de fidelización y redenciones.

El frontend no es la única barrera: los triggers de Supabase impiden saltarse el onboarding llamando directamente a los RPC.

## 4. Validación de backend previa al piloto

Antes de este corte se ejecutó contra Supabase un recorrido completo dentro de una transacción con `ROLLBACK`:

`negocio temporal → alta cliente → compra → recompensa automática → emisión del pase → consumo → historial`

La prueba terminó correctamente y no dejó datos QA persistentes.

## 5. Criterio para incorporar negocios

Podemos incorporar negocios al piloto cuando:

- CI esté verde;
- `/api/health` responda `status: ok`;
- el deployment de Vercel corresponda al SHA mergeado en `develop`;
- las migraciones estén aplicadas en Supabase;
- el alta de un negocio nuevo pueda completarse sin intervención manual en la base de datos.

Google Wallet y Apple Wallet quedan fuera de este corte de piloto.
