import { renderStub } from "../../../../shared/stubPage.js";

export const meta = {
  kicker: "WEB",
  title: "Disponibilidad por objetivo",
  description:
    "Igual que \"Disponibilidad por mes\", pero separada por paso — qué significa exactamente \"paso\" queda por confirmar en la ronda de especificación de esta página.",
};

export function mount(container) {
  renderStub(container, meta);
}
