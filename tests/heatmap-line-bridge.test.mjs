import { test } from "node:test";
import assert from "node:assert/strict";

const { computeBridgeSegments } = await import("../src/modules/web/pages/heatmap/heatmapLineBridge.js");

const getValue = (item) => item.value;

test("computeBridgeSegments no genera segmentos si no hay huecos", () => {
  const items = [{ value: 1 }, { value: 2 }, { value: 3 }];
  assert.deepEqual(computeBridgeSegments(items, getValue), []);
});

test("computeBridgeSegments une el punto antes y después de un hueco de 1", () => {
  const a = { value: 1 };
  const gap = { value: NaN };
  const b = { value: 3 };
  assert.deepEqual(computeBridgeSegments([a, gap, b], getValue), [[a, b]]);
});

test("computeBridgeSegments une sobre un hueco de varios bloques seguidos", () => {
  const a = { value: 1 };
  const b = { value: 5 };
  const items = [a, { value: NaN }, { value: NaN }, { value: NaN }, b];
  assert.deepEqual(computeBridgeSegments(items, getValue), [[a, b]]);
});

test("computeBridgeSegments ignora un hueco al principio (sin punto previo)", () => {
  const b = { value: 2 };
  const items = [{ value: NaN }, b];
  assert.deepEqual(computeBridgeSegments(items, getValue), []);
});

test("computeBridgeSegments ignora un hueco al final (sin punto siguiente)", () => {
  const a = { value: 1 };
  const items = [a, { value: NaN }];
  assert.deepEqual(computeBridgeSegments(items, getValue), []);
});

test("computeBridgeSegments devuelve un segmento por cada hueco independiente", () => {
  const a = { value: 1 };
  const b = { value: 2 };
  const c = { value: 3 };
  const items = [a, { value: NaN }, b, { value: NaN }, c];
  assert.deepEqual(computeBridgeSegments(items, getValue), [
    [a, b],
    [b, c],
  ]);
});
