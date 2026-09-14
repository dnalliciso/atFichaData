import { dateKey } from "../../../../core/excel.js";

export const MONTH_ORDER = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const state = {
  rows: [],
  report: "availability",
  objective: "",
  dateFrom: "",
  dateTo: "",
  selectedDayKey: "",
  // null = sin selección. No puede ser "" ni 0: la hora 0 (medianoche) es
  // una selección válida y no debe confundirse con "nada seleccionado".
  selectedHour: null,
  fileName: "Heatmap_objetivo.xlsx (ejemplo)",
};

export function normalizeText(value) {
  return String(value ?? "").trim();
}

export function monthIndex(month) {
  const lower = normalizeText(month).toLowerCase().slice(0, 3);
  const found = MONTH_ORDER.indexOf(lower);
  return found === -1 ? 99 : found;
}

// state.dateFrom/dateTo son strings "YYYY-MM-DD" (el mismo formato que
// <input type="date"> y que core/excel.js#dateKey), así que se pueden
// comparar como texto sin pasar por objetos Date.
export function getFilteredRows(applyDateRange = false) {
  return state.rows.filter((row) => {
    if (row.objetivo !== state.objective) return false;
    if (!applyDateRange) return true;
    const key = dateKey(row.fecha);
    if (state.dateFrom && key < state.dateFrom) return false;
    if (state.dateTo && key > state.dateTo) return false;
    return true;
  });
}

// Rango del primer mes calendario completo presente en las filas del
// objetivo actual — es el valor por defecto de dateFrom/dateTo.
export function defaultMonthRange(rows) {
  const dates = rows.map((row) => row.fecha).filter(Boolean).sort((a, b) => a - b);
  if (!dates.length) return { from: "", to: "" };
  const first = dates[0];
  const year = first.getFullYear();
  const month = first.getMonth();
  const from = dateKey(new Date(year, month, 1));
  const to = dateKey(new Date(year, month + 1, 0));
  return { from, to };
}

// Fecha (00:00 local) del lunes de la semana calendario — lunes a
// domingo — que contiene `date`. `date.getDay()` devuelve 0=domingo …
// 6=sábado; `(day + 6) % 7` traduce eso a "días desde el lunes anterior"
// (lunes=0, martes=1, …, domingo=6).
export function mondayOf(date) {
  const day = date.getDay();
  const diffFromMonday = (day + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - diffFromMonday);
}

// Las 7 fechas (lunes a domingo, en orden) de la semana calendario que
// contiene `date`.
export function weekDatesOf(date) {
  const monday = mondayOf(date);
  return Array.from(
    { length: 7 },
    (_, offset) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset),
  );
}
