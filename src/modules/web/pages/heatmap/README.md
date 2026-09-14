# Disponibilidad y tiempo de respuesta (heatmap)

Heatmap hora × día de disponibilidad y tiempo de respuesta de un objetivo,
con detalle horario del día seleccionado y panel de bloques marcados.

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
- La leyenda de degradado usa los colores reales del Excel como paradas
  (no recalcula ninguna escala propia).

## Gráfico de hover con pin

A la derecha del mapa principal hay un gráfico combinado (barras de
disponibilidad + línea de tiempo de respuesta, 24 horas) que se
actualiza en vivo al pasar el mouse por una fila del mapa — con
transición animada al cambiar de día, no un reemplazo de golpe.

Clickear una celda **fija** el gráfico en ese día: deja de reaccionar
al hover, y esa fila queda resaltada en el mapa. Clickear la misma
celda de nuevo lo suelta (vuelve al modo hover-en-vivo). Clickear otra
celda distinta re-fija al nuevo día.

El valor exacto de cada hora (disponibilidad, tiempo de respuesta,
estado) se consigue pasando el mouse sobre las barras o los puntos del
propio gráfico — funciona tanto en modo vivo como fijado. Las celdas
del mapa principal ya no tienen ese tooltip de texto (se mudó acá).

Sobre las barras de disponibilidad hay un círculo arrastrable (mismo
mecanismo que el de la leyenda del mapa principal) que traza una línea
de referencia horizontal, para comparar a ojo "hasta dónde llega" cada
hora contra un umbral elegido. Arranca en 95% y vuelve a ese valor si
cambiás Objetivo o Período (eso también suelta el pin, si había uno).

El selector "Informe: Disponibilidad / Respuesta" solo cambia cómo se
colorean las celdas del mapa principal — el gráfico siempre muestra
ambas métricas juntas, sin importar la pestaña activa.
