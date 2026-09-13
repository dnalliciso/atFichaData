import { modules } from "./modules/registry.js";
import { navState, onNavigate, setActivePage } from "./core/router.js";
import { setupTabScroller } from "./core/tabScroller.js";

const els = {
  themeToggle: document.querySelector("#themeToggle"),
  moduleTabs: document.querySelector("#moduleTabs"),
  pageTabs: document.querySelector("#pageTabs"),
  pageContainer: document.querySelector("#pageContainer"),
};

const refreshModuleTabScroller = setupTabScroller(document.querySelector("#moduleTabsScroller"));
const refreshPageTabScroller = setupTabScroller(document.querySelector("#pageTabsScroller"));

const THEME_STORAGE_KEY = "atficha-theme";

function applyThemeIcon(theme) {
  els.themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  els.themeToggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro",
  );
}

function effectiveTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function initTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    document.documentElement.setAttribute("data-theme", stored);
  }
  applyThemeIcon(effectiveTheme());
}

els.themeToggle.addEventListener("click", () => {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_STORAGE_KEY, next);
  document.documentElement.setAttribute("data-theme", next);
  applyThemeIcon(next);
});

initTheme();

let currentUnmount = null;

function findModule(moduleId) {
  return modules.find((module) => module.id === moduleId);
}

function findPage(module, pageId) {
  return module.pages.find((page) => page.id === pageId);
}

function renderModuleTabs() {
  els.moduleTabs.innerHTML = modules
    .map((module) => {
      const active = module.id === navState.moduleId;
      return `
        <button type="button" role="tab" aria-selected="${active}" class="tab-button${active ? " active" : ""}" data-module="${module.id}">
          ${module.label}
        </button>
      `;
    })
    .join("");

  els.moduleTabs.querySelectorAll("[data-module]").forEach((button) => {
    button.addEventListener("click", () => {
      const module = findModule(button.dataset.module);
      setActivePage(module.id, module.pages[0].id);
    });
  });
}

function renderPageTabs(module) {
  els.pageTabs.innerHTML = module.pages
    .map((page) => {
      const active = page.id === navState.pageId;
      return `
        <button type="button" role="tab" aria-selected="${active}" class="tab-button${active ? " active" : ""}" data-page="${page.id}">
          ${page.label}
        </button>
      `;
    })
    .join("");

  els.pageTabs.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      setActivePage(module.id, button.dataset.page);
    });
  });
}

function renderActivePage() {
  const module = findModule(navState.moduleId);
  const pageEntry = findPage(module, navState.pageId);

  renderModuleTabs();
  renderPageTabs(module);
  refreshModuleTabScroller();
  refreshPageTabScroller();

  currentUnmount?.();
  const result = pageEntry.page.mount(els.pageContainer);
  currentUnmount = result?.unmount ?? null;
}

onNavigate(renderActivePage);

const firstModule = modules[0];
setActivePage(firstModule.id, firstModule.pages[0].id);
