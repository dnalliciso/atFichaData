import { specialStateFor, formatValue } from "./colorScales.js";

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
