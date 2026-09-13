import { formatValue } from "../core/format.js";

export function renderCategoryLegend(container, items) {
  container.innerHTML = items
    .map(
      (item) => `
        <div class="legend-row">
          <span class="swatch" style="background-color:${item.color}"></span>
          <span>${item.label}</span>
        </div>
      `,
    )
    .join("");
}

export function renderGradientLegend(svg, options) {
  const { colorScale, domain, config, margin, width, chartHeight, gradientId, onScrub } = options;
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

  svg
    .append("rect")
    .attr("x", x)
    .attr("y", y)
    .attr("width", barWidth)
    .attr("height", barHeight)
    .attr("rx", 3)
    .attr("fill", `url(#${gradientId})`);

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

  if (!onScrub) return;

  const handleGroup = svg.append("g").attr("class", "legend-handle");
  let handleY = y;

  const connector = handleGroup
    .append("line")
    .attr("x1", x - 6)
    .attr("x2", x)
    .attr("y1", handleY)
    .attr("y2", handleY)
    .attr("class", "legend-handle-connector")
    .attr("opacity", 0);

  const valueLabel = handleGroup
    .append("text")
    .attr("class", "legend-handle-label")
    .attr("x", x - 12)
    .attr("y", handleY + 4)
    .attr("text-anchor", "end")
    .attr("opacity", 0)
    .text(formatValue(axisScale.invert(handleY), config));

  const handle = handleGroup
    .append("circle")
    .attr("class", "legend-handle-knob")
    .attr("cx", x + barWidth / 2)
    .attr("cy", handleY)
    .attr("r", 8);

  function moveHandle(rawY) {
    handleY = Math.max(y, Math.min(y + barHeight, rawY));
    const value = axisScale.invert(handleY);
    handle.attr("cy", handleY);
    connector.attr("y1", handleY).attr("y2", handleY).attr("opacity", 1);
    valueLabel.attr("y", handleY + 4).attr("opacity", 1).text(formatValue(value, config));
    onScrub(value);
  }

  const drag = d3
    .drag()
    .on("start", (event) => {
      handle.classed("dragging", true);
      moveHandle(event.y);
    })
    .on("drag", (event) => moveHandle(event.y))
    .on("end", () => handle.classed("dragging", false));

  handle.call(drag);
}
