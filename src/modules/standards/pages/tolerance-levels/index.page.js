import { ensurePageStyle } from "../../../../core/dom.js";
import { loadDefault, LEVEL_COLUMNS } from "./data.js";

ensurePageStyle(new URL("./style.css", import.meta.url).href);

export const meta = {
  kicker: "Disponibilidad de servicios",
  title: "Estándar niveles de tolerancia de disponibilidad",
  subtitle: "Umbrales de disponibilidad según nivel de servicio y periodicidad de medición.",
};

const PERIOD_ICONS = {
  calendar:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
};

// loadDefault() hoy devuelve valores embebidos siempre completos, pero su
// contrato (ver README de esta página) es quedar listo para un fetch a la
// API del cliente más adelante — un campo faltante en esa respuesta futura
// no debería tirar abajo toda la página.
function formatPercent(value) {
  return Number.isFinite(value) ? `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}%` : "-";
}

function renderCell(cell) {
  const bueno = cell?.bueno;
  const aceptableMin = cell?.aceptableMin;

  return `
    <div class="tolerance-cell">
      <p class="tolerance-cell-heading">Bueno: ≥ ${formatPercent(bueno)}</p>
      <div class="tolerance-bar" role="img" aria-label="Deficiente por debajo de ${formatPercent(aceptableMin)}, aceptable hasta ${formatPercent(bueno)}, bueno desde ${formatPercent(bueno)}">
        <span class="tolerance-seg tolerance-seg--critical"></span>
        <span class="tolerance-seg tolerance-seg--warning"></span>
        <span class="tolerance-seg tolerance-seg--good"></span>
      </div>
      <div class="tolerance-cell-labels">
        <div class="tolerance-cell-label tolerance-cell-label--critical">
          <strong>Deficiente</strong>
          <span>&lt; ${formatPercent(aceptableMin)}</span>
        </div>
        <div class="tolerance-cell-label tolerance-cell-label--warning">
          <strong>Aceptable</strong>
          <span>${formatPercent(aceptableMin)} - ${formatPercent(bueno)}</span>
        </div>
        <div class="tolerance-cell-label tolerance-cell-label--good">
          <strong>Bueno</strong>
          <span>≥ ${formatPercent(bueno)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderRow(row) {
  const icon = PERIOD_ICONS[row?.icon] ?? PERIOD_ICONS.calendar;

  return `
    <div class="tolerance-period">
      <span class="tolerance-period-icon">${icon}</span>
      <div>
        <strong>${row?.period ?? "-"}</strong>
        <span>${row?.description ?? ""}</span>
      </div>
    </div>
    ${LEVEL_COLUMNS.map((level) => renderCell(row?.levels?.[level.id])).join("")}
  `;
}

export function mount(container) {
  container.innerHTML = `
    <section class="report-surface tolerance-page">
      <div class="section-heading">
        <div class="tolerance-heading-main">
          <span class="tolerance-heading-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>
          </span>
          <div>
            <p>${meta.kicker}</p>
            <h2>${meta.title}</h2>
            <p class="tolerance-subtitle">${meta.subtitle}</p>
          </div>
        </div>
        <div class="chart-actions">
          <ul class="tolerance-legend">
            <li><span class="tolerance-dot tolerance-dot--good"></span>Bueno</li>
            <li><span class="tolerance-dot tolerance-dot--warning"></span>Aceptable</li>
            <li><span class="tolerance-dot tolerance-dot--critical"></span>Deficiente</li>
          </ul>
        </div>
      </div>
      <div data-ref="body"><div class="empty-state">Cargando...</div></div>
    </section>
  `;

  const body = container.querySelector("[data-ref='body']");

  loadDefault().then((rows) => {
    body.innerHTML = `
      <div class="tolerance-matrix-wrap">
        <div class="tolerance-matrix">
          <div class="tolerance-matrix-spacer" aria-hidden="true"></div>
          <div class="tolerance-criticidad-bar">
            <span>Mayor criticidad</span>
            <span aria-hidden="true">→</span>
          </div>
          <div class="tolerance-corner">Periodicidad<br />de medición</div>
          ${LEVEL_COLUMNS.map(
            (level, index) => `
              <div class="tolerance-level-header tolerance-level-header--${index + 1}">
                <strong>${level.label}</strong>
                <span>${level.sublabel}</span>
              </div>
            `,
          ).join("")}
          ${rows.map((row) => renderRow(row)).join("")}
        </div>
      </div>
      <p class="section-subtitle tolerance-note">
        Nota: los umbrales corresponden al porcentaje de disponibilidad requerido según el nivel de servicio y la periodicidad de medición. Valores ilustrativos por defecto, pendientes de reemplazo por los del cliente.
      </p>
    `;
  });
}
