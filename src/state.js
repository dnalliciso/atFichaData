export const MONTH_ORDER = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const ALL_MONTHS = "__all__";

export const state = {
  rows: [],
  report: "availability",
  objective: "",
  selectedMonth: "",
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

export function getFilteredRows(applyMonth = false) {
  return state.rows.filter((row) => {
    if (row.objetivo !== state.objective) return false;
    return !applyMonth || state.selectedMonth === ALL_MONTHS || row.mes === state.selectedMonth;
  });
}

export function getMonths(rows) {
  return Array.from(new Set(rows.map((row) => row.mes))).sort((a, b) => monthIndex(a) - monthIndex(b));
}
