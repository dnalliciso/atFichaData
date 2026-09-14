import { dateKey, shortDateLabel } from "../../../../core/excel.js";
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
import { renderGradientLegend } from "../../../../shared/legend.js";
import { showTooltip, moveTooltip, hideTooltip } from "../../../../shared/tooltip.js";
import { hourlyTooltipHtml } from "./tooltipContent.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_RESERVED_DAYS = 31;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dayOffset(date, referenceStart) {
  return Math.round((startOfDay(date) - referenceStart) / MS_PER_DAY);
}

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

export function render(rows, options) {
  const { heatmapEl, tooltipEl, state } = options;
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

  heatmapEl.innerHTML = "";
  if (!data.length) {
    heatmapEl.innerHTML = `<div class="empty-state">No hay datos para este filtro.</div>`;
    return;
  }

  // El grid reserva siempre el alto de un mes completo (31 filas) a
  // partir del mes del primer día visible, para que acortar el rango de
  // fechas (ej. solo 2 semanas) no cambie el tamaño del gráfico ni mueva
  // el resto de la página.
  const referenceStart = startOfMonth(dateEntries[0].date);
  const lastOffset = dayOffset(dateEntries[dateEntries.length - 1].date, referenceStart);
  const reservedDays = Math.max(MIN_RESERVED_DAYS, lastOffset + 1);

  const gradient = buildEmpiricalGradient(data, config);

  const hours = d3.range(0, 24);
  const margin = { top: 40, right: 116, bottom: 60, left: 78 };
  const cellWidth = 38;
  const cellHeight = 17;
  const width = Math.max(720, margin.left + hours.length * cellWidth + margin.right);
  const chartHeight = margin.top + reservedDays * cellHeight;
  const height = chartHeight + margin.bottom;

  const svg = d3
    .select(heatmapEl)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  const x = d3.scaleBand().domain(hours).range([margin.left, width - margin.right]).padding(0.05);
  const y = d3
    .scaleBand()
    .domain(d3.range(reservedDays))
    .range([margin.top, chartHeight])
    .padding(0.05);
  const rowY = (date) => y(dayOffset(date, referenceStart));

  svg
    .append("g")
    .selectAll("text")
    .data(hours)
    .join("text")
    .attr("class", "axis-label")
    .attr("x", (d) => x(d) + x.bandwidth() / 2)
    .attr("y", margin.top - 14)
    .attr("text-anchor", "middle")
    .text((d) => `${String(d).padStart(2, "0")}`);

  svg
    .append("g")
    .selectAll("text")
    .data(dateEntries)
    .join("text")
    .attr("class", "axis-label")
    .attr("x", margin.left - 14)
    .attr("y", (d) => rowY(d.date) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "end")
    .text((d) => shortDateLabel(d.date));

  // Etiqueta de mes: una franja vertical angosta a la izquierda de todo,
  // en vez de texto en línea con los días (así no se pisan si el rango
  // cruza más de un mes).
  const monthGroups = d3.groups(dateEntries, (entry) => `${entry.date.getFullYear()}-${entry.date.getMonth()}`);
  const monthBarX = 6;
  const monthBarWidth = 14;
  svg
    .append("g")
    .selectAll("g")
    .data(monthGroups)
    .join("g")
    .each(function ([, entries]) {
      const first = entries[0];
      const last = entries[entries.length - 1];
      const y0 = rowY(first.date);
      const y1 = rowY(last.date) + y.bandwidth();
      const group = d3.select(this);
      group
        .append("rect")
        .attr("class", "month-bar")
        .attr("x", monthBarX)
        .attr("y", y0)
        .attr("width", monthBarWidth)
        .attr("height", Math.max(y1 - y0, 1))
        .attr("rx", 4);
      group
        .append("text")
        .attr("class", "month-bar-label")
        .attr("transform", `translate(${monthBarX + monthBarWidth / 2}, ${(y0 + y1) / 2}) rotate(-90)`)
        .attr("text-anchor", "middle")
        .text(`${MONTH_ORDER[first.date.getMonth()].toUpperCase()} ${first.date.getFullYear()}`);
    });

  const cells = svg
    .append("g")
    .selectAll("g")
    .data(data)
    .join("g")
    .attr("transform", (d) => `translate(${x(d.hora)},${rowY(d.date)})`);

  cells
    .append("rect")
    .attr("class", (d) => {
      const special = specialStateFor(d.estado_bloque);
      const classes = ["heat-cell"];
      if (special?.pulse) classes.push("pulse-alert");
      return classes.join(" ");
    })
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 4)
    .attr("fill", (d) => resolveCellColor(d, config))
    .on("mouseenter", (event, d) => showTooltip(tooltipEl, event, hourlyTooltipHtml(d, config)))
    .on("mousemove", (event) => moveTooltip(tooltipEl, event))
    .on("mouseleave", () => hideTooltip(tooltipEl));

  cells
    .append("text")
    .attr("class", "cell-label")
    .attr("x", x.bandwidth() / 2)
    .attr("y", y.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .text((d) => (x.bandwidth() >= 28 ? cellLabelFor(d, config) : ""));

  if (gradient) {
    const gradientId = `legend-${state.report}`;
    const filterableCells = cells.filter((d) => !specialStateFor(d.estado_bloque));
    renderGradientLegend(svg, {
      colorScale: gradient.colorAt,
      domain: gradient.domain,
      config,
      margin,
      width,
      chartHeight,
      gradientId,
      onScrub: (value) => {
        const span = gradient.domain[1] - gradient.domain[0];
        filterableCells.select("rect").attr("fill-opacity", (d) => computeHoverOpacity(d[config.valueKey], value, span));
      },
    });
  }
}
