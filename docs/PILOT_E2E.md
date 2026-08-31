# Bonoa — Validación E2E del piloto

Este documento define el recorrido mínimo que debe funcionar antes de incorporar comercios reales. No cubre Google Wallet ni Apple Wallet.

## 1. Alta de negocio

- Crear un negocio desde `/business`.
- Entrar automáticamente en `/business/:id/onboarding`.
- Completar nombre comercial, categoría, descripción, teléfono, dirección/zona, logo y color.
- Configurar nombre/mensaje del club y etiqueta del carnet.
- Seleccionar una fidelización inicial y premio cuando el negocio todavía no tenga una regla activa.
- Finalizar el onboarding sin errores de permisos.
- Verificar que `onboarding_completed_at` queda informado.
- Verificar que `directory_listed = true` y que existe `directory_category`.

## 2. Descubrimiento

- El negocio aparece en `/negocios`.
- Se puede encontrar por nombre, categoría y zona.
- La tarjeta muestra logo, categoría, descripción y ofertas públicas si existen.
- El escaparate `/c/:slug` carga correctamente.

## 3. Alta de cliente

- Un usuario autenticado abre el escaparate público.
- Se une al negocio y recibe el carnet permanente.
- El carnet aparece en su wallet web.
- El QR de la wallet sigue siendo único para todos los negocios.

## 4. Operación en mostrador

- Owner/manager/staff autorizado abre el mostrador.
- Escanea o introduce el QR del cliente.
- El cliente y sus bonos se resuelven correctamente.
- Se registra una visita o compra.
- Si hay importe mínimo, una compra inferior no suma progreso.
- Una compra válida sí suma progreso.

## 5. Fidelización y premio

- El progreso del cliente aumenta tras el evento válido.
- Al alcanzar el objetivo se genera el premio una sola vez.
- Repetir una petición con el mismo `request_id` no duplica operaciones.
- El premio aparece en la wallet y en el historial.

## 6. Consumo e historial

- Un bono activo puede consumirse desde el negocio autorizado.
- No se permite consumir más unidades que las disponibles.
- El saldo/usos restantes se actualizan.
- La operación aparece en historial/recibo.
- El panel del negocio refleja la actividad.

## 7. Notificaciones y crecimiento

- Se refrescan las notificaciones de sistema.
- Las campañas activas respetan segmento, fechas y límite de reclamaciones.
- Los referidos no permiten autoreferido ni reutilización indebida.
- Los eventos de riesgo se registran cuando corresponde.

## 8. Seguridad

- Un usuario ajeno a un negocio no puede modificarlo ni operar sobre sus clientes.
- Staff no obtiene permisos de owner/manager.
- Los cambios de directorio y operaciones relevantes quedan auditados.
- Las mutaciones sensibles siguen protegidas por RLS/RPC.

## Criterio de salida

El piloto está listo cuando este recorrido puede completarse de principio a fin con un negocio recién creado y un usuario cliente independiente, sin intervención manual en Supabase.
