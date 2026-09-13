# Niveles de tolerancia de disponibilidad

Matriz de referencia período (mensual/diario/por hora) × nivel de
tolerancia (1 Estándar / 2 Crítico / 3 Misión crítica), definida por el
cliente.

## Fuente de datos

Por ahora, valores por defecto embebidos en `data.js` (`loadDefault()`).
No hay Excel ni API todavía — es el paso futuro planeado.

## Columnas esperadas (cuando se conecte a una fuente real)

| Campo | Tipo | Obligatoria | Ejemplo |
|---|---|---|---|
| `period` | texto (`Mensual`/`Diario`/`Por hora`) | sí | `Mensual` |
| `nivel1` | número (% disponibilidad mínima) | sí | `99.0` |
| `nivel2` | número (% disponibilidad mínima) | sí | `99.5` |
| `nivel3` | número (% disponibilidad mínima) | sí | `99.9` |

## Cómo reemplazar los datos

Editar el array `MATRIX` en `data.js`, o (paso futuro) reemplazar el
cuerpo de `loadDefault()` por un fetch a la API del cliente.

## Notas de diseño

Los valores actuales son ilustrativos, no confirmados por el cliente.
