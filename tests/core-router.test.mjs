import { test } from "node:test";
import assert from "node:assert/strict";
import { navState, onNavigate, setActivePage } from "../src/core/router.js";

test("setActivePage actualiza navState", () => {
  setActivePage("web", "heatmap");
  assert.deepEqual(navState, { moduleId: "web", pageId: "heatmap" });
});

test("setActivePage notifica al listener registrado con onNavigate", () => {
  let received = null;
  onNavigate((state) => {
    received = { ...state };
  });
  setActivePage("standards", "tolerance-levels");
  assert.deepEqual(received, { moduleId: "standards", pageId: "tolerance-levels" });
});

test("registrar un nuevo listener con onNavigate reemplaza al anterior", () => {
  let calls = 0;
  onNavigate(() => {
    calls += 1;
  });
  onNavigate(() => {
    calls += 100;
  });
  setActivePage("web", "heatmap");
  assert.equal(calls, 100);
});
