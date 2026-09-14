import { ensurePageStyle, showError, clearError } from "../../../../core/dom.js";
import { formatDate, dateKey } from "../../../../core/excel.js";
import { renderCategoryLegend } from "../../../../shared/legend.js";
import { loadDefault, loadFromFile } from "./data.js";
import { state, getFilteredRows, defaultMonthRange } from "./state.js";
import { reportConfig, average, SPECIAL_STATES } from "./colorScales.js";
import * as heatmapMain from "./heatmapMain.js";
import * as heatmapHourly from "./heatmapHourly.js";
import * as heatmapWeekHour from "./heatmapWeekHour.js";
import * as heatmapPeriodWeekday from "./heatmapPeriodWeekday.js";
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
        <div class="detail-stack">
          <section>
            <div class="section-heading compact">
              <div>
                <p>Detalle</p>
                <h2 data-ref="detailTitle">Selecciona un día</h2>
              </div>
            </div>
            <div data-ref="hourlyHeatmap" class="chart-wrap small" aria-label="Detalle horario"></div>
          </section>
          <section>
            <div class="section-heading compact">
              <div>
                <p>Detalle</p>
                <h2 data-ref="weekHourTitle">Detalle hora</h2>
              </div>
            </div>
            <div data-ref="weekHourHeatmap" class="chart-wrap small" aria-label="Detalle hora"></div>
          </section>
          <section>
            <div class="section-heading compact">
              <div>
                <p>Detalle</p>
                <h2 data-ref="periodWeekdayTitle">Detalle día de la semana</h2>
              </div>
            </div>
            <div data-ref="periodWeekdayHeatmap" class="chart-wrap small" aria-label="Detalle día de la semana"></div>
          </section>
        </div>
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

// Identifica el mount() "vigente": si el usuario navega a otra página
// mientras loadDefault()/loadFromFile() todavía está en vuelo, la promesa
// que resuelve tarde no debe escribir sobre el DOM de un mount() anterior
// que ya fue reemplazado por container.innerHTML en el mount() siguiente.
let activeMountToken = 0;

export function mount(container) {
  const mountToken = ++activeMountToken;
  const isStale = () => mountToken !== activeMountToken;

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
    state.selectedHour = null;
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
    els.fileName.textContent = state.fileName;
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

    container.querySelectorAll("[data-report]").forEach((button) => {
      button.classList.toggle("active", button.dataset.report === state.report);
    });

    const config = reportConfig[state.report];

    els.reportKicker.textContent = config.kicker;
    els.reportTitle.textContent = config.kicker;
    els.reportSubtitle.textContent =
      state.report === "availability"
        ? "Eje X: hora del día. Eje Y: día del período. Cada celda muestra disponibilidad."
        : "Eje X: hora del día. Eje Y: día del período. Cada celda muestra tiempo de respuesta.";

    renderCategoryLegend(els.legend, Object.values(SPECIAL_STATES));

    heatmapMain.render(rows, {
      heatmapEl: els.heatmap,
      tooltipEl,
      state,
      onCellSelected: (dayKey, hora) => {
        state.selectedDayKey = dayKey;
        state.selectedHour = hora;
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

    heatmapWeekHour.render(getFilteredRows(false), {
      weekHourEl: els.weekHourHeatmap,
      weekHourTitleEl: els.weekHourTitle,
      tooltipEl,
      state,
    });

    heatmapPeriodWeekday.render(rows, {
      periodWeekdayEl: els.periodWeekdayHeatmap,
      periodWeekdayTitleEl: els.periodWeekdayTitle,
      tooltipEl,
      state,
    });

    eventsPanel.render(rows, els.eventsList);
  }

  container.querySelectorAll("[data-report]").forEach((button) => {
    button.addEventListener("click", () => {
      state.report = button.dataset.report;
      render();
    });
  });

  els.objectiveSelect.addEventListener("change", () => {
    state.objective = els.objectiveSelect.value;
    state.dateFrom = "";
    state.dateTo = "";
    state.selectedDayKey = "";
    state.selectedHour = null;
    populateFilters();
    render();
  });

  els.dateFromInput.addEventListener("change", () => {
    state.dateFrom = els.dateFromInput.value;
    state.selectedDayKey = "";
    state.selectedHour = null;
    render();
  });

  els.dateToInput.addEventListener("change", () => {
    state.dateTo = els.dateToInput.value;
    state.selectedDayKey = "";
    state.selectedHour = null;
    render();
  });

  // Clickear fuera de la matriz principal (en cualquier otra parte de la
  // página, incluidos los paneles de detalle — solo la matriz es
  // clickeable para seleccionar) limpia la selección. El propio click de
  // selección hace stopPropagation() (ver heatmapMain.js), así que este
  // listener nunca ve ESE click — el closest() de abajo es una segunda
  // capa de seguridad, no la única.
  function handleDocumentClick(event) {
    if (isStale()) {
      document.removeEventListener("click", handleDocumentClick);
      return;
    }
    if (event.target.closest && event.target.closest('[data-ref="heatmap"] .heat-cell')) return;
    if (!state.selectedDayKey && state.selectedHour == null) return;
    state.selectedDayKey = "";
    state.selectedHour = null;
    render();
  }
  document.addEventListener("click", handleDocumentClick);

  els.fileTrigger.addEventListener("click", () => els.fileInput.click());

  els.fileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    els.fileName.textContent = file.name;
    try {
      clearError(els.errorBox);
      const rows = await loadFromFile(file);
      if (isStale()) return;
      state.fileName = file.name;
      setRows(rows);
    } catch (error) {
      if (isStale()) return;
      showError(els.errorBox, error.message);
    }
  });

  // Si ya hay datos cargados (el usuario navegó a otra página y volvió),
  // no hace falta re-pedir el Excel ni resetear objetivo/rango/día
  // seleccionado — solo re-pintar con el estado que ya tenía.
  if (state.rows.length) {
    populateFilters();
    render();
    return;
  }

  loadDefault()
    .then((rows) => {
      if (isStale()) return;
      setRows(rows);
    })
    .catch((error) => {
      if (isStale()) return;
      showError(els.errorBox, error.message);
    });
}
