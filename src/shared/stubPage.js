export function renderStub(container, { kicker, title, description }) {
  container.innerHTML = `
    <section class="report-surface">
      <div class="section-heading">
        <div>
          <p>${kicker}</p>
          <h2>${title}</h2>
        </div>
      </div>
      <div class="empty-state">
        <div>
          <p>${description}</p>
          <p><em>Próximamente.</em></p>
        </div>
      </div>
    </section>
  `;
}
