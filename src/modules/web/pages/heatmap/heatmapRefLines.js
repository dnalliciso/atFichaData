// Líneas horizontales de referencia para el tiempo de respuesta (mediana y
// promedio) en los 3 gráficos de hover del heatmap (día / semana /
// período). El valor de ambas se calcula una sola vez sobre todas las
// filas del objetivo dentro del Período activo (ver heatmapHoverChart.js)
// y es el MISMO en los tres paneles — lo que cambia entre paneles es la
// escala `yLine` contra la que se dibujan, porque cada uno tiene su propio
// dominio (el día muestra 24 horas, la semana 7 días, el período N
// ocurrencias). Se compartye acá para no triplicar este código, que ya se
// usa en heatmapHoverChart.js, heatmapWeekPanel.js y heatmapPeriodPanel.js.
export function appendResponseRefLines(svg, margin, width) {
  const group = svg.append("g").attr("class", "hover-chart-reflines");
  const build = (kind) => ({
    line: group
      .append("line")
      .attr("class", `hover-chart-refline hover-chart-refline--${kind}`)
      .attr("x1", margin.left)
      .attr("x2", width - margin.right),
  });
  return { median: build("median"), average: build("average") };
}

// El valor numérico no se dibuja pegado a la línea (colisionaba con las
// etiquetas del eje Y derecho cuando mediana/promedio caían cerca de un
// tick, o entre sí cuando ambas caían cerca) — se actualiza en el texto de
// la leyenda (`legendTexts`, de appendResponseRefLegend), que tiene
// posición fija y no depende de dónde caiga el valor en la escala.
//
// `extent` es opcional: solo lo necesitan los paneles de ancho variable
// (heatmapDayListPanel.js), donde el <svg> se reusa entre shows() pero su
// ancho cambia según cuántas celdas haya — sin esto, la línea se quedaría
// con el x2 del primer render para siempre. Los paneles de ancho fijo
// (día/semana) no lo pasan y la línea simplemente no se reposiciona.
export function updateResponseRefLines(elements, yLine, stats, legendTexts, extent) {
  const set = (kind, value, baseLabel) => {
    const { line } = elements[kind];
    if (extent) line.attr("x1", extent.x1).attr("x2", extent.x2);
    const visible = Number.isFinite(value);
    line.style("display", visible ? null : "none");
    if (visible) {
      const y = yLine(value);
      line.attr("y1", y).attr("y2", y);
    }
    legendTexts?.[kind]?.text(visible ? `${baseLabel}: ${value.toFixed(1)}s` : `${baseLabel}: -`);
  };
  set("median", stats?.median, "Mediana");
  set("average", stats?.average, "Promedio");
}

// Entrada de leyenda (línea de muestra + texto) para cada referencia, en la
// misma fila que "Disponibilidad" / "Tiempo de respuesta". Devuelve los
// nodos de texto para que updateResponseRefLines les vaya sumando el valor
// calculado cada vez que cambia el Objetivo/Período.
export function appendResponseRefLegend(legend, xStart) {
  const addEntry = (kind, label, x) => {
    legend
      .append("line")
      .attr("class", `hover-chart-refline hover-chart-refline--${kind}`)
      .attr("x1", x)
      .attr("x2", x + 20)
      .attr("y1", 15)
      .attr("y2", 15);
    return legend.append("text").attr("class", "axis-label").attr("x", x + 26).attr("y", 19).text(label);
  };
  return {
    median: addEntry("median", "Mediana", xStart),
    average: addEntry("average", "Promedio", xStart + 130),
  };
}
