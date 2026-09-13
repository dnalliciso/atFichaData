import { renderStub } from "../../../../shared/stubPage.js";

export const meta = {
  kicker: "WEB",
  title: "Comparativo login",
  description:
    "Gráfico de densidad de tiempos de demora a nivel industria vs. la empresa (eje Y: densidad, eje X: tiempo en segundos), con un punto marcando dónde se ubica el cliente en la curva.",
};

export function mount(container) {
  renderStub(container, meta);
}
