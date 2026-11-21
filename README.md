# DeepLog 2.0

API modular de DeepLog 2.0, preparada para crecer por fases.

## Requisitos
- Docker + Docker Compose

## Arranque local
1. Opcionalmente, crea un archivo `.env` en esta carpeta usando los valores de
   `backend/.env.example`.
2. Ejecuta:

```bash
docker compose up --build
```

Los servicios locales (`db`, `backend` y `frontend`) usan la politica
`restart: unless-stopped`, por lo que Docker Desktop los recupera despues de
un reinicio. La POC React aplica la misma politica cuando se inicia con el
perfil `poc`.

## Abrir DeepLog

Interfaz web:

```text
http://localhost:8080
```

API directa:

```text
http://localhost:3000/api/v1/health
```

La navegacion normal debe hacerse desde el puerto `8080`. Nginx sirve el
frontend y reenvia las peticiones `/api` al backend.

## Problemas frecuentes al arrancar

### `Cannot find module '...'` o `deeplog-api` queda *unhealthy* tras cambiar dependencias

En desarrollo, `docker-compose.yml` monta `./backend` sobre `/app` y guarda
`node_modules` en un volumen anonimo (`- /app/node_modules`). Docker reutiliza
ese volumen al recrear el contenedor, asi que despues de anadir o actualizar
dependencias en `backend/package.json` la API sigue arrancando con las
antiguas aunque la imagen se haya reconstruido.

```bash
docker compose up --build -d --renew-anon-volumes
```

`--renew-anon-volumes` solo recrea los volumenes anonimos. La base de datos
(`postgres_data`) y las fotos (`dive_uploads`) estan en volumenes con nombre y
no se tocan.

### `403 Forbidden` en `http://localhost:8080` o en algun `.js`/`.css`

Nginx se ejecuta dentro del contenedor con un usuario distinto al tuyo y solo
puede servir archivos legibles por todos. Si un archivo del frontend tiene
permisos `600` (pasa con algunos editores, descargas o herramientas que
escriben archivos de forma restrictiva), Nginx responde 403 solo para ese
archivo.

```bash
# Ver que archivos del frontend no son legibles por todos
find frontend -type f ! -perm -o=r
# Corregirlos y reconstruir la imagen de la web
find frontend -type f ! -perm -o=r -exec chmod 644 {} +
docker compose up --build -d frontend
```

La reconstruccion es necesaria porque la imagen guarda una copia de los
archivos del frontend.

## Comprobar API
- Healthcheck: `GET http://localhost:3000/api/v1/health`

Respuesta esperada:
```json
{
  "status": "ok",
  "service": "deeplog-api",
  "timestamp": "2026-01-01T10:00:00.000Z"
}
```

## Ejecutar pruebas

Con la pila Docker levantada:

```bash
docker compose exec backend npm test
docker run --rm -v "$PWD/frontend:/app:ro" -w /app node:20-alpine npm test
docker run --rm -v "$PWD/frontend-react-poc:/app" -v /app/node_modules \
  -w /app node:20-alpine sh -lc "npm ci && npm test && npm run build"
```

La auditoria funcional completa del 19 de octubre de 2026 esta documentada en
`docs/FUNCTIONAL_AUDIT_2026-10-19.md`.

## Datos de demostracion

El formulario de inmersion incluye un ejemplo temporal en cada campo. Los
textos desaparecen al empezar a escribir o seleccionar un valor y no se envian
a la API.

Para cargar las 20 inmersiones ficticias del portfolio en una cuenta local:

```bash
docker compose exec backend npm run seed:demo -- usuario@ejemplo.com
```

El sembrador incluye equipo, lastre, compañeros, centro, coordenadas, notas y
reflexion privada. Es idempotente: identifica cada registro por usuario, nombre
y fecha, por lo que ejecutarlo de nuevo no crea duplicados. No añade fotos
ficticias; las fotografias deben ser archivos reales elegidos por el usuario.

## Registrar un usuario

`POST http://localhost:3000/api/v1/auth/register`

```json
{
  "firstName": "Carlos",
  "lastName": "Cano",
  "secondLastName": "Canton",
  "email": "carlos@example.com",
  "password": "DeepLog2026"
}
```

La API valida los datos, normaliza el email y guarda un hash bcrypt. La
contraseña nunca se devuelve en la respuesta.

## Iniciar sesion

`POST http://localhost:3000/api/v1/auth/login`

```json
{
  "email": "carlos@example.com",
  "password": "DeepLog2026"
}
```

La respuesta contiene un JWT de acceso con una duracion predeterminada de
15 minutos. El refresh token no aparece en el JSON: se entrega como cookie
`httpOnly`, `SameSite=Strict` y `Secure` en produccion.

```json
{
  "data": {
    "user": {
      "id": "1",
      "firstName": "Carlos",
      "lastName": "Cano",
      "secondLastName": "Canton",
      "email": "carlos@example.com"
    },
    "accessToken": "eyJ...",
    "tokenType": "Bearer",
    "expiresIn": "15m"
  }
}
```

## Consultar el usuario autenticado

`GET http://localhost:3000/api/v1/auth/me`

Incluye el token recibido durante el login:

```http
Authorization: Bearer eyJ...
```

Si el token falta, ha caducado o no es valido, la API devuelve `401`.

## Registrar una inmersion

`POST http://localhost:3000/api/v1/dives`

La ruta requiere el encabezado `Authorization: Bearer eyJ...`.

```json
{
  "name": "Bahia Principe",
  "date": "2026-07-12",
  "durationMinutes": 48,
  "maxDepthMeters": 18.5,
  "ballastKg": 6,
  "equipmentOwnership": "owned",
  "buddies": ["Ana Lopez", "Marcos Ruiz"],
  "diveCenter": "Costa Brava Diving",
  "comments": "Buena visibilidad y corriente suave."
}
```

La fecha no puede estar en el futuro, la duracion debe estar entre 1 y 300
minutos y la profundidad entre 0 y 150 metros.

`ballastKg` y `equipmentOwnership` son opcionales. El lastre admite valores
entre 0 y 20 kg con hasta dos decimales. El material acepta `owned` para
material propio o `rented` para material de alquiler. Las inmersiones antiguas
mantienen ambos campos con valor `null` hasta que se editen.

`buddies` es opcional y acepta hasta 10 nombres, de 2 a 80 caracteres cada
uno. En la interfaz se escriben separados por comas y se conservan en el orden
indicado.

## Fotografias de una inmersion

Las fotografias se gestionan despues de crear la inmersion y siempre requieren
el JWT del propietario:

```text
POST   /api/v1/dives/:diveId/photos
GET    /api/v1/dives/:diveId/photos/:photoId/content
DELETE /api/v1/dives/:diveId/photos/:photoId
```

La subida usa `multipart/form-data`, con el campo repetido `photos`. Cada
inmersion admite hasta 5 imagenes JPEG, PNG o WebP, de un maximo de 8 MB cada
una. La API verifica tanto el MIME como la firma binaria del archivo.

En desarrollo los binarios se guardan en el volumen Docker persistente
`dive_uploads`; PostgreSQL conserva solo sus metadatos y la relacion con la
inmersion. No existe una carpeta publica: la descarga comprueba usuario,
inmersion y foto antes de servir el contenido.

## Listar mis inmersiones

`GET http://localhost:3000/api/v1/dives`

La ruta requiere autenticacion y solo devuelve las inmersiones asociadas al
usuario del JWT, ordenadas desde la mas reciente.

```json
{
  "data": {
    "dives": []
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Filtros disponibles:

```text
GET /api/v1/dives?page=1&limit=20
GET /api/v1/dives?dateFrom=2025-01-01&dateTo=2025-12-31
GET /api/v1/dives?diveCenter=costa
GET /api/v1/dives?minDepth=10&maxDepth=30
```

Los filtros pueden combinarse. `limit` acepta entre 1 y 100 resultados.

## Consultar una inmersion

`GET http://localhost:3000/api/v1/dives/:diveId`

Solo el propietario puede consultarla. Un ID inexistente o perteneciente a
otro usuario devuelve `404`.

## Estadisticas del dashboard

`GET http://localhost:3000/api/v1/dives/stats`

La ruta requiere autenticacion y calcula sobre todas las inmersiones del
usuario, no solo sobre la pagina visible:
- total de inmersiones y minutos acumulados,
- profundidad maxima y profundidad media,
- inmersion mas duradera como record personal,
- inmersiones del año actual,
- centro de buceo mas visitado,
- actividad mensual de los ultimos seis meses.

Las agregaciones se ejecutan en PostgreSQL y se vuelven a consultar despues de
crear, editar o eliminar una inmersion.

## Editar una inmersion

`PUT http://localhost:3000/api/v1/dives/:diveId`

El cuerpo utiliza los mismos campos y validaciones que el registro de una
inmersion. La actualizacion es completa, no parcial.

## Eliminar una inmersion

`DELETE http://localhost:3000/api/v1/dives/:diveId`

Si se elimina correctamente devuelve `204 No Content`. La operacion siempre
filtra simultaneamente por ID y propietario.

## Pruebas automatizadas

La primera suite de integracion se adelanto al cierre de la Semana 5 para fijar
los contratos del backend antes de comenzar el frontend.

```bash
docker compose exec backend npm test
```

La suite crea usuarios temporales, prueba auth y CRUD contra PostgreSQL real, y
elimina esos datos al finalizar.

Comprobacion de sintaxis:

```bash
docker compose exec backend npm run check
```

Estado actual: 13 pruebas superadas, 0 fallos. La suite tambien comprueba que
una fotografia es accesible para su propietario, no para otro usuario, y que
puede eliminarse. Las estadisticas se verifican con datos reales y aislamiento
entre usuarios. Tambien valida las cabeceras HTTP y el bloqueo temporal tras
varios intentos de login fallidos.

## Recuperar la contraseña

La pantalla de acceso incluye `He olvidado mi contraseña` y utiliza dos rutas:

```text
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

Funcionamiento:
- la solicitud responde igual exista o no el correo para evitar enumerar
  cuentas,
- el token aleatorio se guarda en PostgreSQL solo como hash SHA-256,
- caduca a los 30 minutos,
- cada token solo puede utilizarse una vez,
- solicitar uno nuevo invalida los anteriores,
- la contraseña nueva se guarda con bcrypt.

En desarrollo local, la API devuelve el token al propio frontend y abre
directamente el formulario de nueva contraseña. En produccion no se devuelve:
sera necesario configurar un proveedor de correo para enviar un enlace del
tipo `/?resetToken=...`.

## Validacion de formularios

Login, registro, recuperacion e inmersiones muestran el error debajo del campo
afectado, lo marcan visualmente y colocan el foco en el primer dato incorrecto.
Las credenciales invalidas señalan correo y contraseña conjuntamente para no
revelar si una cuenta concreta existe.

## Frontend actual

Las Semanas 6, 7 y 8 incluyen:
- registro,
- login,
- restauracion de sesion,
- cierre de sesion,
- listado paginado de inmersiones,
- ficha completa de solo lectura al pulsar cualquier inmersion,
- alta y edicion mediante un formulario reutilizable,
- registro de hasta 10 companeros por inmersion,
- galeria privada de hasta 5 fotografias por inmersion,
- eliminacion con confirmacion,
- acciones disponibles desde cada tarjeta,
- estados de carga, error y lista vacia,
- dashboard con metricas globales y grafica de actividad de seis meses,
- diseno responsive para escritorio y movil.

Navegacion por pestañas:
- la aplicacion se divide en cinco secciones: Inicio, Inmersiones, Mapa,
  Estadisticas y Perfil,
- cada seccion tiene su direccion (`#/inicio`, `#/inmersiones`, `#/mapa`,
  `#/estadisticas`, `#/perfil`): atras, recargar y los marcadores funcionan,
- un enlace directo sin sesion abierta lleva a esa seccion tras iniciar sesion,
- en escritorio las pestañas van arriba; en movil, en una barra inferior,
- las pestañas forman una escala de profundidad (0, 10, 20, 30 y 40 m),
- Inicio resume la bitacora: saludo, cifras clave, ultima inmersion y las
  cuatro anteriores, con acceso directo a su ficha,
- al cambiar de pestaña el foco pasa al titulo de la seccion para lectores de
  pantalla y navegacion con teclado.

Modo claro y oscuro:
- dos temas: Superficie (claro) y Abismo (oscuro); por defecto DeepLog sigue
  el ajuste del sistema (Automatico),
- se cambia desde el interruptor de la cabecera o en Perfil > Apariencia, y la
  eleccion se recuerda en ese dispositivo,
- el tema se aplica antes de pintar la pagina (`js/theme-init.js`), sin
  parpadeos, y respeta la CSP porque el script se sirve desde la propia app,
- todos los colores de `styles.css` son variables: cada tema solo cambia sus
  valores.

Estilo visual «B · Abismo» (elegido entre tres propuestas en Figma):
- tipografias Sora (textos) e IBM Plex Mono (cifras y etiquetas), alojadas en
  `frontend/fonts/` con su licencia OFL; no se cargan de servicios externos,
- en Abismo, fondo de mar profundo con rayos de luz y particulas que brillan;
  en Superficie se mantienen las burbujas,
- la tarjeta de ultima inmersion dibuja un perfil aproximado (descenso, fondo
  y parada de seguridad) calculado solo con la profundidad maxima y la
  duracion, y lo indica asi; DeepLog no guarda datos de ordenador de buceo,
- cada inmersion de la bitacora muestra una barra de profundidad (0-40 m),
- el mapa ocupa la pantalla en su propia pestaña.

Animaciones:
- al cambiar de pestaña hacia la derecha el contenido sube como si bajaras
  mas profundo; hacia la izquierda, baja como si volvieras a la superficie,
- el cambio de tema se extiende en circulo desde el boton pulsado (en
  navegadores sin View Transitions cambia al instante),
- las cifras de Inicio cuentan hasta su valor, el perfil de la ultima
  inmersion se dibuja solo, las barras de profundidad se llenan y las listas y
  tarjetas aparecen escalonadas; botones y tarjetas responden al pulsar,
- Perfil > Apariencia > «Reducir animaciones» las quita en ese dispositivo; si
  el sistema ya pide reducir movimiento, DeepLog lo respeta siempre.

Direccion visual:
- composicion minimalista y editorial inspirada en la claridad de Apple,
- identidad propia con degradados azul/turquesa y tonos pastel,
- tipografia nativa del sistema en macOS,
- superficies luminosas, translucidas y con espacio visual amplio,
- seis corrientes animadas que simulan exhalaciones con grupos de burbujas,
- escala visual de profundidad entre 0 y 40 metros,
- identidad visual con logo vectorial propio en forma de `D`,
- capas de profundidad y burbujas centrales en el simbolo de marca.

Alcance funcional actual:
- el registro crea usuarios reales en PostgreSQL,
- el login devuelve una sesion JWT real,
- tras acceder se muestra el listado paginado del usuario,
- crear, editar y eliminar operan contra la API y PostgreSQL,
- las tarjetas se abren con clic, `Enter` o barra espaciadora sin entrar en
  modo edicion,
- el listado se actualiza despues de cada operacion,
- los formularios aplican los mismos limites principales que el backend.

Referencia de producto:
- MySSI se usa para estudiar como crece un logbook digital real,
- se adopta la prioridad por registro rapido e historial personal,
- companeros y fotografias ya forman parte del registro esencial,
- gases, inventario detallado, mapas, verificacion e importaciones quedan
  reservados para evoluciones posteriores,
- no se copia su marca ni su interfaz.

El JWT de acceso solo vive en memoria. Al recargar, el frontend rota la cookie
de refresh y obtiene un JWT nuevo; JavaScript no puede leer ese refresh token.
Las operaciones de sesion exigen además un token CSRF ligado al registro del
servidor. El usuario puede cerrar la sesion actual o revocar todas las sesiones.

## Configuracion JWT

En desarrollo Docker utiliza un secreto local predeterminado. Para cualquier
entorno compartido o de produccion configura `JWT_SECRET` con un valor largo y
aleatorio. La API impide arrancar en produccion con el secreto de desarrollo.

## Produccion

La Semana 9 incorpora un stack separado en `compose.production.yml`:
- Caddy como unica entrada publica con HTTPS automatico,
- frontend, API y PostgreSQL sin puertos expuestos,
- red privada para datos y backend,
- imagen Node sin dependencias de desarrollo y ejecutada como usuario `node`,
- healthchecks encadenados antes de iniciar cada servicio,
- secretos obligatorios mediante `.env.production`,
- volumenes persistentes para datos, fotos y certificados.

La guia completa esta en `docs/DEPLOYMENT.md`. El despliegue publico efectivo
queda pendiente de elegir servidor y dominio.

## Exportar una inmersion a PDF

La Semana 11 convierte la ficha de una inmersion en una historia visual:
- abre la inmersion desde el logbook,
- selecciona las fotografias que quieres incluir,
- pulsa `Preparar PDF`,
- revisa el documento A4 y elige `Guardar como PDF` en el dialogo del navegador.

La version editorial incorpora portada marina, datos tecnicos, compañeros,
notas, fotografias seleccionadas y nombre del propietario. La generacion se
realiza en el navegador con datos ya autenticados; no crea copias publicas ni
envia recuerdos a servicios externos. JPEG, PNG y WebP se renderizan mediante
el motor nativo del navegador.

## Compartir una inmersion

La Semana 12 incorpora capsulas privadas de solo lectura:
- el propietario elige nombre, centro, equipo, compañeros, notas y fotografias,
- configura 1, 7 o 30 dias, sin caducidad, y contraseña opcional,
- comparte el enlace o codigo QR y puede revocarlo desde la ficha.

El token solo se entrega al crearlo y la base guarda su hash SHA-256. Las
contraseñas usan BCrypt y autorizan un JWT temporal limitado a esa capsula. La
vista publica no revela correo, perfil ni IDs internos, impide indexacion,
desactiva cache y elimina el token de las rutas escritas en logs.

## Memoria personal de configuracion

La Semana 13 amplia cada inmersion con tipo y grosor de traje, material y
capacidad de botella, y tipo de agua. Desde el formulario se pueden localizar
las cinco inmersiones propias mas recientes que coincidan con los campos
indicados y consultar el lastre que se registro entonces.

La memoria nunca rellena automaticamente el lastre ni formula recomendaciones:
solo recupera hechos del historial personal con fecha y centro. Los registros
anteriores siguen siendo compatibles porque todos los campos nuevos son
opcionales.

## Analisis personal avanzado

La Semana 14 transforma el historial en contexto util sin convertirlo en una
recomendacion de buceo:
- agrupa el lastre registrado por traje, botella y tipo de agua,
- compara duracion y profundidad medias con material propio y de alquiler,
- muestra compañeros y centros mas frecuentes,
- representa la evolucion de profundidad y duracion de las 12 inmersiones mas
  recientes.

Cada resultado indica su numero de registros. Las escalas de profundidad y
duracion son independientes y los promedios describen experiencias pasadas, no
condiciones controladas ni configuraciones seguras para una inmersion futura.

## Portabilidad y eliminacion de cuenta

La Semana 15 permite descargar el historial en JSON y CSV, o preparar un ZIP
con ambos formatos y todas las fotografias a resolucion completa (sin metadatos de ubicacion). Las inmersiones se leen
en lotes de 100 y los archivos se transmiten mientras se generan para mantener
acotado el uso de memoria.

La eliminacion definitiva exige contraseña y la confirmacion `ELIMINAR`. La
cuenta y sus relaciones se borran en una transaccion; despues se retiran los
binarios privados y los JWT anteriores dejan de funcionar. El contrato completo
esta documentado en `docs/DATA_EXPORT_FORMAT.md`.

## Diario de aprendizaje

La Semana 16 añade una reflexion privada posterior a cada inmersion: que salio
bien, que se puede mejorar, habilidad practicada, sensacion general, incidencias
y proximo objetivo. La evolucion aparece como cronologia textual, sin notas,
rankings ni recomendaciones de seguridad.

El diario se incluye en la ficha, PDF y exportaciones privadas. No se publica
en las capsulas compartidas. El guion para presentar el producto y sus decisiones
esta en `docs/DEMO_SCRIPT.md`.

## Valor como proyecto de portfolio

DeepLog demuestra una API REST modular, PostgreSQL con migraciones y constraints,
autenticacion y autorizacion, almacenamiento privado, Docker, observabilidad
basica, pruebas de integracion y un frontend responsive orientado a producto.
Cada funcion sensible documenta limites, privacidad y decisiones tecnicas.

## Contrato y estrategia de calidad

La Semana 17 formaliza las operaciones actuales en OpenAPI 3.1. El contrato
importable esta en `backend/openapi.json` y su fuente reproducible en
`backend/scripts/build-openapi.js`. Una prueba comprueba inventario completo,
`operationId` unicos y autenticacion declarada para recursos privados.

La piramide separa reglas sin infraestructura, comportamiento HTTP con
PostgreSQL y un recorrido E2E independiente de registro, login, alta y consulta:

```bash
docker compose exec backend npm run test:unit
docker compose exec backend npm run test:integration
docker compose exec backend npm run test:e2e
docker compose exec backend npm test
```

La priorizacion, evidencia y huecos pendientes se documentan en
`docs/TEST_STRATEGY.md`. El objetivo es cubrir primero autenticacion, propiedad,
borrado, comparticion y contrato; no perseguir una cifra de cobertura aislada.

## Integracion y entrega continuas

La Semana 19 incorpora dos workflows:

- `CI` ejecuta sintaxis, consistencia OpenAPI, la suite completa contra PostgreSQL 16,
  auditoria desde nivel moderado y builds Docker de desarrollo y produccion.
- `Deploy` permite promover un SHA inmutable a staging o produccion, exige el
  CI completo, crea un backup previo y conserva el commit anterior para rollback.

`production` se diseña como GitHub Environment con aprobacion obligatoria. Los
workflows estan validados localmente, pero su ejecucion remota queda pendiente
de crear el repositorio GitHub y configurar servidor y secretos. El proceso y
sus limites se describen en `docs/RELEASE_STRATEGY.md`.

## Robustez operativa

La Semana 10 incorpora:
- copias automaticas de PostgreSQL y fotografias cada 24 horas,
- conservacion configurable de 14 dias y hashes SHA-256 de cada archivo,
- logs HTTP JSON con identificador de peticion, estado y duracion,
- limites independientes para login, registro y recuperacion de contraseña,
- cabeceras de seguridad con Helmet y cuerpos JSON limitados a 100 KB,
- ausencia deliberada de CORS: frontend y API comparten origen y la API no
  autoriza peticiones de navegadores desde otros dominios.

Los logs no incluyen contraseñas, tokens, cuerpos de peticion ni direcciones
IP. El rate limiting utiliza memoria local mientras exista una sola instancia;
si se escala horizontalmente se sustituira por un almacen compartido.

## Observabilidad con privacidad

La Semana 20 sustituye el logger manual por Pino y añade readiness de base de
datos, captura opcional con Sentry y telemetria minima del navegador. Las
señales se correlacionan mediante `X-Request-ID`; las rutas omiten query strings
y redactan tokens publicos.

Produccion incorpora un watchdog que revisa la aplicacion cada cinco minutos y
exige una copia completa con menos de 26 horas. Puede enviar a un webhook solo
el tipo de fallo. Sentry y alertas permanecen desactivados hasta configurar
`SENTRY_DSN` y `MONITOR_WEBHOOK_URL`; el monitor externo se activara al publicar.
La politica completa esta en `docs/OBSERVABILITY.md`.

## Perfil personal y accesibilidad

La Semana 21 incorpora un perfil privado con fotografia protegida, biografia,
certificacion, año de inicio y preferencia para mostrar el nombre en nuevos
enlaces. La foto y la biografia nunca forman parte de las capsulas QR. Los
records siguen siendo personales y no existe ranking entre usuarios.

La interfaz añade salto al contenido, foco visible, tabs por teclado y estados
anunciables. La matriz WCAG 2.2 AA y sus pruebas manuales estan en
`docs/ACCESSIBILITY_AUDIT.md`.

La Semana 22 añade coordenadas opcionales con precision exacta o aproximada. La
opcion aproximada se redondea a dos decimales antes de persistir; el mapa es
privado, no usa tiles externos y las ubicaciones no se incluyen en capsulas QR.
El mapa dibuja los continentes con datos de Natural Earth (dominio publico)
servidos por el propio Nginx, se encuadra solo sobre tus inmersiones y agrupa
las cercanas: pulsar un grupo acerca la vista y, si son del mismo punto, las
lista. Para regenerar los datos, ver `ops/build-world-map.js`.
La PWA guarda el shell y una copia local de consulta, pero exige conexion para
cualquier escritura. La politica se documenta en `docs/OFFLINE_STRATEGY.md`.

## Estructura
- `backend/`: API Express (modular)
- `backend/src/database/migrations/`: migraciones versionadas de PostgreSQL
- `backend/tests/integration/`: pruebas HTTP contra PostgreSQL
- `backend/tests/unit/`: reglas aisladas y consistencia OpenAPI
- `backend/tests/e2e/`: recorrido critico completo contra PostgreSQL
- `backend/openapi.json`: contrato OpenAPI 3.1 importable
- volumen `dive_uploads`: binarios privados de fotografias en desarrollo
- `frontend/`: cliente HTML/CSS/JS servido por Nginx
- `frontend-react-poc/`: vertical React + TypeScript aislada de la Semana 23
- `frontend/js/api.js`: acceso centralizado a la API
- `frontend/js/app.js`: estado y comportamiento de la interfaz
- `frontend/js/dive-pdf.js`: documento editorial A4 y previsualizacion PDF
- `frontend/js/public-share.js`: ficha publica y acceso mediante contraseña
- `docker-compose.yml`: orquestacion local
- `compose.production.yml`: orquestacion segura para servidor publico
- `Caddyfile`: terminacion TLS, proxy y cabeceras de seguridad
- `ops/`: scripts de copia atomica y monitorizacion de disponibilidad/backups
- `docs/DEPLOYMENT.md`: preparacion de servidor, DNS y puesta en marcha
- `.github/workflows/ci.yml`: quality gate para push y pull request
- `.github/workflows/deploy.yml`: promocion manual y aprobada por entorno
- `docs/RELEASE_STRATEGY.md`: staging, migraciones, entrega y rollback
- `docs/OBSERVABILITY.md`: señales, redaccion, retencion y alertas
- `docs/ACCESSIBILITY_AUDIT.md`: revision WCAG, evidencia y pruebas manuales
- `docs/OFFLINE_STRATEGY.md`: cache local, privacidad y resolucion de conflictos
- `docs/FRONTEND_EVOLUTION_ADR.md`: metricas y decision sobre React/Next/Tailwind

## Siguiente paso
Preparar la Semana 24: produccion, portfolio y validacion con buceadores. La POC
React + TypeScript queda disponible en `http://localhost:8081` mediante el perfil
Compose `poc`; el producto estable continua en `http://localhost:8080`.
La publicacion de la Semana 9 sigue pendiente hasta que se decidan servidor y
dominio, pero no bloquea el desarrollo local.
