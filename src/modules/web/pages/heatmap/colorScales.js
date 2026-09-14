// Re-exportado tal cual — mismo formatValue que usa shared/legend.js, sin
// duplicar la implementación (ver src/core/format.js).
export { formatValue } from "../../../../core/format.js";

// El color de cada celda viene calculado por fila en el propio Excel
// (columnas color_disp / color_tiempo) — no se recalcula acá, se respeta
// tal cual, para ambos reportes.
export const FALLBACK_COLOR = "#e4e6ea";

// El Excel trae color_disp/color_tiempo también para estos estados, pero
// son colores de dato (a veces muy pálidos, ej. #68C0FC) pensados para la
// escala normal — no sirven como marca de estado especial porque se
// pierden contra el fondo. Estos dos estados usan un color propio, fijo,
// independiente del Excel: negro sólido (con pulso) para Caída Total,
// gris sólido para Datos no válidos.
export const SPECIAL_STATES = {
  eventos_cliente: { color: "#000000", label: "Caída Total", pulse: true },
  marcado_atentus: { color: "#5b6478", label: "Datos no válidos", pulse: false },
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

export function median(values) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? d3.median(clean) : null;
}

export function compactCellLabel(value, config) {
  if (!Number.isFinite(value)) return "";
  if (config.unit === "%") return value.toFixed(value < 99 ? 1 : 0);
  return value.toFixed(0);
}

// Cada celda del heatmap es 1 hora = 60 minutos: usado para expresar el
// downtime de esa hora (100 - disponibilidad) en minutos, tanto en el
// mapa principal (cellLabelFor) como en el tooltip de los 3 gráficos
// (tooltipContent.js).
export const MINUTES_PER_HOUR = 60;

// Tiempo de respuesta "real" de una fila: NaN para estados especiales
// (Caída Total / Datos no válidos) aunque su columna `tiempo` traiga 0 en
// el Excel — ese 0 es un placeholder, no una medición real. Sin esto, la
// línea de tiempo de respuesta de los gráficos de hover se iba en picada
// a 0 en esos bloques en vez de cortarse / puentearse (ver
// heatmapLineBridge.js).
export function responseValueOf(row) {
  if (specialStateFor(row.estado_bloque)) return NaN;
  return row.tiempo;
}

export function downtimeMinutes(row) {
  if (!Number.isFinite(row.disponibilidad)) return null;
  return ((100 - row.disponibilidad) / 100) * MINUTES_PER_HOUR;
}

export function cellLabelFor(row, config) {
  if (specialStateFor(row.estado_bloque)) return "";
  if (config.useAnomalyLabel) return row.label_tiempo || "";
  // En Disponibilidad se muestra el downtime en minutos de esa hora, no
  // el porcentaje — el porcentaje es casi siempre 100 y saturaba el mapa
  // sin aportar nada; el downtime en minutos es lo que realmente importa
  // ver de un vistazo. Se oculta cuando redondea a 0 (sin caída real).
  if (config.valueKey === "disponibilidad") {
    const downtime = downtimeMinutes(row);
    if (downtime == null) return "";
    const label = downtime.toFixed(1);
    return label === "0.0" ? "" : label;
  }
  return compactCellLabel(row[config.valueKey], config);
}

export function resolveCellColor(row, config) {
  const special = specialStateFor(row.estado_bloque);
  if (special) return special.color;
  const raw = row[config.colorKey];
  return raw ? raw : FALLBACK_COLOR;
}

// Visibilidad al arrastrar el handle de la leyenda: las celdas cuyo valor
// cae dentro de la tolerancia del punto donde está el handle quedan
// visibles (opacidad 1); el resto desaparece (opacidad 0). No es un
// desvanecido gradual — es mostrar/ocultar según coincidencia con ese
// valor.
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
