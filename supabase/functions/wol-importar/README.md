# wol-importar

Edge Function (Deno) que descarga el programa oficial de la reunión "Vida y
Ministerio Cristianos" directamente de la fuente de publicaciones de JW
(no de un scraping de HTML de wol.jw.org, sino del mismo archivo RTF que usa
JW Library), en español o portugués según lo que la app le indique.

## Cómo la llama el frontend

`src/pages/VidaMinisterio.jsx` invoca:

```js
supabase.functions.invoke('wol-importar', {
  body: { fecha_inicio: '2026-07-06', idioma: 'es' } // o 'pt'
})
```

`idioma` viaja automáticamente según lo que el usuario tenga elegido en el
selector ES/PT del encabezado (`useI18n().idioma`).

## Desplegar

```bash
supabase functions deploy wol-importar
```

No necesita variables de entorno ni secretos: solo hace `fetch` a endpoints
públicos de jw.org.

## Cómo funciona (resumen)

1. Calcula la edición bimestral (`YYYYMM00`) de la Guía de actividades que
   contiene `fecha_inicio` (las ediciones arrancan en meses impares: ene, mar,
   may, jul, sep, nov).
2. Pide el enlace de descarga del RTF de esa edición vía la API pública
   `GETPUBMEDIALINKS` de jw.org, pidiendo el idioma correcto (`S` = español,
   `T` = portugués).
3. Descarga el RTF y lo convierte a texto plano (conversor RTF→texto propio,
   sin dependencias externas).
4. Recorta del texto completo (que trae las ~8-9 semanas del bimestre) solo el
   bloque de la semana pedida, buscando el encabezado de fecha correspondiente.
5. Devuelve `{ texto, cantico_inicial, cantico_final }`, en el mismo formato
   que ya espera `parsearPrograma()` en el frontend.

## ⚠️ Importante — no se pudo probar contra la red real

Este entorno de desarrollo no tenía salida de red hacia `jw-cdn.org` /
`wol.jw.org`, así que el código se armó a partir de la documentación pública
conocida de la API de medios de jw.org (la misma que usan herramientas como
JW Library y varios proyectos open source), pero **no se ejecutó contra un
archivo RTF real**. Antes de darlo por bueno en producción:

1. Desplegalo y probalo con una fecha real (`fecha_inicio` = un lunes con
   programa ya publicado).
2. Si falla, revisá los logs: `supabase functions logs wol-importar`.
3. Los puntos más frágiles, por si hay que ajustar algo:
   - **Reconocimiento del encabezado de semana** (`lunesDeEncabezado`): está
     hecho para formatos como "6-12 de julio" o "29 de junio a 5 de julio"
     (y sus equivalentes en portugués). Si el RTF real usa una redacción
     distinta, hay que ajustar esas expresiones regulares.
   - **Detección de cánticos** (`extraerCantico`): busca "cántico", "canción"
     o "música" seguido de un número, cerca del principio/final de la semana.
   - El conversor RTF es liviano (a propósito, sin dependencias) y cubre los
     casos típicos (`\par`, `\'xx`, `\uNNNN`, tablas de fuentes/colores para
     ignorar), pero si el archivo real tiene estructuras más raras (objetos
     incrustados, imágenes, campos), puede colarse algo de texto de más.
