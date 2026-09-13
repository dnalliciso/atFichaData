import { ensurePageStyle } from "../../../../core/dom.js";
import { loadDefault } from "./data.js";

ensurePageStyle(new URL("./style.css", import.meta.url).href);

export const meta = {
  kicker: "Estándares",
  title: "Estándares internacionales de tiempo de respuesta",
  subtitle: "AWS Apdex y Google — 4 zonas por fuente",
};

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

  loadDefault().then((sources) => {
    body.innerHTML = `
      <p>
        Estos estándares clasifican el tiempo de respuesta en zonas de
        experiencia de usuario a partir de un umbral (T). Los valores de
        abajo son de referencia por defecto; se reemplazan por los
        confirmados para cada fuente en una ronda de trabajo posterior.
      </p>
      ${sources
        .map(
          (source) => `
            <h3>${source.source} — ${source.thresholdLabel}: ${source.thresholdValue}</h3>
            <table class="data-table">
              <thead>
                <tr><th>Zona</th><th>Rango</th></tr>
              </thead>
              <tbody>
                ${source.zones
                  .map((zone) => `<tr><td>${zone.label}</td><td>${zone.range}</td></tr>`)
                  .join("")}
              </tbody>
            </table>
          `,
        )
        .join("")}
    `;
  });
}
