import { normalizeText, MONTH_ORDER } from "./state.js";

export function excelDateToDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shortDateLabel(date) {
  return new Intl.DateTimeFormat("es-CL", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function loadWorkbookFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No pude cargar ${url}`);
  const buffer = await response.arrayBuffer();
  return parseWorkbook(buffer);
}

export async function loadWorkbookFromFile(file) {
  const buffer = await file.arrayBuffer();
  return parseWorkbook(buffer);
}

export function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { cellDates: true });
  const sheet = workbook.Sheets.Heatmap || workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });

  return rawRows
    .map((row) => {
      const date = excelDateToDate(row.fecha_obj || row.fecha);
      return {
        objetivo_id: row.objetivo_id,
        objetivo: normalizeText(row.objetivo),
        fecha: date,
        hora: Number(row.hora),
        dia: Number(row.dia || date?.getDate()),
        mes: normalizeText(row.mes || MONTH_ORDER[date?.getMonth()]),
        dia_semana_label: normalizeText(row.dia_semana_label),
        disponibilidad: Number(row.disponibilidad),
        tiempo: Number(row.tiempo),
        mediana_tiempo: Number(row.mediana_tiempo),
        estado_bloque: normalizeText(row.estado_bloque),
        label_tiempo: normalizeText(row.label_tiempo),
        downtime: Number(row.downtime || 0),
        eventos_cliente: Number(row.eventos_cliente || 0),
        marcado_atentus: Number(row.marcado_atentus || 0),
      };
    })
    .filter((row) => row.objetivo && row.fecha && Number.isFinite(row.hora));
}
