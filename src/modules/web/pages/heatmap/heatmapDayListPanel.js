import { reportConfig, resolveCellColor, specialStateFor, responseValueOf } from "./colorScales.js";
import { showTooltip, moveTooltip, hideTooltip } from "../../../../shared/tooltip.js";
import { hourlyTooltipHtml } from "./tooltipContent.js";
import { shortDateLabel } from "../../../../core/excel.js";
import { appendResponseRefLines, updateResponseRefLines, appendResponseRefLegend } from "./heatmapRefLines.js";
import { renderLineBridges } from "./heatmapLineBridge.js";

const TRANSITION_MS = 500;

function barValue(row) {
  if (specialStateFor(row.estado_bloque)) return 100;
  return Number.isFinite(row.disponibilidad) ? row.disponibilidad : 0;
}

// Base compartida por los paneles de hover que listan varios días en un
// eje X de ancho variable (heatmapPeriodPanel.js: mismo día de semana;
// heatmapAllDaysPanel.js: todos los días del período) — a diferencia del
// panel de semana y del gráfico principal, la cantidad de columnas cambia
// según cuántas filas elija `selectCells`.
//
// El <svg> se arma UNA sola vez (igual que heatmapWeekPanel.js) y se
// reusa entre shows() con `.join()` + transición, para tener la misma
// animación suave que el resto de los paneles — la escala X sí se
// reconstruye en cada show() (cambia el dominio y el ancho disponible),
// pero eso no impide animar: cuando el conjunto de fechas no cambia
// (ej. te movés de hora en hora sobre el mismo día/misma semana), el key
// por fecha hace que `.join()` anime la altura de cada barra en vez de
// destruir y recrear todo. Cuando sí cambia (otro día de semana en el
// panel de período), las barras viejas salen y las nuevas entran con
// transición en vez de un reemplazo instantáneo del <svg>.
export function createDayListPanel(containerEl, tooltipEl, { emptyText, noDataText, selectCells, titleFor }) {
  const margin = { top: 44, right: 56, bottom: 34, left: 40 };
  const height = 280;
  const initialWidth = 680;

  containerEl.innerHTML = `
    <div class="hover-chart-title"></div>
    <div class="empty-state" data-ref="empty">${emptyText}</div>
    <svg viewBox="0 0 ${initialWidth} ${height}" hidden></svg>
  `;
  const titleEl = containerEl.querySelector(".hover-chart-title");
  const emptyEl = containerEl.querySelector("[data-ref='empty']");
  const svg = d3.select(containerEl).select("svg");
  const svgNode = svg.node();

  let currentWidth = initialWidth;
  let x = d3.scaleBand().range([margin.left, initialWidth - margin.right]).padding(0.2);
  const yBar = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);
  let yLine = d3.scaleLinear().domain([0, 1]).range([height - margin.bottom, margin.top]);

  const legend = svg.append("g").attr("class", "hover-chart-legend");
  const legendAvailability = legend.append("g");
  legendAvailability
    .append("rect")
    .attr("class", "hover-chart-legend-swatch")
    .attr("x", margin.left)
    .attr("y", 10)
    .attr("width", 10)
    .attr("height", 10)
    .attr("rx", 2);
  legendAvailability.append("text").attr("class", "axis-label").attr("x", margin.left + 16).attr("y", 19).text("Disponibilidad");
  const legendResponse = legend.append("g");
  legendResponse
    .append("line")
    .attr("class", "hover-chart-legend-line")
    .attr("x1", margin.left)
    .attr("x2", margin.left + 20)
    .attr("y1", 15)
    .attr("y2", 15);
  legendResponse
    .append("circle")
    .attr("class", "hover-chart-legend-line")
    .attr("cx", margin.left + 10)
    .attr("cy", 15)
    .attr("r", 3);
  legendResponse
    .append("text")
    .attr("class", "axis-label")
    .attr("x", margin.left + 26)
    .attr("y", 19)
    .text("Tiempo de respuesta");
  const refLegendTexts = appendResponseRefLegend(legendResponse, margin.left + 162);

  // Eje Y de disponibilidad (%) — dominio fijo [0,100], no depende del
  // ancho, se dibuja una sola vez.
  const yBarAxisG = svg.append("g");
  yBarAxisG
    .selectAll("text")
    .data(yBar.ticks(5))
    .join("text")
    .attr("class", "legend-axis")
    .attr("x", margin.left - 8)
    .attr("y", (tick) => yBar(tick) + 4)
    .attr("text-anchor", "end")
    .text((tick) => `${tick}%`);

  const xAxisG = svg.append("g");
  // Mismo lado izquierdo que el de disponibilidad — nunca se muestran
  // los dos juntos (ver applyReportVisibility).
  const yLineAxisG = svg.append("g").attr("class", "hover-chart-yline-axis");
  function drawYLineAxis() {
    yLineAxisG
      .selectAll("text")
      .data(yLine.ticks(5))
      .join("text")
      .attr("class", "legend-axis")
      .attr("x", margin.left - 8)
      .attr("y", (tick) => yLine(tick) + 4)
      .attr("text-anchor", "end")
      .text((tick) => `${tick.toFixed(1)}s`);
  }

  const barsG = svg.append("g").attr("class", "hover-chart-bars");
  const pointsG = svg.append("g").attr("class", "hover-chart-points");
  const bridgeG = svg.append("g").attr("class", "hover-chart-line-bridges");
  const lineGenerator = d3
    .line()
    .defined((cell) => Number.isFinite(responseValueOf(cell.row)))
    .x((cell) => x(cell.dateKeyValue) + x.bandwidth() / 2)
    .y((cell) => yLine(responseValueOf(cell.row)));
  const linePath = svg.append("path").attr("class", "hover-chart-line").attr("fill", "none");
  const refLineEls = appendResponseRefLines(svg, margin, initialWidth);

  let currentReport = "availability";
  function applyReportVisibility() {
    const showAvailability = currentReport === "availability";
    legendAvailability.style("display", showAvailability ? null : "none");
    legendResponse.style("display", showAvailability ? "none" : null);
    yBarAxisG.style("display", showAvailability ? null : "none");
    yLineAxisG.style("display", showAvailability ? "none" : null);
    barsG.style("display", showAvailability ? null : "none");
    pointsG.style("display", showAvailability ? "none" : null);
    linePath.style("display", showAvailability ? "none" : null);
    bridgeG.style("display", showAvailability ? "none" : null);
  }

  function show(periodRows, dayKey, hour, stats) {
    if (dayKey == null || hour == null) return;

    const cells = selectCells(periodRows, dayKey, hour);
    titleEl.textContent = titleFor(dayKey, hour);

    if (!cells.length) {
      emptyEl.textContent = noDataText;
      emptyEl.hidden = false;
      svgNode.toggleAttribute("hidden", true);
      return;
    }

    emptyEl.hidden = true;
    svgNode.toggleAttribute("hidden", false);

    currentWidth = Math.max(680, margin.left + cells.length * 28 + margin.right);
    svg.attr("viewBox", `0 0 ${currentWidth} ${height}`);
    x = d3.scaleBand().domain(cells.map((cell) => cell.dateKeyValue)).range([margin.left, currentWidth - margin.right]).padding(0.2);

    const values = cells.map((cell) => responseValueOf(cell.row)).filter(Number.isFinite);
    const max = values.length ? Math.max(...values) : 0;
    yLine = d3.scaleLinear().domain([0, max > 0 ? max * 1.1 : 1]).range([height - margin.bottom, margin.top]);
    drawYLineAxis();
    if (currentReport === "response") {
      updateResponseRefLines(refLineEls, yLine, stats, refLegendTexts, { x1: margin.left, x2: currentWidth - margin.right });
    } else {
      refLineEls.median.line.style("display", "none");
      refLineEls.average.line.style("display", "none");
    }

    xAxisG
      .selectAll("text")
      .data(cells, (cell) => cell.dateKeyValue)
      .join(
        (enter) =>
          enter
            .append("text")
            .attr("class", "axis-label")
            .attr("x", (cell) => x(cell.dateKeyValue) + x.bandwidth() / 2)
            .attr("y", height - margin.bottom + 16)
            .attr("text-anchor", "middle")
            .attr("opacity", 0)
            .text((cell) => shortDateLabel(cell.row.fecha))
            .call((enter) => enter.transition().duration(TRANSITION_MS).attr("opacity", 1)),
        (update) =>
          update.call((update) =>
            update
              .transition()
              .duration(TRANSITION_MS)
              .attr("x", (cell) => x(cell.dateKeyValue) + x.bandwidth() / 2)
              .text((cell) => shortDateLabel(cell.row.fecha)),
          ),
        (exit) => exit.transition().duration(TRANSITION_MS).attr("opacity", 0).remove(),
      );

    barsG
      .selectAll("rect")
      .data(cells, (cell) => cell.dateKeyValue)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("x", (cell) => x(cell.dateKeyValue))
            .attr("width", x.bandwidth())
            .attr("rx", 3)
            .attr("fill", (cell) => resolveCellColor(cell.row, reportConfig.availability))
            .attr("y", yBar(0))
            .attr("height", 0)
            .on("mouseenter", (event, cell) => showTooltip(tooltipEl, event, hourlyTooltipHtml(cell.row)))
            .on("mousemove", (event) => moveTooltip(tooltipEl, event))
            .on("mouseleave", () => hideTooltip(tooltipEl))
            .call((enter) =>
              enter
                .transition()
                .duration(TRANSITION_MS)
                .attr("y", (cell) => yBar(barValue(cell.row)))
                .attr("height", (cell) => yBar(0) - yBar(barValue(cell.row))),
            ),
        (update) =>
          update.call((update) =>
            update
              .transition()
              .duration(TRANSITION_MS)
              .attr("x", (cell) => x(cell.dateKeyValue))
              .attr("width", x.bandwidth())
              .attr("fill", (cell) => resolveCellColor(cell.row, reportConfig.availability))
              .attr("y", (cell) => yBar(barValue(cell.row)))
              .attr("height", (cell) => yBar(0) - yBar(barValue(cell.row))),
          ),
        (exit) => exit.transition().duration(TRANSITION_MS).attr("height", 0).attr("y", yBar(0)).remove(),
      );

    linePath.datum(cells).transition().duration(TRANSITION_MS).attr("d", lineGenerator);
    renderLineBridges(
      bridgeG,
      "hover-chart-line-bridge",
      cells,
      (cell) => responseValueOf(cell.row),
      (cell) => x(cell.dateKeyValue) + x.bandwidth() / 2,
      (value) => yLine(value),
    );

    pointsG
      .selectAll("circle")
      .data(
        cells.filter((cell) => Number.isFinite(responseValueOf(cell.row))),
        (cell) => cell.dateKeyValue,
      )
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "hover-chart-point")
            .attr("r", 3)
            .attr("cx", (cell) => x(cell.dateKeyValue) + x.bandwidth() / 2)
            .attr("cy", (cell) => yLine(responseValueOf(cell.row)))
            .on("mouseenter", (event, cell) => showTooltip(tooltipEl, event, hourlyTooltipHtml(cell.row)))
            .on("mousemove", (event) => moveTooltip(tooltipEl, event))
            .on("mouseleave", () => hideTooltip(tooltipEl)),
        (update) =>
          update.call((update) =>
            update
              .transition()
              .duration(TRANSITION_MS)
              .attr("cx", (cell) => x(cell.dateKeyValue) + x.bandwidth() / 2)
              .attr("cy", (cell) => yLine(responseValueOf(cell.row))),
          ),
        (exit) => exit.remove(),
      );
  }

  function reset(report) {
    currentReport = report;
    applyReportVisibility();
    titleEl.textContent = "";
    emptyEl.textContent = emptyText;
    emptyEl.hidden = false;
    svgNode.toggleAttribute("hidden", true);
  }

  return { show, reset };
}
