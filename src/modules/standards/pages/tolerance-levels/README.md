# Niveles de tolerancia de disponibilidad

Matriz de referencia período (mensual/diario/por hora) × nivel de
tolerancia (1 Estándar / 2 Crítico / 3 Misión crítica), definida por el
cliente. Para cada celda período × nivel se muestran tres zonas
(Deficiente / Aceptable / Bueno) según el umbral de disponibilidad.

## Fuente de datos

Por ahora, valores por defecto embebidos en `data.js` (`loadDefault()`).
No hay Excel ni API todavía — es el paso futuro planeado.

## Forma de los datos (cuando se conecte a una fuente real)

Cada fila de la matriz:

| Campo | Tipo | Obligatoria | Ejemplo |
|---|---|---|---|
| `period` | texto (`Mensual`/`Diario`/`Por hora`) | sí | `Mensual` |
| `description` | texto (subtítulo bajo el período) | no | `Disponibilidad promedio del mes` |
| `icon` | texto (`calendar`/`clock`) | no (cae a `calendar`) | `clock` |
| `levels.nivel1.bueno` | número (% mínimo para "Bueno") | sí | `95` |
| `levels.nivel1.aceptableMin` | número (% mínimo para "Aceptable") | sí | `90` |
| `levels.nivel2.*` / `levels.nivel3.*` | igual forma que `nivel1` | sí | — |

El rango "Aceptable" queda implícito entre `aceptableMin` (inclusive) y
`bueno` (exclusive); por debajo de `aceptableMin` es "Deficiente".

Las columnas de nivel (etiqueta "Nivel 1 — Estándar", etc.) están en
`LEVEL_COLUMNS`, exportado desde `data.js` junto con `loadDefault()`.

## Cómo reemplazar los datos

Editar el array `MATRIX` en `data.js`, o (paso futuro) reemplazar el
cuerpo de `loadDefault()` por un fetch a la API del cliente.

## Notas de diseño

Los valores actuales son ilustrativos, no confirmados por el cliente.
El diseño de la matriz (tarjetas por celda, barra de tramos
Deficiente/Aceptable/Bueno, flecha "Mayor criticidad") sigue el
estándar visual de referencia entregado por el cliente
(`dataExample/ejemplos/nivelesdetolerancia.png`). Los colores de estado
(verde/ámbar/rojo) son fijos y no se tematizan entre claro/oscuro —
solo cambian las variantes de texto (`--tol-*-ink`) para mantener
contraste legible en ambos temas.
