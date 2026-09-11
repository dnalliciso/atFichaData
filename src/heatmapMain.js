import { dateKey, shortDateLabel } from "./data.js";
import { MONTH_ORDER } from "./state.js";
import {
  reportConfig,
  average,
  resolveCellColor,
  cellLabelFor,
  computeHoverOpacity,
  specialStateFor,
  buildEmpiricalGradient,
} from "./colorScales.js";
import { renderGradientLegend } from "./legend.js";
import { showTooltip, moveTooltip, hideTooltip, hourlyTooltipHtml } from "./tooltip.js";

const SPECIAL_HATCH_ID = "special-hatch-main";

function aggregateHourlyByDay(rows) {
  const grouped = d3.rollups(
    rows,
    (items) => ({
      disponibilidad: average(items.map((row) => row.disponibilidad)),
      tiempo: average(items.map((row) => row.tiempo)),
      color_disp: items[0].color_disp,
      color_tiempo: items[0].color_tiempo,
      date: items[0].fecha,
      mes: items[0].mes,
      dia: items[0].dia,
      hora: items[0].hora,
      estado_bloque: items[0].estado_bloque,
      label_tiempo: items[0].label_tiempo,
    }),
    (row) => dateKey(row.fecha),
    (row) => row.hora,
  );

  return grouped.flatMap(([dayKey, hours]) =>
    hours.map(([hora, payload]) => ({ dayKey, key: `${dayKey}-${hora}`, ...payload })),
  );
}

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
    .attr("stroke", "rgba(11, 22, 54, 0.55)")
    .attr("stroke-width", 3);
}

export function render(rows, options) {
  const { heatmapEl, tooltipEl, state, onDaySelected } = options;
  const config = reportConfig[state.report];
  const data = aggregateHourlyByDay(rows);

  const dateEntries = Array.from(
    d3.rollup(
      rows,
      (items) => items[0].fecha,
      (row) => dateKey(row.fecha),
    ),
    ([key, date]) => ({ key, date }),
  ).sort((a, b) => a.date - b.date);
  const days = dateEntries.map((entry) => entry.key);
  const hours = d3.range(0, 24);

  heatmapEl.innerHTML = "";
  if (!data.length) {
    heatmapEl.innerHTML = `<div class="empty-state">No hay datos para este filtro.</div>`;
    return;
  }

  const gradient = buildEmpiricalGradient(data, config);

  const margin = { top: 34, right: 110, bottom: 60, left: 64 };
  const cellWidth = 30;
  const cellHeight = days.length > 20 ? 14 : 18;
  const width = Math.max(720, margin.left + hours.length * cellWidth + margin.right);
  const chartHeight = margin.top + days.length * cellHeight;
  const height = chartHeight + margin.bottom;

  const svg = d3
    .select(heatmapEl)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  appendSpecialHatchDef(svg);

  const x = d3.scaleBand().domain(hours).range([margin.left, width - margin.right]).padding(0.03);
  const y = d3.scaleBand().domain(days).range([margin.top, chartHeight]).padding(0.03);

  svg
    .append("g")
    .selectAll("text")
    .data(hours)
    .join("text")
    .attr("class", "axis-label")
    .attr("x", (d) => x(d) + x.bandwidth() / 2)
    .attr("y", margin.top - 12)
    .attr("text-anchor", "middle")
    .text((d) => `${String(d).padStart(2, "0")}`);

  svg
    .append("g")
    .selectAll("text")
    .data(dateEntries)
    .join("text")
    .attr("class", "axis-label")
    .attr("x", margin.left - 10)
    .attr("y", (d) => y(d.key) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "end")
    .text((d) => shortDateLabel(d.date));

  svg
    .append("g")
    .selectAll("text")
    .data(
      dateEntries.filter(
        (entry, index, entries) =>
          index === 0 || entry.date.getDate() === 1 || entry.date.getMonth() !== entries[index - 1].date.getMonth(),
      ),
    )
    .join("text")
    .attr("class", "axis-label")
    .attr("x", 4)
    .attr("y", (d) => y(d.key) - 4)
    .attr("text-anchor", "start")
    .text((d) => `${MONTH_ORDER[d.date.getMonth()].toUpperCase()} ${d.date.getFullYear()}`);

  const cells = svg
    .append("g")
    .selectAll("g")
    .data(data)
    .join("g")
    .attr("transform", (d) => `translate(${x(d.hora)},${y(d.dayKey)})`);

  cells
    .append("rect")
    .attr("class", (d) => `heat-cell ${state.selectedDayKey === d.dayKey ? "selected" : ""}`)
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 4)
    .attr("fill", (d) => resolveCellColor(d, config))
    .on("mouseenter", (event, d) => showTooltip(tooltipEl, event, hourlyTooltipHtml(d, config)))
    .on("mousemove", (event) => moveTooltip(tooltipEl, event))
    .on("mouseleave", () => hideTooltip(tooltipEl))
    .on("click", (_, d) => onDaySelected(d.dayKey));

  const specialCells = cells.filter((d) => specialStateFor(d.estado_bloque));

  specialCells
    .append("rect")
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 4)
    .attr("fill", `url(#${SPECIAL_HATCH_ID})`)
    .attr("pointer-events", "none");

  specialCells
    .append("rect")
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 4)
    .attr("fill", "none")
    .attr("stroke", "#0b1636")
    .attr("stroke-width", 1.2)
    .attr("stroke-dasharray", "3,2")
    .attr("pointer-events", "none");

  cells
    .append("text")
    .attr("class", "cell-label")
    .attr("x", x.bandwidth() / 2)
    .attr("y", y.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .text((d) => (x.bandwidth() >= 34 ? cellLabelFor(d, config) : ""));

  if (gradient) {
    const gradientId = `legend-${state.report}`;
    renderGradientLegend(svg, {
      colorScale: gradient.colorAt,
      domain: gradient.domain,
      config,
      margin,
      width,
      chartHeight,
      gradientId,
      onHover: (hoverValue) => {
        const span = gradient.domain[1] - gradient.domain[0];
        cells
          .select("rect")
          .transition()
          .duration(120)
          .attr("fill-opacity", (d) =>
            specialStateFor(d.estado_bloque) ? 1 : computeHoverOpacity(d[config.valueKey], hoverValue, span),
          );
      },
      onHoverEnd: () => {
        cells.select("rect").transition().duration(120).attr("fill-opacity", 1);
      },
    });
  }
}
