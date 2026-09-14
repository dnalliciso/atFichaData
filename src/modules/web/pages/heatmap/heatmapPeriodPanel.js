import { reportConfig, resolveCellColor, specialStateFor } from "./colorScales.js";
import { showTooltip, moveTooltip, hideTooltip } from "../../../../shared/tooltip.js";
import { hourlyTooltipHtml } from "./tooltipContent.js";
import { dateKey, shortDateLabel } from "../../../../core/excel.js";
import { appendResponseRefLines, updateResponseRefLines, appendResponseRefLegend } from "./heatmapRefLines.js";

// Nombre de día de semana a partir de Date#getDay() (0=domingo…6=sábado)
// — se deriva de la fecha, no de una columna del Excel.
const WEEKDAY_NAME = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const EMPTY_TEXT = "Pasá el mouse sobre una celda del mapa para ver el detalle del período.";

function barValue(row) {
  if (specialStateFor(row.estado_bloque)) return 100;
  return Number.isFinite(row.disponibilidad) ? row.disponibilidad : 0;
}

export function createPeriodPanel(containerEl, tooltipEl) {
  containerEl.innerHTML = `
    <div class="hover-chart-title"></div>
    <div class="empty-state" data-ref="empty">${EMPTY_TEXT}</div>
  `;
  const titleEl = containerEl.querySelector(".hover-chart-title");
  const emptyEl = containerEl.querySelector("[data-ref='empty']");

  function clearChart() {
    containerEl.querySelector("svg")?.remove();
  }

  // A diferencia del panel de semana y del gráfico principal (eje X fijo,
  // el SVG se arma una sola vez y se anima entre estados), acá la
  // cantidad de columnas varía según cuántas ocurrencias de ese día de
  // semana haya en el Período — se reconstruye el <svg> completo en cada
  // show(), igual criterio que ya usaba heatmapPeriodWeekday.js hace 2
  // rondas.
  function show(periodRows, dayKey, hour, stats) {
    if (dayKey == null || hour == null) return;

    const [year, month, day] = dayKey.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const weekday = selectedDate.getDay();

    const cells = periodRows
      .filter((row) => row.hora === hour && row.fecha.getDay() === weekday)
      .sort((a, b) => a.fecha - b.fecha)
      .map((row) => ({ dateKeyValue: dateKey(row.fecha), row }));

    clearChart();
    const weekdayName = WEEKDAY_NAME[weekday];
    const capitalized = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);
    titleEl.textContent = `${capitalized} ${String(hour).padStart(2, "0")}:00 - detalle del período`;

    if (!cells.length) {
      emptyEl.textContent = "Esta fecha no tiene otras ocurrencias en el período actual.";
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;

    const margin = { top: 44, right: 56, bottom: 34, left: 40 };
    const width = Math.max(680, margin.left + cells.length * 28 + margin.right);
    const height = 280;

    const svg = d3.select(containerEl).append("svg").attr("viewBox", `0 0 ${width} ${height}`);

    const x = d3.scaleBand().domain(cells.map((cell) => cell.dateKeyValue)).range([margin.left, width - margin.right]).padding(0.2);
    const yBar = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);
    const values = cells.map((cell) => cell.row.tiempo).filter(Number.isFinite);
    const max = values.length ? Math.max(...values) : 0;
    const yLine = d3.scaleLinear().domain([0, max > 0 ? max * 1.1 : 1]).range([height - margin.bottom, margin.top]);

    const legend = svg.append("g").attr("class", "hover-chart-legend");
    legend
      .append("rect")
      .attr("class", "hover-chart-legend-swatch")
      .attr("x", margin.left)
      .attr("y", 10)
      .attr("width", 10)
      .attr("height", 10)
      .attr("rx", 2);
    legend.append("text").attr("class", "axis-label").attr("x", margin.left + 16).attr("y", 19).text("Disponibilidad");
    legend
      .append("line")
      .attr("class", "hover-chart-legend-line")
      .attr("x1", margin.left + 128)
      .attr("x2", margin.left + 148)
      .attr("y1", 15)
      .attr("y2", 15);
    legend
      .append("circle")
      .attr("class", "hover-chart-legend-line")
      .attr("cx", margin.left + 138)
      .attr("cy", 15)
      .attr("r", 3);
    legend
      .append("text")
      .attr("class", "axis-label")
      .attr("x", margin.left + 154)
      .attr("y", 19)
      .text("Tiempo de respuesta");
    const refLegendTexts = appendResponseRefLegend(legend, margin.left + 290);

    svg
      .append("g")
      .selectAll("text")
      .data(cells)
      .join("text")
      .attr("class", "axis-label")
      .attr("x", (cell) => x(cell.dateKeyValue) + x.bandwidth() / 2)
      .attr("y", height - margin.bottom + 16)
      .attr("text-anchor", "middle")
      .text((cell) => shortDateLabel(cell.row.fecha));

    svg
      .append("g")
      .selectAll("text")
      .data(yBar.ticks(5))
      .join("text")
      .attr("class", "legend-axis")
      .attr("x", margin.left - 8)
      .attr("y", (tick) => yBar(tick) + 4)
      .attr("text-anchor", "end")
      .text((tick) => `${tick}%`);

    svg
      .append("g")
      .selectAll("text")
      .data(yLine.ticks(5))
      .join("text")
      .attr("class", "legend-axis")
      .attr("x", width - margin.right + 8)
      .attr("y", (tick) => yLine(tick) + 4)
      .attr("text-anchor", "start")
      .text((tick) => `${tick.toFixed(1)}s`);

    svg
      .append("g")
      .selectAll("rect")
      .data(cells)
      .join("rect")
      .attr("x", (cell) => x(cell.dateKeyValue))
      .attr("width", x.bandwidth())
      .attr("rx", 3)
      .attr("y", (cell) => yBar(barValue(cell.row)))
      .attr("height", (cell) => yBar(0) - yBar(barValue(cell.row)))
      .attr("fill", (cell) => resolveCellColor(cell.row, reportConfig.availability))
      .on("mouseenter", (event, cell) => showTooltip(tooltipEl, event, hourlyTooltipHtml(cell.row)))
      .on("mousemove", (event) => moveTooltip(tooltipEl, event))
      .on("mouseleave", () => hideTooltip(tooltipEl));

    const lineGenerator = d3
      .line()
      .defined((cell) => Number.isFinite(cell.row.tiempo))
      .x((cell) => x(cell.dateKeyValue) + x.bandwidth() / 2)
      .y((cell) => yLine(cell.row.tiempo));

    svg.append("path").attr("class", "hover-chart-line").attr("fill", "none").datum(cells).attr("d", lineGenerator);

    svg
      .append("g")
      .selectAll("circle")
      .data(cells.filter((cell) => Number.isFinite(cell.row.tiempo)))
      .join("circle")
      .attr("class", "hover-chart-point")
      .attr("cx", (cell) => x(cell.dateKeyValue) + x.bandwidth() / 2)
      .attr("cy", (cell) => yLine(cell.row.tiempo))
      .attr("r", 3)
      .on("mouseenter", (event, cell) => showTooltip(tooltipEl, event, hourlyTooltipHtml(cell.row)))
      .on("mousemove", (event) => moveTooltip(tooltipEl, event))
      .on("mouseleave", () => hideTooltip(tooltipEl));

    const refLineEls = appendResponseRefLines(svg, margin, width);
    updateResponseRefLines(refLineEls, yLine, stats, refLegendTexts);
  }

  function reset() {
    clearChart();
    titleEl.textContent = "";
    emptyEl.textContent = EMPTY_TEXT;
    emptyEl.hidden = false;
  }

  return { show, reset };
}
