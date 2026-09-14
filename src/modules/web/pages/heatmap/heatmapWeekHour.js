import { reportConfig, resolveCellColor, specialStateFor } from "./colorScales.js";
import { showTooltip, moveTooltip, hideTooltip } from "../../../../shared/tooltip.js";
import { hourlyTooltipHtml } from "./tooltipContent.js";
import { dateKey } from "../../../../core/excel.js";
import { weekDatesOf } from "./state.js";

// Etiqueta de respaldo si un día de la semana no tiene fila en el
// dataset (Detalle hora siempre muestra las 7 columnas). Mismo orden
// lunes-domingo que weekDatesOf.
const WEEKDAY_FALLBACK = ["L", "M", "X", "J", "V", "S", "D"];

export function render(rows, options) {
  const { weekHourEl, weekHourTitleEl, tooltipEl, state } = options;
  const config = reportConfig[state.report];

  weekHourEl.innerHTML = "";

  if (!state.selectedDayKey || state.selectedHour == null) {
    weekHourTitleEl.textContent = "Detalle hora";
    weekHourEl.innerHTML = `<div class="empty-state">Selecciona una celda (día y hora) en el mapa.</div>`;
    return;
  }

  // state.selectedDayKey es "YYYY-MM-DD" (mismo formato que dateKey) —
  // reconstruirlo como Date local, no con `new Date(string)` (eso lo
  // interpretaría como UTC y podría correr un día según la zona horaria).
  const [year, month, day] = state.selectedDayKey.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, day);
  const weekDates = weekDatesOf(selectedDate);

  const rowByDateKey = new Map();
  rows
    .filter((row) => row.hora === state.selectedHour)
    .forEach((row) => rowByDateKey.set(dateKey(row.fecha), row));

  const cells = weekDates.map((date, index) => {
    const key = dateKey(date);
    const row = rowByDateKey.get(key) || null;
    return {
      dateKeyValue: key,
      label: row ? row.dia_semana_label : WEEKDAY_FALLBACK[index],
      row,
    };
  });

  weekHourTitleEl.textContent = `${String(state.selectedHour).padStart(2, "0")}:00 - detalle hora`;

  const margin = { top: 28, right: 18, bottom: 42, left: 34 };
  const width = Math.max(680, margin.left + cells.length * 28 + margin.right);
  const height = 214;
  const svg = d3
    .select(weekHourEl)
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
      if (!cell.row) return "heat-cell--empty";
      const special = specialStateFor(cell.row.estado_bloque);
      return special?.pulse ? "heat-cell pulse-alert" : "heat-cell";
    })
    .attr("width", x.bandwidth())
    .attr("height", cellHeight)
    .attr("rx", 4)
    .attr("fill", (cell) => (cell.row ? resolveCellColor(cell.row, config) : "none"))
    .on("mouseenter", (event, cell) => {
      if (cell.row) showTooltip(tooltipEl, event, hourlyTooltipHtml(cell.row, config));
    })
    .on("mousemove", (event, cell) => {
      if (cell.row) moveTooltip(tooltipEl, event);
    })
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
    .text((cell) => cell.label);

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height - 12)
    .attr("text-anchor", "middle")
    .text("Día de la semana");

  const selectedCell = cells.find((cell) => cell.dateKeyValue === state.selectedDayKey);
  if (selectedCell?.row) {
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
