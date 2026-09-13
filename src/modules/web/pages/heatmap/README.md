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
