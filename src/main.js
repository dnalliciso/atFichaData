import { loadWorkbookFromUrl, loadWorkbookFromFile, dateKey, formatDate } from "./data.js";
import { state, getFilteredRows, defaultMonthRange } from "./state.js";
import { reportConfig, average } from "./colorScales.js";
import { renderCategoryLegend } from "./legend.js";
import * as heatmapMain from "./heatmapMain.js";
import * as heatmapHourly from "./heatmapHourly.js";
import * as eventsPanel from "./events.js";

const DEFAULT_WORKBOOK = "./dataExample/Heatmap_objetivo.xlsx";

const els = {
  objectiveName: document.querySelector("#objectiveName"),
  dateRange: document.querySelector("#dateRange"),
  availabilityAvg: document.querySelector("#availabilityAvg"),
  responseAvg: document.querySelector("#responseAvg"),
  objectiveSelect: document.querySelector("#objectiveSelect"),
  dateFromInput: document.querySelector("#dateFromInput"),
  dateToInput: document.querySelector("#dateToInput"),
  heatmap: document.querySelector("#heatmap"),
  hourlyHeatmap: document.querySelector("#hourlyHeatmap"),
  detailTitle: document.querySelector("#detailTitle"),
  eventsList: document.querySelector("#eventsList"),
  reportKicker: document.querySelector("#reportKicker"),
  reportTitle: document.querySelector("#reportTitle"),
  reportSubtitle: document.querySelector("#reportSubtitle"),
  legend: document.querySelector("#legend"),
  errorBox: document.querySelector("#errorBox"),
  tooltip: document.querySelector("#tooltip"),
  fileInput: document.querySelector("#fileInput"),
  fileTrigger: document.querySelector("#fileTrigger"),
  fileName: document.querySelector("#fileName"),
  themeToggle: document.querySelector("#themeToggle"),
};

const THEME_STORAGE_KEY = "atficha-theme";

function applyThemeIcon(theme) {
  els.themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  els.themeToggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro",
  );
}

function effectiveTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function initTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    document.documentElement.setAttribute("data-theme", stored);
  }
  applyThemeIcon(effectiveTheme());
}

els.themeToggle.addEventListener("click", () => {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_STORAGE_KEY, next);
  document.documentElement.setAttribute("data-theme", next);
  applyThemeIcon(next);
});

initTheme();

els.fileTrigger.addEventListener("click", () => els.fileInput.click());

function showError(message) {
  els.errorBox.hidden = false;
  els.errorBox.textContent = message;
}

function clearError() {
  els.errorBox.hidden = true;
  els.errorBox.textContent = "";
}

function setRows(rows) {
  if (!rows.length) {
    showError("El Excel no tiene filas válidas para la hoja Heatmap.");
    return;
  }
  state.rows = rows;
  const objectives = Array.from(new Set(rows.map((row) => row.objetivo))).sort();
  state.objective = objectives[0];
  state.dateFrom = "";
  state.dateTo = "";
  state.selectedDayKey = "";
  populateFilters();
  render();
}

function populateFilters() {
  const objectives = Array.from(new Set(state.rows.map((row) => row.objetivo))).sort();
  els.objectiveSelect.innerHTML = objectives
    .map((objective) => `<option value="${objective}">${objective}</option>`)
    .join("");
  els.objectiveSelect.value = state.objective;

  if (!state.dateFrom || !state.dateTo) {
    const range = defaultMonthRange(getFilteredRows(false));
    state.dateFrom = range.from;
    state.dateTo = range.to;
  }
  els.dateFromInput.value = state.dateFrom;
  els.dateToInput.value = state.dateTo;
}

function updateSummary(rows) {
  const dates = rows.map((row) => row.fecha).filter(Boolean);
  const minDate = d3.min(dates);
  const maxDate = d3.max(dates);
  const availability = average(rows.map((row) => row.disponibilidad));
  const response = average(rows.map((row) => row.tiempo));

  els.objectiveName.textContent = state.objective || "-";
  els.dateRange.textContent = minDate && maxDate ? `${formatDate(minDate)} - ${formatDate(maxDate)}` : "-";
  els.availabilityAvg.textContent = availability == null ? "-" : `${availability.toFixed(3)}%`;
  els.responseAvg.textContent = response == null ? "-" : `${response.toFixed(2)}s`;
}

function render() {
  clearError();
  const rows = getFilteredRows(true);
  updateSummary(rows);

  const config = reportConfig[state.report];
  const dates = rows.map((row) => row.fecha).filter(Boolean);
  const years = Array.from(new Set(dates.map((date) => date.getFullYear()))).sort();
  const yearLabel = years.length === 1 ? years[0] : years.join("-");

  els.reportKicker.textContent = config.kicker;
  els.reportTitle.textContent = `${config.kicker} — ${yearLabel || "período"}`;
  els.reportSubtitle.textContent =
    state.report === "availability"
      ? "Eje X: hora del día. Eje Y: día del período. Cada celda muestra disponibilidad."
      : "Eje X: hora del día. Eje Y: día del período. Cada celda muestra tiempo de respuesta.";

  renderCategoryLegend(els.legend);

  heatmapMain.render(rows, {
    heatmapEl: els.heatmap,
    tooltipEl: els.tooltip,
    state,
    onDaySelected: (dayKey) => {
      state.selectedDayKey = dayKey;
      render();
    },
  });

  const fallbackDayKey = rows[0] ? dateKey(rows[0].fecha) : null;
  const selectedDayKey = state.selectedDayKey || fallbackDayKey;
  const dayRows = selectedDayKey ? rows.filter((row) => dateKey(row.fecha) === selectedDayKey) : [];
  heatmapHourly.render(dayRows, {
    hourlyEl: els.hourlyHeatmap,
    detailTitleEl: els.detailTitle,
    tooltipEl: els.tooltip,
    state,
  });

  eventsPanel.render(rows, els.eventsList);
}

document.querySelectorAll("[data-report]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-report]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.report = button.dataset.report;
    render();
  });
});

els.objectiveSelect.addEventListener("change", () => {
  state.objective = els.objectiveSelect.value;
  state.dateFrom = "";
  state.dateTo = "";
  state.selectedDayKey = "";
  populateFilters();
  render();
});

els.dateFromInput.addEventListener("change", () => {
  state.dateFrom = els.dateFromInput.value;
  state.selectedDayKey = "";
  render();
});

els.dateToInput.addEventListener("change", () => {
  state.dateTo = els.dateToInput.value;
  state.selectedDayKey = "";
  render();
});

els.fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  els.fileName.textContent = file.name;
  try {
    clearError();
    const rows = await loadWorkbookFromFile(file);
    setRows(rows);
  } catch (error) {
    showError(error.message);
  }
});

loadWorkbookFromUrl(DEFAULT_WORKBOOK)
  .then(setRows)
  .catch((error) => showError(error.message));
