import { renderStub } from "../../../../shared/stubPage.js";

export const meta = {
  kicker: "WEB",
  title: "Disponibilidad por mes",
  description:
    "Disponibilidad promedio del mes para cada objetivo contratado. Hoy existe como gráfico de barras simple; se van a evaluar alternativas de visualización cuando se especifique esta página en detalle.",
};

export function mount(container) {
  renderStub(container, meta);
}
