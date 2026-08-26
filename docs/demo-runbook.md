# Bonoa — runbook de demo

## Objetivo

Demostrar en 5–7 minutos que Bonoa resuelve un flujo completo de fidelización sin tarjetas físicas: el cliente tiene una wallet y un QR único; el negocio emite y consume bonos; ambos lados se actualizan en tiempo real.

## Preparación 15 minutos antes

1. Abrir Tramassso y comprobar que el acceso SSO a Bonoa funciona.
2. En Bonoa Business abrir el negocio de la demo y comprobar:
   - ficha y logo completos;
   - al menos un producto activo con precio y validez;
   - modo Mostrador operativo;
   - cámara con permiso concedido.
3. En un segundo móvil abrir la cuenta cliente y dejar preparada la pantalla `Mi QR`.
4. Abrir en otra pestaña:
   - Wallet cliente;
   - Mostrador negocio;
   - Métricas;
   - Actividad;
   - Escaparate público.
5. Evitar notificaciones, llamadas y modo ahorro de batería durante la demo.

## Guion recomendado

### 1. Problema — 30 s

“Los bonos físicos, sellos y tarjetas se pierden, no son medibles y obligan al cliente a llevar una tarjeta por negocio. Bonoa concentra todas las fidelizaciones en una única wallet y un único QR.”

### 2. Cliente — 45 s

Mostrar la wallet. Enseñar:
- tarjetas personalizadas por negocio;
- usos/saldo restante;
- precio de emisión;
- caducidad;
- historial;
- QR único.

### 3. Comercio — 45 s

Entrar por Tramassso → Bonoa y abrir `Mostrador`.

Mostrar que el comercio tiene su catálogo, branding y un escaparate público sin login.

### 4. Emisión real — 60 s

1. Cliente abre `Mi QR`.
2. Comercio pulsa `Escanear cliente`.
3. Escanear el QR.
4. Elegir un producto.
5. Confirmar la emisión.
6. Volver al móvil cliente y enseñar que el bono aparece automáticamente.

Mensaje clave: “No hemos buscado al cliente por nombre, teléfono o email. Su QR identifica la wallet y el negocio solo accede a sus propios bonos.”

### 5. Consumo real — 60 s

1. Desde el mismo cliente, seleccionar el bono.
2. Consumir 1 uso.
3. Confirmar.
4. Enseñar el toast de éxito.
5. Mostrar en el móvil cliente cómo cambia el saldo en tiempo real.
6. Abrir el detalle del bono y enseñar el movimiento.

### 6. Gestión — 60 s

Mostrar rápidamente:
- Métricas: bonos, clientes, valor emitido y consumo.
- Bonos emitidos: búsqueda, filtros y exportación CSV.
- Actividad: auditoría inmutable y exportación CSV.
- Equipo: owner / manager / staff.

### 7. Captación — 30 s

Abrir el escaparate `/c/<slug>` y el cartel QR A4.

Mensaje clave: “El negocio puede poner este QR en mostrador, redes o material físico. El cliente consulta la oferta sin instalar nada.”

## Cierre

“En el piloto el cobro sigue ocurriendo directamente con el establecimiento. Bonoa gestiona la fidelización. Esto nos permite validar el uso real antes de añadir pagos integrados.”

## Plan B si falla la cámara

Usar el código manual que aparece debajo del QR del cliente. El flujo de negocio es exactamente el mismo.

## Plan B si falla Realtime

Pulsar `Actualizar` en la wallet. La operación ya está persistida en Supabase; Realtime es una mejora de UX, no una dependencia para conservar el dato.

## Qué NO hacer durante la demo

- No crear migraciones ni cambiar configuración de Supabase/Vercel.
- No borrar negocios o usuarios de prueba.
- No cambiar roles del usuario que está haciendo la presentación.
- No enseñar claves, consola de Supabase o variables de entorno.
- No presentar el “valor emitido” como ingresos cobrados: Bonoa todavía no procesa el pago.
