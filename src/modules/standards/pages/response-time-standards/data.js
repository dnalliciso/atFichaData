// Valores ilustrativos por defecto. AWS Apdex usa la metodología real
// (umbral T configurable, acá 2s como ejemplo); los de Google reflejan el
// estándar de referencia entregado por el cliente
// (dataExample/ejemplos/estandaresinternacionaes.png), pendientes de
// confirmar contra la fuente oficial — ver docs/superpowers/specs/
// 2026-09-13-modular-architecture-design.md §2.
//
// Cada fuente define solo T (umbral "bueno") y U (techo de "tolerada");
// las 3 zonas (Satisfecha/Tolerada/Frustrada) son el mismo marco Apdex
// para ambas y se derivan en index.page.js a partir de T y U.
const STANDARDS = [
  {
    id: "aws",
    source: "AWS (Apdex)",
    subtitle: "Estándares de tiempo de respuesta",
    badge: "AWS",
    accentColor: "#e8890c",
    threshold: 2,
    upper: 8,
    unit: "s",
  },
  {
    id: "google",
    source: "Google",
    subtitle: "Estándares de tiempo de respuesta",
    badge: "G",
    accentColor: "#4285f4",
    threshold: 2.5,
    upper: 4,
    unit: "s",
  },
];

export const ZONES = [
  {
    id: "good",
    label: "Satisfecha / Bueno",
    description: "Respuesta rápida y satisfactoria",
  },
  {
    id: "warning",
    label: "Tolerada / Necesita mejora",
    description: "Respuesta aceptable, pero puede mejorar",
  },
  {
    id: "critical",
    label: "Frustrada / Pobre",
    description: "Respuesta lenta e insatisfactoria",
  },
];

export async function loadDefault() {
  return STANDARDS;
}
