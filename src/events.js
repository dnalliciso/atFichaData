import { specialStateFor } from "./colorScales.js";

export function render(rows, eventsListEl) {
  const events = rows
    .filter((row) => row.estado_bloque && row.estado_bloque !== "valor_base")
    .sort((a, b) => a.fecha - b.fecha || a.hora - b.hora);

  if (!events.length) {
    eventsListEl.innerHTML = `<div class="empty-state">Sin bloques marcados para el filtro actual.</div>`;
    return;
  }

  eventsListEl.innerHTML = events
    .map((row) => {
      const special = specialStateFor(row.estado_bloque);
      const detail = special
        ? special.label
        : `disp. ${row.disponibilidad.toFixed(2)}% · resp. ${row.tiempo.toFixed(2)}s`;
      return `
        <article class="event-item">
          <strong>${row.dia} ${row.mes}, ${String(row.hora).padStart(2, "0")}:00</strong>
          ${row.estado_bloque} · ${detail}
        </article>
      `;
    })
    .join("");
}
