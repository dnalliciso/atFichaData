import { showTooltip, moveTooltip, hideTooltip } from "../../../../shared/tooltip.js";
import { gradientTooltipHtml } from "./tooltipContent.js";

// "Gradiente de cambio": para cada punto de una serie (horas del día,
// días de la semana, ocurrencias del período, días del período), compara
// el valor con el del punto INMEDIATAMENTE anterior en ese mismo eje —
// no con la mediana/promedio de heatmapRefLines.js, que son sobre el
// conjunto completo, no punto a punto.
//
// gradientPercent = (actual / anterior) * 100 — ej. de 10 a 12 el
// gradiente es 120%; de 12 a 9 es 75%. El primer punto de la serie, o
// cualquier punto sin un anterior válido (estado especial, hueco, o
// anterior = 0, que haría el ratio indefinido), no tiene gradiente.
export function computeGradientSeries(items, getValue) {
  return items.map((item, index) => {
    if (index === 0) return { item, gradientPercent: null, deltaSeconds: null, direction: null };
    const previous = getValue(items[index - 1]);
    const current = getValue(item);
    if (!Number.isFinite(previous) || !Number.isFinite(current) || previous === 0) {
      return { item, gradientPercent: null, deltaSeconds: null, direction: null };
    }
    const gradientPercent = (current / previous) * 100;
    const deltaSeconds = current - previous;
    const direction = current > previous ? "up" : current < previous ? "down" : "same";
    return { item, gradientPercent, deltaSeconds, direction };
  });
}

// Dominio del eje Y del gráfico de gradiente: se grafica la DIFERENCIA en
// segundos (no el % — un ratio como 32s→14s = 43.75% no dice nada de la
// magnitud real del cambio, y "100% = sin cambio" no es lo que alguien
// espera leer de un vistazo; el % queda solo en el tooltip). El dominio
// siempre incluye 0 (la referencia "sin cambio"), con 10% de margen sobre
// el valor real más alto/bajo. Sin puntos válidos, cae a [-1, 1] en vez
// de [NaN, NaN].
export function computeDeltaDomain(series) {
  const values = series.map((point) => point.deltaSeconds).filter(Number.isFinite);
  if (!values.length) return [-1, 1];
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = Math.max(max - min, 1);
  return [min - span * 0.1, max + span * 0.1];
}

const TRANSITION_MS = 500;

// Arma (una sola vez) todo lo que necesita el gráfico de "Gradiente de
// cambio": eje Y propio (segundos, dominio dinámico que siempre incluye
// 0), línea de referencia en 0 ("sin cambio"), barras que suben desde el
// cero (rojo, el tiempo subió/empeoró) o bajan (verde, bajó/mejoró) y su
// leyenda. Cada barra es una comparación puntual contra SU propio
// anterior — no una tendencia continua — por eso son barras independientes
// y no una línea que las conecta. Se usa igual en los 4 paneles
// (heatmapHoverChart.js, heatmapWeekPanel.js, heatmapDayListPanel.js vía
// heatmapPeriodPanel.js/heatmapAllDaysPanel.js) para no triplicar esta
// lógica.
export function createGradientChart(svg, legend, margin, initialWidth, height, legendX, tooltipEl) {
  const axisGroup = svg.append("g").attr("class", "hover-chart-gradient-axis");
  const chartGroup = svg.append("g");
  const refLine = chartGroup
    .append("line")
    .attr("class", "hover-chart-gradient-refline")
    .attr("x1", margin.left)
    .attr("x2", initialWidth - margin.right);
  const barsG = chartGroup.append("g").attr("class", "hover-chart-gradient-bars");

  let yGradient = d3.scaleLinear().domain([-1, 1]).range([height - margin.bottom, margin.top]);

  function drawAxis() {
    axisGroup
      .selectAll("text")
      .data(yGradient.ticks(5))
      .join("text")
      .attr("class", "legend-axis")
      .attr("x", margin.left - 8)
      .attr("y", (tick) => yGradient(tick) + 4)
      .attr("text-anchor", "end")
      // Sin prefijo "+" para los valores positivos: a este tamaño de
      // fuente, el navegador pinta el glifo "+" de un <text> SVG con el
      // trazo vertical casi invisible, y a simple vista se confunde con
      // un "-" (confirmado con capturas directas del elemento — el DOM
      // y la posición ya son correctos, es puramente un problema de
      // legibilidad del glifo). Como arriba/abajo de la línea de 0 ya
      // indica el signo, el prefijo no hacía falta. El tooltip sí lo usa
      // (es HTML, no tiene este problema).
      .text((tick) => `${tick.toFixed(1)}s`);
  }
  drawAxis();

  // Leyenda (una sola vez): cuadrados rojo/verde + línea de referencia.
  const legendGroup = legend.append("g");
  const addSquareEntry = (direction, label, x) => {
    legendGroup
      .append("rect")
      .attr("class", `hover-chart-gradient-bar hover-chart-gradient-bar--${direction}`)
      .attr("x", x)
      .attr("y", 10)
      .attr("width", 10)
      .attr("height", 10)
      .attr("rx", 2);
    legendGroup.append("text").attr("class", "axis-label").attr("x", x + 16).attr("y", 19).text(label);
  };
  addSquareEntry("up", "Subió (más lento)", legendX);
  addSquareEntry("down", "Bajó (más rápido)", legendX + 170);
  legendGroup
    .append("line")
    .attr("class", "hover-chart-gradient-refline")
    .attr("x1", legendX)
    .attr("x2", legendX + 20)
    .attr("y1", 34)
    .attr("y2", 34);
  legendGroup.append("text").attr("class", "axis-label").attr("x", legendX + 26).attr("y", 38).text("0s (sin cambio)");

  // `getX` posiciona el CENTRO de cada barra en el eje que ya tenga ese
  // panel (horas, letras de día, fechas...); `barWidth` es el mismo ancho
  // de banda que ya usan las demás barras de ese panel. `getRow` extrae
  // la fila real de Excel para el tooltip — en heatmapHoverChart.js cada
  // item YA es la fila (identidad, el default); en
  // heatmapWeekPanel.js/heatmapDayListPanel.js cada item es `{label o
  // dateKeyValue, row}`, así que pasan `(item) => item.row`. `extent` es
  // igual que en heatmapRefLines.js, solo lo usan los paneles de ancho
  // variable.
  function update(items, getValue, getX, barWidth, { getRow = (item) => item, extent } = {}) {
    const series = computeGradientSeries(items, getValue);
    yGradient = d3.scaleLinear().domain(computeDeltaDomain(series)).range([height - margin.bottom, margin.top]);
    drawAxis();

    const x1 = extent ? extent.x1 : margin.left;
    const x2 = extent ? extent.x2 : initialWidth - margin.right;
    const zeroY = yGradient(0);
    refLine.attr("x1", x1).attr("x2", x2).attr("y1", zeroY).attr("y2", zeroY);

    const barY = (point) => Math.min(zeroY, yGradient(point.deltaSeconds));
    const barHeight = (point) => Math.abs(yGradient(point.deltaSeconds) - zeroY);

    const valid = series.filter((point) => Number.isFinite(point.deltaSeconds));
    barsG
      .selectAll("rect")
      .data(valid, (point) => getX(point.item))
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", (point) => `hover-chart-gradient-bar hover-chart-gradient-bar--${point.direction}`)
            .attr("x", (point) => getX(point.item) - barWidth / 2)
            .attr("width", barWidth)
            .attr("rx", 2)
            .attr("y", zeroY)
            .attr("height", 0)
            .on("mouseenter", (event, point) => showTooltip(tooltipEl, event, gradientTooltipHtml(getRow(point.item), point)))
            .on("mousemove", (event) => moveTooltip(tooltipEl, event))
            .on("mouseleave", () => hideTooltip(tooltipEl))
            .call((enter) => enter.transition().duration(TRANSITION_MS).attr("y", barY).attr("height", barHeight)),
        (update) =>
          update.call((update) =>
            update
              .transition()
              .duration(TRANSITION_MS)
              .attr("class", (point) => `hover-chart-gradient-bar hover-chart-gradient-bar--${point.direction}`)
              .attr("x", (point) => getX(point.item) - barWidth / 2)
              .attr("width", barWidth)
              .attr("y", barY)
              .attr("height", barHeight),
          ),
        (exit) => exit.transition().duration(TRANSITION_MS).attr("y", zeroY).attr("height", 0).remove(),
      );

    return series;
  }

  return { chartGroup, axisGroup, legendGroup, update };
}
