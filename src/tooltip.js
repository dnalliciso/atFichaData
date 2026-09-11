import { specialStateFor, formatValue } from "./colorScales.js";

export function showTooltip(tooltipEl, event, html) {
  tooltipEl.hidden = false;
  tooltipEl.innerHTML = html;
  moveTooltip(tooltipEl, event);
}

export function moveTooltip(tooltipEl, event) {
  tooltipEl.style.left = `${Math.min(event.clientX + 14, window.innerWidth - 300)}px`;
  tooltipEl.style.top = `${event.clientY + 14}px`;
}

export function hideTooltip(tooltipEl) {
  tooltipEl.hidden = true;
}

export function hourlyTooltipHtml(row, config) {
  const header = `<strong>${row.dia} ${row.mes}, ${String(row.hora).padStart(2, "0")}:00</strong>`;
  const special = specialStateFor(row.estado_bloque);
  if (special) {
    return `${header}${special.label}`;
  }
  const disponibilidad = Number.isFinite(row.disponibilidad) ? `${row.disponibilidad.toFixed(3)}%` : "-";
  const tiempo = Number.isFinite(row.tiempo) ? `${row.tiempo.toFixed(2)}s` : "-";
  return `
    ${header}
    ${config.kicker}: ${formatValue(row[config.valueKey], config)}<br>
    Disponibilidad: ${disponibilidad}<br>
    Respuesta: ${tiempo}<br>
    Estado: ${row.estado_bloque || "-"}
  `;
}
