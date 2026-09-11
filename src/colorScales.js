// El color de cada celda viene calculado por fila en el propio Excel
// (columnas color_disp / color_tiempo) — no se recalcula acá, se respeta
// tal cual, para ambos reportes.
export const FALLBACK_COLOR = "#e4e6ea";

// El Excel no distingue negro/gris "limpio" para estos estados (ambos
// traen su propio color_disp/color_tiempo, igual que una fila normal),
// así que la señal de "esto no es un dato real" se agrega como patrón
// (rayas diagonales + borde punteado) por encima del color asignado,
// nunca reemplazando el color — ver heatmapMain.js / heatmapHourly.js.
export const SPECIAL_STATES = {
  eventos_cliente: { label: "Caída Total" },
  marcado_atentus: { label: "Datos no válidos" },
};

export function specialStateFor(estadoBloque) {
  return SPECIAL_STATES[estadoBloque] ?? null;
}

export const reportConfig = {
  availability: {
    title: "Heatmap hora / día",
    kicker: "Disponibilidad global",
    valueKey: "disponibilidad",
    colorKey: "color_disp",
    unit: "%",
    decimals: 2,
    useAnomalyLabel: false,
  },
  response: {
    title: "Heatmap hora / día",
    kicker: "Tiempo de respuesta",
    valueKey: "tiempo",
    colorKey: "color_tiempo",
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

export function resolveCellColor(row, config) {
  const raw = row[config.colorKey];
  return raw ? raw : FALLBACK_COLOR;
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

// Construye un degradado de leyenda a partir de los colores ya asignados
// en la data (no de una fórmula propia): ordena las filas por valor,
// muestrea hasta maxStops pares (valor, color) reales y arma una escala
// lineal por tramos entre esos colores. Devuelve null si no hay filas
// numéricas válidas.
export function buildEmpiricalGradient(rows, config, maxStops = 14) {
  const pairs = rows
    .filter((row) => Number.isFinite(row[config.valueKey]) && row[config.colorKey])
    .map((row) => [row[config.valueKey], row[config.colorKey]])
    .sort((a, b) => a[0] - b[0]);

  if (!pairs.length) return null;

  const step = Math.max(1, Math.floor(pairs.length / maxStops));
  const sampled = [];
  for (let i = 0; i < pairs.length; i += step) sampled.push(pairs[i]);
  const last = pairs[pairs.length - 1];
  if (sampled[sampled.length - 1][0] !== last[0]) sampled.push(last);

  const domain = sampled.map((pair) => pair[0]);
  const range = sampled.map((pair) => pair[1]);
  const scale = d3.scaleLinear().domain(domain).range(range).clamp(true);

  return { domain: [domain[0], domain[domain.length - 1]], colorAt: scale };
}
