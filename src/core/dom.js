const injectedStyles = new Set();

export function ensurePageStyle(url) {
  if (injectedStyles.has(url)) return;
  injectedStyles.add(url);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}

export function showError(errorBoxEl, message) {
  errorBoxEl.hidden = false;
  errorBoxEl.textContent = message;
}

export function clearError(errorBoxEl) {
  errorBoxEl.hidden = true;
  errorBoxEl.textContent = "";
}
