# Estrategia offline y conflictos

Revision: 2026-09-30

## Alcance

La PWA almacena el shell de la aplicacion y la ultima pagina de inmersiones y
mapa sincronizados. Si se pierde la red durante una sesion, el usuario puede
consultar esa copia con un aviso explicito.

## Limites deliberados

- No se guardan tokens en `localStorage`.
- No se encolan altas, ediciones, fotos ni borrados offline.
- La copia local se elimina al cerrar sesion de forma explicita.
- Las respuestas autenticadas de la API no entran en Cache Storage.
- La ubicacion no se envia a proveedores externos de mapas.

## Conflictos

DeepLog aplica una estrategia de servidor autoritativo: toda escritura exige
conexion y validacion actual. Al no aceptar escrituras offline no existen dos
versiones pendientes que fusionar ni riesgo de sobrescribir cambios silenciosos.
Una futura edicion offline requeriria versionado optimista mediante `updatedAt`
o ETag y una pantalla de resolucion antes de habilitarse.
