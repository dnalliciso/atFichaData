// Valores ilustrativos por defecto — reemplazar por los que entregue el
// cliente. Estructura pensada para poder cambiar loadDefault() por un
// fetch a la API real sin tocar index.page.js.
//
// Cada nivel guarda dos umbrales: "bueno" (mínimo de disponibilidad para
// estar en zona buena) y "aceptableMin" (mínimo para estar en zona
// aceptable — por debajo de ese valor es "deficiente"). El rango
// "aceptable" queda implícito entre ambos: [aceptableMin, bueno).
const MATRIX = [
  {
    period: "Mensual",
    description: "Disponibilidad promedio del mes",
    icon: "calendar",
    levels: {
      nivel1: { bueno: 95, aceptableMin: 90 },
      nivel2: { bueno: 97, aceptableMin: 95 },
      nivel3: { bueno: 99.5, aceptableMin: 99 },
    },
  },
  {
    period: "Diario",
    description: "Disponibilidad promedio del día",
    icon: "calendar",
    levels: {
      nivel1: { bueno: 90, aceptableMin: 85 },
      nivel2: { bueno: 95, aceptableMin: 90 },
      nivel3: { bueno: 97, aceptableMin: 95 },
    },
  },
  {
    period: "Por hora",
    description: "Disponibilidad promedio de la hora",
    icon: "clock",
    levels: {
      nivel1: { bueno: 80, aceptableMin: 50 },
      nivel2: { bueno: 85, aceptableMin: 75 },
      nivel3: { bueno: 95, aceptableMin: 90 },
    },
  },
];

export const LEVEL_COLUMNS = [
  { id: "nivel1", label: "Nivel 1", sublabel: "Estándar" },
  { id: "nivel2", label: "Nivel 2", sublabel: "Crítico" },
  { id: "nivel3", label: "Nivel 3", sublabel: "Misión crítica" },
];

export async function loadDefault() {
  return MATRIX;
}
