import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
globalThis.d3 = require("../vendor/d3.min.js");

const {
  specialStateFor,
  average,
  formatValue,
  compactCellLabel,
  cellLabelFor,
  resolveCellColor,
  computeHoverOpacity,
  buildEmpiricalGradient,
  reportConfig,
  FALLBACK_COLOR,
} = await import("../src/colorScales.js");

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

test("cellLabelFor usa el valor compacto en Disponibilidad", () => {
  const row = { estado_bloque: "valor_base", disponibilidad: 98.4 };
  assert.equal(cellLabelFor(row, reportConfig.availability), "98.4");
});

test("resolveCellColor devuelve el color asignado en el Excel para Disponibilidad", () => {
  const row = { estado_bloque: "valor_base", color_disp: "#65B636", color_tiempo: "#2372B6" };
  assert.equal(resolveCellColor(row, reportConfig.availability), "#65B636");
});

test("resolveCellColor devuelve el color asignado en el Excel para Tiempo", () => {
  const row = { estado_bloque: "valor_base", color_disp: "#65B636", color_tiempo: "#2372B6" };
  assert.equal(resolveCellColor(row, reportConfig.response), "#2372B6");
});

test("resolveCellColor NO reemplaza el color de filas con estado especial", () => {
  const row = { estado_bloque: "eventos_cliente", color_disp: "#2D87E4", color_tiempo: "gray" };
  assert.equal(resolveCellColor(row, reportConfig.availability), "#2D87E4");
  assert.equal(resolveCellColor(row, reportConfig.response), "gray");
});

test("resolveCellColor cae al color de respaldo si la celda no trae color", () => {
  const row = { estado_bloque: "valor_base", color_disp: "", color_tiempo: null };
  assert.equal(resolveCellColor(row, reportConfig.availability), FALLBACK_COLOR);
});

test("computeHoverOpacity es 1 en el punto exacto", () => {
  assert.equal(computeHoverOpacity(50, 50, 100), 1);
});

test("computeHoverOpacity baja con la distancia al valor del hover", () => {
  const far = computeHoverOpacity(0, 100, 100);
  assert.ok(far < 1);
});

test("computeHoverOpacity nunca baja del piso configurado", () => {
  assert.equal(computeHoverOpacity(0, 1000, 100, 0.2), 0.2);
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
