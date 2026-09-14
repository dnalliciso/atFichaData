// Cuando un bloque está marcado como estado especial (Caída Total /
// Datos no válidos), su `tiempo` viene NaN. La línea de tiempo de
// respuesta ya se corta ahí (el `lineGenerator` de cada panel usa
// `.defined()`), pero eso deja un hueco que no dice nada — parece que el
// dato "desapareció" en vez de "no aplica en ese bloque". Esta función
// calcula, para cada hueco, el par de puntos válidos que lo rodean, para
// que el caller dibuje un segmento PUNTEADO que los une directo (sin
// pasar por el bloque especial) — se ve que el valor sigue existiendo
// antes y después, sin inventar un valor para el bloque marcado.
export function computeBridgeSegments(items, getValue) {
  const segments = [];
  let lastDefinedIndex = -1;
  items.forEach((item, index) => {
    if (!Number.isFinite(getValue(item))) return;
    if (lastDefinedIndex !== -1 && index - lastDefinedIndex > 1) {
      segments.push([items[lastDefinedIndex], item]);
    }
    lastDefinedIndex = index;
  });
  return segments;
}

// Dibuja esos segmentos como líneas punteadas sueltas (no un <path> con
// el resto de la serie) — cada uno es una recta de 2 puntos entre el
// último valor válido antes del hueco y el primero después, sin importar
// cuántos bloques especiales haya en el medio.
export function renderLineBridges(parent, className, items, getValue, getX, getY) {
  const segments = computeBridgeSegments(items, getValue);
  return parent
    .selectAll(`.${className}`)
    .data(segments, (segment) => `${getX(segment[0])}-${getX(segment[1])}`)
    .join("line")
    .attr("class", className)
    .attr("x1", ([a]) => getX(a))
    .attr("y1", ([a]) => getY(getValue(a)))
    .attr("x2", ([, b]) => getX(b))
    .attr("y2", ([, b]) => getY(getValue(b)));
}
