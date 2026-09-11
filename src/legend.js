import { formatValue, SPECIAL_STATES } from "./colorScales.js";

export function renderCategoryLegend(container) {
  container.innerHTML = Object.values(SPECIAL_STATES)
    .map(
      (state) => `
        <div class="legend-row">
          <span class="swatch" style="background:${state.color}"></span>
          <span>${state.label}</span>
        </div>
      `,
    )
    .join("");
}

export function renderGradientLegend(svg, options) {
  const { colorScale, domain, config, margin, width, chartHeight, gradientId, onHover, onHoverEnd } = options;
  const [min, max] = domain;
  const legendWidth = Math.min(430, Math.max(260, width * 0.5));
  const legendHeight = 14;
  const x = (width - legendWidth) / 2;
  const y = chartHeight + 48;

  const defs = svg.append("defs");
  const gradient = defs
    .append("linearGradient")
    .attr("id", gradientId)
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");

  d3.range(0, 1.01, 0.1).forEach((stop) => {
    gradient
      .append("stop")
      .attr("offset", `${stop * 100}%`)
      .attr("stop-color", colorScale(min + stop * (max - min)));
  });

  svg
    .append("text")
    .attr("class", "range-label")
    .attr("x", x - 8)
    .attr("y", y + legendHeight)
    .attr("text-anchor", "end")
    .text(formatValue(min, config));

  const bar = svg
    .append("rect")
    .attr("x", x)
    .attr("y", y)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("rx", 2)
    .attr("fill", `url(#${gradientId})`);

  if (onHover && onHoverEnd) {
    bar.style("cursor", "crosshair");
  }

  svg
    .append("text")
    .attr("class", "range-label")
    .attr("x", x + legendWidth + 8)
    .attr("y", y + legendHeight)
    .text(formatValue(max, config));

  const axisScale = d3.scaleLinear().domain([min, max]).range([x, x + legendWidth]);
  const ticks = axisScale.ticks(5);
  svg
    .append("g")
    .selectAll("text")
    .data(ticks)
    .join("text")
    .attr("class", "legend-axis")
    .attr("x", (d) => axisScale(d))
    .attr("y", y + 35)
    .attr("text-anchor", "middle")
    .text((d) => `${d.toFixed(config.unit === "%" ? 1 : 0)}${config.unit}`);

  if (onHover && onHoverEnd) {
    bar
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event, svg.node());
        const clampedX = Math.max(x, Math.min(x + legendWidth, mx));
        onHover(axisScale.invert(clampedX));
      })
      .on("mouseleave", onHoverEnd);
  }
}
