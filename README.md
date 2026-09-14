# Informes Atentus

Dashboard local organizado en **módulos** que agrupan **páginas** (ver
`src/modules/README.md` para la convención completa). Cada página trae su
propia fuente de datos y su propio `README.md` con el detalle de columnas
esperadas — este archivo da solo la vista general.

## Módulos actuales

- **Estándares** — 2 páginas de referencia con valores por defecto
  embebidos en código (pendientes de los valores reales del cliente):
  - `src/modules/standards/pages/tolerance-levels/README.md`
  - `src/modules/standards/pages/response-time-standards/README.md`
- **WEB** — monitoreo de objetivos web. Página activa hoy:
  - `src/modules/web/pages/heatmap/README.md` — heatmap hora × día de
    disponibilidad y tiempo de respuesta.
  Las otras 6 páginas del módulo (comparativos de login, disponibilidad y
  tiempo de respuesta por objetivo, rendimiento por flujo) están
  registradas como "Próximamente" — se implementan en rondas de trabajo
  futuras, cada una con su propio spec.

## Levantar localmente

Desde la raíz del proyecto:

```bash
python3 serve.py 8080
```

Luego abrir:

```text
http://localhost:8080/
```

`serve.py` es un wrapper de `python3 -m http.server` que agrega headers
de "no cachear nada" a cada respuesta — sin esto, el navegador (sobre
todo Chrome) suele quedarse con una versión vieja cacheada de los
módulos JS/CSS aunque el archivo en disco ya haya cambiado. Si por
algún motivo hace falta el server sin este agregado, `python3 -m
http.server 8080` sigue funcionando igual que siempre.

## Agregar una página o un módulo nuevo

Ver `src/modules/README.md` — agregar una página es crear una carpeta y
sumar 1-2 líneas de registro, sin tocar `index.html`.

## Paso futuro: API

Cada página expone `loadDefault()` (y, cuando lee Excel,
`loadFromFile()`/`parseWorkbook()`) en su `data.js`. El siguiente paso
natural para conectar una API real es reemplazar el cuerpo de
`loadDefault()` de la página correspondiente por un fetch a la API, sin
tocar el resto del contrato.

## Referencia de d3-graph-gallery

[d3-graph-gallery.com](https://d3-graph-gallery.com/) es una colección de
ejemplos de código D3 (de Yan Holtz), **no una librería instalable** — no
hay `npm install`, cada ejemplo es una página con HTML+JS autocontenido
para copiar y adaptar. Esta tabla deja explícito qué patrón de cada módulo
sale de un ejemplo de la galería y qué es lógica propia de este proyecto:

| Módulo | Referencia de galería | Qué es propio de este proyecto |
|---|---|---|
| `src/modules/web/pages/heatmap/heatmapMain.js` | [`graph/heatmap_style.html`](https://d3-graph-gallery.com/graph/heatmap_style.html) ("Ready to go heatmap": band scales, tooltip) | Eje hora×día, color por celda tomado del Excel, patrón de rayas para estados especiales, etiqueta de anomalía "x", integración con la leyenda de hover |
| `src/modules/web/pages/heatmap/heatmapHourly.js` | Mismo ejemplo que `heatmapMain.js`, variante de una sola fila | — |
| `src/shared/legend.js` | Patrón de tooltip/gradiente de la galería | La animación de scrub por arrastre del handle no existe en la galería, es de este proyecto |
| `src/modules/web/pages/heatmap/colorScales.js` | — | Lee `color_disp`/`color_tiempo` tal cual del Excel (no calcula ninguna escala propia); resuelve estados especiales por `estado_bloque` |
| `src/shared/tooltip.js` | Ejemplo "Add tooltip to heatmap" de la galería | — |

Si en el futuro se agrega otro tipo de gráfico, sumarlo a esta tabla con
el mismo criterio: URL exacta del ejemplo de la galería (si existe uno) y
qué se le agregó de propio.

## Convenciones y gotchas de JS/DOM

Lecciones de bugs reales ya encontrados en este proyecto, para no repetirlos
y para saber por dónde empezar si un síntoma parecido vuelve a aparecer.

- **Nunca usar `elemento.hidden = true/false` sobre un `<svg>` (ni sobre
  cualquier elemento no-HTML).** La propiedad IDL `.hidden` está garantizada
  solo en `HTMLElement`; en motores donde `SVGElement` no la implementa
  igual, la asignación se convierte en una propiedad JS inerte que no toca
  el atributo `hidden` real del DOM — el elemento queda oculto (o visible)
  para siempre, sin ningún error en consola, aunque el resto del código
  (joins de D3, `textContent`, transiciones) siga corriendo perfecto. Por
  eso un bug así no se puede reproducir en Chromium/Playwright (que sí
  soporta `.hidden` en SVG) pero sí aparece en el navegador real de un
  usuario. Usar siempre `elemento.toggleAttribute("hidden", true/false)`
  (o `setAttribute`/`removeAttribute`) en vez de la propiedad `.hidden`
  cuando el elemento puede ser un `<svg>` o cualquier nodo no-HTML. Ver el
  fix en `heatmapHoverChart.js`/`heatmapWeekPanel.js` (mostrar/ocultar el
  gráfico de día y de semana del heatmap).
- **La regla nativa `[hidden] { display: none }` del navegador se puede
  perder contra una regla propia de igual o mayor especificidad** (ej.
  `.empty-state { display: grid }` en `base.css`, o `.hover-chart svg {
  display: block }`) si esa regla se carga después. El `hidden` HTML/DOM
  queda puesto correctamente pero el elemento sigue viéndose. Fix: agregar
  una regla más específica con el atributo, ej. `.empty-state[hidden] {
  display: none }`, en vez de depender de la regla nativa sola.
