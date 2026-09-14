import { test } from "node:test";
import assert from "node:assert/strict";

const { mondayOf, weekDatesOf } = await import("../src/modules/web/pages/heatmap/state.js");

test("mondayOf de un miércoles devuelve el lunes de esa misma semana", () => {
  const wednesday = new Date(2026, 7, 5); // 5 ago 2026 — miércoles (dia_semana_label 'X' en el Excel real)
  const monday = mondayOf(wednesday);
  assert.equal(monday.getFullYear(), 2026);
  assert.equal(monday.getMonth(), 7);
  assert.equal(monday.getDate(), 3);
});

test("mondayOf de un lunes devuelve el mismo día", () => {
  const monday = new Date(2026, 7, 3); // 3 ago 2026 — lunes ('L')
  const result = mondayOf(monday);
  assert.equal(result.getMonth(), 7);
  assert.equal(result.getDate(), 3);
});

test("mondayOf de un domingo devuelve el lunes anterior (semana lunes-domingo)", () => {
  const sunday = new Date(2026, 7, 9); // 9 ago 2026 — domingo ('D')
  const result = mondayOf(sunday);
  assert.equal(result.getMonth(), 7);
  assert.equal(result.getDate(), 3);
});

test("weekDatesOf devuelve las 7 fechas lunes a domingo en orden", () => {
  const wednesday = new Date(2026, 7, 5);
  const week = weekDatesOf(wednesday);
  assert.equal(week.length, 7);
  assert.deepEqual(
    week.map((date) => date.getDate()),
    [3, 4, 5, 6, 7, 8, 9],
  );
});

test("weekDatesOf cruza el límite de mes correctamente", () => {
  // 1 sep 2026 es martes ('M' en el Excel real); su semana es
  // 31 ago (lunes) a 6 sep (domingo).
  const tuesday = new Date(2026, 8, 1);
  const week = weekDatesOf(tuesday);
  assert.deepEqual(
    week.map((date) => `${date.getMonth()}-${date.getDate()}`),
    ["7-31", "8-1", "8-2", "8-3", "8-4", "8-5", "8-6"],
  );
});
