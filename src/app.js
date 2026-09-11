const DEFAULT_WORKBOOK = "./dataExample/Heatmap_objetivo.xlsx";
const ALL_MONTHS = "__all__";
const MONTH_ORDER = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const state = {
  rows: [],
  report: "availability",
  objective: "",
  selectedMonth: "",
  selectedDayKey: "",
};

const els = {
  objectiveName: document.querySelector("#objectiveName"),
  dateRange: document.querySelector("#dateRange"),
  availabilityAvg: document.querySelector("#availabilityAvg"),
  responseAvg: document.querySelector("#responseAvg"),
  objectiveSelect: document.querySelector("#objectiveSelect"),
  monthSelect: document.querySelector("#monthSelect"),
  paletteSelect: document.querySelector("#paletteSelect"),
  heatmap: document.querySelector("#heatmap"),
  hourlyHeatmap: document.querySelector("#hourlyHeatmap"),
  detailTitle: document.querySelector("#detailTitle"),
  eventsList: document.querySelector("#eventsList"),
  reportKicker: document.querySelector("#reportKicker"),
  reportTitle: document.querySelector("#reportTitle"),
  reportSubtitle: document.querySelector("#reportSubtitle"),
  legend: document.querySelector("#legend"),
  errorBox: document.querySelector("#errorBox"),
  tooltip: document.querySelector("#tooltip"),
};

const reportConfig = {
  availability: {
    title: "Heatmap hora / día",
    kicker: "Disponibilidad global",
    valueKey: "disponibilidad",
    colorKey: "color_disp",
    unit: "%",
    decimals: 2,
    legend: [
      ["#0d0887", "Bajo", "Peor disponibilidad"],
      ["#cc4778", "Medio", "Revisar"],
      ["#f0f921", "Alto", "Mejor disponibilidad"],
    ],
  },
  response: {
    title: "Heatmap hora / día",
    kicker: "Tiempo de respuesta",
    valueKey: "tiempo",
    colorKey: "color_tiempo",
    unit: "s",
    decimals: 2,
    legend: [
      ["#0d0887", "Rápido", "Menor latencia"],
      ["#cc4778", "Medio", "Tendencia central"],
      ["#f0f921", "Lento", "Mayor latencia"],
    ],
  },
};

const palettes = {
  plasma: { label: "Plasma", interpolate: d3.interpolatePlasma },
  viridis: { label: "Viridis", interpolate: d3.interpolateViridis },
  turbo: { label: "Turbo", interpolate: d3.interpolateTurbo },
  magma: { label: "Magma", interpolate: d3.interpolateMagma },
};

function normalizeText(value) {
  return String(value ?? "").trim();
}

function excelDateToDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthIndex(month) {
  const lower = normalizeText(month).toLowerCase().slice(0, 3);
  const found = MONTH_ORDER.indexOf(lower);
  return found === -1 ? 99 : found;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function shortDateLabel(date) {
  return new Intl.DateTimeFormat("es-CL", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatValue(value, config) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(config.decimals)}${config.unit}`;
}

function average(values) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? d3.mean(clean) : null;
}

function showError(message) {
  els.errorBox.hidden = false;
  els.errorBox.textContent = message;
}

function clearError() {
  els.errorBox.hidden = true;
  els.errorBox.textContent = "";
}

async function loadWorkbookFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No pude cargar ${url}`);
  const buffer = await response.arrayBuffer();
  return parseWorkbook(buffer);
}

async function loadWorkbookFromFile(file) {
  const buffer = await file.arrayBuffer();
  return parseWorkbook(buffer);
}

function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { cellDates: true });
  const sheet = workbook.Sheets.Heatmap || workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });

  return rawRows
    .map((row) => {
      const date = excelDateToDate(row.fecha_obj || row.fecha);
      return {
        objetivo_id: row.objetivo_id,
        objetivo: normalizeText(row.objetivo),
        fecha: date,
        hora: Number(row.hora),
        dia: Number(row.dia || date?.getDate()),
        mes: normalizeText(row.mes || MONTH_ORDER[date?.getMonth()]),
        dia_semana_label: normalizeText(row.dia_semana_label),
        disponibilidad: Number(row.disponibilidad),
        tiempo: Number(row.tiempo),
        mediana_tiempo: Number(row.mediana_tiempo),
        estado_bloque: normalizeText(row.estado_bloque),
        color_disp: normalizeText(row.color_disp),
        color_tiempo: normalizeText(row.color_tiempo),
        downtime: Number(row.downtime || 0),
        eventos_cliente: Number(row.eventos_cliente || 0),
        marcado_atentus: Number(row.marcado_atentus || 0),
      };
    })
    .filter((row) => row.objetivo && row.fecha && Number.isFinite(row.hora));
}

function setRows(rows) {
  if (!rows.length) {
    showError("El Excel no tiene filas válidas para la hoja Heatmap.");
    return;
  }

  state.rows = rows;
  const objectives = Array.from(new Set(rows.map((row) => row.objetivo))).sort();
  state.objective = objectives[0];
  state.selectedMonth = "";
  state.selectedDayKey = "";
  populateFilters();
  render();
}

function populateFilters() {
  const objectives = Array.from(new Set(state.rows.map((row) => row.objetivo))).sort();
  els.objectiveSelect.innerHTML = objectives
    .map((objective) => `<option value="${objective}">${objective}</option>`)
    .join("");
  els.objectiveSelect.value = state.objective;

  const months = getMonths(getFilteredRows(false));
  state.selectedMonth ||= ALL_MONTHS;
  els.monthSelect.innerHTML = [
    `<option value="${ALL_MONTHS}">Todo el período</option>`,
    ...months.map((month) => `<option value="${month}">${month}</option>`),
  ].join("");
  els.monthSelect.value = state.selectedMonth;
}

function getFilteredRows(applyMonth = false) {
  return state.rows.filter((row) => {
    if (row.objetivo !== state.objective) return false;
    return !applyMonth || state.selectedMonth === ALL_MONTHS || row.mes === state.selectedMonth;
  });
}

function getMonths(rows) {
  return Array.from(new Set(rows.map((row) => row.mes))).sort((a, b) => monthIndex(a) - monthIndex(b));
}

function updateSummary(rows) {
  const dates = rows.map((row) => row.fecha).filter(Boolean);
  const minDate = d3.min(dates);
  const maxDate = d3.max(dates);
  const availability = average(rows.map((row) => row.disponibilidad));
  const response = average(rows.map((row) => row.tiempo));

  els.objectiveName.textContent = state.objective || "-";
  els.dateRange.textContent = minDate && maxDate ? `${formatDate(minDate)} - ${formatDate(maxDate)}` : "-";
  els.availabilityAvg.textContent = availability == null ? "-" : `${availability.toFixed(3)}%`;
  els.responseAvg.textContent = response == null ? "-" : `${response.toFixed(2)}s`;
}

function aggregateHourlyByDay(rows) {
  const grouped = d3.rollups(
    rows,
    (items) => ({
      rows: items,
      value: average(items.map((row) => row[reportConfig[state.report].valueKey])),
      availability: average(items.map((row) => row.disponibilidad)),
      response: average(items.map((row) => row.tiempo)),
      events: items.filter((row) => row.estado_bloque && row.estado_bloque !== "valor_base"),
      date: items[0].fecha,
      mes: items[0].mes,
      dia: items[0].dia,
      hora: items[0].hora,
      color_disp: items[0].color_disp,
      color_tiempo: items[0].color_tiempo,
    }),
    (row) => dateKey(row.fecha),
    (row) => row.hora,
  );

  return grouped.flatMap(([dayKey, hours]) =>
    hours.map(([hora, payload]) => ({
      dayKey,
      key: `${dayKey}-${hora}`,
      ...payload,
    })),
  );
}

function renderLegend(config) {
  els.legend.innerHTML = config.legend
    .map(
      ([color, label, value]) => `
        <div class="legend-row">
          <span class="swatch" style="background:${color}"></span>
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `,
    )
    .join("");
}

function activePalette() {
  return palettes[els.paletteSelect.value] || palettes.plasma;
}

function colorForValue(value, values) {
  if (!Number.isFinite(value)) return "#f4f1f4";
  const clean = values.filter(Number.isFinite);
  const [min, max] = d3.extent(clean);
  if (min === max) return activePalette().interpolate(0.7);
  const scale = d3.scaleSequential([min, max], activePalette().interpolate);
  return scale(value);
}

function render() {
  clearError();
  const rows = getFilteredRows(true);
  const dates = rows.map((row) => row.fecha).filter(Boolean);
  const years = Array.from(new Set(dates.map((date) => date.getFullYear()))).sort();
  const yearLabel = years.length === 1 ? years[0] : years.join("-");
  updateSummary(rows);

  const config = reportConfig[state.report];
  els.reportKicker.textContent = config.kicker;
  els.reportTitle.textContent = `${config.kicker} — ${yearLabel || "período"}`;
  els.reportSubtitle.textContent =
    state.report === "availability"
      ? "Eje X: día del período. Eje Y: hora del día. Cada celda muestra disponibilidad."
      : "Eje X: día del período. Eje Y: hora del día. Cada celda muestra tiempo de respuesta.";
  renderLegend(config);
  renderMainHeatmap(rows);
  renderEvents();
}

function renderMainHeatmap(rows) {
  const data = aggregateHourlyByDay(rows);
  const dateEntries = Array.from(
    d3.rollup(
      rows,
      (items) => items[0].fecha,
      (row) => dateKey(row.fecha),
    ),
    ([key, date]) => ({ key, date }),
  ).sort((a, b) => a.date - b.date);
  const dates = dateEntries.map((entry) => entry.key);
  const hours = d3.range(0, 24);
  const config = reportConfig[state.report];
  const values = data.map((d) => d.value);

  els.heatmap.innerHTML = "";
  if (!data.length) {
    els.heatmap.innerHTML = `<div class="empty-state">No hay datos para este filtro.</div>`;
    return;
  }

  const margin = { top: 34, right: 22, bottom: 94, left: 74 };
  const cellWidth = state.selectedMonth === ALL_MONTHS ? 14 : 18;
  const cellHeight = 15;
  const width = Math.max(720, margin.left + dates.length * cellWidth + margin.right);
  const chartHeight = margin.top + hours.length * cellHeight;
  const height = chartHeight + margin.bottom;
  const svg = d3
    .select(els.heatmap)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  const x = d3.scaleBand().domain(dates).range([margin.left, width - margin.right]).padding(0.03);
  const y = d3.scaleBand().domain(hours).range([margin.top, chartHeight]).padding(0.03);

  svg
    .append("g")
    .selectAll("text")
    .data(dateEntries.filter((entry, index) => dates.length <= 45 || index % 7 === 0 || entry.date.getDate() === 1))
    .join("text")
    .attr("class", "axis-label")
    .attr("x", (d) => x(d.key) + x.bandwidth() / 2)
    .attr("y", chartHeight + 18)
    .attr("text-anchor", "end")
    .attr("transform", (d) => `rotate(-45 ${x(d.key) + x.bandwidth() / 2} ${chartHeight + 18})`)
    .text((d) => shortDateLabel(d.date));

  svg
    .append("g")
    .selectAll("text")
    .data(dateEntries.filter((entry, index, entries) => index === 0 || entry.date.getDate() === 1 || entry.date.getMonth() !== entries[index - 1].date.getMonth()))
    .join("text")
    .attr("class", "axis-label")
    .attr("x", (d) => x(d.key))
    .attr("y", 22)
    .attr("text-anchor", "middle")
    .text((d) => `${MONTH_ORDER[d.date.getMonth()].toUpperCase()} ${d.date.getFullYear()}`);

  svg
    .append("g")
    .selectAll("text")
    .data(hours)
    .join("text")
    .attr("class", "axis-label")
    .attr("x", margin.left - 14)
    .attr("y", (d) => y(d) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "end")
    .text((d) => `${String(d).padStart(2, "0")}:00`);

  const cells = svg
    .append("g")
    .selectAll("g")
    .data(data)
    .join("g")
    .attr("transform", (d) => `translate(${x(d.dayKey)},${y(d.hora)})`);

  cells
    .append("rect")
    .attr("class", (d) => `heat-cell ${state.selectedDayKey === d.dayKey ? "selected" : ""}`)
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 4)
    .attr("fill", (d) => colorForValue(d.value, values))
    .on("mouseenter", (event, d) => showTooltip(event, hourlyTooltip(d)))
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip)
    .on("click", (_, d) => {
      state.selectedDayKey = d.dayKey;
      render();
      renderHourly(rows.filter((row) => dateKey(row.fecha) === d.dayKey));
    });

  cells
    .append("text")
    .attr("class", "cell-label")
    .attr("x", x.bandwidth() / 2)
    .attr("y", y.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .text((d) => (x.bandwidth() >= 34 ? compactCellLabel(d.value, config) : ""));

  renderGradientLegend(svg, values, config, margin, width, chartHeight);

  if (state.selectedDayKey) {
    renderHourly(rows.filter((row) => dateKey(row.fecha) === state.selectedDayKey));
  } else {
    renderHourly(rows.filter((row) => dateKey(row.fecha) === dates[0]));
  }
}

function renderGradientLegend(svg, values, config, margin, width, chartHeight) {
  const clean = values.filter(Number.isFinite);
  const [min, max] = d3.extent(clean);
  const legendWidth = Math.min(430, Math.max(260, width * 0.5));
  const legendHeight = 14;
  const x = (width - legendWidth) / 2;
  const y = chartHeight + 48;
  const gradientId = `legend-${state.report}-${els.paletteSelect.value}`;
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
      .attr("stop-color", activePalette().interpolate(stop));
  });

  svg
    .append("text")
    .attr("class", "range-label")
    .attr("x", x - 8)
    .attr("y", y + legendHeight)
    .attr("text-anchor", "end")
    .text(formatValue(min, config));

  svg
    .append("rect")
    .attr("x", x)
    .attr("y", y)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("rx", 2)
    .attr("fill", `url(#${gradientId})`);

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
}

function compactCellLabel(value, config) {
  if (!Number.isFinite(value)) return "";
  if (config.unit === "%") return value.toFixed(value < 99 ? 1 : 0);
  return value.toFixed(0);
}

function renderHourly(rows) {
  const config = reportConfig[state.report];
  const sorted = [...rows].sort((a, b) => a.hora - b.hora);
  const selectedDay = sorted[0];
  els.detailTitle.textContent = selectedDay
    ? `${selectedDay.dia} ${selectedDay.mes} - detalle horario`
    : "Detalle horario";

  els.hourlyHeatmap.innerHTML = "";
  if (!sorted.length) {
    els.hourlyHeatmap.innerHTML = `<div class="empty-state">No hay detalle horario para mostrar.</div>`;
    return;
  }

  const values = sorted.map((row) => row[config.valueKey]);
  const margin = { top: 28, right: 18, bottom: 42, left: 34 };
  const width = Math.max(680, margin.left + sorted.length * 28 + margin.right);
  const height = 214;
  const svg = d3
    .select(els.hourlyHeatmap)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height);

  const x = d3
    .scaleBand()
    .domain(sorted.map((row) => row.hora))
    .range([margin.left, width - margin.right])
    .padding(0.08);
  const y = margin.top;
  const cellHeight = 94;

  svg
    .append("g")
    .selectAll("rect")
    .data(sorted)
    .join("rect")
    .attr("class", "heat-cell")
    .attr("x", (d) => x(d.hora))
    .attr("y", y)
    .attr("width", x.bandwidth())
    .attr("height", cellHeight)
    .attr("rx", 4)
    .attr("fill", (d) => colorForValue(d[config.valueKey], values))
    .on("mouseenter", (event, d) => showTooltip(event, hourlyTooltip(d)))
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);

  svg
    .append("g")
    .selectAll("text")
    .data(sorted)
    .join("text")
    .attr("class", "axis-label")
    .attr("x", (d) => x(d.hora) + x.bandwidth() / 2)
    .attr("y", y + cellHeight + 20)
    .attr("text-anchor", "middle")
    .text((d) => `${String(d.hora).padStart(2, "0")}`);

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height - 12)
    .attr("text-anchor", "middle")
    .text("Hora del día");
}

function hourlyTooltip(row) {
  const config = reportConfig[state.report];
  return `
    <strong>${row.dia} ${row.mes}, ${String(row.hora).padStart(2, "0")}:00</strong>
    ${config.kicker}: ${formatValue(row[config.valueKey], config)}<br>
    Disponibilidad: ${row.disponibilidad.toFixed(3)}%<br>
    Respuesta: ${row.tiempo.toFixed(2)}s<br>
    Estado: ${row.estado_bloque || "-"}
  `;
}

function renderEvents() {
  const rows = getFilteredRows(true)
    .filter((row) => row.estado_bloque && row.estado_bloque !== "valor_base")
    .sort((a, b) => a.fecha - b.fecha || a.hora - b.hora);

  if (!rows.length) {
    els.eventsList.innerHTML = `<div class="empty-state">Sin bloques marcados para el filtro actual.</div>`;
    return;
  }

  els.eventsList.innerHTML = rows
    .map(
      (row) => `
        <article class="event-item">
          <strong>${row.dia} ${row.mes}, ${String(row.hora).padStart(2, "0")}:00</strong>
          ${row.estado_bloque} · disp. ${row.disponibilidad.toFixed(2)}% · resp. ${row.tiempo.toFixed(2)}s
        </article>
      `,
    )
    .join("");
}

function showTooltip(event, html) {
  els.tooltip.hidden = false;
  els.tooltip.innerHTML = html;
  moveTooltip(event);
}

function moveTooltip(event) {
  els.tooltip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - 300)}px`;
  els.tooltip.style.top = `${event.clientY + 14}px`;
}

function hideTooltip() {
  els.tooltip.hidden = true;
}

document.querySelectorAll("[data-report]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-report]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.report = button.dataset.report;
    render();
  });
});

els.objectiveSelect.addEventListener("change", () => {
  state.objective = els.objectiveSelect.value;
  state.selectedMonth = "";
  state.selectedDayKey = "";
  populateFilters();
  render();
});

els.monthSelect.addEventListener("change", () => {
  state.selectedMonth = els.monthSelect.value;
  state.selectedDayKey = "";
  render();
});

els.paletteSelect.addEventListener("change", () => {
  render();
});

document.querySelector("#fileInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    clearError();
    const rows = await loadWorkbookFromFile(file);
    setRows(rows);
  } catch (error) {
    showError(error.message);
  }
});

loadWorkbookFromUrl(DEFAULT_WORKBOOK)
  .then(setRows)
  .catch((error) => showError(error.message));
