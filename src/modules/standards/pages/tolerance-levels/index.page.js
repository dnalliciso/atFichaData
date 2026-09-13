import { ensurePageStyle } from "../../../../core/dom.js";
import { loadDefault } from "./data.js";

ensurePageStyle(new URL("./style.css", import.meta.url).href);

export const meta = {
  kicker: "Estándares",
  title: "Niveles de tolerancia de disponibilidad",
  subtitle: "Matriz período × nivel, valores por defecto",
};

const LEVEL_LABELS = {
  nivel1: "Nivel 1 — Estándar",
  nivel2: "Nivel 2 — Crítico",
  nivel3: "Nivel 3 — Misión crítica",
};

// loadDefault() hoy devuelve valores embebidos siempre completos, pero su
// contrato (ver README de esta página) es quedar listo para un fetch a la
// API del cliente más adelante — un campo faltante en esa respuesta futura
// no debería tirar abajo toda la página.
function formatPercent(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)}%` : "-";
}

export function mount(container) {
  container.innerHTML = `
    <section class="report-surface">
      <div class="section-heading">
        <div>
          <p>${meta.kicker}</p>
          <h2>${meta.title}</h2>
        </div>
        <div class="chart-actions">
          <p class="section-subtitle">${meta.subtitle}</p>
        </div>
      </div>
      <div data-ref="body"><div class="empty-state">Cargando...</div></div>
    </section>
  `;

  const body = container.querySelector("[data-ref='body']");

  loadDefault().then((rows) => {
    body.innerHTML = `
      <table class="data-table data-table--tolerance-levels">
        <thead>
          <tr>
            <th>Período</th>
            <th>${LEVEL_LABELS.nivel1}</th>
            <th>${LEVEL_LABELS.nivel2}</th>
            <th>${LEVEL_LABELS.nivel3}</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  <td>${row.period ?? "-"}</td>
                  <td>${formatPercent(row.nivel1)}</td>
                  <td>${formatPercent(row.nivel2)}</td>
                  <td>${formatPercent(row.nivel3)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
      <p class="section-subtitle">Valores ilustrativos por defecto, pendientes de reemplazo por los del cliente.</p>
    `;
  });
}
