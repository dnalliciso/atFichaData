import { dateKey } from "../../../../core/excel.js";
import { createDayListPanel } from "./heatmapDayListPanel.js";

// Nombre de día de semana a partir de Date#getDay() (0=domingo…6=sábado)
// — se deriva de la fecha, no de una columna del Excel.
const WEEKDAY_NAME = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function weekdayOf(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function createPeriodPanel(containerEl, tooltipEl) {
  return createDayListPanel(containerEl, tooltipEl, {
    emptyText: "Pasá el mouse sobre una celda del mapa para ver el detalle del período.",
    noDataText: "Esta fecha no tiene otras ocurrencias en el período actual.",
    selectCells: (periodRows, dayKey, hour) => {
      const weekday = weekdayOf(dayKey);
      return periodRows
        .filter((row) => row.hora === hour && row.fecha.getDay() === weekday)
        .sort((a, b) => a.fecha - b.fecha)
        .map((row) => ({ dateKeyValue: dateKey(row.fecha), row }));
    },
    titleFor: (dayKey, hour) => {
      const weekdayName = WEEKDAY_NAME[weekdayOf(dayKey)];
      const capitalized = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);
      return `${capitalized} ${String(hour).padStart(2, "0")}:00 - detalle del período`;
    },
  });
}
