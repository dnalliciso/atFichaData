import { readSheetRows, excelDateToDate } from "../../../../core/excel.js";
import { normalizeText, MONTH_ORDER } from "./state.js";

const DEFAULT_WORKBOOK = "./dataExample/Heatmap_objetivo.xlsx";

export async function loadDefault() {
  const response = await fetch(DEFAULT_WORKBOOK);
  if (!response.ok) throw new Error(`No pude cargar ${DEFAULT_WORKBOOK}`);
  const buffer = await response.arrayBuffer();
  return parseWorkbook(buffer);
}

export async function loadFromFile(file) {
  const buffer = await file.arrayBuffer();
  return parseWorkbook(buffer);
}

export function parseWorkbook(buffer) {
  const rawRows = readSheetRows(buffer, "Heatmap");

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
        disponibilidad: Number(row.disponibilidad),
        tiempo: Number(row.tiempo),
        mediana_tiempo: Number(row.mediana_tiempo),
        estado_bloque: normalizeText(row.estado_bloque),
        label_tiempo: normalizeText(row.label_tiempo),
        color_disp: normalizeText(row.color_disp),
        color_tiempo: normalizeText(row.color_tiempo),
        downtime: Number(row.downtime || 0),
        eventos_cliente: Number(row.eventos_cliente || 0),
        marcado_atentus: Number(row.marcado_atentus || 0),
      };
    })
    .filter((row) => row.objetivo && row.fecha && Number.isFinite(row.hora));
}
