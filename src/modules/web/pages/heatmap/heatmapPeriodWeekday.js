import { reportConfig, resolveCellColor, specialStateFor } from "./colorScales.js";
import { showTooltip, moveTooltip, hideTooltip } from "../../../../shared/tooltip.js";
import { hourlyTooltipHtml } from "./tooltipContent.js";
import { dateKey, shortDateLabel } from "../../../../core/excel.js";

const WEEKDAY_NAME = {
  L: "lunes",
  M: "martes",
  X: "miércoles",
  J: "jueves",
  V: "viernes",
  S: "sábado",
  D: "domingo",
};

export function render(rows, options) {
  const { periodWeekdayEl, periodWeekdayTitleEl, tooltipEl, state } = options;
  const config = reportConfig[state.report];

  periodWeekdayEl.innerHTML = "";

  if (!state.selectedDayKey || state.selectedHour == null) {
    periodWeekdayTitleEl.textContent = "Detalle día de la semana";
    periodWeekdayEl.innerHTML = `<div class="empty-state">Selecciona una celda (día y hora) en el mapa.</div>`;
    return;
  }

  const selectedRow = rows.find(
    (row) => dateKey(row.fecha) === state.selectedDayKey && row.hora === state.selectedHour,
  );
  const weekdayLabel = selectedRow?.dia_semana_label;

  if (!weekdayLabel) {
    // Puede pasar si el usuario cambió el Período justo entre el click y
    // este render — la celda seleccionada ya no está en las filas
    // filtradas actuales.
    periodWeekdayTitleEl.textContent = "Detalle día de la semana";
    periodWeekdayEl.innerHTML = `<div class="empty-state">La celda seleccionada quedó fuera del período actual.</div>`;
    return;
  }

  const cells = rows
    .filter((row) => row.dia_semana_label === weekdayLabel && row.hora === state.selectedHour)
    .sort((a, b) => a.fecha - b.fecha)
    .map((row) => ({ dateKeyValue: dateKey(row.fecha), row }));

  const weekdayName = WEEKDAY_NAME[weekdayLabel] ?? weekdayLabel;
  const capitalizedWeekday = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);
  periodWeekdayTitleEl.textContent = `${capitalizedWeekday} ${String(state.selectedHour).padStart(2, "0")}:00 - detalle del período`;

  const margin = { top: 28, right: 18, bottom: 42, left: 34 };
  const width = Math.max(680, margin.left + cells.length * 28 + margin.right);
  const height = 214;
  const svg = d3
    .select(periodWeekdayEl)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height);

  const x = d3
    .scaleBand()
    .domain(cells.map((cell) => cell.dateKeyValue))
    .range([margin.left, width - margin.right])
    .padding(0.08);
  const y = margin.top;
  const cellHeight = 94;

  const groups = svg
    .append("g")
    .selectAll("g")
    .data(cells)
    .join("g")
    .attr("transform", (cell) => `translate(${x(cell.dateKeyValue)},${y})`);

  groups
    .append("rect")
    .attr("class", (cell) => {
      const special = specialStateFor(cell.row.estado_bloque);
      return special?.pulse ? "heat-cell pulse-alert" : "heat-cell";
    })
    .attr("width", x.bandwidth())
    .attr("height", cellHeight)
    .attr("rx", 4)
    .attr("fill", (cell) => resolveCellColor(cell.row, config))
    .on("mouseenter", (event, cell) => showTooltip(tooltipEl, event, hourlyTooltipHtml(cell.row, config)))
    .on("mousemove", (event) => moveTooltip(tooltipEl, event))
    .on("mouseleave", () => hideTooltip(tooltipEl));

  svg
    .append("g")
    .selectAll("text")
    .data(cells)
    .join("text")
    .attr("class", "axis-label")
    .attr("x", (cell) => x(cell.dateKeyValue) + x.bandwidth() / 2)
    .attr("y", y + cellHeight + 20)
    .attr("text-anchor", "middle")
    .text((cell) => shortDateLabel(cell.row.fecha));

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height - 12)
    .attr("text-anchor", "middle")
    .text(`Todos los ${weekdayName} del período`);

  const selectedCell = cells.find((cell) => cell.dateKeyValue === state.selectedDayKey);
  if (selectedCell) {
    svg
      .append("rect")
      .attr("class", "selection-ring")
      .attr("x", x(selectedCell.dateKeyValue))
      .attr("y", y)
      .attr("width", x.bandwidth())
      .attr("height", cellHeight)
      .attr("rx", 4);
  }
}
