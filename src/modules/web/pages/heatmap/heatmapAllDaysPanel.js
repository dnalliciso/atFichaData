import { dateKey } from "../../../../core/excel.js";
import { createDayListPanel } from "./heatmapDayListPanel.js";

// A diferencia de heatmapPeriodPanel.js (mismo día de semana), acá entra
// CUALQUIER día del Período activo mientras tenga esa misma hora — ej.
// si el Período es agosto completo, muestra los 31 días a las 06:00.
export function createAllDaysPanel(containerEl, tooltipEl) {
  return createDayListPanel(containerEl, tooltipEl, {
    emptyText: "Pasá el mouse sobre una celda del mapa para ver todos los días del período a esa hora.",
    noDataText: "No hay datos para esa hora en el período actual.",
    selectCells: (periodRows, dayKey, hour) =>
      periodRows
        .filter((row) => row.hora === hour)
        .sort((a, b) => a.fecha - b.fecha)
        .map((row) => ({ dateKeyValue: dateKey(row.fecha), row })),
    titleFor: (dayKey, hour) => `${String(hour).padStart(2, "0")}:00 - todos los días del período`,
  });
}
