import { specialStateFor } from "./colorScales.js";

const MINUTES_PER_HOUR = 60;

export function hourlyTooltipHtml(row) {
  const header = `<strong>${row.dia} ${row.mes}, ${String(row.hora).padStart(2, "0")}:00</strong>`;
  const special = specialStateFor(row.estado_bloque);
  if (special) {
    return `${header}${special.label}`;
  }
  const disponibilidad = Number.isFinite(row.disponibilidad) ? `${row.disponibilidad.toFixed(3)}%` : "-";
  const tiempo = Number.isFinite(row.tiempo) ? `${row.tiempo.toFixed(2)}s` : "-";
  // Downtime en minutos dentro de la hora del bloque (cada celda es 1
  // hora = 60 minutos), a partir de la disponibilidad de esa hora.
  const downtime = Number.isFinite(row.disponibilidad)
    ? `${(((100 - row.disponibilidad) / 100) * MINUTES_PER_HOUR).toFixed(1)} min`
    : "-";
  return `
    ${header}
    Disponibilidad: ${disponibilidad}<br>
    Respuesta: ${tiempo}<br>
    Downtime: ${downtime}
  `;
}
