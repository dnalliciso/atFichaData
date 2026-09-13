export const navState = { moduleId: null, pageId: null };

let listener = null;

export function onNavigate(callback) {
  listener = callback;
}

export function setActivePage(moduleId, pageId) {
  navState.moduleId = moduleId;
  navState.pageId = pageId;
  listener?.(navState);
}
