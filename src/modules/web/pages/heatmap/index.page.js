import { ensurePageStyle, showError, clearError } from "../../../../core/dom.js";
import { formatDate, dateKey } from "../../../../core/excel.js";
import { renderCategoryLegend } from "../../../../shared/legend.js";
import { loadDefault, loadFromFile } from "./data.js";
import { state, getFilteredRows, defaultMonthRange } from "./state.js";
import { reportConfig, average, SPECIAL_STATES } from "./colorScales.js";
import * as heatmapMain from "./heatmapMain.js";
import * as heatmapHourly from "./heatmapHourly.js";
import * as eventsPanel from "./events.js";

ensurePageStyle(new URL("./style.css", import.meta.url).href);

export const meta = {
  kicker: "Disponibilidad global",
  title: "Disponibilidad y tiempo de respuesta",
  subtitle: "Heatmap hora / día",
};

const TEMPLATE = `
  <section class="summary-strip" aria-label="Resumen">
    <article>
      <span>Objetivo</span>
      <strong data-ref="objectiveName">Cargando...</strong>
    </article>
    <article>
      <span>Rango</span>
      <strong data-ref="dateRange">-</strong>
    </article>
    <article>
      <span>Disponibilidad promedio</span>
      <strong data-ref="availabilityAvg">-</strong>
    </article>
    <article>
      <span>Respuesta promedio</span>
      <strong data-ref="responseAvg">-</strong>
    </article>
  </section>

  <section class="workspace">
    <aside class="controls-panel" aria-label="Controles">
      <div class="control-group">
        <span class="control-label">Informe</span>
        <div class="segmented" role="tablist" aria-label="Tipo de informe">
          <button class="segment active" data-report="availability" type="button">Disponibilidad</button>
          <button class="segment" data-report="response" type="button">Respuesta</button>
        </div>
      </div>

      <label class="control-group">
        <span class="control-label">Objetivo</span>
        <select data-ref="objectiveSelect"></select>
      </label>

      <div class="control-group">
        <span class="control-label">Período</span>
        <div class="date-range">
          <input data-ref="dateFromInput" type="date" aria-label="Desde" />
          <span class="date-range-sep">–</span>
          <input data-ref="dateToInput" type="date" aria-label="Hasta" />
        </div>
      </div>

      <div class="control-group">
        <span class="control-label">Excel</span>
        <div class="file-control">
          <button type="button" data-ref="fileTrigger" class="file-trigger">Elegir archivo</button>
          <span data-ref="fileName" class="file-name">Heatmap_objetivo.xlsx (ejemplo)</span>
          <input data-ref="fileInput" type="file" accept=".xlsx,.xls" hidden />
        </div>
      </div>

      <div class="legend" data-ref="legend"></div>
    </aside>

    <section class="report-surface">
      <div class="section-heading">
        <div>
          <p data-ref="reportKicker">Disponibilidad global</p>
          <h2 data-ref="reportTitle">Heatmap hora / día</h2>
        </div>
        <div class="chart-actions">
          <p class="section-subtitle" data-ref="reportSubtitle"></p>
        </div>
      </div>

      <div data-ref="errorBox" class="error-box" hidden></div>
      <div data-ref="heatmap" class="chart-wrap" aria-label="Heatmap principal"></div>

      <div class="detail-grid">
        <section>
          <div class="section-heading compact">
            <div>
              <p>Detalle</p>
              <h2 data-ref="detailTitle">Selecciona un día</h2>
            </div>
          </div>
          <div data-ref="hourlyHeatmap" class="chart-wrap small" aria-label="Detalle horario"></div>
        </section>
        <section class="records-panel">
          <div class="section-heading compact">
            <div>
              <p>Eventos</p>
              <h2>Bloques marcados</h2>
            </div>
          </div>
          <div data-ref="eventsList" class="events-list"></div>
        </section>
      </div>
    </section>
  </section>
`;

export function mount(container) {
  container.innerHTML = TEMPLATE;

  const els = {};
  container.querySelectorAll("[data-ref]").forEach((el) => {
    els[el.dataset.ref] = el;
  });

  const tooltipEl = document.querySelector("#tooltip");

  function setRows(rows) {
    if (!rows.length) {
      showError(els.errorBox, "El Excel no tiene filas válidas para la hoja Heatmap.");
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
    clearError(els.errorBox);
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

    renderCategoryLegend(els.legend, Object.values(SPECIAL_STATES));

    heatmapMain.render(rows, {
      heatmapEl: els.heatmap,
      tooltipEl,
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
      tooltipEl,
      state,
    });

    eventsPanel.render(rows, els.eventsList);
  }

  container.querySelectorAll("[data-report]").forEach((button) => {
    button.addEventListener("click", () => {
      container.querySelectorAll("[data-report]").forEach((item) => item.classList.remove("active"));
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

  els.fileTrigger.addEventListener("click", () => els.fileInput.click());

  els.fileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    els.fileName.textContent = file.name;
    try {
      clearError(els.errorBox);
      const rows = await loadFromFile(file);
      setRows(rows);
    } catch (error) {
      showError(els.errorBox, error.message);
    }
  });

  loadDefault()
    .then(setRows)
    .catch((error) => showError(els.errorBox, error.message));
}
