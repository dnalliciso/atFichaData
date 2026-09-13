// Valores ilustrativos por defecto. AWS Apdex usa la metodología real
// (umbral T configurable, acá 0.5s como ejemplo); los de Google quedan
// pendientes de confirmar la fuente exacta (¿Core Web Vitals?) — ver
// docs/superpowers/specs/2026-09-13-modular-architecture-design.md §2.
const STANDARDS = [
  {
    source: "AWS Apdex",
    thresholdLabel: "Umbral por defecto (T)",
    thresholdValue: "T = 0.5s",
    zones: [
      { label: "Zona satisfecha / bueno", range: "≤ T (≤ 0.5s)" },
      { label: "Zona tolerada / necesita mejora", range: "T – 4T (0.5s – 2s)" },
      { label: "Zona frustrada / pobre", range: "> 4T (> 2s)" },
    ],
  },
  {
    source: "Google",
    thresholdLabel: "Umbral por defecto (T)",
    thresholdValue: "Pendiente de confirmar",
    zones: [
      { label: "Zona satisfecha / bueno", range: "Pendiente" },
      { label: "Zona tolerada / necesita mejora", range: "Pendiente" },
      { label: "Zona frustrada / pobre", range: "Pendiente" },
    ],
  },
];

export async function loadDefault() {
  return STANDARDS;
}
