import { specialStateFor, downtimeMinutes } from "./colorScales.js";

export function hourlyTooltipHtml(row) {
  const header = `<strong>${row.dia} ${row.mes}, ${String(row.hora).padStart(2, "0")}:00</strong>`;
  const special = specialStateFor(row.estado_bloque);
  if (special) {
    return `${header}${special.label}`;
  }
  const disponibilidad = Number.isFinite(row.disponibilidad) ? `${row.disponibilidad.toFixed(3)}%` : "-";
  const tiempo = Number.isFinite(row.tiempo) ? `${row.tiempo.toFixed(2)}s` : "-";
  const downtimeValue = downtimeMinutes(row);
  const downtime = downtimeValue != null ? `${downtimeValue.toFixed(1)} min` : "-";
  return `
    ${header}
    Disponibilidad: ${disponibilidad}<br>
    Respuesta: ${tiempo}<br>
    Downtime: ${downtime}
  `;
}
