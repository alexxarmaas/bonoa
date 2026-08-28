# Alta completa de negocios en Bonōa

El alta de un negocio se divide en dos momentos:

1. Creación mínima del espacio con nombre y slug.
2. Onboarding obligatorio antes de considerarlo listo y publicarlo en el directorio.

## Campos obligatorios

- Nombre comercial.
- Categoría del directorio.
- Descripción comercial de al menos 20 caracteres.
- Teléfono.
- Dirección o zona.
- Logotipo.
- Color de marca.
- Nombre del club.
- Mensaje del club.
- Etiqueta del carnet.
- Plantilla de fidelización y premio, salvo que ya exista una regla activa.

Web e Instagram son opcionales.

## Finalización

Al terminar correctamente el onboarding:

- se guarda la ficha comercial;
- se guarda la identidad del club;
- se crea la fidelización inicial si todavía no existe;
- se activa `directory_listed` con la categoría seleccionada;
- se registra `onboarding_completed_at`.

Un negocio publicado puede ocultarse posteriormente desde `Bonoa Business > Directorio` sin borrar su escaparate público ni sus datos.
