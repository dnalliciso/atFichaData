# Informes Heatmap

Dashboard local para revisar dos informes interactivos desde Excel:

- Disponibilidad global
- Tiempo de respuesta

El heatmap principal usa eje X por día/fecha y eje Y por hora, pensado para revisar el comportamiento a través del año.

La primera fuente de datos es `dataExample/Heatmap_objetivo.xlsx`. La app lee la hoja `Heatmap` y espera estas columnas principales:

- `objetivo`
- `fecha` o `fecha_obj`
- `hora`
- `dia`
- `mes`
- `disponibilidad`
- `tiempo`
- `estado_bloque`
- `color_disp`
- `color_tiempo`

## Levantar localmente

Desde la raíz del proyecto:

```bash
python3 -m http.server 8080
```

Luego abrir:

```text
http://localhost:8080/
```

## Cambiar el Excel

Puedes reemplazar `dataExample/Heatmap_objetivo.xlsx` manteniendo el mismo nombre, o usar el selector `Excel` en la pantalla para cargar otro archivo `.xlsx`.

## Paso futuro: API

La app está preparada para separar la fuente de datos. El siguiente paso natural es cambiar `loadWorkbookFromUrl()` por un proveedor tipo `loadRowsFromApi()` que devuelva el mismo JSON normalizado que hoy sale desde Excel.
