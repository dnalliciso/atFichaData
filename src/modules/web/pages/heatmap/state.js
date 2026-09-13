export const MONTH_ORDER = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const state = {
  rows: [],
  report: "availability",
  objective: "",
  dateFrom: "",
  dateTo: "",
  selectedDayKey: "",
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
    const key = dateKeyOf(row.fecha);
    if (state.dateFrom && key < state.dateFrom) return false;
    if (state.dateTo && key > state.dateTo) return false;
    return true;
  });
}

function dateKeyOf(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

// Rango del primer mes calendario completo presente en las filas del
// objetivo actual — es el valor por defecto de dateFrom/dateTo.
export function defaultMonthRange(rows) {
  const dates = rows.map((row) => row.fecha).filter(Boolean).sort((a, b) => a - b);
  if (!dates.length) return { from: "", to: "" };
  const first = dates[0];
  const year = first.getFullYear();
  const month = first.getMonth();
  const from = dateKeyOf(new Date(year, month, 1));
  const to = dateKeyOf(new Date(year, month + 1, 0));
  return { from, to };
}
