import { reportConfig, resolveCellColor, specialStateFor } from "./colorScales.js";
import { showTooltip, moveTooltip, hideTooltip } from "../../../../shared/tooltip.js";
import { hourlyTooltipHtml } from "./tooltipContent.js";
import { shortDateLabel } from "../../../../core/excel.js";
import { appendResponseRefLines, updateResponseRefLines, appendResponseRefLegend } from "./heatmapRefLines.js";
import { renderLineBridges } from "./heatmapLineBridge.js";

function barValue(row) {
  if (specialStateFor(row.estado_bloque)) return 100;
  return Number.isFinite(row.disponibilidad) ? row.disponibilidad : 0;
}

// Base compartida por los paneles de hover que listan varios días en un
// eje X de ancho variable (a diferencia del panel de semana y del
// gráfico principal, de eje fijo): acá el <svg> se reconstruye entero en
// cada show() en vez de animarse con .join(), porque la cantidad de
// columnas cambia según cuántas filas elija `selectCells`.
//
// Lo único que difiere entre paneles (heatmapPeriodPanel.js: mismo día
// de semana dentro del Período; heatmapAllDaysPanel.js: todos los días
// del Período) es qué filas eligen y los textos — el resto del dibujo es
// idéntico, así que vive acá una sola vez.
export function createDayListPanel(containerEl, tooltipEl, { emptyText, noDataText, selectCells, titleFor }) {
  containerEl.innerHTML = `
    <div class="hover-chart-title"></div>
    <div class="empty-state" data-ref="empty">${emptyText}</div>
  `;
  const titleEl = containerEl.querySelector(".hover-chart-title");
  const emptyEl = containerEl.querySelector("[data-ref='empty']");

  function clearChart() {
    containerEl.querySelector("svg")?.remove();
  }

  function show(periodRows, dayKey, hour, stats) {
    if (dayKey == null || hour == null) return;

    const cells = selectCells(periodRows, dayKey, hour);

    clearChart();
    titleEl.textContent = titleFor(dayKey, hour);

    if (!cells.length) {
      emptyEl.textContent = noDataText;
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
    renderLineBridges(
      svg.append("g").attr("class", "hover-chart-line-bridges"),
      "hover-chart-line-bridge",
      cells,
      (cell) => cell.row.tiempo,
      (cell) => x(cell.dateKeyValue) + x.bandwidth() / 2,
      (value) => yLine(value),
    );

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
    emptyEl.textContent = emptyText;
    emptyEl.hidden = false;
  }

  return { show, reset };
}
