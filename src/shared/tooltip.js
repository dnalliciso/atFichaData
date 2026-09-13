export function showTooltip(tooltipEl, event, html) {
  tooltipEl.hidden = false;
  tooltipEl.innerHTML = html;
  moveTooltip(tooltipEl, event);
}

export function moveTooltip(tooltipEl, event) {
  tooltipEl.style.left = `${Math.min(event.clientX + 14, window.innerWidth - 300)}px`;
  tooltipEl.style.top = `${event.clientY + 14}px`;
}

export function hideTooltip(tooltipEl) {
  tooltipEl.hidden = true;
}
