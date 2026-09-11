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
  buildSequentialScale,
  buildDivergingTimeScale,
  computeHoverOpacity,
  resolveCellColor,
  reportConfig,
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

test("buildSequentialScale interpola dentro del rango", () => {
  const scale = buildSequentialScale([0, 50, 100], (t) => `t=${t.toFixed(2)}`);
  assert.equal(scale(0), "t=0.00");
  assert.equal(scale(100), "t=1.00");
});

test("buildDivergingTimeScale: 0 es azul (bueno), max es rojo (malo)", () => {
  const scale = buildDivergingTimeScale(100);
  assert.equal(scale(0), "rgb(5, 48, 97)");
  assert.equal(scale(100), "rgb(103, 0, 31)");
});

test("resolveCellColor prioriza el estado especial sobre la escala", () => {
  const scale = buildDivergingTimeScale(100);
  const row = { estado_bloque: "eventos_cliente", tiempo: 50 };
  assert.equal(
    resolveCellColor(row, reportConfig.response, scale),
    specialStateFor("eventos_cliente").color,
  );
});

test("resolveCellColor usa la escala cuando no hay estado especial", () => {
  const scale = buildDivergingTimeScale(100);
  const row = { estado_bloque: "valor_base", tiempo: 0 };
  assert.equal(resolveCellColor(row, reportConfig.response, scale), scale(0));
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
