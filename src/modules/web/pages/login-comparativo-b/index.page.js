import { renderStub } from "../../../../shared/stubPage.js";

export const meta = {
  kicker: "WEB",
  title: "Comparativo login (variante)",
  description:
    "Mismo tipo de gráfico de densidad que \"Comparativo login\", con otro recorte de datos — nombre y alcance exactos pendientes de aclarar en la ronda de especificación de esta página (ver spec §2, fuera de alcance).",
};

export function mount(container) {
  renderStub(container, meta);
}
