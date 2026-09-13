# Estándares internacionales de tiempo de respuesta

Compara, por fuente (AWS Apdex / Google), los umbrales que clasifican el
tiempo de respuesta en 3 zonas de experiencia de usuario: Satisfecha
(Bueno), Tolerada (necesita mejora) y Frustrada (pobre).

## Fuente de datos

Por ahora, valores por defecto embebidos en `data.js` (`loadDefault()`).
No hay Excel ni API todavía — es el paso futuro planeado.

## Forma de los datos (cuando se conecte a una fuente real)

| Campo | Tipo | Obligatoria | Ejemplo |
|---|---|---|---|
| `source` | texto (nombre de la fuente) | sí | `AWS (Apdex)` |
| `subtitle` | texto | no | `Estándares de tiempo de respuesta` |
| `badge` | texto (monograma corto) | no (cae a `-`) | `AWS` |
| `accentColor` | color hex (identidad de marca de la fuente, no del tema) | no (cae a `var(--accent)`) | `#e8890c` |
| `threshold` | número (T, umbral "bueno" en `unit`) | sí | `2` |
| `upper` | número (techo de "tolerada" en `unit`) | sí | `8` |
| `unit` | texto (`s`, `ms`, …) | sí | `s` |

Las 3 zonas (Satisfecha/Tolerada/Frustrada) son el mismo marco Apdex para
todas las fuentes — están en `ZONES`, exportado desde `data.js`. Cada
fuente solo aporta `threshold`/`upper`/`unit`; los rangos ("0 a T",
"> T a U", "> U") y la posición de las marcas en la barra se calculan en
`index.page.js` a partir de esos dos números.

## Cómo reemplazar los datos

Editar el array `STANDARDS` en `data.js`, o (paso futuro) reemplazar el
cuerpo de `loadDefault()` por un fetch a la API del cliente.

## Notas de diseño

Los valores actuales son ilustrativos, tomados del estándar visual de
referencia entregado por el cliente
(`dataExample/ejemplos/estandaresinternacionaes.png`), no confirmados
formalmente. Ese material incluía además un bloque "Consideración" al pie
— se omite a pedido explícito del cliente, no es un olvido.
