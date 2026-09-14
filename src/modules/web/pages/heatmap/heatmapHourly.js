import { reportConfig, resolveCellColor, specialStateFor } from "./colorScales.js";
import { showTooltip, moveTooltip, hideTooltip } from "../../../../shared/tooltip.js";
import { hourlyTooltipHtml } from "./tooltipContent.js";

export function render(rows, options) {
  const { hourlyEl, detailTitleEl, tooltipEl, state } = options;
  const config = reportConfig[state.report];
  const sorted = [...rows].sort((a, b) => a.hora - b.hora);
  const selectedDay = sorted[0];
  detailTitleEl.textContent = selectedDay
    ? `${selectedDay.dia} ${selectedDay.mes} - detalle horario`
    : "Detalle horario";

  hourlyEl.innerHTML = "";
  if (!sorted.length) {
    hourlyEl.innerHTML = `<div class="empty-state">No hay detalle horario para mostrar.</div>`;
    return;
  }

  const margin = { top: 28, right: 18, bottom: 42, left: 34 };
  const width = Math.max(680, margin.left + sorted.length * 28 + margin.right);
  const height = 214;
  const svg = d3
    .select(hourlyEl)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height);

  const x = d3
    .scaleBand()
    .domain(sorted.map((row) => row.hora))
    .range([margin.left, width - margin.right])
    .padding(0.08);
  const y = margin.top;
  const cellHeight = 94;

  const cells = svg
    .append("g")
    .selectAll("g")
    .data(sorted)
    .join("g")
    .attr("transform", (d) => `translate(${x(d.hora)},${y})`);

  cells
    .append("rect")
    .attr("class", (d) => {
      const special = specialStateFor(d.estado_bloque);
      return special?.pulse ? "heat-cell pulse-alert" : "heat-cell";
    })
    .attr("width", x.bandwidth())
    .attr("height", cellHeight)
    .attr("rx", 4)
    .attr("fill", (d) => resolveCellColor(d, config))
    .on("mouseenter", (event, d) => showTooltip(tooltipEl, event, hourlyTooltipHtml(d, config)))
    .on("mousemove", (event) => moveTooltip(tooltipEl, event))
    .on("mouseleave", () => hideTooltip(tooltipEl));

  svg
    .append("g")
    .selectAll("text")
    .data(sorted)
    .join("text")
    .attr("class", "axis-label")
    .attr("x", (d) => x(d.hora) + x.bandwidth() / 2)
    .attr("y", y + cellHeight + 20)
    .attr("text-anchor", "middle")
    .text((d) => `${String(d.hora).padStart(2, "0")}`);

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height - 12)
    .attr("text-anchor", "middle")
    .text("Hora del día");

  const selectedBar = sorted.find((d) => d.hora === state.selectedHour);
  if (selectedBar) {
    svg
      .append("rect")
      .attr("class", "selection-ring")
      .attr("x", x(selectedBar.hora))
      .attr("y", y)
      .attr("width", x.bandwidth())
      .attr("height", cellHeight)
      .attr("rx", 4);
  }
}
