import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
globalThis.d3 = require("../vendor/d3.min.js");

const {
  specialStateFor,
  average,
  median,
  downtimeMinutes,
  formatValue,
  compactCellLabel,
  cellLabelFor,
  resolveCellColor,
  computeHoverOpacity,
  buildEmpiricalGradient,
  reportConfig,
  FALLBACK_COLOR,
} = await import("../src/modules/web/pages/heatmap/colorScales.js");

test("specialStateFor resuelve eventos_cliente como Caída Total", () => {
  const special = specialStateFor("eventos_cliente");
  assert.equal(special.label, "Caída Total");
});

test("specialStateFor resuelve marcado_atentus como Datos no válidos", () => {
  const special = specialStateFor("marcado_atentus");
  assert.equal(special.label, "Datos no válidos");
});

test("specialStateFor devuelve null para valor_base", () => {
  assert.equal(specialStateFor("valor_base"), null);
});

test("average ignora valores no finitos", () => {
  assert.equal(average([10, NaN, 20, null]), 15);
});

test("average devuelve null si no hay valores finitos", () => {
  assert.equal(average([NaN, null]), null);
});

test("median ignora valores no finitos y devuelve el valor central", () => {
  assert.equal(median([10, NaN, 20, 30, null]), 20);
});

test("median promedia los dos valores centrales en listas pares", () => {
  assert.equal(median([10, 20, 30, 40]), 25);
});

test("median devuelve null si no hay valores finitos", () => {
  assert.equal(median([NaN, null]), null);
});

test("formatValue formatea con unidad y decimales", () => {
  assert.equal(formatValue(12.345, { unit: "s", decimals: 2 }), "12.35s");
});

test("formatValue devuelve guion para valores no finitos", () => {
  assert.equal(formatValue(NaN, { unit: "%", decimals: 2 }), "-");
});

test("cellLabelFor usa label_tiempo cuando useAnomalyLabel es true", () => {
  const row = { estado_bloque: "valor_base", label_tiempo: "1.59x", tiempo: 30 };
  assert.equal(cellLabelFor(row, reportConfig.response), "1.59x");
});

test("cellLabelFor no muestra etiqueta en celdas de estado especial", () => {
  const row = { estado_bloque: "eventos_cliente", label_tiempo: "1.59x", tiempo: NaN };
  assert.equal(cellLabelFor(row, reportConfig.response), "");
});

test("downtimeMinutes calcula los minutos de caída de una hora (100% = 60 min)", () => {
  assert.equal(downtimeMinutes({ disponibilidad: 40 }), 36);
});

test("downtimeMinutes devuelve null si la disponibilidad no es finita", () => {
  assert.equal(downtimeMinutes({ disponibilidad: NaN }), null);
});

test("cellLabelFor en Disponibilidad muestra el downtime en minutos, no el porcentaje", () => {
  const row = { estado_bloque: "valor_base", disponibilidad: 98.4 };
  assert.equal(cellLabelFor(row, reportConfig.availability), "1.0");
});

test("cellLabelFor no muestra etiqueta cuando la disponibilidad es 100% (downtime 0)", () => {
  const row = { estado_bloque: "valor_base", disponibilidad: 100 };
  assert.equal(cellLabelFor(row, reportConfig.availability), "");
});

test("cellLabelFor no muestra etiqueta cuando el downtime redondea a 0.0", () => {
  const row = { estado_bloque: "valor_base", disponibilidad: 99.96 };
  assert.equal(cellLabelFor(row, reportConfig.availability), "");
});

test("resolveCellColor devuelve el color asignado en el Excel para Disponibilidad", () => {
  const row = { estado_bloque: "valor_base", color_disp: "#65B636", color_tiempo: "#2372B6" };
  assert.equal(resolveCellColor(row, reportConfig.availability), "#65B636");
});

test("resolveCellColor devuelve el color asignado en el Excel para Tiempo", () => {
  const row = { estado_bloque: "valor_base", color_disp: "#65B636", color_tiempo: "#2372B6" };
  assert.equal(resolveCellColor(row, reportConfig.response), "#2372B6");
});

test("resolveCellColor usa el color fijo del estado especial, no el del Excel", () => {
  const row = { estado_bloque: "eventos_cliente", color_disp: "#2D87E4", color_tiempo: "gray" };
  assert.equal(resolveCellColor(row, reportConfig.availability), specialStateFor("eventos_cliente").color);
  assert.equal(resolveCellColor(row, reportConfig.response), specialStateFor("eventos_cliente").color);
});

test("resolveCellColor cae al color de respaldo si la celda no trae color", () => {
  const row = { estado_bloque: "valor_base", color_disp: "", color_tiempo: null };
  assert.equal(resolveCellColor(row, reportConfig.availability), FALLBACK_COLOR);
});

test("computeHoverOpacity es 1 en el punto exacto", () => {
  assert.equal(computeHoverOpacity(50, 50, 100), 1);
});

test("computeHoverOpacity es 1 dentro de la tolerancia", () => {
  assert.equal(computeHoverOpacity(52, 50, 100), 1);
});

test("computeHoverOpacity es 0 (desaparece) fuera de la tolerancia", () => {
  assert.equal(computeHoverOpacity(0, 100, 100), 0);
});

test("computeHoverOpacity respeta una tolerancia custom", () => {
  assert.equal(computeHoverOpacity(60, 50, 100, 0.2), 1);
  assert.equal(computeHoverOpacity(80, 50, 100, 0.2), 0);
});

test("computeHoverOpacity devuelve 1 si algún valor no es finito", () => {
  assert.equal(computeHoverOpacity(NaN, 50, 100), 1);
});

test("buildEmpiricalGradient devuelve null sin filas válidas", () => {
  const rows = [{ estado_bloque: "eventos_cliente", disponibilidad: NaN, color_disp: "" }];
  assert.equal(buildEmpiricalGradient(rows, reportConfig.availability), null);
});

test("buildEmpiricalGradient usa los colores reales como paradas del degradado", () => {
  const rows = [
    { disponibilidad: 0, color_disp: "#C2272D" },
    { disponibilidad: 50, color_disp: "#FFFFFF" },
    { disponibilidad: 100, color_disp: "#65B636" },
  ];
  const gradient = buildEmpiricalGradient(rows, reportConfig.availability, 10);
  assert.deepEqual(gradient.domain, [0, 100]);
  assert.equal(gradient.colorAt(0), "rgb(194, 39, 45)");
  assert.equal(gradient.colorAt(100), "rgb(101, 182, 54)");
});
