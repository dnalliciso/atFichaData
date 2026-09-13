# Estándares internacionales de tiempo de respuesta

Referencia de dos fuentes (AWS Apdex, Google) para clasificar tiempo de
respuesta en 4 zonas: umbral por defecto (T), satisfecha/buena,
tolerada/necesita mejora, frustrada/pobre.

## Fuente de datos

Por ahora, valores por defecto embebidos en `data.js` (`loadDefault()`).
AWS Apdex usa la metodología real (T, T–4T, >4T); los de Google están
pendientes de confirmar la fuente exacta (¿Core Web Vitals?).

## Columnas esperadas (cuando se conecte a una fuente real)

| Campo | Tipo | Obligatoria | Ejemplo |
|---|---|---|---|
| `source` | texto | sí | `AWS Apdex` |
| `thresholdLabel` | texto | sí | `Umbral por defecto (T)` |
| `thresholdValue` | texto | sí | `T = 0.5s` |
| `zones` | lista de `{label, range}` (3 zonas) | sí | ver `data.js` |

## Cómo reemplazar los datos

Editar el array `STANDARDS` en `data.js`, o (paso futuro) reemplazar el
cuerpo de `loadDefault()` por un fetch a la API del cliente.

## Notas de diseño

Pendiente: confirmar con el usuario la fuente exacta de "Google" antes de
reemplazar los valores placeholder.
