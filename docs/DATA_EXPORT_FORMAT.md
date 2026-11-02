# Formato de exportacion de DeepLog

Version del contrato: `1`

## Descargas disponibles

- `GET /api/v1/account/export.json`: perfil e historial estructurado.
- `GET /api/v1/account/export.csv`: una fila UTF-8 por inmersion.
- `GET /api/v1/account/export.zip`: JSON, CSV y fotografias a resolucion completa.

Todas las rutas requieren el JWT del propietario, usan `Cache-Control: no-store`
y se entregan como archivos adjuntos.

## JSON

El documento raiz contiene:

- `formatVersion`: version necesaria para una futura importacion.
- `exportedAt`: instante UTC en formato ISO 8601.
- `source`: producto que genero el archivo.
- `user`: identidad de cuenta sin hash de contraseña.
- `profile`: biografía, experiencia, preferencia de nombre y presencia de foto.
- `dives`: historial completo ordenado por identificador de origen.

Cada inmersion conserva `sourceId`, datos tecnicos, compañeros, notas, diario
de aprendizaje, fechas y metadatos de fotografia. `sourceId` solo sirve para relacionar los archivos del
ZIP y no debe reutilizarse como ID al importar en otra cuenta.

## CSV

El CSV utiliza UTF-8 con BOM, coma como separador, CRLF y escape RFC 4180 para
comas, comillas y saltos de linea. Compañeros y nombres de fotos se separan con
` | ` dentro de su celda. Es adecuado para hojas de calculo y analisis, pero el
JSON es el formato canonico para una futura importacion.

## ZIP

Estructura:

```text
deeplog-complete-export.zip
|-- deeplog-export.json
|-- deeplog-dives.csv
|-- photos/
|   `-- dive-<sourceId>/
|       `-- <photoSourceId>-<nombre-seguro>
`-- profile/
    `-- profile-<identificador>.<formato>
```

La carpeta `profile/` solo existe cuando el usuario ha añadido fotografía. Los
binarios conservan su resolucion y formato, sin metadatos EXIF/XMP (GPS,
dispositivo y fecha de captura se eliminan al subirlas). Los nombres se
sanean para impedir rutas relativas o caracteres no portables.

## Rendimiento y consistencia

Las inmersiones se leen en lotes de 100 y las respuestas se transmiten mientras
se generan. Las fotos del ZIP se incorporan como streams, sin cargarlas todas en
memoria. La exportacion no bloquea la cuenta: si se modifica el historial al
mismo tiempo, dos lotes podrian reflejar instantes ligeramente distintos.

## Eliminacion de cuenta

`DELETE /api/v1/account` exige la contraseña actual y `confirmation: ELIMINAR`.
La base elimina en una transaccion la cuenta y todas sus relaciones mediante
cascada. Tras confirmar la transaccion se eliminan los archivos privados. Los
tokens antiguos dejan de ser validos porque el usuario ya no existe.

Las copias operativas pueden conservar datos hasta agotar la retencion definida
en `BACKUP_RETENTION_DAYS`; no son accesibles desde la aplicacion y deben caducar
segun la politica de produccion.
