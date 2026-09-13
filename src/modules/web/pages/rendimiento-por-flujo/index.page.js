import { renderStub } from "../../../../shared/stubPage.js";

export const meta = {
  kicker: "WEB",
  title: "Rendimiento por flujo",
  description:
    "Gráfico dividido de disponibilidad y tiempo de respuesta: una barra de 0 a 100 por objetivo mostrando lo alcanzado (verde) y lo que falta para 100 según cada nivel de tolerancia de Estándares, con un switch para cambiar de nivel.",
};

export function mount(container) {
  renderStub(container, meta);
}
