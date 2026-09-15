import { specialStateFor, downtimeMinutes, responseValueOf } from "./colorScales.js";

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

// Tooltip de un punto del gráfico de "Gradiente de cambio" — `gradient`
// es una entrada de computeGradientSeries (heatmapGradient.js): null o
// con gradientPercent null cuando ese punto no tiene un anterior válido
// para comparar (primer punto de la serie, estado especial, hueco).
export function gradientTooltipHtml(row, gradient) {
  const header = `<strong>${row.dia} ${row.mes}, ${String(row.hora).padStart(2, "0")}:00</strong>`;
  const special = specialStateFor(row.estado_bloque);
  if (special) {
    return `${header}${special.label}`;
  }
  const tiempoValue = responseValueOf(row);
  const tiempo = Number.isFinite(tiempoValue) ? `${tiempoValue.toFixed(2)}s` : "-";
  if (!gradient || !Number.isFinite(gradient.gradientPercent)) {
    return `${header}Tiempo de respuesta: ${tiempo}<br>Sin punto anterior válido para comparar`;
  }
  const { gradientPercent, deltaSeconds, direction } = gradient;
  const directionLabel = direction === "up" ? "Subió" : direction === "down" ? "Bajó" : "Sin cambio";
  const deltaSign = deltaSeconds > 0 ? "+" : "";
  return `
    ${header}
    Tiempo de respuesta: ${tiempo}<br>
    ${directionLabel} respecto al anterior (${deltaSign}${deltaSeconds.toFixed(2)}s)<br>
    Gradiente: ${gradientPercent.toFixed(1)}%
  `;
}
