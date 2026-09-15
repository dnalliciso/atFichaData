# Disponibilidad y tiempo de respuesta (heatmap)

Heatmap hora × día de disponibilidad y tiempo de respuesta de un objetivo,
con detalle horario del día seleccionado.

## Fuente de datos

Archivo Excel esperado: `dataExample/Heatmap_objetivo.xlsx`, hoja `Heatmap`.

## Columnas esperadas

| Columna | Tipo | Obligatoria | Ejemplo |
|---|---|---|---|
| `objetivo` | texto | sí | `WEB Demo Tienda Ejemplo` |
| `fecha` o `fecha_obj` | fecha | sí | `2026-08-14` |
| `hora` | número (0-23) | sí | `14` |
| `dia` | número | no (se infiere de la fecha) | `14` |
| `mes` | texto (3 letras) | no (se infiere de la fecha) | `ago` |
| `disponibilidad` | número (%) | no | `99.8` |
| `tiempo` | número (segundos) | no | `1.2` |
| `estado_bloque` | `valor_base` / `eventos_cliente` / `marcado_atentus` | no | `eventos_cliente` |
| `label_tiempo` | texto (etiqueta de anomalía) | no | `1.59x` |
| `color_disp` / `color_tiempo` | color hex o nombre, ya calculado en el Excel | no | `#65B636` |

Las columnas `label_disp`, `valor_base`, `desviacion` y `valor_color`
pueden estar presentes en el Excel pero esta página no las usa.

## Cómo reemplazar los datos

Reemplazar `dataExample/Heatmap_objetivo.xlsx` manteniendo el mismo
nombre, o usar el botón "Elegir archivo" dentro de esta página para cargar
otro `.xlsx` sin tocar el archivo de ejemplo.

## Notas de diseño

- Estados especiales (`eventos_cliente` → negro "Caída Total",
  `marcado_atentus` → gris "Datos no válidos") se determinan por
  `estado_bloque`, no por `color_disp`/`color_tiempo` — esas columnas no
  distinguen negro de gris en la muestra actual.
- La columna `tiempo` de un bloque en estado especial suele venir en `0`
  en el Excel (un placeholder, no una medición real) — `responseValueOf()`
  en `colorScales.js` lo trata como `NaN` en vez de tomarlo literal, así
  la línea de tiempo de respuesta de los 4 gráficos de hover no se va en
  picada a 0 en esos bloques. En su lugar, el tramo se corta y se dibuja
  un segmento **punteado** que une el último valor válido antes del
  bloque con el primero después (`heatmapLineBridge.js`) — si el bloque
  especial está al principio o al final de la serie (sin un valor de un
  lado), no hay nada que puentear y el tramo simplemente no se dibuja.
- La leyenda de degradado usa los colores reales del Excel como paradas
  (no recalcula ninguna escala propia).
- Las celdas del mapa de Disponibilidad muestran el **downtime en
  minutos** de esa hora (`(100 - disponibilidad) / 100 × 60`), no el
  porcentaje — se oculta cuando redondea a 0 (sin caída real). El color
  de la celda sigue viniendo de `color_disp` tal cual, sin cambios. El
  mapa de Tiempo de respuesta no se toca (sigue usando `label_tiempo`).

### Sliders del mapa principal (filtro por arrastre)

A la derecha del mapa hay un slider vertical arrastrable (círculo sobre
una barra de degradado) que resalta las celdas cuyo valor cae cerca de
donde está el handle — el resto baja a opacidad 0. En la pestaña
**Disponibilidad** hay dos: uno por el % de disponibilidad (colores
reales de celda) y otro por el downtime en minutos (degradado neutro
violeta, ya que el downtime no tiene un color propio en el Excel). En
**Respuesta** sigue habiendo solo el de tiempo de respuesta.

Solo un filtro está activo a la vez: mover un slider desactiva el efecto
del otro (aunque su handle se quede visualmente donde lo dejaste). Click
en cualquier lugar fuera de los sliders — incluida una celda del mapa —
suelta el filtro y vuelve a mostrar todas las celdas.

## Gráfico de hover con pin

Debajo del mapa principal hay 4 gráficos, todos derivados de la misma
celda (día + hora) que estés hover-eando o hayas fijado — los primeros 3
en una grilla de 3 columnas, el cuarto a todo el ancho debajo. Cada uno
muestra **una sola métrica a la vez**, la misma que la pestaña activa del
Informe: barras de disponibilidad en la pestaña Disponibilidad, línea +
puntos de tiempo de respuesta en la pestaña Respuesta — nunca las dos
juntas. Las series/ejes/leyenda de la métrica que no corresponde quedan
construidos en el DOM pero ocultos (`applyReportVisibility()` en cada
archivo), así cambiar de pestaña no requiere reconstruir nada, solo
alternar qué se ve. El eje de valores de la métrica activa siempre va del
lado izquierdo.

- **El día**: las 24 horas del día bajo el mouse.
- **La semana**: la misma hora en cada uno de los 7 días de esa semana
  calendario (lunes a domingo) — busca en **todas** las filas del
  objetivo, sin aplicar el filtro de Período (para mostrar siempre la
  semana completa aunque el filtro elegido la corte). Días sin datos
  quedan como un espacio punteado.
- **El período (mismo día de semana)**: la misma hora en todas las
  ocurrencias de ese mismo día de semana **dentro del filtro de Período
  activo** (ej. si estás mirando un sábado, todos los sábados que el
  Período actual incluya).
- **Todos los días del período** (panel ancho, debajo de los otros 3):
  la misma hora en **cualquier** día dentro del Período activo, sin
  filtrar por día de semana — ej. si el Período es agosto completo,
  muestra los 31 días a esa hora. `heatmapPeriodPanel.js` y
  `heatmapAllDaysPanel.js` comparten toda la lógica de dibujo en
  `heatmapDayListPanel.js`; solo difieren en qué filas eligen y el
  título.

Mover el mouse por una fila del mapa actualiza los 4 en vivo, con la
misma transición animada en los cuatro. El `<svg>` de "período" y "todos
los días" se arma una sola vez (igual que semana) y se reusa entre
hovers con `.join()` — su eje X sí se recalcula en cada uno (cambia el
ancho y, en "período", el conjunto de fechas al cambiar de día de
semana), pero cuando el conjunto de fechas no cambia (ej. te movés de
hora en hora dentro de la misma fila) las barras existentes animan su
alto en vez de reconstruirse. Moverse a otra hora de la MISMA fila no
cambia el gráfico del día (ya muestra las 24 horas) pero sí actualiza
los demás, porque dependen de la hora puntual.

Clickear una celda **fija** los 4 gráficos en esa combinación día+hora:
dejan de reaccionar al hover, y esa fila queda resaltada en el mapa.
Clickear la misma celda de nuevo lo suelta (vuelve al modo hover-en-vivo).
Clickear otra celda distinta re-fija a la nueva.

El valor exacto de cada barra o punto se consigue pasando el mouse sobre
ella — funciona tanto en modo vivo como fijado. Las celdas del mapa
principal no tienen tooltip de texto propio (vive en estos 4 gráficos).

Sobre las barras de disponibilidad del gráfico del día hay un círculo
arrastrable (mismo mecanismo que el de la leyenda del mapa principal)
que traza una línea de referencia horizontal, para comparar a ojo "hasta
dónde llega" cada hora contra un umbral elegido. Arranca en 95% y vuelve
a ese valor si cambiás Objetivo o Período (eso también suelta el pin).
Solo aparece en la pestaña Disponibilidad (no tiene sentido sobre
segundos).

Cambiar de pestaña (Informe: Disponibilidad / Respuesta) resetea los 4
gráficos al estado "pasá el mouse..." igual que cambiar de Objetivo o
Período — hay que volver a pasar el mouse para verlos con la métrica
nueva.

### Mediana y promedio de tiempo de respuesta

Los 4 gráficos de la pestaña **Respuesta** muestran 4 líneas horizontales
de referencia, dos pares distinguibles por color y por patrón de guiones:

- **General** (naranja `--warn` / gris, igual patrón que antes): mediana
  y promedio sobre **todas** las filas del objetivo dentro del Período
  activo — se calculan una sola vez en `heatmapHoverChart.js` y son el
  MISMO valor en los 4 paneles, sin importar qué día/hora estés mirando.
- **Local** (azul / verde azulado, "Med. local" / "Prom. local" en la
  leyenda): mediana y promedio de **solo los datos que ese panel en
  particular muestra** — las 24 horas del día, los 7 días de la semana,
  las N ocurrencias del mismo día de semana en el período, o todos los
  días del período a esa hora. Se recalcula en cada `show()` de cada
  panel, a partir de los mismos valores que ya usa para dibujar sus
  barras/línea (no una consulta aparte).

El patrón de guiones sigue marcando mediana (6 3) vs. promedio (2 3) en
ambos pares; el color es lo que distingue general de local. La pestaña
Disponibilidad no tiene líneas de referencia propias. Ver
`median`/`average` en `colorScales.js` y `heatmapRefLines.js`.
