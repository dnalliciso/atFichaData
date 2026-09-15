// Líneas horizontales de referencia para el tiempo de respuesta en los 4
// gráficos de hover del heatmap (día / semana / período / todos los
// días). Cada gráfico muestra DOS pares: el "general" (mediana/promedio
// sobre TODAS las filas del objetivo dentro del Período activo, calculado
// una sola vez en heatmapHoverChart.js — el mismo valor en los 4 paneles)
// y el "local" (mediana/promedio solo de los datos que ESE panel muestra
// — recalculado en cada show()). El patrón de guiones marca mediana vs.
// promedio; el color marca local vs. general.
//
// Cada entrada de la leyenda es clickeable para prender/apagar su línea
// — el estado de encendido/apagado vive acá (por instancia, así que es
// independiente por gráfico: apagar "Promedio" en el panel del día no
// afecta al de la semana) y se re-aplica en cada update() para que no se
// pierda al pasar el mouse a otra celda.
const KIND_DEFS = [
  { key: "medianGeneral", css: "median-general", label: "Mediana", statGroup: "general", statField: "median" },
  { key: "averageGeneral", css: "average-general", label: "Promedio", statGroup: "general", statField: "average" },
  { key: "medianLocal", css: "median-local", label: "Med. local", statGroup: "local", statField: "median" },
  { key: "averageLocal", css: "average-local", label: "Prom. local", statGroup: "local", statField: "average" },
];

// Separación entre entradas de leyenda medida a ojo con margen de sobra
// para el valor más largo posible ("125.3s"), no solo el caso típico
// ("24.9s") — con menos separación el line-sample de una entrada se
// solapaba con el texto de la anterior (medido con getBBox()).
const LEGEND_ENTRY_OFFSETS = [0, 130, 260, 390];

export function createResponseRefLines(svg, legend, margin, initialWidth, legendX, legendY) {
  const group = svg.append("g").attr("class", "hover-chart-reflines");
  const disabledKeys = new Set();
  let current = { yLine: null, stats: null };

  const lines = {};
  const legendTexts = {};

  KIND_DEFS.forEach(({ key, css }) => {
    lines[key] = group
      .append("line")
      .attr("class", `hover-chart-refline hover-chart-refline--${css}`)
      .attr("x1", margin.left)
      .attr("x2", initialWidth - margin.right);
  });

  function apply() {
    const { yLine, stats } = current;
    if (!yLine) return;
    KIND_DEFS.forEach(({ key, label, statGroup, statField }) => {
      const value = stats?.[statGroup]?.[statField];
      const line = lines[key];
      const visible = !disabledKeys.has(key) && Number.isFinite(value);
      line.style("display", visible ? null : "none");
      if (visible) {
        const y = yLine(value);
        line.attr("y1", y).attr("y2", y);
      }
      legendTexts[key]?.text(Number.isFinite(value) ? `${label}: ${value.toFixed(1)}s` : `${label}: -`);
    });
  }

  KIND_DEFS.forEach(({ key, css, label }, index) => {
    const entryX = legendX + LEGEND_ENTRY_OFFSETS[index];
    const entry = legend.append("g").attr("class", "hover-chart-reflegend-entry");
    // Área de click invisible más grande que la línea/texto reales — sin
    // esto el único blanco clickeable era el trazo de 1.5px de la línea
    // de muestra (los <text> tienen pointer-events:none por la regla
    // genérica .axis-label de base.css).
    entry
      .append("rect")
      .attr("class", "hover-chart-reflegend-hitarea")
      .attr("x", entryX - 4)
      .attr("y", legendY - 10)
      .attr("width", LEGEND_ENTRY_OFFSETS[index + 1] != null ? LEGEND_ENTRY_OFFSETS[index + 1] - LEGEND_ENTRY_OFFSETS[index] - 6 : 124)
      .attr("height", 20)
      .attr("fill", "transparent");
    entry
      .append("line")
      .attr("class", `hover-chart-refline hover-chart-refline--${css}`)
      .attr("x1", entryX)
      .attr("x2", entryX + 20)
      .attr("y1", legendY)
      .attr("y2", legendY);
    legendTexts[key] = entry.append("text").attr("class", "axis-label").attr("x", entryX + 26).attr("y", legendY + 4).text(label);
    entry.on("click", () => {
      if (disabledKeys.has(key)) disabledKeys.delete(key);
      else disabledKeys.add(key);
      entry.classed("hover-chart-reflegend-entry--off", disabledKeys.has(key));
      apply();
    });
  });

  // `extent` es opcional: solo lo necesitan los paneles de ancho variable
  // (heatmapDayListPanel.js), donde el <svg> se reusa entre shows() pero
  // su ancho cambia según cuántas celdas haya — sin esto, la línea se
  // quedaría con el x2 del primer render para siempre. Los paneles de
  // ancho fijo (día/semana) no lo pasan y la línea simplemente no se
  // reposiciona.
  function update(yLine, stats, extent) {
    current = { yLine, stats };
    if (extent) {
      Object.values(lines).forEach((line) => line.attr("x1", extent.x1).attr("x2", extent.x2));
    }
    apply();
  }

  return { group, update };
}
