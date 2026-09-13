import * as toleranceLevels from "./pages/tolerance-levels/index.page.js";
import * as responseTimeStandards from "./pages/response-time-standards/index.page.js";

export const module = {
  id: "standards",
  label: "Estándares",
  pages: [
    { id: "tolerance-levels", label: "Niveles de tolerancia de disponibilidad", page: toleranceLevels },
    { id: "response-time-standards", label: "Estándares de tiempo de respuesta", page: responseTimeStandards },
  ],
};
