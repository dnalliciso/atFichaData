# Convención de módulos y páginas

Este proyecto organiza sus pantallas como **módulos** que agrupan
**páginas**. Agregar contenido nuevo es casi siempre: crear una carpeta de
página y sumar 1-2 líneas de registro — no hace falta tocar `index.html`
ni ninguna página existente.

## Estructura de una página

```
modules/<modulo>/pages/<pagina>/
  index.page.js   — contrato de página (ver abajo)
  data.js         — carga y normalización de datos (ver abajo)
  style.css       — estilos específicos, sobrescriben src/styles/base.css
  README.md       — copiar la plantilla de abajo y completarla
```

## Contrato de `index.page.js`

```js
export const meta = { kicker: "...", title: "...", subtitle: "..." };

export function mount(container) {
  // Limpia `container` y arma el DOM/gráfico de la página.
  // Debe poder llamarse de nuevo sin acumular estado ni listeners
  // duplicados (el router la vuelve a llamar cada vez que se navega a
  // esta página).
  // Devuelve opcionalmente { unmount() {...} } si la página registró
  // listeners fuera de `container` (ej. window resize) que necesiten
  // limpieza al salir de la página.
}
```

## Contrato de `data.js`

```js
export async function loadDefault();        // fetch al Excel de ejemplo de esta página
export async function loadFromFile(file);   // Excel subido por el usuario
export function parseWorkbook(buffer);      // parseo + normalización propia de la página
```

Usa las utilidades genéricas de `src/core/excel.js` (`readSheetRows`,
`excelDateToDate`, `dateKey`, `formatDate`, `shortDateLabel`) en vez de
reimplementar el parseo de Excel en cada página.

## CSS por página

Al tope de `index.page.js`, llamar una vez:

```js
import { ensurePageStyle } from "../../../core/dom.js";

ensurePageStyle(new URL("./style.css", import.meta.url).href);
```

Esto inyecta `style.css` al `<head>` la primera vez que el módulo se
importa. Como queda *después* de `src/styles/base.css` en el DOM, cualquier
regla en `style.css` gana los empates de especificidad contra `base.css`
sin necesitar `!important`.

## Cómo agregar una página a un módulo existente

1. Copiar una carpeta de página existente como plantilla.
2. Ajustar `index.page.js`, `data.js`, `style.css`, `README.md`.
3. Agregar una línea en el `index.js` del módulo (import + entrada en el
   array `pages`).

## Cómo agregar un módulo nuevo

1. Crear `modules/<id>/index.js` con el descriptor `{ id, label, pages }`.
2. Agregar sus páginas como arriba.
3. Agregar una línea en `src/modules/registry.js` (import + entrada en el
   array `modules`).

## Plantilla de `README.md` por página

Copiar este bloque en el `README.md` de cada página nueva y completarlo:

> # \<Nombre de la página\>
>
> Qué muestra esta página (1-2 líneas).
>
> ## Fuente de datos
>
> Archivo Excel esperado: `dataExample/<archivo>.xlsx`, hoja `<Hoja>`.
>
> ## Columnas esperadas
>
> | Columna | Tipo | Obligatoria | Ejemplo |
> |---|---|---|---|
> | ... | ... | sí/no | ... |
>
> ## Cómo reemplazar los datos
>
> Cómo subir otro Excel desde la página, o cómo cambiar el default en
> `data.js`.
>
> ## Notas de diseño
>
> (Opcional) decisiones no obvias.
