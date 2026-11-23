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
- Las navegaciones no se guardan nunca en Cache Storage: su URL puede llevar
  `?share=` o `?resetToken=`. Al activarse, el worker borra cualquier entrada
  que no sea un archivo estatico limpio (por ejemplo, tokens guardados por una
  version anterior).

## Service worker (revision 2026-11-23)

- Archivos versionados (`?v=`) y fuentes: cache first. Se precachean en
  `SHELL` y solo se añaden en tiempo de ejecucion rutas de `js/`, `styles/`,
  `fonts/` o `assets/` sin mas parametros que `v` y que no sean HTML.
- Navegaciones: network first; sin red se responde con `/index.html`
  precacheado. Solo las navegaciones caen a `index.html`: un script que falta
  falla como script en vez de interpretarse como HTML.
- Resto (manifiesto, iconos sin version): red y, sin red, la copia precacheada.
- Cada modulo importado (estatico o con `import()`) debe estar en `SHELL` con
  la misma version; `tests/pwa-shell.test.js` lo comprueba en todos los
  modulos de `js/`. `dive-map.js` y `public-share.js` se cargan con `import()`
  bajo demanda, pero siguen precacheados para funcionar sin conexion.

## Conflictos

DeepLog aplica una estrategia de servidor autoritativo: toda escritura exige
conexion y validacion actual. Al no aceptar escrituras offline no existen dos
versiones pendientes que fusionar ni riesgo de sobrescribir cambios silenciosos.
Una futura edicion offline requeriria versionado optimista mediante `updatedAt`
o ETag y una pantalla de resolucion antes de habilitarse.
