# Informes Heatmap

Dashboard local para revisar dos informes interactivos desde Excel:

- Disponibilidad global
- Tiempo de respuesta

El heatmap principal usa eje X por hora del día y eje Y por día/fecha, pensado para revisar el comportamiento a través del año.

La primera fuente de datos es `dataExample/Heatmap_objetivo.xlsx`. La app lee la hoja `Heatmap` y espera estas columnas principales:

- `objetivo`
- `fecha` o `fecha_obj`
- `hora`
- `dia`
- `mes`
- `disponibilidad`
- `tiempo`
- `estado_bloque` (`valor_base` / `eventos_cliente` / `marcado_atentus`)
- `label_tiempo` (etiqueta de anomalía, ej. "1.59x", mostrada sobre la celda en el reporte de Tiempo)

Las columnas `color_disp`, `color_tiempo`, `label_disp`, `valor_base`, `desviacion` y `valor_color` pueden estar presentes en el Excel pero la app no las usa: el color de cada celda se calcula en el navegador (ver tabla de referencia más abajo).

## Levantar localmente

Desde la raíz del proyecto:

```bash
python3 -m http.server 8080
```

Luego abrir:

```text
http://localhost:8080/
```

## Cambiar el Excel

Puedes reemplazar `dataExample/Heatmap_objetivo.xlsx` manteniendo el mismo nombre, o usar el selector `Excel` en la pantalla para cargar otro archivo `.xlsx`.

## Paso futuro: API

La app está preparada para separar la fuente de datos. El siguiente paso natural es cambiar `loadWorkbookFromUrl()` por un proveedor tipo `loadRowsFromApi()` que devuelva el mismo JSON normalizado que hoy sale desde Excel.

## Referencia de d3-graph-gallery

[d3-graph-gallery.com](https://d3-graph-gallery.com/) es una colección de
ejemplos de código D3 (de Yan Holtz), **no una librería instalable** — no
hay `npm install`, cada ejemplo es una página con HTML+JS autocontenido
para copiar y adaptar. Esta tabla deja explícito qué patrón de cada módulo
sale de un ejemplo de la galería y qué es lógica propia de este proyecto:

| Módulo | Referencia de galería | Qué es propio de este proyecto |
|---|---|---|
| `src/heatmapMain.js` | [`graph/heatmap_style.html`](https://d3-graph-gallery.com/graph/heatmap_style.html) ("Ready to go heatmap": band scales, `scaleSequential`, tooltip) | Eje hora×día, estados negro/gris, etiqueta de anomalía "x", integración con la leyenda de hover |
| `src/heatmapHourly.js` | Mismo ejemplo que `heatmapMain.js`, variante de una sola fila | — |
| `src/legend.js` | Patrón de tooltip/gradiente de la galería | La animación de hover-scrub (atenuar celdas por distancia al valor bajo el cursor) no existe en la galería, es de este proyecto |
| `src/colorScales.js` | — | Escala diverging rojo/azul fija para Tiempo de respuesta, resolución de estados especiales por `estado_bloque` |
| `src/tooltip.js` | Ejemplo "Add tooltip to heatmap" de la galería | — |

Si en el futuro se agrega otro tipo de gráfico, sumarlo a esta tabla con
el mismo criterio: URL exacta del ejemplo de la galería (si existe uno) y
qué se le agregó de propio.
