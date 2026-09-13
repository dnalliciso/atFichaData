export function formatValue(value, config) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(config.decimals)}${config.unit}`;
}
