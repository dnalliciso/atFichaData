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

// Dominio del eje Y del gráfico de gradiente: siempre incluye 100% (la
// línea de referencia "sin cambio"), con 10% de margen sobre el valor
// real más alto/bajo. Sin puntos válidos, cae a un rango parejo
// alrededor de 100 en vez de [NaN, NaN].
export function computeGradientDomain(series) {
  const values = series.map((point) => point.gradientPercent).filter(Number.isFinite);
  if (!values.length) return [50, 150];
  const min = Math.min(100, ...values);
  const max = Math.max(100, ...values);
  const span = Math.max(max - min, 1);
  return [min - span * 0.1, max + span * 0.1];
}

const TRANSITION_MS = 500;

function triangleTransform(getX, yGradient) {
  return (point) => `translate(${getX(point.item)}, ${yGradient(point.gradientPercent)}) rotate(${point.direction === "down" ? 180 : 0})`;
}

// Arma (una sola vez) todo lo que necesita el gráfico de "Gradiente de
// cambio": eje Y propio (%, dominio dinámico que siempre incluye 100%),
// línea de referencia en 100% ("sin cambio"), la línea que conecta los
// puntos con gradiente válido, los triángulos (▲ subió/más lento, en
// rojo; ▼ bajó/más rápido, en verde) y su leyenda. Se usa igual en los
// 4 paneles (heatmapHoverChart.js, heatmapWeekPanel.js,
// heatmapDayListPanel.js vía heatmapPeriodPanel.js/heatmapAllDaysPanel.js)
// para no triplicar esta lógica.
export function createGradientChart(svg, legend, margin, initialWidth, height, legendX, tooltipEl) {
  // Un generador de símbolo de d3 es un objeto MUTABLE — llamar `.size(N)`
  // en la misma instancia para dos tamaños distintos (leyenda vs. puntos
  // reales) pisaría el tamaño anterior. Y como `d3` es un global que solo
  // existe en el navegador (no al importar este módulo en un test), estas
  // rutas se generan como strings estáticos ACÁ ADENTRO, no a nivel de
  // módulo — createGradientChart solo se llama en el navegador.
  const trianglePathLegend = d3.symbol().type(d3.symbolTriangle).size(40)();
  const trianglePathPoint = d3.symbol().type(d3.symbolTriangle).size(56)();

  const axisGroup = svg.append("g").attr("class", "hover-chart-gradient-axis");
  const chartGroup = svg.append("g");
  const refLine = chartGroup
    .append("line")
    .attr("class", "hover-chart-gradient-refline")
    .attr("x1", margin.left)
    .attr("x2", initialWidth - margin.right);
  const linePath = chartGroup.append("path").attr("class", "hover-chart-gradient-line").attr("fill", "none");
  const pointsG = chartGroup.append("g").attr("class", "hover-chart-gradient-points");

  let yGradient = d3.scaleLinear().domain([50, 150]).range([height - margin.bottom, margin.top]);

  function drawAxis() {
    axisGroup
      .selectAll("text")
      .data(yGradient.ticks(5))
      .join("text")
      .attr("class", "legend-axis")
      .attr("x", margin.left - 8)
      .attr("y", (tick) => yGradient(tick) + 4)
      .attr("text-anchor", "end")
      .text((tick) => `${tick.toFixed(0)}%`);
  }
  drawAxis();

  // Leyenda (una sola vez): triángulos rojo/verde + línea de referencia.
  const legendGroup = legend.append("g");
  const addTriangleEntry = (direction, label, x) => {
    legendGroup
      .append("path")
      .attr("class", `hover-chart-gradient-point hover-chart-gradient-point--${direction}`)
      .attr("d", trianglePathLegend)
      .attr("transform", `translate(${x + 6}, 15) rotate(${direction === "down" ? 180 : 0})`);
    legendGroup.append("text").attr("class", "axis-label").attr("x", x + 16).attr("y", 19).text(label);
  };
  addTriangleEntry("up", "Subió (más lento)", legendX);
  addTriangleEntry("down", "Bajó (más rápido)", legendX + 170);
  legendGroup
    .append("line")
    .attr("class", "hover-chart-gradient-refline")
    .attr("x1", legendX)
    .attr("x2", legendX + 20)
    .attr("y1", 34)
    .attr("y2", 34);
  legendGroup.append("text").attr("class", "axis-label").attr("x", legendX + 26).attr("y", 38).text("100% (sin cambio)");

  // `getX` posiciona cada punto en el eje que ya tenga ese panel (horas,
  // letras de día, fechas...). `getRow` extrae la fila real de Excel para
  // el tooltip — en heatmapHoverChart.js cada item YA es la fila
  // (identidad, el default); en heatmapWeekPanel.js/heatmapDayListPanel.js
  // cada item es `{label o dateKeyValue, row}`, así que pasan `(item) =>
  // item.row`. `extent` es igual que en heatmapRefLines.js, solo lo usan
  // los paneles de ancho variable.
  function update(items, getValue, getX, { getRow = (item) => item, extent } = {}) {
    const series = computeGradientSeries(items, getValue);
    yGradient = d3.scaleLinear().domain(computeGradientDomain(series)).range([height - margin.bottom, margin.top]);
    drawAxis();

    const x1 = extent ? extent.x1 : margin.left;
    const x2 = extent ? extent.x2 : initialWidth - margin.right;
    const refY = yGradient(100);
    refLine.attr("x1", x1).attr("x2", x2).attr("y1", refY).attr("y2", refY);

    const lineGenerator = d3
      .line()
      .defined((point) => Number.isFinite(point.gradientPercent))
      .x((point) => getX(point.item))
      .y((point) => yGradient(point.gradientPercent));
    linePath.datum(series).transition().duration(TRANSITION_MS).attr("d", lineGenerator);

    const valid = series.filter((point) => Number.isFinite(point.gradientPercent));
    pointsG
      .selectAll("path")
      .data(valid, (point) => getX(point.item))
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", (point) => `hover-chart-gradient-point hover-chart-gradient-point--${point.direction}`)
            .attr("d", trianglePathPoint)
            .attr("transform", triangleTransform(getX, yGradient))
            .on("mouseenter", (event, point) => showTooltip(tooltipEl, event, gradientTooltipHtml(getRow(point.item), point)))
            .on("mousemove", (event) => moveTooltip(tooltipEl, event))
            .on("mouseleave", () => hideTooltip(tooltipEl)),
        (update) =>
          update.call((update) =>
            update
              .transition()
              .duration(TRANSITION_MS)
              .attr("class", (point) => `hover-chart-gradient-point hover-chart-gradient-point--${point.direction}`)
              .attr("transform", triangleTransform(getX, yGradient)),
          ),
        (exit) => exit.remove(),
      );

    return series;
  }

  return { chartGroup, axisGroup, legendGroup, update };
}
