import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
globalThis.XLSX = require("../vendor/xlsx.full.min.js");

const { excelDateToDate, dateKey, formatDate, shortDateLabel, readSheetRows } = await import(
  "../src/core/excel.js"
);

test("excelDateToDate devuelve el mismo objeto si ya es Date", () => {
  const date = new Date(2026, 7, 14);
  assert.equal(excelDateToDate(date), date);
});

test("excelDateToDate convierte un serial numérico de Excel", () => {
  const result = excelDateToDate(46248);
  assert.equal(result.getFullYear(), 2026);
  assert.equal(result.getMonth(), 7);
  assert.equal(result.getDate(), 14);
});

test("excelDateToDate devuelve null para un valor no parseable", () => {
  assert.equal(excelDateToDate("no-es-fecha"), null);
});

test("dateKey formatea como YYYY-MM-DD", () => {
  assert.equal(dateKey(new Date(2026, 0, 5)), "2026-01-05");
});

test("formatDate usa el formato largo es-CL", () => {
  assert.equal(formatDate(new Date(2026, 7, 14)), "14-08-2026");
});

test("shortDateLabel usa el formato corto es-CL (sin cero a la izquierda en el mes)", () => {
  assert.equal(shortDateLabel(new Date(2026, 7, 14)), "14/8");
});

test("readSheetRows lee la hoja pedida por nombre", () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([{ a: 1, b: 2 }]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Datos");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  assert.deepEqual(readSheetRows(buffer, "Datos"), [{ a: 1, b: 2 }]);
});

test("readSheetRows cae a la primera hoja si el nombre pedido no existe", () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([{ a: 9 }]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Hoja1");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  assert.deepEqual(readSheetRows(buffer, "NoExiste"), [{ a: 9 }]);
});
