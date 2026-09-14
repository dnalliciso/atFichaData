import { reportConfig, resolveCellColor, specialStateFor, average, median } from "./colorScales.js";
import { dateKey } from "../../../../core/excel.js";
import { showTooltip, moveTooltip, hideTooltip } from "../../../../shared/tooltip.js";
import { hourlyTooltipHtml } from "./tooltipContent.js";
import { createWeekPanel } from "./heatmapWeekPanel.js";
import { createPeriodPanel } from "./heatmapPeriodPanel.js";
import { appendResponseRefLines, updateResponseRefLines, appendResponseRefLegend } from "./heatmapRefLines.js";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const DEFAULT_THRESHOLD = 95;
const TRANSITION_MS = 500;

// Dominio del eje de tiempo de respuesta (segundos): 0 al máximo real de
// las filas filtradas actuales, +10% de margen para que la barra/punto
// más alto no toque el borde del gráfico. Sin filas válidas, cae a
// [0, 1] en vez de [0, NaN].
export function computeResponseDomain(rows) {
  const values = rows.map((row) => row.tiempo).filter(Number.isFinite);
  if (!values.length) return [0, 1];
  const max = Math.max(...values);
  return [0, max > 0 ? max * 1.1 : 1];
}

// Valor de la barra de disponibilidad: los estados especiales (Caída
// Total / Datos no válidos) se dibujan a altura completa con su color
// fijo (igual que ocupan la celda entera en el mapa principal), no a la
// altura de un `disponibilidad` que puede venir NaN para esas filas.
function barValue(row) {
  if (specialStateFor(row.estado_bloque)) return 100;
  return Number.isFinite(row.disponibilidad) ? row.disponibilidad : 0;
}

export function createHoverChart(options) {
  const { hoverEl, weekEl, periodEl, heatmapEl, tooltipEl } = options;
  const margin = { top: 44, right: 56, bottom: 34, left: 40 };
  const width = 680;
  const height = 320;

  hoverEl.innerHTML = `
    <div class="hover-chart-title"></div>
    <div class="empty-state" data-ref="hoverChartEmpty">Pasá el mouse sobre una celda del mapa para ver el detalle del día.</div>
    <svg viewBox="0 0 ${width} ${height}" hidden></svg>
  `;
  const titleEl = hoverEl.querySelector(".hover-chart-title");
  const emptyEl = hoverEl.querySelector("[data-ref='hoverChartEmpty']");
  const svg = d3.select(hoverEl).select("svg");
  const svgNode = svg.node();

  const x = d3.scaleBand().domain(HOURS).range([margin.left, width - margin.right]).padding(0.2);
  const yBar = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);
  let yLine = d3.scaleLinear().domain([0, 1]).range([height - margin.bottom, margin.top]);

  // Leyenda (una sola vez): cuadrado = disponibilidad (barras), línea +
  // punto = tiempo de respuesta. Hace falta porque el color de las
  // barras varía por celda (verde/ámbar/rojo) — no alcanza para
  // distinguir la serie con solo mirar el color.
  const legend = svg.append("g").attr("class", "hover-chart-legend");
  legend
    .append("rect")
    .attr("class", "hover-chart-legend-swatch")
    .attr("x", margin.left)
    .attr("y", 10)
    .attr("width", 10)
    .attr("height", 10)
    .attr("rx", 2);
  legend.append("text").attr("class", "axis-label").attr("x", margin.left + 16).attr("y", 19).text("Disponibilidad");
  legend
    .append("line")
    .attr("class", "hover-chart-legend-line")
    .attr("x1", margin.left + 128)
    .attr("x2", margin.left + 148)
    .attr("y1", 15)
    .attr("y2", 15);
  legend
    .append("circle")
    .attr("class", "hover-chart-legend-line")
    .attr("cx", margin.left + 138)
    .attr("cy", 15)
    .attr("r", 3);
  legend
    .append("text")
    .attr("class", "axis-label")
    .attr("x", margin.left + 154)
    .attr("y", 19)
    .text("Tiempo de respuesta");
  const refLegendTexts = appendResponseRefLegend(legend, margin.left + 290);

  // Eje X (horas) — fijo, una sola vez.
  svg
    .append("g")
    .selectAll("text")
    .data(HOURS)
    .join("text")
    .attr("class", "axis-label")
    .attr("x", (hour) => x(hour) + x.bandwidth() / 2)
    .attr("y", height - margin.bottom + 16)
    .attr("text-anchor", "middle")
    .text((hour) => String(hour).padStart(2, "0"));

  // Eje Y izquierdo (disponibilidad %) — dominio fijo [0,100], una sola vez.
  svg
    .append("g")
    .selectAll("text")
    .data(yBar.ticks(5))
    .join("text")
    .attr("class", "legend-axis")
    .attr("x", margin.left - 8)
    .attr("y", (tick) => yBar(tick) + 4)
    .attr("text-anchor", "end")
    .text((tick) => `${tick}%`);

  // Eje Y derecho (tiempo de respuesta) — su dominio cambia con el
  // filtro activo (ver update()), así que se re-dibuja desde una función.
  const yLineAxisG = svg.append("g").attr("class", "hover-chart-yline-axis");
  function drawYLineAxis() {
    yLineAxisG
      .selectAll("text")
      .data(yLine.ticks(5))
      .join("text")
      .attr("class", "legend-axis")
      .attr("x", width - margin.right + 8)
      .attr("y", (tick) => yLine(tick) + 4)
      .attr("text-anchor", "start")
      .text((tick) => `${tick.toFixed(1)}s`);
  }
  drawYLineAxis();

  const barsG = svg.append("g").attr("class", "hover-chart-bars");
  const pointsG = svg.append("g").attr("class", "hover-chart-points");
  const lineGenerator = d3
    .line()
    .x((row) => x(row.hora) + x.bandwidth() / 2)
    .y((row) => yLine(Number.isFinite(row.tiempo) ? row.tiempo : 0));
  const linePath = svg.append("path").attr("class", "hover-chart-line").attr("fill", "none");
  const refLineEls = appendResponseRefLines(svg, margin, width);

  // Umbral arrastrable — mismo patrón que renderGradientLegend en
  // shared/legend.js, reusando sus clases .legend-handle-* de
  // src/styles/base.css.
  const thresholdGroup = svg.append("g").attr("class", "legend-handle");
  let thresholdValue = DEFAULT_THRESHOLD;

  const thresholdLine = thresholdGroup
    .append("line")
    .attr("class", "legend-handle-connector")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("stroke-dasharray", "4 3");

  const thresholdLabel = thresholdGroup
    .append("text")
    .attr("class", "legend-handle-label")
    .attr("x", width - margin.right + 8);

  const thresholdHandle = thresholdGroup.append("circle").attr("class", "legend-handle-knob").attr("cx", margin.left).attr("r", 8);

  function moveThreshold(rawY) {
    const clampedY = Math.max(margin.top, Math.min(height - margin.bottom, rawY));
    thresholdValue = yBar.invert(clampedY);
    thresholdHandle.attr("cy", clampedY);
    thresholdLine.attr("y1", clampedY).attr("y2", clampedY);
    thresholdLabel.attr("y", clampedY + 4).text(`${thresholdValue.toFixed(1)}%`);
  }

  thresholdHandle.call(
    d3
      .drag()
      .on("start", (event) => {
        thresholdHandle.classed("dragging", true);
        moveThreshold(event.y);
      })
      .on("drag", (event) => moveThreshold(event.y))
      .on("end", () => thresholdHandle.classed("dragging", false)),
  );

  moveThreshold(yBar(DEFAULT_THRESHOLD));

  const weekPanel = createWeekPanel(weekEl, tooltipEl);
  const periodPanel = createPeriodPanel(periodEl, tooltipEl);

  let currentRows = [];
  let allObjectiveRows = [];
  // Mediana/promedio del tiempo de respuesta sobre TODAS las filas del
  // Período activo — se recalcula solo en update() (cambio de Objetivo o
  // Período), no por día/hora, y se pasa igual a los 3 paneles (ver
  // heatmapRefLines.js).
  let responseStats = { median: null, average: null };
  let shownDayKey = null;
  let shownHour = null;
  let pinnedDayKey = null;
  let pinnedHour = null;

  const PINNED_CLASSES = ["heat-cell--pinned-row", "heat-cell--pinned-col", "heat-cell--pinned-exact"];

  // Resalta (o limpia, si dayKey/hour son null) la fila del día fijado y
  // la columna de la hora fijada en el mapa principal — la celda que
  // coincide en ambos ejes se marca distinto (ver .heat-cell--pinned-exact
  // en el CSS). Se vuelve a llamar desde update() porque
  // heatmapMain.render() reconstruye el <svg> del mapa en cada render —
  // cualquier clase puesta a mano en una celda anterior desaparece con
  // ese rebuild.
  function setPinnedHighlight(dayKeyToHighlight, hourToHighlight) {
    heatmapEl
      .querySelectorAll(PINNED_CLASSES.map((cls) => `.${cls}`).join(","))
      .forEach((cell) => cell.classList.remove(...PINNED_CLASSES));
    if (dayKeyToHighlight == null || hourToHighlight == null) return;
    heatmapEl.querySelectorAll(".heat-cell").forEach((cell) => {
      const datum = cell.__data__;
      if (!datum) return;
      const sameDay = datum.dayKey === dayKeyToHighlight;
      const sameHour = datum.hora === hourToHighlight;
      if (sameDay && sameHour) cell.classList.add("heat-cell--pinned-exact");
      else if (sameDay) cell.classList.add("heat-cell--pinned-row");
      else if (sameHour) cell.classList.add("heat-cell--pinned-col");
    });
  }

  function showDay(dayKey) {
    const dayRows = currentRows.filter((row) => dateKey(row.fecha) === dayKey);
    if (!dayRows.length) return false;
    shownDayKey = dayKey;
    emptyEl.hidden = true;
    svgNode.toggleAttribute("hidden", false);
    renderDay(dayRows);
    return true;
  }

  function renderDay(dayRows) {
    const sorted = [...dayRows].sort((a, b) => a.hora - b.hora);

    barsG
      .selectAll("rect")
      .data(sorted, (row) => row.hora)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("x", (row) => x(row.hora))
            .attr("width", x.bandwidth())
            .attr("rx", 3)
            .attr("y", yBar(0))
            .attr("height", 0)
            .attr("fill", (row) => resolveCellColor(row, reportConfig.availability))
            .on("mouseenter", (event, row) => showTooltip(tooltipEl, event, hourlyTooltipHtml(row, reportConfig.availability)))
            .on("mousemove", (event) => moveTooltip(tooltipEl, event))
            .on("mouseleave", () => hideTooltip(tooltipEl))
            .call((enter) =>
              enter
                .transition()
                .duration(TRANSITION_MS)
                .attr("y", (row) => yBar(barValue(row)))
                .attr("height", (row) => yBar(0) - yBar(barValue(row))),
            ),
        (update) =>
          update.call((update) =>
            update
              .transition()
              .duration(TRANSITION_MS)
              .attr("fill", (row) => resolveCellColor(row, reportConfig.availability))
              .attr("y", (row) => yBar(barValue(row)))
              .attr("height", (row) => yBar(0) - yBar(barValue(row))),
          ),
        (exit) => exit.remove(),
      );

    linePath.datum(sorted).transition().duration(TRANSITION_MS).attr("d", lineGenerator);

    pointsG
      .selectAll("circle")
      .data(sorted, (row) => row.hora)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "hover-chart-point")
            .attr("cx", (row) => x(row.hora) + x.bandwidth() / 2)
            .attr("cy", (row) => yLine(Number.isFinite(row.tiempo) ? row.tiempo : 0))
            .attr("r", 3)
            .on("mouseenter", (event, row) => showTooltip(tooltipEl, event, hourlyTooltipHtml(row, reportConfig.response)))
            .on("mousemove", (event) => moveTooltip(tooltipEl, event))
            .on("mouseleave", () => hideTooltip(tooltipEl)),
        (update) =>
          update.call((update) =>
            update
              .transition()
              .duration(TRANSITION_MS)
              .attr("cx", (row) => x(row.hora) + x.bandwidth() / 2)
              .attr("cy", (row) => yLine(Number.isFinite(row.tiempo) ? row.tiempo : 0)),
          ),
        (exit) => exit.remove(),
      );

    if (sorted[0]) titleEl.textContent = `${sorted[0].dia} ${sorted[0].mes}`;
  }

  function refreshSubPanels(dayKey, hour) {
    weekPanel.show(allObjectiveRows, dayKey, hour, responseStats);
    periodPanel.show(currentRows, dayKey, hour, responseStats);
  }

  function handleMove(event) {
    if (pinnedDayKey != null) return;
    const datum = d3.select(event.target).datum();
    if (!datum || datum.dayKey == null) return;
    if (datum.dayKey === shownDayKey && datum.hora === shownHour) return;

    if (datum.dayKey !== shownDayKey && !showDay(datum.dayKey)) return;
    shownDayKey = datum.dayKey;
    shownHour = datum.hora;
    refreshSubPanels(shownDayKey, shownHour);
  }

  function handleClick(event) {
    const datum = d3.select(event.target).datum();
    if (!datum || datum.dayKey == null) return;

    if (pinnedDayKey === datum.dayKey && pinnedHour === datum.hora) {
      pinnedDayKey = null;
      pinnedHour = null;
      setPinnedHighlight(null, null);
      return;
    }

    if (datum.dayKey !== shownDayKey && !showDay(datum.dayKey)) return;
    shownDayKey = datum.dayKey;
    shownHour = datum.hora;
    refreshSubPanels(shownDayKey, shownHour);
    pinnedDayKey = datum.dayKey;
    pinnedHour = datum.hora;
    setPinnedHighlight(pinnedDayKey, pinnedHour);
  }

  heatmapEl.addEventListener("mousemove", handleMove);
  heatmapEl.addEventListener("click", handleClick);

  function update(rows, allRows) {
    currentRows = rows;
    allObjectiveRows = allRows;
    yLine = d3.scaleLinear().domain(computeResponseDomain(rows)).range([height - margin.bottom, margin.top]);
    drawYLineAxis();
    moveThreshold(yBar(DEFAULT_THRESHOLD));

    const tiempoValues = rows.map((row) => row.tiempo);
    responseStats = { median: median(tiempoValues), average: average(tiempoValues) };
    updateResponseRefLines(refLineEls, yLine, responseStats, refLegendTexts);

    pinnedDayKey = null;
    pinnedHour = null;
    shownDayKey = null;
    shownHour = null;
    setPinnedHighlight(null, null);
    titleEl.textContent = "";
    emptyEl.hidden = false;
    svgNode.toggleAttribute("hidden", true);

    weekPanel.reset();
    periodPanel.reset();
  }

  return { update };
}
