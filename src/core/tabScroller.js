// Convierte una lista de tabs en una fila única desplazable (en vez de
// wrap a varias líneas) con flechas que aparecen solo si hay overflow, y
// navegación por teclado entre tabs (flechas izquierda/derecha, Home/End)
// según el patrón ARIA de tabs (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).
export function setupTabScroller(scrollerEl) {
  const nav = scrollerEl.querySelector('[role="tablist"]');
  const startBtn = scrollerEl.querySelector(".tab-scroll-arrow--start");
  const endBtn = scrollerEl.querySelector(".tab-scroll-arrow--end");

  function refresh() {
    const canScroll = nav.scrollWidth > nav.clientWidth + 1;
    scrollerEl.dataset.overflow = canScroll ? "true" : "false";
    startBtn.hidden = !canScroll || nav.scrollLeft <= 0;
    endBtn.hidden = !canScroll || nav.scrollLeft >= nav.scrollWidth - nav.clientWidth - 1;
  }

  startBtn.addEventListener("click", () => nav.scrollBy({ left: -160, behavior: "smooth" }));
  endBtn.addEventListener("click", () => nav.scrollBy({ left: 160, behavior: "smooth" }));
  nav.addEventListener("scroll", refresh);
  window.addEventListener("resize", refresh);

  nav.addEventListener("keydown", (event) => {
    const tabs = Array.from(nav.querySelectorAll('[role="tab"]'));
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      tabs[nextIndex].focus();
      tabs[nextIndex].scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  });

  refresh();
  return refresh;
}
