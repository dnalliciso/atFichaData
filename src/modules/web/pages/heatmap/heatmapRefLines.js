// Líneas horizontales de referencia para el tiempo de respuesta en los 4
// gráficos de hover del heatmap (día / semana / período / todos los
// días). Cada gráfico muestra DOS pares: el "general" (mediana/promedio
// sobre TODAS las filas del objetivo dentro del Período activo, calculado
// una sola vez en heatmapHoverChart.js — el mismo valor en los 4 paneles)
// y el "local" (mediana/promedio solo de los datos que ESE panel muestra
// — ej. las 24 horas del día, los 7 días de la semana, las N ocurrencias
// del período — recalculado en cada show()). El patrón de guiones marca
// mediana vs. promedio; el color marca local vs. general.
const KIND_DEFS = [
  { key: "medianGeneral", css: "median-general", label: "Mediana" },
  { key: "averageGeneral", css: "average-general", label: "Promedio" },
  { key: "medianLocal", css: "median-local", label: "Med. local" },
  { key: "averageLocal", css: "average-local", label: "Prom. local" },
];

export function appendResponseRefLines(svg, margin, width) {
  const group = svg.append("g").attr("class", "hover-chart-reflines");
  const elements = { group };
  KIND_DEFS.forEach(({ key, css }) => {
    elements[key] = {
      line: group
        .append("line")
        .attr("class", `hover-chart-refline hover-chart-refline--${css}`)
        .attr("x1", margin.left)
        .attr("x2", width - margin.right),
    };
  });
  return elements;
}

// El valor numérico no se dibuja pegado a la línea (colisionaba con las
// etiquetas del eje Y cuando alguna caía cerca de un tick, o entre sí
// cuando dos caían cerca) — se actualiza en el texto de la leyenda
// (`legendTexts`, de appendResponseRefLegend), que tiene posición fija y
// no depende de dónde caiga el valor en la escala.
//
// `stats` = `{ general: {median, average}, local: {median, average} }`.
//
// `extent` es opcional: solo lo necesitan los paneles de ancho variable
// (heatmapDayListPanel.js), donde el <svg> se reusa entre shows() pero su
// ancho cambia según cuántas celdas haya — sin esto, la línea se quedaría
// con el x2 del primer render para siempre. Los paneles de ancho fijo
// (día/semana) no lo pasan y la línea simplemente no se reposiciona.
export function updateResponseRefLines(elements, yLine, stats, legendTexts, extent) {
  const set = (key, value, baseLabel) => {
    const { line } = elements[key];
    if (extent) line.attr("x1", extent.x1).attr("x2", extent.x2);
    const visible = Number.isFinite(value);
    line.style("display", visible ? null : "none");
    if (visible) {
      const y = yLine(value);
      line.attr("y1", y).attr("y2", y);
    }
    legendTexts?.[key]?.text(visible ? `${baseLabel}: ${value.toFixed(1)}s` : `${baseLabel}: -`);
  };
  set("medianGeneral", stats?.general?.median, "Mediana");
  set("averageGeneral", stats?.general?.average, "Promedio");
  set("medianLocal", stats?.local?.median, "Med. local");
  set("averageLocal", stats?.local?.average, "Prom. local");
}

// Entrada de leyenda (línea de muestra + texto) para cada referencia, en
// su propia fila (row 2) debajo de la fila de "Tiempo de respuesta" (row
// 1) — 4 entradas no entran cómodas en la misma fila que esa. Devuelve
// los nodos de texto para que updateResponseRefLines les vaya sumando el
// valor calculado cada vez.
// Separación entre entradas medida a ojo con margen de sobra para el
// valor más largo posible ("125.3s"), no solo el caso típico ("24.9s") —
// con menos separación el line-sample de una entrada se solapaba con el
// texto de la anterior.
const LEGEND_ENTRY_OFFSETS = [0, 130, 260, 390];

export function appendResponseRefLegend(legend, x, y) {
  const addEntry = (css, label, entryX) => {
    legend
      .append("line")
      .attr("class", `hover-chart-refline hover-chart-refline--${css}`)
      .attr("x1", entryX)
      .attr("x2", entryX + 20)
      .attr("y1", y)
      .attr("y2", y);
    return legend.append("text").attr("class", "axis-label").attr("x", entryX + 26).attr("y", y + 4).text(label);
  };
  return {
    medianGeneral: addEntry("median-general", "Mediana", x + LEGEND_ENTRY_OFFSETS[0]),
    averageGeneral: addEntry("average-general", "Promedio", x + LEGEND_ENTRY_OFFSETS[1]),
    medianLocal: addEntry("median-local", "Med. local", x + LEGEND_ENTRY_OFFSETS[2]),
    averageLocal: addEntry("average-local", "Prom. local", x + LEGEND_ENTRY_OFFSETS[3]),
  };
}
