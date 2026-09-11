// El color de cada celda viene calculado por fila en el propio Excel
// (columnas color_disp / color_tiempo) — no se recalcula acá, se respeta
// tal cual, para ambos reportes.
export const FALLBACK_COLOR = "#e4e6ea";

// El Excel trae color_disp/color_tiempo también para estos estados, pero
// son colores de dato (a veces muy pálidos, ej. #68C0FC) pensados para la
// escala normal — no sirven como marca de estado especial porque se
// pierden contra el fondo. Estos dos estados usan un color propio, fijo,
// independiente del Excel, más el patrón de rayas como refuerzo visual.
export const SPECIAL_STATES = {
  eventos_cliente: { color: "#0b1636", label: "Caída Total" },
  marcado_atentus: { color: "#5b6478", label: "Datos no válidos" },
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
  const special = specialStateFor(row.estado_bloque);
  if (special) return special.color;
  const raw = row[config.colorKey];
  return raw ? raw : FALLBACK_COLOR;
}

// Visibilidad al pasar el mouse por la leyenda: las celdas cuyo valor cae
// dentro de la tolerancia del punto bajo el cursor quedan visibles
// (opacidad 1); el resto desaparece (opacidad 0). No es un desvanecido
// gradual — es mostrar/ocultar según coincidencia con ese valor.
export function computeHoverOpacity(cellValue, hoverValue, domainSpan, tolerance = 0.05) {
  if (
    !Number.isFinite(cellValue) ||
    !Number.isFinite(hoverValue) ||
    !Number.isFinite(domainSpan) ||
    domainSpan <= 0
  ) {
    return 1;
  }
  const distance = Math.abs(cellValue - hoverValue) / domainSpan;
  return distance <= tolerance ? 1 : 0;
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
