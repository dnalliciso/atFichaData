import { test } from "node:test";
import assert from "node:assert/strict";

const { hourlyTooltipHtml } = await import("../src/modules/web/pages/heatmap/tooltipContent.js");

test("hourlyTooltipHtml muestra disponibilidad, respuesta y downtime", () => {
  const row = { dia: 16, mes: "ago", hora: 9, estado_bloque: "valor_base", disponibilidad: 90, tiempo: 1.2 };
  const html = hourlyTooltipHtml(row);
  assert.match(html, /Disponibilidad: 90\.000%/);
  assert.match(html, /Respuesta: 1\.20s/);
  assert.match(html, /Downtime: 6\.0 min/);
  assert.doesNotMatch(html, /Estado:/);
});

test("hourlyTooltipHtml devuelve solo el label de estado especial", () => {
  const row = { dia: 12, mes: "ago", hora: 0, estado_bloque: "eventos_cliente", disponibilidad: NaN, tiempo: NaN };
  const html = hourlyTooltipHtml(row);
  assert.match(html, /Caída Total/);
  assert.doesNotMatch(html, /Downtime/);
});

test("hourlyTooltipHtml muestra guion cuando la disponibilidad no es finita", () => {
  const row = { dia: 1, mes: "ago", hora: 3, estado_bloque: "valor_base", disponibilidad: NaN, tiempo: 2 };
  const html = hourlyTooltipHtml(row);
  assert.match(html, /Disponibilidad: -/);
  assert.match(html, /Downtime: -/);
});
