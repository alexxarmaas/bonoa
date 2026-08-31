# Bonōa — Demo reproducible del piloto

Este guion define una demo comercial repetible del corte `v0.1.0`. El objetivo es enseñar valor sin depender de datos improvisados ni de Google Wallet / Apple Wallet.

## 1. Resultado que debe entender el negocio

Al terminar la demo, el negocio debe haber visto este ciclo completo:

`cliente se une → enseña un único QR → comercio registra compra/visita → carnet progresa → premio aparece → negocio ve actividad y puede recuperar clientes`

La promesa del piloto es deliberadamente pequeña: un carnet, una regla, un QR y métricas de retorno.

## 2. Preflight técnico

Antes de cada demo:

1. Abrir `https://bonoa.tramassso.com/api/health`.
2. Confirmar HTTP `200`, `status: ok` y anotar el campo `commit`.
3. Confirmar que `googleWalletReady` y `appleWalletReady` pueden estar en `false`; no forman parte del corte del piloto.
4. Abrir `https://bonoa.tramassso.com/demo/business` y confirmar que carga la demo con la etiqueta `Demo · datos ficticios`.
5. Si se hará demo real, disponer de dos sesiones distintas: una cuenta de negocio QA y una cuenta cliente QA. Preferible dos dispositivos o un dispositivo + ventana privada.

Si falla el preflight, no crear datos reales para intentar arreglar la demo sobre la marcha.

## 3. Demo comercial segura — 5 minutos

### Paso A — Problema y resultado (30 s)

Abrir `/demo/business`.

Explicar únicamente:

- Bonoa identifica recurrencia sin mostrar PII del cliente al comercio.
- El negocio ve clientes nuevos, fieles, cercanos a premio y en riesgo.
- Las campañas y recompensas se apoyan en actividad real registrada con el QR.

No presentar las cifras ficticias como resultados reales.

### Paso B — Wallet del cliente (45 s)

Con la cuenta cliente QA:

1. Abrir `/wallet`.
2. Mostrar `Mis carnets` y `Mis bonos y premios` como conceptos separados.
3. Abrir `Mi QR`.
4. Explicar que el mismo QR identifica la wallet del cliente ante negocios autorizados.

Resultado esperado: el cliente tiene una relación permanente con el comercio aunque no tenga un bono consumible activo.

### Paso C — Operación en mostrador (60 s)

Con la cuenta de negocio QA:

1. Abrir el modo mostrador.
2. Escanear o introducir el QR del cliente QA.
3. Registrar una compra conocida.
4. Mostrar que el comercio trabaja con un identificador pseudónimo del cliente y no necesita ver email/nombre.

Para una regla `2 compras de al menos 50 € → premio` usar esta secuencia si se quiere demostrar el umbral:

- 49 €: queda en historial pero no aumenta progreso.
- 50 €: aumenta progreso.
- 75 €: completa el objetivo y genera el premio cuando corresponde.

### Paso D — Resultado en el cliente (45 s)

Volver a la wallet cliente:

1. Confirmar el nuevo movimiento en historial.
2. Confirmar el avance visual del carnet.
3. Si se alcanzó el objetivo, mostrar el premio como elemento independiente.
4. Mostrar la notificación generada.

Resultado esperado: compra, progreso, premio e historial cuentan la misma historia sin recarga manual cuando Realtime está disponible.

### Paso E — Resultado para el negocio (60 s)

Volver al panel del negocio y enseñar solo tres bloques:

1. `Clientes en riesgo`.
2. `Cerca de un premio`.
3. `Recurrencia` / actividad identificada.

Después abrir el radar de clientes y enseñar los códigos `CL-...`.

Mensaje: Bonoa no termina en “dar puntos”; convierte la actividad en una lista accionable de clientes a recuperar o activar.

### Paso F — Campaña (45 s)

Mostrar una campaña segmentada de ejemplo o el flujo de creación.

Explicar:

- se puede dirigir a todos, nuevos, activos, fieles o en riesgo;
- una wallet fuera del segmento no puede reclamarla;
- una misma wallet no recibe duplicados por reintentos;
- la reclamación termina en wallet, historial y métricas.

No hace falta crear una campaña nueva en cada demo si existe una QA preparada.

### Paso G — Cierre (15 s)

Cerrar con el alcance real del piloto:

> Un carnet, una regla de fidelización y un QR funcionando con clientes reales. Medimos uso, recurrencia y retorno durante el piloto y decidimos con datos si merece la pena ampliarlo.

## 4. Demo sin cuentas QA

Si no se dispone de cuentas QA o no conviene modificar datos:

1. Usar exclusivamente `/demo/business`.
2. Señalar expresamente `Demo · datos ficticios`.
3. Recorrer: métricas → clientes en riesgo → cerca de premio → radar → campañas → referidos.
4. Enseñar `/api/health` solo si el interlocutor es técnico.

Esta ruta es comercial y no sustituye al E2E autenticado de release.

## 5. Evidencia mínima después de una demo real

Registrar internamente:

- fecha;
- commit mostrado por `/api/health`;
- negocio QA/piloto utilizado;
- si se completó QR → evento → progreso → premio/historial;
- cualquier error o paso que necesitó intervención manual.

Una demo se considera reproducible solo si puede repetirse desde estas instrucciones sin tocar manualmente Supabase.

## 6. Fuera de alcance

No bloquear ni ampliar la demo por:

- Google Wallet;
- Apple Wallet;
- integración TPV;
- automatizaciones avanzadas;
- features nuevas que no sean necesarias para completar el ciclo del piloto.

Las validaciones exhaustivas siguen documentadas en `docs/PILOT_E2E.md` y `docs/PILOT_RELEASE_CHECKLIST.md`.
