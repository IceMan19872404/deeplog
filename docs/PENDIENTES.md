# Pendientes y errores de DeepLog

Última actualización: 26 de noviembre de 2026, durante la revisión general del
código (rama `revision/integracion`).

Hay tres partes: los errores corregidos en esta revisión, que conviene repasar,
los errores conocidos que siguen sin corregir y las mejoras pendientes.

---

## 1. Errores corregidos en esta revisión

| # | Error | Dónde | Gravedad |
|---|-------|-------|----------|
| C1 | **No se podía crear una cuenta desde la web.** La regla del campo de contraseña estaba mal escrita (`.(8, 72)` en vez de `.{8,72}`) y el navegador rechazaba cualquier contraseña. **Afecta a `main`.** | `frontend/index.html` (registro) | Alta |
| C2 | Si al crear una inmersión fallaba el guardado de los compañeros, la app daba error pero la inmersión quedaba guardada. | `backend/src/services/dive.service.js` | Media |
| C3 | Lo mismo al editar: daba error pero los cambios se guardaban. | `dive.service.js` | Media |
| C4 | Dos subidas de fotos a la vez podían superar el límite de 5 fotos. | `dive-photo.service.js` | Baja |
| C5 | Si se borraba una inmersión mientras se subía una foto, el archivo de la foto se quedaba en el disco. | `dive.service.js` | Baja |
| C6 | En un enlace compartido, después de borrar una foto, los enlaces a las demás apuntaban a la foto equivocada o daban error. | `dive-share.service.js` | Media |
| C7 | Dos cambios simultáneos de la foto de perfil podían dejar un archivo huérfano. | `profile.service.js` | Baja |
| C8 | Al superar el límite de avisos de error, el servidor respondía en HTML en lugar del formato JSON documentado. | `backend/src/routes/telemetry.routes.js` | Baja |
| C9 | Si fallaba una respuesta que ya había empezado a enviarse, el registro mostraba un error desordenado. | `error.middleware.js` | Baja |
| C10 | Si el navegador bloqueaba el almacenamiento local, al cerrar sesión no aparecía la pantalla de acceso. | `frontend/js/offline.js` (antes en `app.js`) | Baja |

---

## 2. Errores conocidos sin corregir

### Importantes
- **E1. A veces se pierde la sesión al recuperar la conexión.** Si se pasa de
  sin conexión a con conexión y se recarga, el servidor puede recibir dos
  renovaciones de sesión con unos 100 ms de diferencia. La segunda falla y
  obliga a entrar otra vez. Ya pasaba antes de la revisión. Hay que mirar
  `frontend/js/api.js`, el arranque y la rotación del refresh en el servidor.

### Del backend
- **E2.** El mensaje al confirmar el borrado de cuenta nunca sale como se
  quería («Confirmation must be ELIMINAR»). Zod 4 ignora la opción `errorMap`.
  Está en `backend/src/validations/account.validation.js:5`.
- **E3.** Algunos errores al leer el cuerpo de una petición (charset no
  admitido, codificación no admitida, petición abortada) responden 500 y se
  envían a Sentry, cuando la culpa es del cliente. Está en `error.middleware.js`.
- **E4.** Los ajustes numéricos de la configuración no se validan. Por ejemplo,
  si `REFRESH_TOKEN_DAYS` no es un número, el inicio de sesión falla con 500.
  Está en `backend/src/config/env.js`.
- **E5.** `GET /dives/configuration-memory` devuelve las inmersiones con
  compañeros, fotos y reflexión vacíos.
- **E6.** Borrar una reflexión que no existe responde 204 en lugar de 404.
  Hay que decidir si es lo correcto.
- **E7.** Queda una carrera muy improbable cuando dos subidas crean a la vez la
  primera foto de perfil.

### Documentación de la API (`openapi.json`) que no coincide con el servidor
- **E8.** `CreateShareInput.includeDiverName` aparece con `true` por defecto,
  pero el servidor usa `false` (TD-032).
- **E9.** `DiveInput` no incluye `latitude`, `longitude` ni
  `locationPrecision`, aunque el servidor los acepta. `Dive` no tiene el campo
  `location`.
- **E10.** No están documentados estos errores:
  - el 404 `SHARE_NOT_FOUND` de `POST /public/dives/{token}/access`;
  - el 400 por token mal formado en las rutas públicas;
  - el 429 de la foto pública.
- **E11.** `ProfileInput.divingSince` no tiene máximo, pero el servidor
  rechaza los años futuros.

### Del frontend
- **E12.** En la descarga de la exportación de la cuenta, la URL temporal se
  libera justo después del clic. En Chromium funciona; falta probarlo en
  Safari y Firefox. Está en `api.js`, en `downloadAccountExport`.
- **E13.** Las capturas de comparación del tema Superficie en móvil no siempre
  salen idénticas: hay diferencias mínimas de antialiasing.
- **E15. Botón principal mientras carga en Abismo.** El texto sigue visible y
  el indicador de carga casi no se ve sobre el aguamarina. Hay que elegir
  colores para el indicador en Abismo y después ocultar el texto, como en
  Superficie. Ahora mismo se mantiene a propósito con
  `--primary-loading-ink` (`01-tokens.css`).
- **E16.** En móvil, la regla que daba 120 px de margen inferior al contenido
  nunca se aplicaba, porque ganaba otra de 80 px. Se ha eliminado sin cambiar
  nada visible. Si se quieren de verdad los 120 px, hay que añadirla en
  `05-app-shell.css`, y eso sí cambia el aspecto.
- **E17.** `15-theme-abismo.css` ya solo contiene las fuentes, y
  `18-theme-superficie.css` solo las cáusticas. Conviene renombrarlos, lo que
  exige tocar `index.html` y el service worker.
- **E18.** Los fondos dependen ahora de que exista `data-theme`. `theme-init.js`
  lo pone siempre antes de pintar y una prueba lo comprueba, pero si algún día
  se carga la página sin él, se vería Superficie.

### De las herramientas
- **E14.** `npm test` del backend no fija `NODE_ENV=test`, así que los
  registros ensucian la salida de las pruebas.

---

## 3. Mejoras pendientes

- **M1. Consumo de aire por minuto y su evolución.** Está aparcado en la rama
  `feature/consumo-aire`. Falta decidir cómo obtener la profundidad media,
  porque el Cressi Leonardo no la registra: un campo opcional con una
  estimación, o solo la estimación.
- **M2. Trusted Types.** El plan está en `docs/TRUSTED_TYPES_PLAN.md`.
- **M3. Miniaturas de las fotos.** Necesitan cambios en el backend.
- **M4. Escala de texto del sistema al 200 %:** revisar que todo se lea y que
  nada se corte.
- **M5. Probar en un iPhone real** el signo menos de las coordenadas y que la
  pantalla no se amplíe al enfocar un campo.
- **M6.** Usar el ayudante `withTransaction` también en
  `backend/scripts/seed-demo-dives.js`.
