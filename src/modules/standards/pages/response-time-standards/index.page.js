import { ensurePageStyle } from "../../../../core/dom.js";
import { loadDefault, ZONES } from "./data.js";

ensurePageStyle(new URL("./style.css", import.meta.url).href);

export const meta = {
  kicker: "Estándares",
  title: "Estándares internacionales tiempos de respuesta",
  subtitle:
    "La puntuación del Apdex es una métrica de estándar abierto que mide el grado de satisfacción de un usuario con el tiempo de respuesta de las aplicaciones y servicios web de una organización.",
};

const ZONE_ICONS = {
  good: '<circle cx="18" cy="18" r="18" fill="var(--rt-good)"/><circle cx="13" cy="15" r="2" fill="#fff"/><circle cx="23" cy="15" r="2" fill="#fff"/><path d="M11 22c2 3 5 4.5 7 4.5s5-1.5 7-4.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  warning: '<circle cx="18" cy="18" r="18" fill="var(--rt-warning)"/><circle cx="13" cy="15" r="2" fill="#fff"/><circle cx="23" cy="15" r="2" fill="#fff"/><path d="M12 23h12" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  critical: '<circle cx="18" cy="18" r="18" fill="var(--rt-critical)"/><circle cx="13" cy="15" r="2" fill="#fff"/><circle cx="23" cy="15" r="2" fill="#fff"/><path d="M11 25.5c2-3 5-4.5 7-4.5s5 1.5 7 4.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
};

// loadDefault() hoy devuelve valores embebidos siempre completos, pero su
// contrato es quedar listo para un fetch a la API del cliente más
// adelante — un campo faltante en esa respuesta futura no debería tirar
// abajo toda la página.
function formatNumber(value) {
  if (!Number.isFinite(value)) return "-";
  return Number.isInteger(value) ? `${value}` : `${value}`.replace(".", ",");
}

function rangeLabel(zoneId, standard) {
  const { threshold, upper, unit } = standard;
  if (zoneId === "good") return `0 a ${formatNumber(threshold)} ${unit}`;
  if (zoneId === "warning") return `> ${formatNumber(threshold)} a ${formatNumber(upper)} ${unit}`;
  return `> ${formatNumber(upper)} ${unit}`;
}

// Dominio del track: upper × 1.3 deja aire para mostrar el tick "U+" sin
// pegarlo al borde derecho, y garantiza tPos < uPos < 100% para cualquier
// par threshold/upper válido (threshold < upper).
function renderZoneRow(zone, standard) {
  const threshold = Number(standard?.threshold);
  const upper = Number(standard?.upper);
  const hasDomain = Number.isFinite(threshold) && Number.isFinite(upper) && upper > threshold;
  const domainMax = hasDomain ? upper * 1.3 : null;
  const tPos = hasDomain ? (threshold / domainMax) * 100 : 0;
  const uPos = hasDomain ? (upper / domainMax) * 100 : 100;

  const segments = {
    good: { left: 0, width: tPos },
    warning: { left: tPos, width: uPos - tPos },
    critical: { left: uPos, width: 100 - uPos },
  };
  const segment = segments[zone.id];

  return `
    <div class="rt-zone-row rt-zone-row--${zone.id}">
      <span class="rt-zone-icon" aria-hidden="true">
        <svg viewBox="0 0 36 36" width="36" height="36">${ZONE_ICONS[zone.id] ?? ""}</svg>
      </span>
      <div class="rt-zone-text">
        <strong>${zone.label}</strong>
        <span>${zone.description}</span>
      </div>
      <div class="rt-zone-range">${hasDomain ? rangeLabel(zone.id, standard) : "-"}</div>
      <div class="rt-zone-viz">
        <div class="rt-track">
          <span class="rt-fill rt-fill--${zone.id}" style="left:${segment.left}%;width:${segment.width}%"></span>
          <span class="rt-tick" style="left:${tPos}%"></span>
          <span class="rt-tick" style="left:${uPos}%"></span>
        </div>
        <div class="rt-tick-labels">
          <span style="left:0%">0</span>
          <span style="left:${tPos}%">${formatNumber(threshold)}</span>
          <span style="left:${uPos}%">${formatNumber(upper)}+</span>
        </div>
      </div>
    </div>
  `;
}

function renderCard(standard) {
  const accent = standard?.accentColor ?? "var(--accent)";

  return `
    <div class="rt-card">
      <div class="rt-card-header">
        <div class="rt-card-brand">
          <span class="rt-card-badge" style="background:${accent}">${standard?.badge ?? "-"}</span>
          <div>
            <h3>${standard?.source ?? "-"}</h3>
            <span>${standard?.subtitle ?? ""}</span>
          </div>
        </div>
        <div class="rt-threshold" style="background:color-mix(in srgb, ${accent} 16%, var(--panel-alt));border-color:color-mix(in srgb, ${accent} 35%, var(--line));">
          <span class="rt-threshold-label">Umbral por defecto (T)</span>
          <span class="rt-threshold-value" style="color:${accent}">${formatNumber(standard?.threshold)} ${standard?.unit ?? ""}</span>
        </div>
      </div>
      <div class="rt-zone-head">
        <span>Zona</span>
        <span>Rango de tiempo</span>
        <span>Visualización</span>
      </div>
      ${ZONES.map((zone) => renderZoneRow(zone, standard)).join("")}
    </div>
  `;
}

export function mount(container) {
  container.innerHTML = `
    <section class="report-surface rt-page">
      <div class="section-heading">
        <div class="rt-heading-main">
          <span class="rt-heading-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>
          </span>
          <div>
            <p>${meta.kicker}</p>
            <h2>${meta.title}</h2>
            <p class="rt-subtitle">${meta.subtitle}</p>
          </div>
        </div>
      </div>
      <div data-ref="body"><div class="empty-state">Cargando...</div></div>
    </section>
  `;

  const body = container.querySelector("[data-ref='body']");

  loadDefault().then((standards) => {
    body.innerHTML = `
      <div class="rt-cards">
        ${standards.map((standard) => renderCard(standard)).join("")}
      </div>
    `;
  });
}
