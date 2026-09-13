import { renderStub } from "../../../../shared/stubPage.js";

export const meta = {
  kicker: "WEB",
  title: "Tiempo de respuesta por objetivo",
  description:
    "Tiempo de respuesta por objetivo, separado por paso (misma aclaración pendiente que en \"Disponibilidad por objetivo\").",
};

export function mount(container) {
  renderStub(container, meta);
}
