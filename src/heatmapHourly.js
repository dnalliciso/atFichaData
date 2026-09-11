import { reportConfig, resolveCellColor, specialStateFor } from "./colorScales.js";
import { showTooltip, moveTooltip, hideTooltip, hourlyTooltipHtml } from "./tooltip.js";

const SPECIAL_HATCH_ID = "special-hatch-hourly";

function appendSpecialHatchDef(svg) {
  const defs = svg.append("defs");
  const pattern = defs
    .append("pattern")
    .attr("id", SPECIAL_HATCH_ID)
    .attr("width", 6)
    .attr("height", 6)
    .attr("patternUnits", "userSpaceOnUse")
    .attr("patternTransform", "rotate(45)");
  pattern.append("rect").attr("width", 6).attr("height", 6).attr("fill", "transparent");
  pattern
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", 6)
    .attr("stroke", "rgba(255, 255, 255, 0.55)")
    .attr("stroke-width", 3);
}

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

  appendSpecialHatchDef(svg);

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
    .attr("class", "heat-cell")
    .attr("width", x.bandwidth())
    .attr("height", cellHeight)
    .attr("rx", 4)
    .attr("fill", (d) => resolveCellColor(d, config))
    .on("mouseenter", (event, d) => showTooltip(tooltipEl, event, hourlyTooltipHtml(d, config)))
    .on("mousemove", (event) => moveTooltip(tooltipEl, event))
    .on("mouseleave", () => hideTooltip(tooltipEl));

  const specialCells = cells.filter((d) => specialStateFor(d.estado_bloque));

  specialCells
    .append("rect")
    .attr("width", x.bandwidth())
    .attr("height", cellHeight)
    .attr("rx", 4)
    .attr("fill", `url(#${SPECIAL_HATCH_ID})`)
    .attr("pointer-events", "none");

  specialCells
    .append("rect")
    .attr("width", x.bandwidth())
    .attr("height", cellHeight)
    .attr("rx", 4)
    .attr("fill", "none")
    .attr("stroke", "rgba(255, 255, 255, 0.8)")
    .attr("stroke-width", 1.2)
    .attr("stroke-dasharray", "3,2")
    .attr("pointer-events", "none");

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
}
