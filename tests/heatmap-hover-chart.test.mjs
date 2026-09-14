import { test } from "node:test";
import assert from "node:assert/strict";

const { computeResponseDomain } = await import("../src/modules/web/pages/heatmap/heatmapHoverChart.js");

test("computeResponseDomain calcula el máximo real con 10% de margen", () => {
  const rows = [{ tiempo: 1 }, { tiempo: 5 }, { tiempo: 3 }];
  assert.deepEqual(computeResponseDomain(rows), [0, 5.5]);
});

test("computeResponseDomain ignora valores no finitos", () => {
  const rows = [{ tiempo: NaN }, { tiempo: 2 }, { tiempo: null }, { tiempo: undefined }];
  assert.deepEqual(computeResponseDomain(rows), [0, 2.2]);
});

test("computeResponseDomain devuelve [0, 1] sin filas válidas", () => {
  assert.deepEqual(computeResponseDomain([]), [0, 1]);
  assert.deepEqual(computeResponseDomain([{ tiempo: NaN }]), [0, 1]);
});

test("computeResponseDomain devuelve [0, 1] cuando el máximo es 0", () => {
  assert.deepEqual(computeResponseDomain([{ tiempo: 0 }]), [0, 1]);
});
