// Paletas secuenciales: patrón de
// https://d3-graph-gallery.com/graph/heatmap_style.html ("Ready to go heatmap")
export const palettes = {
  plasma: { label: "Plasma", interpolate: d3.interpolatePlasma },
  viridis: { label: "Viridis", interpolate: d3.interpolateViridis },
  turbo: { label: "Turbo", interpolate: d3.interpolateTurbo },
  magma: { label: "Magma", interpolate: d3.interpolateMagma },
};

// El Excel no distingue negro/gris en color_disp/color_tiempo (ambos
// traen el string "gray" para eventos_cliente y marcado_atentus), así
// que el estado especial se resuelve acá por estado_bloque.
export const SPECIAL_STATES = {
  eventos_cliente: { color: "#15171c", label: "Caída Total" },
  marcado_atentus: { color: "#c9ced6", label: "Datos no válidos" },
};

export function specialStateFor(estadoBloque) {
  return SPECIAL_STATES[estadoBloque] ?? null;
}

export const reportConfig = {
  availability: {
    title: "Heatmap hora / día",
    kicker: "Disponibilidad global",
    valueKey: "disponibilidad",
    unit: "%",
    decimals: 2,
    useAnomalyLabel: false,
  },
  response: {
    title: "Heatmap hora / día",
    kicker: "Tiempo de respuesta",
    valueKey: "tiempo",
    unit: "s",
    decimals: 2,
    useAnomalyLabel: true,
  },
};

export function average(values) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? d3.mean(clean) : null;
}

export function formatValue(value, config) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(config.decimals)}${config.unit}`;
}

export function compactCellLabel(value, config) {
  if (!Number.isFinite(value)) return "";
  if (config.unit === "%") return value.toFixed(value < 99 ? 1 : 0);
  return value.toFixed(0);
}

export function cellLabelFor(row, config) {
  if (specialStateFor(row.estado_bloque)) return "";
  if (config.useAnomalyLabel) return row.label_tiempo || "";
  return compactCellLabel(row[config.valueKey], config);
}

export function buildSequentialScale(values, interpolate) {
  const clean = values.filter(Number.isFinite);
  const [min, max] = d3.extent(clean);
  if (min === undefined) return () => "#f4f1f4";
  if (min === max) return () => interpolate(0.7);
  return d3.scaleSequential([min, max], interpolate);
}

export function buildDivergingTimeScale(maxValue) {
  const safeMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1;
  return d3.scaleDiverging([0, safeMax / 2, safeMax], (t) => d3.interpolateRdBu(1 - t));
}

export function computeHoverOpacity(cellValue, hoverValue, domainSpan, floor = 0.12) {
  if (
    !Number.isFinite(cellValue) ||
    !Number.isFinite(hoverValue) ||
    !Number.isFinite(domainSpan) ||
    domainSpan <= 0
  ) {
    return 1;
  }
  const distance = Math.abs(cellValue - hoverValue) / domainSpan;
  return Math.max(floor, 1 - Math.min(1, distance));
}

export function resolveCellColor(row, config, scale) {
  const special = specialStateFor(row.estado_bloque);
  if (special) return special.color;
  return scale(row[config.valueKey]);
}
