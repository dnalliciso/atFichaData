// Valores ilustrativos por defecto — reemplazar por los que entregue el
// cliente. Estructura pensada para poder cambiar loadDefault() por un
// fetch a la API real sin tocar index.page.js.
const MATRIX = [
  { period: "Mensual", nivel1: 99.0, nivel2: 99.5, nivel3: 99.9 },
  { period: "Diario", nivel1: 98.5, nivel2: 99.0, nivel3: 99.8 },
  { period: "Por hora", nivel1: 97.0, nivel2: 98.0, nivel3: 99.5 },
];

export async function loadDefault() {
  return MATRIX;
}
