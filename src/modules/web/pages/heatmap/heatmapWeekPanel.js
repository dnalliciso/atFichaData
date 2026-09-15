import { reportConfig, resolveCellColor, specialStateFor, responseValueOf, median, average } from "./colorScales.js";
import { showTooltip, moveTooltip, hideTooltip } from "../../../../shared/tooltip.js";
import { hourlyTooltipHtml } from "./tooltipContent.js";
import { dateKey } from "../../../../core/excel.js";
import { appendResponseRefLines, updateResponseRefLines, appendResponseRefLegend } from "./heatmapRefLines.js";
import { renderLineBridges } from "./heatmapLineBridge.js";

// Letra de día de semana a partir de Date#getDay() (0=domingo…6=sábado) —
// se deriva de la fecha, no de una columna del Excel.
const WEEKDAY_LETTERS = ["D", "L", "M", "X", "J", "V", "S"];
// Eje X fijo, lunes a domingo — mismo orden en el que weekDatesOf ya
// devuelve las fechas, así que las 7 posiciones son siempre las mismas
// letras en el mismo orden, semana tras semana (permite animar la
// transición entre semanas en vez de redibujar de cero).
const ORDER = ["L", "M", "X", "J", "V", "S", "D"];
const TRANSITION_MS = 500;

// Fecha (00:00 local) del lunes de la semana calendario — lunes a
// domingo — que contiene `date`. `date.getDay()` devuelve 0=domingo …
// 6=sábado; `(day + 6) % 7` traduce eso a "días desde el lunes anterior"
// (lunes=0, martes=1, …, domingo=6).
export function mondayOf(date) {
  const day = date.getDay();
  const diffFromMonday = (day + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - diffFromMonday);
}

// Las 7 fechas (lunes a domingo, en orden) de la semana calendario que
// contiene `date`.
export function weekDatesOf(date) {
  const monday = mondayOf(date);
  return Array.from(
    { length: 7 },
    (_, offset) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset),
  );
}

function barValue(row) {
  if (specialStateFor(row.estado_bloque)) return 100;
  return Number.isFinite(row.disponibilidad) ? row.disponibilidad : 0;
}

// Tiempo de respuesta de una celda de semana: NaN si el día no tiene fila
// (hueco real) o si la fila es un estado especial (ver responseValueOf).
function cellResponseValue(cell) {
  return cell.row ? responseValueOf(cell.row) : NaN;
}

export function createWeekPanel(containerEl, tooltipEl) {
  // top más alto que en rondas anteriores: la leyenda ahora tiene 2 filas
  // (fila 1: identidad de la serie; fila 2: las 4 líneas de referencia).
  const margin = { top: 60, right: 56, bottom: 34, left: 40 };
  const width = 680;
  const height = 280;

  containerEl.innerHTML = `
    <div class="hover-chart-title"></div>
    <div class="empty-state" data-ref="empty">Pasá el mouse sobre una celda del mapa para ver la semana.</div>
    <svg viewBox="0 0 ${width} ${height}" hidden></svg>
  `;
  const titleEl = containerEl.querySelector(".hover-chart-title");
  const emptyEl = containerEl.querySelector("[data-ref='empty']");
  const svg = d3.select(containerEl).select("svg");
  const svgNode = svg.node();

  const x = d3.scaleBand().domain(ORDER).range([margin.left, width - margin.right]).padding(0.2);
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
  const refLegendTexts = appendResponseRefLegend(legendResponse, margin.left, 34);

  svg
    .append("g")
    .selectAll("text")
    .data(ORDER)
    .join("text")
    .attr("class", "axis-label")
    .attr("x", (letter) => x(letter) + x.bandwidth() / 2)
    .attr("y", height - margin.bottom + 16)
    .attr("text-anchor", "middle")
    .text((letter) => letter);

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
  const lineGenerator = d3
    .line()
    .defined((cell) => Number.isFinite(cellResponseValue(cell)))
    .x((cell) => x(cell.label) + x.bandwidth() / 2)
    .y((cell) => yLine(cellResponseValue(cell)));
  const linePath = svg.append("path").attr("class", "hover-chart-line").attr("fill", "none");
  const bridgeG = svg.append("g").attr("class", "hover-chart-line-bridges");
  const refLineEls = appendResponseRefLines(svg, margin, width);

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
    refLineEls.group.style("display", showAvailability ? "none" : null);
  }

  function show(allRows, dayKey, hour, stats) {
    if (dayKey == null || hour == null) return;

    const [year, month, day] = dayKey.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const weekDates = weekDatesOf(selectedDate);

    const rowByDateKey = new Map();
    allRows.filter((row) => row.hora === hour).forEach((row) => rowByDateKey.set(dateKey(row.fecha), row));

    const cells = weekDates.map((date) => ({
      label: WEEKDAY_LETTERS[date.getDay()],
      row: rowByDateKey.get(dateKey(date)) || null,
    }));

    const values = cells.map(cellResponseValue).filter(Number.isFinite);
    const max = values.length ? Math.max(...values) : 0;
    yLine = d3.scaleLinear().domain([0, max > 0 ? max * 1.1 : 1]).range([height - margin.bottom, margin.top]);
    drawYLineAxis();
    // Local: mediana/promedio de esta semana en particular (los 7 días
    // que se muestran), a diferencia de `stats` (general, del Período
    // completo, pasado desde heatmapHoverChart.js).
    const localStats = { median: median(values), average: average(values) };
    updateResponseRefLines(refLineEls, yLine, { general: stats, local: localStats }, refLegendTexts);

    barsG
      .selectAll("rect")
      .data(cells, (cell) => cell.label)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("x", (cell) => x(cell.label))
            .attr("width", x.bandwidth())
            .attr("rx", 3)
            .attr("class", (cell) => (cell.row ? null : "heat-cell--empty"))
            .attr("fill", (cell) => (cell.row ? resolveCellColor(cell.row, reportConfig.availability) : "none"))
            .attr("y", yBar(0))
            .attr("height", 0)
            .on("mouseenter", (event, cell) => {
              if (cell.row) showTooltip(tooltipEl, event, hourlyTooltipHtml(cell.row));
            })
            .on("mousemove", (event, cell) => {
              if (cell.row) moveTooltip(tooltipEl, event);
            })
            .on("mouseleave", () => hideTooltip(tooltipEl))
            .call((enter) =>
              enter
                .transition()
                .duration(TRANSITION_MS)
                .attr("y", (cell) => (cell.row ? yBar(barValue(cell.row)) : yBar(0)))
                .attr("height", (cell) => (cell.row ? yBar(0) - yBar(barValue(cell.row)) : 0)),
            ),
        (update) =>
          update
            .attr("class", (cell) => (cell.row ? null : "heat-cell--empty"))
            .attr("fill", (cell) => (cell.row ? resolveCellColor(cell.row, reportConfig.availability) : "none"))
            .call((update) =>
              update
                .transition()
                .duration(TRANSITION_MS)
                .attr("y", (cell) => (cell.row ? yBar(barValue(cell.row)) : yBar(0)))
                .attr("height", (cell) => (cell.row ? yBar(0) - yBar(barValue(cell.row)) : 0)),
            ),
        (exit) => exit.remove(),
      );

    linePath.datum(cells).transition().duration(TRANSITION_MS).attr("d", lineGenerator);
    renderLineBridges(bridgeG, "hover-chart-line-bridge", cells, cellResponseValue, (cell) => x(cell.label) + x.bandwidth() / 2, (value) => yLine(value));

    pointsG
      .selectAll("circle")
      .data(
        cells.filter((cell) => Number.isFinite(cellResponseValue(cell))),
        (cell) => cell.label,
      )
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "hover-chart-point")
            .attr("r", 3)
            .attr("cx", (cell) => x(cell.label) + x.bandwidth() / 2)
            .attr("cy", (cell) => yLine(cellResponseValue(cell)))
            .on("mouseenter", (event, cell) => showTooltip(tooltipEl, event, hourlyTooltipHtml(cell.row)))
            .on("mousemove", (event) => moveTooltip(tooltipEl, event))
            .on("mouseleave", () => hideTooltip(tooltipEl)),
        (update) =>
          update.call((update) =>
            update
              .transition()
              .duration(TRANSITION_MS)
              .attr("cx", (cell) => x(cell.label) + x.bandwidth() / 2)
              .attr("cy", (cell) => yLine(cellResponseValue(cell))),
          ),
        (exit) => exit.remove(),
      );

    titleEl.textContent = `${String(hour).padStart(2, "0")}:00 - misma hora en la semana`;
    emptyEl.hidden = true;
    svgNode.toggleAttribute("hidden", false);
  }

  function reset(report) {
    currentReport = report;
    applyReportVisibility();
    titleEl.textContent = "";
    emptyEl.hidden = false;
    svgNode.toggleAttribute("hidden", true);
  }

  return { show, reset };
}
