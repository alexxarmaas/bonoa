# Bonoa — Checklist de release para piloto

Este documento define la puerta mínima antes de promocionar una tanda de `develop` a `main` y utilizar Bonoa con un comercio real.

## 1. Código y base de datos

- [ ] Todas las migraciones aplicadas están versionadas en `supabase/migrations/`.
- [ ] `npm run lint` pasa.
- [ ] `npm run typecheck` pasa.
- [ ] `npm run build` pasa.
- [ ] `npm run smoke` pasa contra el build resultante.
- [ ] `/api/health` devuelve `200`, `status=ok` y el commit esperado.
- [ ] No hay errores `error`/`fatal` nuevos en Vercel tras el despliegue.
- [ ] Supabase permanece `ACTIVE_HEALTHY`.
- [ ] Advisors de seguridad revisados; cualquier warning restante está entendido y documentado.

## 2. E2E cliente ↔ comercio (dos cuentas y dos dispositivos)

Usar una cuenta cliente y una cuenta del negocio distintas. No validar el piloto únicamente con el owner como cliente.

1. Registrar/iniciar sesión con el cliente.
2. Abrir `Mi QR` en el dispositivo del cliente.
3. Iniciar sesión con el comercio en otro dispositivo.
4. Abrir `Asignar / consumir` y escanear el QR.
5. Confirmar que el comercio no ve email, nombre ni otros datos personales del cliente.
6. Emitir un bono con precio y caducidad conocidos.
7. Confirmar que aparece en la wallet del cliente mediante Realtime, sin recargar.
8. Consumir una unidad o importe.
9. Confirmar en la wallet el nuevo saldo y el historial.
10. Repetir un consumo válido y comprobar el agotado automático cuando llega a cero.
11. En otro bono activo, probar cancelación desde owner/manager.
12. Confirmar que el cliente ve el estado cancelado y no puede volver a utilizarlo.
13. Pulsar `Terminar cliente` y comprobar que el escáner se rearma para el siguiente QR.

### Pruebas negativas

- [ ] QR antiguo después de rotarlo: rechazado.
- [ ] Consumo superior al saldo: rechazado.
- [ ] Decimales en un bono por usos: rechazados.
- [ ] Bono caducado: no consumible.
- [ ] Staff intentando cancelar: rechazado.
- [ ] Doble clic/reintento de emisión: no crea dos bonos para la misma operación.
- [ ] Reintento de consumo con el mismo `request_id`: no duplica el consumo.

## 3. E2E de fidelización

### Carnet permanente y objetivo incremental

1. Usar un cliente sin relación previa con el comercio.
2. Registrar su primera compra o visita y confirmar que aparece automáticamente un carnet del comercio en `Mis carnets`.
3. Confirmar que el carnet permanece visible aunque el cliente no tenga ningún bono consumible activo.
4. Crear un objetivo `2 compras de al menos 50 € → premio B`.
5. Registrar una compra de 49 €: debe aparecer en el historial, pero no aumentar el progreso del objetivo.
6. Registrar una compra de 50 €: el carnet debe mostrar `1 / 2`.
7. Registrar una compra de 75 €: el carnet debe completar `2 / 2` y emitir exactamente un premio B.
8. Confirmar que el premio aparece en `Mis bonos y premios`, separado del carnet.
9. Si la regla es repetible, confirmar que el carnet inicia el siguiente ciclo sin perder la antigüedad ni la relación con el comercio.
10. Reintentar una operación con el mismo `request_id`: no debe sumar progreso ni emitir premio dos veces.

### Recibos e historial

- [ ] Compra registrada muestra comercio, importe, fecha y referencia de operación.
- [ ] Visita registrada aparece en el feed aunque no tenga importe.
- [ ] Emisión de bono aparece como movimiento independiente.
- [ ] Premio automático aparece como movimiento independiente.
- [ ] Reclamación de campaña aparece como movimiento independiente.
- [ ] Consumo muestra saldo anterior y saldo posterior correctos.
- [ ] La referencia `OP-...` es estable para la operación y no expone PII.

### Centro de notificaciones

- [ ] Compra genera aviso al cliente.
- [ ] Visita genera aviso al cliente.
- [ ] Consumo de bono genera aviso con saldo restante.
- [ ] Premio automático genera aviso de `Premio desbloqueado`.
- [ ] Reclamación de campaña genera aviso.
- [ ] Se puede marcar un aviso como leído.
- [ ] `Marcar todo como leído` solo afecta a la wallet autenticada.

### Campaña compartible y segmentada

1. Crear un producto promocional activo en Catálogo.
2. En `Fidelización`, crear una campaña con límite de reclamaciones y fecha de fin.
3. Copiar el enlace `/promo/[code]` y abrirlo en una sesión de cliente distinta.
4. Si el cliente no tiene sesión, registrarse/iniciar sesión y confirmar que vuelve automáticamente a la campaña.
5. Reclamar el premio y comprobar que aparece inmediatamente en la wallet con precio promocional 0 €.
6. Abrir de nuevo el mismo enlace y reclamar otra vez: debe devolver el mismo bono, no emitir uno nuevo.
7. Comprobar que el contador de reclamaciones solo aumenta una vez.
8. Pausar la campaña y confirmar que una wallet nueva ya no puede reclamarla.
9. Repetir con una campaña agotada por `max_claims` y confirmar el estado público correcto.
10. Crear una campaña `En riesgo` y confirmar que un cliente de otro segmento recibe `campaign_not_eligible`.
11. Confirmar que un cliente del segmento objetivo sí puede reclamarla una vez.
12. Repetir la validación con `Nuevos`, `Activos` o `Fieles` según los datos de prueba.

### Recompensa automática

1. Crear una regla sencilla para prueba, por ejemplo `cada 2 consumos de A → regalar B`.
2. Consumir una vez: no debe aparecer premio.
3. Registrar el segundo consumo: el premio B debe aparecer automáticamente en la wallet.
4. Confirmar un único `reward_issued` en Actividad y un único grant para ese hito.
5. Repetir/reintentar la operación de consumo: no debe duplicar ni el consumo ni el premio.
6. Pausar la regla y verificar que deja de generar premios nuevos.
7. Reactivarla y verificar que vuelve a funcionar.
8. Probar recuperación: hacer temporalmente no disponible el producto-premio en un entorno controlado, alcanzar el hito, reactivarlo y confirmar que un consumo posterior recupera el hito pendiente sin duplicarlo.

### Radar de clientes

- [ ] `Clientes` muestra códigos pseudónimos `CL-...`, nunca email/nombre/token QR.
- [ ] Una wallet reciente se clasifica como `Nuevo`.
- [ ] La recurrencia actualiza el segmento y los contadores.
- [ ] Un cliente con actividad y >45 días de inactividad aparece como `En riesgo`.
- [ ] Un cliente aparece como `Fiel` si cumple al menos uno: >=5 compras, >=8 visitas, >=5 consumos/redenciones o >=2 premios.
- [ ] La tasa de recurrentes coincide con los datos de prueba.
- [ ] El dashboard muestra correctamente clientes en riesgo, cercanos a premio y nuevos de la semana.

### Apple Wallet / Google Wallet

Estas pruebas solo aplican cuando existan credenciales reales de emisor; la ausencia de credenciales no debe bloquear el resto del piloto.

- [ ] Sin credenciales, Bonoa no muestra un botón engañoso como si la emisión estuviera operativa.
- [ ] Google Wallet: el servidor firma el JWT con credenciales privadas y el cliente recibe una URL `Save to Google Wallet` válida.
- [ ] Google Wallet: el carnet muestra el negocio y ofrece un enlace `Abrir mi QR Bonōa` hacia `/qr`; no incrusta una copia estática del QR rotatorio.
- [ ] Apple Wallet: el firmador devuelve un `.pkpass` firmado con Pass Type ID/certificado válidos.
- [ ] Apple Wallet: el carnet muestra el negocio y ofrece acceso al QR vigente de Bonoa; no incrusta una copia estática del QR rotatorio.
- [ ] Rotar el QR en Bonoa invalida el QR anterior sin dejar una credencial antigua utilizable dentro de Apple/Google Wallet.
- [ ] Ninguna clave privada, certificado ni token de firma se expone en variables `NEXT_PUBLIC_*` ni en el navegador.
- [ ] La actualización nativa de objetos Google Wallet / pases Apple queda como mejora posterior si queremos mostrar un barcode directamente en el carnet sin abrir Bonoa.

## 4. Comercio listo para piloto

- [ ] Nombre y descripción revisados.
- [ ] Al menos un canal de contacto real.
- [ ] Logo subido.
- [ ] Color de marca correcto.
- [ ] Al menos un bono activo.
- [ ] Al menos un bono activo con precio comercial.
- [ ] Escaparate `/c/[slug]` visible y compartible.
- [ ] Previsualización de enlace muestra nombre/descripción/logo.
- [ ] Cartel QR A4 generado y legible a distancia razonable.
- [ ] Modo mostrador probado en móvil/tablet.
- [ ] Owner y staff/manager necesarios configurados.
- [ ] Al menos un objetivo de carnet preparado para la demo.
- [ ] Al menos una campaña de ejemplo preparada para la demo.
- [ ] Si se usan premios automáticos, sus productos-regalo tienen coste/margen asumible para el comercio.

## 5. Datos y privacidad

- [ ] El comercio solo consulta bonos y métricas de su propio negocio.
- [ ] El escaneo no revela PII del cliente.
- [ ] El radar de fidelización usa identificadores pseudónimos, no PII.
- [ ] Carnets, notificaciones, campañas, claims, reglas y grants no tienen acceso directo desde `anon`/`authenticated`; pasan por RPC controladas.
- [ ] La lectura pública de campañas expone solo ficha comercial y datos del premio.
- [ ] Las mutaciones de wallet, passes y redemptions pasan por RPC controladas.
- [ ] El feed de auditoría solo está disponible para owner/manager.
- [ ] Exportaciones CSV no incluyen PII innecesaria.
- [ ] Endpoints de Wallet digital verifican la sesión y que el carnet pertenece al usuario autenticado antes de emitir.

## 6. Tramassso

Tramassso no es proveedor de identidad de Bonoa. Se utiliza únicamente como escaparate/canal de descubrimiento.

- [ ] No existe botón ni flujo de “Entrar desde Tramassso”.
- [ ] Bonoa no depende de una sesión, cookie o cuenta de Tramassso.
- [ ] Los enlaces desde Tramassso abren páginas públicas de Bonoa o el escaparate correspondiente.
- [ ] `NEXT_PUBLIC_TRAMASSSO_URL` se usa únicamente para navegación/retorno cuando proceda.

## 7. Release

Cuando todo lo anterior esté verde:

1. Integrar la tanda en `develop`.
2. Realizar un único deployment de `develop`.
3. Ejecutar de nuevo los E2E anteriores contra ese deployment.
4. Abrir PR `develop → main`.
5. Merge solo si CI y E2E están verdes.
6. Crear tag de versión (`v0.1.0` para el primer piloto estable).
7. Registrar fecha, commit y comercios incluidos en el piloto.

## 8. Rollback

Si aparece un problema grave tras desplegar:

- no seguir emitiendo bonos hasta identificar el alcance;
- usar el deployment estable anterior como rollback en Vercel;
- no revertir migraciones con pérdida de datos de forma improvisada;
- preferir una migración correctiva hacia delante;
- conservar audit events y redemptions para reconstruir cualquier incidencia operativa.
