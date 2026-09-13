import * as heatmap from "./pages/heatmap/index.page.js";
import * as loginComparativo from "./pages/login-comparativo/index.page.js";
import * as loginComparativoB from "./pages/login-comparativo-b/index.page.js";
import * as disponibilidadPorMes from "./pages/disponibilidad-por-mes/index.page.js";
import * as disponibilidadPorObjetivo from "./pages/disponibilidad-por-objetivo/index.page.js";
import * as tiempoRespuestaPorObjetivo from "./pages/tiempo-respuesta-por-objetivo/index.page.js";
import * as rendimientoPorFlujo from "./pages/rendimiento-por-flujo/index.page.js";

export const module = {
  id: "web",
  label: "WEB",
  pages: [
    { id: "heatmap", label: "Disponibilidad y tiempo de respuesta", page: heatmap },
    { id: "login-comparativo", label: "Comparativo login", page: loginComparativo },
    { id: "login-comparativo-b", label: "Comparativo login (variante)", page: loginComparativoB },
    { id: "disponibilidad-por-mes", label: "Disponibilidad por mes", page: disponibilidadPorMes },
    { id: "disponibilidad-por-objetivo", label: "Disponibilidad por objetivo", page: disponibilidadPorObjetivo },
    { id: "tiempo-respuesta-por-objetivo", label: "Tiempo de respuesta por objetivo", page: tiempoRespuestaPorObjetivo },
    { id: "rendimiento-por-flujo", label: "Rendimiento por flujo", page: rendimientoPorFlujo },
  ],
};
