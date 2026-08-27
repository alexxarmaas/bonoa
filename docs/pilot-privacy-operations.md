# Bonoa — Operaciones de privacidad para el piloto

Este runbook cubre las solicitudes de acceso/exportación y eliminación de cuenta durante el piloto. La aplicación permite al usuario exportar sus datos y registrar/cancelar una solicitud de eliminación desde Perfil. La eliminación efectiva de la cuenta es una operación administrativa y no se ejecuta automáticamente desde el navegador.

## Principios

- No utilizar claves `service_role` ni credenciales administrativas en el frontend.
- No borrar manualmente filas de wallet, bonos o eventos una a una. La eliminación de `auth.users` activa las cascadas y anonimización definidas en el esquema.
- Conservar únicamente el histórico operativo que queda expresamente desacoplado de la identidad eliminada.
- Antes de eliminar una cuenta que sea miembro de un negocio, comprobar siempre su rol.

## 1. Revisar solicitudes pendientes

Ejecutar desde una sesión administrativa de Supabase:

```sql
select
  r.id as request_id,
  r.user_id,
  p.email,
  r.requested_at
from public.account_deletion_requests r
left join public.profiles p on p.id = r.user_id
where r.status = 'pending'
order by r.requested_at;
```

Guardar el `request_id` de la solicitud que se va a procesar.

## 2. Comprobar responsabilidades de negocio

Antes de borrar el usuario:

```sql
select
  bm.business_id,
  b.name,
  bm.role,
  count(*) filter (where owners.role = 'owner') as owner_count
from public.business_members bm
join public.businesses b on b.id = bm.business_id
join public.business_members owners on owners.business_id = bm.business_id
where bm.user_id = '<USER_ID>'
group by bm.business_id, b.name, bm.role;
```

Si el usuario es el único `owner` de un negocio activo, **no eliminar todavía la cuenta**. Primero hay que:

1. añadir o promover a otro usuario como `owner`, o
2. resolver expresamente el cierre/desactivación del negocio.

Nunca dejar un negocio activo sin owner.

## 3. Exportación previa

El usuario puede descargar su JSON desde Perfil → Privacidad y datos. Si pide la exportación por soporte, pedirle que use primero esa opción mientras mantenga acceso a la cuenta.

La exportación no incluye el token público rotatorio del QR y contiene los principales datos asociados a la cuenta, wallet, carnets, bonos, actividad, consumos y avisos.

## 4. Eliminar la cuenta

Eliminar el usuario mediante la administración de **Supabase Auth**. No exponer ni automatizar esta operación con una clave administrativa en el cliente web.

El esquema está preparado para que al eliminar `auth.users`:

- desaparezcan perfil, wallet, carnets, bonos, progreso, notificaciones, preferencias y relaciones de referidos vinculadas a la wallet;
- desaparezca la pertenencia del usuario al equipo de los negocios;
- `business_audit_events.actor_id`, `business_risk_events.actor_id`, `loyalty_events.recorded_by`, autores de reglas/campañas y `redemptions.performed_by` queden a `NULL` cuando proceda;
- los `redemptions` históricos puedan conservarse sin la wallet ni el bono originales: `pass_id` queda a `NULL` al eliminar el pass;
- la solicitud administrativa de eliminación se conserve, pero `account_deletion_requests.user_id` quede a `NULL`.

## 5. Marcar la solicitud como completada

Después de confirmar que Auth eliminó correctamente el usuario, marcar la solicitud usando el `request_id` guardado:

```sql
update public.account_deletion_requests
set status = 'completed', completed_at = now()
where id = '<REQUEST_ID>' and status = 'pending';
```

Comprobar:

```sql
select id, user_id, status, requested_at, completed_at
from public.account_deletion_requests
where id = '<REQUEST_ID>';
```

El resultado esperado tras el borrado es `user_id = null` y `status = completed`.

## 6. Verificación posterior

Comprobar como mínimo:

```sql
select exists(select 1 from auth.users where id = '<USER_ID>') as auth_user_exists;
select exists(select 1 from public.wallets where user_id = '<USER_ID>') as wallet_exists;
select exists(select 1 from public.profiles where id = '<USER_ID>') as profile_exists;
```

Los tres valores deben ser `false`.

Si la cuenta había operado como personal de un comercio, verificar también que no queden referencias directas al usuario en columnas de auditoría que deban anonimizarse.

## 7. Solicitud cancelada

Si el usuario cancela la solicitud desde Perfil antes de procesarla, queda con estado `cancelled` y no debe ejecutarse el borrado.

## Incidencias

Si el borrado de Auth falla:

1. no borrar manualmente datos asociados;
2. revisar la FK o dependencia que haya bloqueado la operación;
3. resolverla mediante una migración correctiva hacia delante;
4. repetir la eliminación solo cuando el esquema vuelva a ser consistente.

No realizar cambios destructivos improvisados en producción.
