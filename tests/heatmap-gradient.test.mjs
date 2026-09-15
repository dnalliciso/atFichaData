import { test } from "node:test";
import assert from "node:assert/strict";

const { computeGradientSeries, computeDeltaDomain } = await import(
  "../src/modules/web/pages/heatmap/heatmapGradient.js"
);

const getValue = (item) => item.value;

test("computeGradientSeries calcula el gradiente como (actual/anterior)*100 en una subida", () => {
  const items = [{ value: 10 }, { value: 12 }];
  const result = computeGradientSeries(items, getValue);
  assert.equal(result[1].gradientPercent, 120);
  assert.equal(result[1].deltaSeconds, 2);
  assert.equal(result[1].direction, "up");
});

test("computeGradientSeries calcula el gradiente en una bajada", () => {
  const items = [{ value: 12 }, { value: 9 }];
  const result = computeGradientSeries(items, getValue);
  assert.equal(result[1].gradientPercent, 75);
  assert.equal(result[1].deltaSeconds, -3);
  assert.equal(result[1].direction, "down");
});

test("computeGradientSeries el primer punto no tiene gradiente", () => {
  const items = [{ value: 10 }, { value: 12 }];
  const result = computeGradientSeries(items, getValue);
  assert.equal(result[0].gradientPercent, null);
  assert.equal(result[0].deltaSeconds, null);
  assert.equal(result[0].direction, null);
});

test("computeGradientSeries valores iguales da direction 'same' y 100%", () => {
  const items = [{ value: 10 }, { value: 10 }];
  const result = computeGradientSeries(items, getValue);
  assert.equal(result[1].gradientPercent, 100);
  assert.equal(result[1].deltaSeconds, 0);
  assert.equal(result[1].direction, "same");
});

test("computeGradientSeries sin gradiente si el anterior no es finito (estado especial/hueco)", () => {
  const items = [{ value: NaN }, { value: 12 }];
  const result = computeGradientSeries(items, getValue);
  assert.equal(result[1].gradientPercent, null);
});

test("computeGradientSeries sin gradiente si el actual no es finito", () => {
  const items = [{ value: 10 }, { value: NaN }];
  const result = computeGradientSeries(items, getValue);
  assert.equal(result[1].gradientPercent, null);
});

test("computeGradientSeries sin gradiente si el anterior es 0 (ratio indefinido)", () => {
  const items = [{ value: 0 }, { value: 12 }];
  const result = computeGradientSeries(items, getValue);
  assert.equal(result[1].gradientPercent, null);
});

test("computeDeltaDomain incluye siempre el 0 con margen", () => {
  const series = [
    { deltaSeconds: null },
    { deltaSeconds: 5 },
    { deltaSeconds: -3 },
  ];
  const [min, max] = computeDeltaDomain(series);
  assert.ok(min < -3);
  assert.ok(max > 5);
});

test("computeDeltaDomain sin puntos válidos cae a [-1, 1]", () => {
  const series = [{ deltaSeconds: null }];
  assert.deepEqual(computeDeltaDomain(series), [-1, 1]);
});
