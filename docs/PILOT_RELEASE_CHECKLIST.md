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

## 3. E2E Tramassso → Bonoa

1. Iniciar el acceso desde Tramassso con una cuenta real.
2. Tramassso emite un ticket opaco de un solo uso.
3. Bonoa canjea el ticket server-to-server.
4. Se crea o recupera el enlace estable en `external_identities`.
5. El navegador termina con una sesión Supabase normal.
6. Refrescar Bonoa y confirmar que la sesión persiste.
7. Reutilizar el mismo ticket y confirmar que se rechaza.
8. Salir de Bonoa y verificar que el login independiente sigue disponible.

Nunca copiar `SUPABASE_SERVICE_ROLE_KEY` a GitHub, al navegador, a logs o a documentación.

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

## 5. Datos y privacidad

- [ ] El comercio solo consulta bonos de su propio negocio.
- [ ] El escaneo no revela PII del cliente.
- [ ] La tabla `external_identities` continúa sin acceso directo desde `anon`/`authenticated`.
- [ ] Las mutaciones de wallet, passes y redemptions pasan por RPC controladas.
- [ ] El feed de auditoría solo está disponible para owner/manager.
- [ ] Exportaciones CSV no incluyen PII innecesaria.

## 6. Release

Cuando todo lo anterior esté verde:

1. Integrar la tanda en `develop`.
2. Realizar un único deployment de `develop`.
3. Ejecutar de nuevo los E2E anteriores contra ese deployment.
4. Abrir PR `develop → main`.
5. Merge solo si CI y E2E están verdes.
6. Crear tag de versión (`v0.1.0` para el primer piloto estable).
7. Registrar fecha, commit y comercios incluidos en el piloto.

## 7. Rollback

Si aparece un problema grave tras desplegar:

- no seguir emitiendo bonos hasta identificar el alcance;
- usar el deployment estable anterior como rollback en Vercel;
- no revertir migraciones con pérdida de datos de forma improvisada;
- preferir una migración correctiva hacia delante;
- conservar audit events y redemptions para reconstruir cualquier incidencia operativa.
