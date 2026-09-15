import { test } from "node:test";
import assert from "node:assert/strict";

const { hourlyTooltipHtml, gradientTooltipHtml } = await import("../src/modules/web/pages/heatmap/tooltipContent.js");

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

test("gradientTooltipHtml muestra tiempo, dirección, delta y gradiente en una subida", () => {
  const row = { dia: 1, mes: "ago", hora: 1, estado_bloque: "valor_base", tiempo: 12 };
  const gradient = { gradientPercent: 120, deltaSeconds: 2, direction: "up" };
  const html = gradientTooltipHtml(row, gradient);
  assert.match(html, /Tiempo de respuesta: 12\.00s/);
  assert.match(html, /Subió respecto al anterior \(\+2\.00s\)/);
  assert.match(html, /Gradiente: 120\.0%/);
});

test("gradientTooltipHtml muestra bajada con delta negativo", () => {
  const row = { dia: 1, mes: "ago", hora: 2, estado_bloque: "valor_base", tiempo: 9 };
  const gradient = { gradientPercent: 75, deltaSeconds: -3, direction: "down" };
  const html = gradientTooltipHtml(row, gradient);
  assert.match(html, /Bajó respecto al anterior \(-3\.00s\)/);
  assert.match(html, /Gradiente: 75\.0%/);
});

test("gradientTooltipHtml sin gradiente válido avisa que no hay punto anterior", () => {
  const row = { dia: 1, mes: "ago", hora: 0, estado_bloque: "valor_base", tiempo: 10 };
  const html = gradientTooltipHtml(row, { gradientPercent: null, deltaSeconds: null, direction: null });
  assert.match(html, /Sin punto anterior válido para comparar/);
});

test("gradientTooltipHtml devuelve solo el label de estado especial", () => {
  const row = { dia: 12, mes: "ago", hora: 0, estado_bloque: "eventos_cliente", tiempo: NaN };
  const html = gradientTooltipHtml(row, { gradientPercent: 120, deltaSeconds: 2, direction: "up" });
  assert.match(html, /Caída Total/);
  assert.doesNotMatch(html, /Gradiente/);
});
