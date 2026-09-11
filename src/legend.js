import { formatValue, SPECIAL_STATES } from "./colorScales.js";

export function renderCategoryLegend(container) {
  container.innerHTML = Object.values(SPECIAL_STATES)
    .map(
      (state) => `
        <div class="legend-row">
          <span class="swatch swatch--pattern"></span>
          <span>${state.label}</span>
        </div>
      `,
    )
    .join("");
}

// Leyenda de degradado vertical (a la derecha del heatmap, como la
// referencia): la escala/dominio ya vienen resueltos por quien llama
// (colorScales.buildEmpiricalGradient) — acá solo se dibuja y se
// engancha el hover-scrub sobre el eje Y de la barra.
export function renderGradientLegend(svg, options) {
  const { colorScale, domain, config, margin, width, chartHeight, gradientId, onHover, onHoverEnd } = options;
  const [min, max] = domain;
  const barWidth = 16;
  const barHeight = Math.max(120, chartHeight - margin.top - 30);
  const x = width - margin.right + 40;
  const y = margin.top;

  const defs = svg.append("defs");
  const gradient = defs
    .append("linearGradient")
    .attr("id", gradientId)
    .attr("x1", "0%")
    .attr("x2", "0%")
    .attr("y1", "100%")
    .attr("y2", "0%");

  d3.range(0, 1.01, 0.1).forEach((stop) => {
    gradient
      .append("stop")
      .attr("offset", `${stop * 100}%`)
      .attr("stop-color", colorScale(min + stop * (max - min)));
  });

  const bar = svg
    .append("rect")
    .attr("x", x)
    .attr("y", y)
    .attr("width", barWidth)
    .attr("height", barHeight)
    .attr("rx", 3)
    .attr("fill", `url(#${gradientId})`);

  if (onHover && onHoverEnd) {
    bar.style("cursor", "crosshair");
  }

  svg
    .append("text")
    .attr("class", "range-label")
    .attr("x", x + barWidth / 2)
    .attr("y", y - 10)
    .attr("text-anchor", "middle")
    .text(formatValue(max, config));

  svg
    .append("text")
    .attr("class", "range-label")
    .attr("x", x + barWidth / 2)
    .attr("y", y + barHeight + 18)
    .attr("text-anchor", "middle")
    .text(formatValue(min, config));

  const axisScale = d3.scaleLinear().domain([min, max]).range([y + barHeight, y]);
  const ticks = axisScale.ticks(5);
  svg
    .append("g")
    .selectAll("text")
    .data(ticks)
    .join("text")
    .attr("class", "legend-axis")
    .attr("x", x + barWidth + 8)
    .attr("y", (d) => axisScale(d) + 3)
    .attr("text-anchor", "start")
    .text((d) => `${d.toFixed(config.unit === "%" ? 1 : 0)}${config.unit}`);

  if (onHover && onHoverEnd) {
    bar
      .on("mousemove", (event) => {
        const [, my] = d3.pointer(event, svg.node());
        const clampedY = Math.max(y, Math.min(y + barHeight, my));
        onHover(axisScale.invert(clampedY));
      })
      .on("mouseleave", onHoverEnd);
  }
}
