# Bonōa · Feature freeze del piloto

**Inicio del freeze:** 1 de septiembre de 2026  
**Objetivo:** estabilizar `v0.1.0` para el primer piloto comercial.

Hasta cerrar `v0.1.0`, Bonōa no incorpora funcionalidades nuevas. Solo se aceptan cambios que entren en una de estas categorías:

- corrección de bugs que afecten al recorrido del piloto;
- seguridad, privacidad o permisos;
- fiabilidad de autenticación, correo, QR, fidelización o consumo;
- observabilidad y diagnóstico sin exponer secretos ni PII;
- documentación de release, demo u operación;
- ajustes de UX/copy estrictamente necesarios para evitar errores durante la demo o el piloto.

Quedan fuera del corte y pasan a una versión posterior:

- nuevas familias de fidelización no necesarias para el piloto actual;
- pagos dentro de Bonōa;
- actualización nativa del barcode/QR dentro de Apple Wallet o Google Wallet;
- nuevas integraciones externas no imprescindibles;
- ampliaciones de analítica que no sean necesarias para validar el piloto;
- cualquier feature que incremente superficie de riesgo sin cerrar un problema real del recorrido actual.

## Gate de excepción

Una excepción al freeze solo se admite si cumple las tres condiciones:

1. resuelve un bloqueo real para un comercio o cliente del piloto;
2. tiene un alcance acotado y rollback claro;
3. pasa el gate existente: lint, typecheck, build, smoke, `pilot:contract` y Playwright.

## Criterio de cierre

El freeze termina después de:

1. promover `develop` a `main` con CI verde;
2. verificar el deployment estable y `/api/health`;
3. completar el recorrido E2E del piloto;
4. etiquetar el commit estable como `v0.1.0`;
5. incorporar el primer comercio bajo la oferta de piloto definida.
