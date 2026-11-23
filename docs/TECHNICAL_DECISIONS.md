# Decisiones tecnicas - DeepLog 2.0

Este documento registra cambios relevantes sobre el plan original. Cada
decision incluye contexto, motivo e impacto para evitar que arquitectura y
roadmap diverjan sin explicacion.

## TD-001 - Pruebas automatizadas antes del frontend

Fecha: 2026-07-16

Estado: Aceptada

Contexto:
El roadmap inicial situaba el testing completo en una fase posterior. Al cerrar
la Semana 5, el backend ya contiene autenticacion, permisos por propietario,
validaciones, filtros, paginacion y CRUD completo.

Decision:
Introducir una primera suite automatizada de integracion antes de comenzar la
Semana 6.

Motivo:
- Fijar los contratos HTTP que consumira el frontend.
- Detectar regresiones de permisos y aislamiento de datos.
- Sustituir parte de las comprobaciones manuales repetitivas.
- Mantener la velocidad de desarrollo sin reducir confianza.

Implementacion:
- Node Test Runner para ejecutar pruebas.
- Supertest para realizar peticiones a Express.
- PostgreSQL real dentro de Docker.
- Usuarios temporales eliminados al finalizar la suite.

Cobertura inicial:
- Auth obligatoria.
- Crear, consultar, editar y eliminar inmersiones.
- Bloqueo de lectura, edicion y borrado entre usuarios.
- Filtros y paginacion.
- Validacion de rangos.

Resultado inicial:
- 7 pruebas superadas.
- 0 fallos.

Impacto en roadmap:
- El testing inicial pasa al Quality Gate posterior a Semana 5.
- La fase de evolucion tecnica conserva la ampliacion de cobertura, unit tests
  y CI/CD.

## TD-002 - Actualizacion completa con PUT

Fecha: 2026-07-16

Estado: Aceptada

Decision:
La edicion de inmersiones usa `PUT /api/v1/dives/:diveId` y exige todos los
campos obligatorios.

Motivo:
El formulario de edicion del frontend trabajara inicialmente con la entidad
completa. `PATCH` se pospone hasta que exista una necesidad real de
actualizaciones parciales.

## TD-003 - Recursos ajenos responden 404

Fecha: 2026-07-16

Estado: Aceptada

Decision:
Consultar, editar o eliminar una inmersion ajena devuelve `404 DIVE_NOT_FOUND`.

Motivo:
No revelar si un identificador pertenece a otro usuario. Todas las consultas
sensibles filtran por `id` y `user_id` en la misma operacion SQL.

## TD-004 - Frontend inicial sin framework

Fecha: 2026-07-16

Estado: Aceptada

Decision:
Implementar la primera interfaz con HTML semantico, CSS y JavaScript modular.

Motivo:
- Introducir una sola capa nueva en esta fase.
- Comprender formularios, DOM, modulos y `fetch` antes de abstraerlos.
- Validar UX y contratos antes de decidir una migracion a React.

Consecuencias:
- No existe proceso de compilacion frontend.
- Nginx sirve archivos estaticos directamente.
- La logica API esta separada en `frontend/js/api.js`.
- Una migracion futura podra reutilizar endpoints y decisiones visuales.

## TD-005 - Nginx como entrada web local

Fecha: 2026-07-16

Estado: Aceptada

Decision:
Servir el frontend en `localhost:8080` y reenviar `/api` al backend desde
Nginx.

Motivo:
- Frontend y API comparten origen.
- No es necesario habilitar CORS en desarrollo.
- La topologia se aproxima a un despliegue real con reverse proxy.

## TD-006 - JWT temporal en sessionStorage

Fecha: 2026-07-16

Estado: Reemplazada por TD-026

Decision:
Guardar el access token en `sessionStorage` durante la fase frontend inicial.

Motivo:
- La sesion desaparece al cerrar la pestana.
- Implementacion sencilla para aprender el flujo JWT.
- Menor persistencia que `localStorage`.

Riesgo:
Un XSS podria leer el token porque sigue accesible para JavaScript.

Revision prevista:
Antes de produccion se evaluaran cookies seguras `httpOnly`, refresh tokens y
proteccion CSRF.

## TD-007 - Direccion visual inspirada en Apple

Fecha: 2026-07-16

Estado: Aceptada

Decision:
Usar como referencia los principios visuales de la web oficial de Apple:
jerarquia tipografica fuerte, mensajes breves, mucho espacio negativo,
navegacion discreta, acciones claras y movimiento contenido.

Adaptacion a DeepLog:
- Paleta propia de azules, turquesas y tonos pastel marinos.
- Degradados atmosfericos inspirados en profundidad, luz y agua.
- Superficies translucidas y limpias sin copiar componentes de Apple.
- Titulares editoriales y contenido centrado en la experiencia del buceador.

Limite:
Apple se utiliza como referencia de composicion y claridad, no como plantilla
para copiar marca, recursos, textos o interfaces propietarias.

## TD-008 - Logo definitivo vectorial

Fecha: 2026-07-16

Estado: Aceptada

Decision:
Adoptar la propuesta final numero 6: una `D` formada por capas de profundidad,
con una columna central de burbujas.

Implementacion:
- Reinterpretacion propia en SVG.
- Un unico recurso para cabecera, navegacion y favicon.
- Degradado desde turquesa de superficie hasta azul profundo.

Motivo:
- Mantiene legibilidad en tamanos pequenos.
- Une la inicial de DeepLog con profundidad, agua y respiracion.
- El formato vectorial evita perdida de calidad y reduce dependencia de
  imagenes rasterizadas.

## TD-009 - MySSI como referencia funcional, no visual

Fecha: 2026-07-16

Estado: Aceptada

Contexto:
MySSI representa un producto de buceo maduro que integra logbook, formacion,
certificaciones, centros, eventos, equipo, reconocimientos e importacion desde
ordenadores de buceo.

Decision:
Usar MySSI para identificar necesidades reales y posibles capas futuras, pero
mantener DeepLog centrado inicialmente en una bitacora personal sencilla.

Principios adoptados:
- Registro de una inmersion con acceso inmediato.
- Historial como centro de la experiencia.
- Informacion esencial visible antes que los detalles avanzados.
- Crecimiento progresivo hacia estadisticas, ubicaciones y datos enriquecidos.

Elementos pospuestos:
- Equipo y mantenimiento.
- Gases, perfiles y datos de ordenador de buceo.
- Centros y verificaciones.
- Fauna estructurada, mapas y eventos.
- Certificaciones y contenido formativo.

Compañeros y fotografias, inicialmente pospuestos, se incorporaron el
2026-08-04 una vez estabilizado el CRUD esencial. Su alcance se documenta en
TD-013.

Motivo:
Introducir todas esas areas ahora aumentaria el modelo de datos, la navegacion
y la carga cognitiva antes de validar el flujo esencial. El roadmap mantiene
esas posibilidades sin convertir la Semana 7 en una imitacion de MySSI.

Limite:
SSI no se usa como referencia de marca ni como plantilla visual. DeepLog
conserva su identidad marina pastel, su jerarquia editorial y su interfaz
minimalista.

## TD-010 - Recuperacion de contraseña con tokens opacos

Fecha: 2026-08-03

Estado: Aceptada para desarrollo; entrega por email pendiente en produccion

Decision:
La recuperacion utiliza un token aleatorio de 32 bytes. PostgreSQL almacena
solo su hash SHA-256, junto al usuario, fecha de caducidad y fecha de uso.

Garantias:
- Caducidad de 30 minutos.
- Un solo uso mediante transaccion y bloqueo `FOR UPDATE`.
- Un token nuevo invalida solicitudes anteriores.
- La respuesta no confirma si el correo existe.
- La contraseña final se vuelve a proteger con bcrypt.

Desarrollo local:
El token se devuelve al frontend para que el flujo pueda probarse sin un
servicio externo de correo.

Produccion:
El token nunca se incluira en la respuesta. Se enviara un enlace por correo y
se añadira rate limiting antes del despliegue publico.

## TD-011 - Errores inline y cache de desarrollo

Fecha: 2026-08-03

Estado: Aceptada

Decision:
Los errores de validacion se asocian al control concreto mediante mensaje
inline, `aria-invalid`, foco en el primer error y resumen general cuando sea
necesario.

Excepcion de seguridad:
Un login incorrecto marca conjuntamente email y contraseña. No se revela cual
de los dos datos fallo porque eso permitiria comprobar si una cuenta existe.

Cache local:
Nginx usa `Cache-Control: no-store` para archivos estaticos y los modulos se
referencian con version. En produccion se sustituira por nombres con hash y
cache larga.

Actualizacion (2026-11-23): se aplica el plan anunciado usando la version
`?v=` como equivalente del hash. `nginx.conf` sirve `js/`, `styles/`, `fonts/`
y `assets/` con `max-age=31536000, immutable` solo cuando la URL lleva `?v=`
(sin version: `no-cache`; un 404 no se cachea). El HTML pasa a `no-cache`,
que permite la back/forward cache, salvo las URL con `?share=` o
`?resetToken=`, que siguen en `no-store`. `service-worker.js` y el manifiesto
siguen en `no-cache`. El service worker usa cache-first para archivos
versionados y network-first para navegaciones, y nunca guarda una navegacion.
Requisito: cambiar un archivo exige subir su `?v=` (y el `CACHE` del worker);
`tests/pwa-shell.test.js` comprueba que cada import usa la version precacheada.

Correccion descubierta:
Deshabilitar controles antes de construir `FormData` los excluia del payload.
El estado ocupado utiliza ahora `readOnly`, conservando los valores enviados.

## TD-012 - Lastre y procedencia del material

Fecha: 2026-08-03

Estado: Aceptada

Decision:
Cada inmersion puede registrar `ballastKg` y `equipmentOwnership`.

Reglas:
- El lastre es opcional y admite de 0 a 20 kg.
- Se conservan hasta dos decimales.
- El material puede ser propio (`owned`) o de alquiler (`rented`).
- Ambos campos son nulos en inmersiones anteriores que no tengan el dato.

Motivo:
El lastre es un dato relevante para ajustar la flotabilidad en futuras
inmersiones. Distinguir material propio y alquilado aporta contexto sin crear
todavia un modulo completo de inventario y mantenimiento de equipo.

## TD-013 - Compañeros y galeria privada de inmersion

Fecha: 2026-08-04

Estado: Aceptada para desarrollo; almacenamiento cloud pendiente para produccion

Decision:
Los compañeros se modelan en `dive_buddies`, asociados a una inmersion y con
orden estable. No se guardan como un unico texto porque la estructura permitira
buscar, agrupar o evolucionar hacia contactos sin migrar datos ambiguos.

Las fotografias se modelan en `dive_photos`. PostgreSQL conserva metadatos y
una clave aleatoria; los binarios se guardan fuera de la base de datos. En el
entorno Docker actual se usa el volumen persistente `dive_uploads`.

Seguridad y limites:
- hasta 10 compañeros, con nombres de 2 a 80 caracteres,
- hasta 5 fotografias por inmersion y 8 MB por archivo,
- formatos JPEG, PNG y WebP,
- validacion de MIME y firma binaria,
- nombres de almacenamiento generados con UUID,
- lectura y borrado protegidos por JWT y propiedad de la inmersion,
- eliminacion en cascada de metadatos y limpieza del archivo al borrar.

Motivo:
Son recuerdos esenciales del contexto humano y visual de una inmersion, pero
se mantienen acotados para no convertir el logbook en una red social ni en un
gestor multimedia complejo.

Produccion:
El contrato HTTP y el modelo de metadatos permiten sustituir el volumen local
por almacenamiento de objetos compatible con S3 sin cambiar el frontend. Antes
del despliegue se añadiran redimensionado, miniaturas, eliminacion de metadatos
EXIF y analisis antimalware si el producto admite usuarios externos.

## TD-014 - Consulta separada de la edicion

Fecha: 2026-08-04

Estado: Aceptada

Decision:
Pulsar una tarjeta abre una ficha de solo lectura con todos los datos y la
galeria privada. La edicion permanece como una accion explicita e independiente.

Accesibilidad:
- toda la tarjeta admite clic,
- puede abrirse con `Enter` o barra espaciadora,
- conserva foco visible y nombre accesible,
- los botones Editar y Eliminar no activan accidentalmente la ficha.

Motivo:
Consultar recuerdos es una accion mucho mas frecuente que modificarlos. Separar
ambos flujos reduce cambios accidentales y permite presentar la informacion con
una jerarquia optimizada para lectura.

## TD-015 - Estadisticas agregadas en PostgreSQL

Fecha: 2026-08-04

Estado: Aceptada

Decision:
El dashboard consulta `GET /api/v1/dives/stats`. PostgreSQL calcula las metricas
sobre el conjunto completo del usuario autenticado y devuelve un contrato
independiente de la paginacion del logbook.

Metricas actuales:
- total y tiempo acumulado,
- profundidad maxima y media,
- inmersion mas duradera como record personal,
- actividad del año actual,
- centro mas visitado,
- serie mensual de los ultimos seis meses.

Motivo:
Calcular en el navegador obligaria a descargar todas las inmersiones y podria
producir cifras incorrectas al paginar. La agregacion en base de datos reduce
transferencia, conserva el aislamiento por usuario y escala mejor.

Frontend:
Las estadisticas se actualizan en paralelo con el listado al entrar, refrescar
o completar una operacion CRUD. La grafica usa HTML y CSS sin añadir una
dependencia de visualizacion durante esta fase.

## TD-016 - Stack de produccion con Caddy

Fecha: 2026-08-06

Estado: Aceptada; publicacion pendiente de servidor y dominio

Decision:
Mantener un Compose de desarrollo y otro de produccion. Produccion incorpora
Caddy como unica entrada publica y conserva Nginx como servidor del frontend y
proxy de `/api`.

Topologia:
- Caddy publica 80/443 y gestiona TLS automatico.
- Nginx solo pertenece a redes Docker y sirve la aplicacion.
- Express y PostgreSQL permanecen en una red marcada como interna.
- PostgreSQL, Express y Nginx no publican puertos del host.

Imagen backend:
- instala solo dependencias de produccion,
- arranca con `npm start` sin `nodemon`,
- se ejecuta con el usuario no privilegiado `node`,
- conserva escritura exclusivamente en el volumen de fotografias.

Configuracion:
- Compose exige dominio, email ACME, credenciales DB y secreto JWT,
- la API rechaza secretos de desarrollo, cortos o valores de ejemplo,
- los healthchecks encadenan DB, API, frontend y entrada publica,
- certificados, PostgreSQL y fotografias usan volumenes persistentes.

Motivo:
Caddy reduce la configuracion operativa de certificados y renovaciones sin
mezclar TLS con el contenedor del frontend. Separar los Compose evita bind
mounts, puertos y herramientas de desarrollo en el servidor publico.

Validacion:
El stack se probo completo con base de datos nueva, migraciones, cabeceras de
seguridad y una subida autenticada de 2 MB a traves de ambos proxies. Caddy
valido el archivo y las imagenes se construyeron con 0 vulnerabilidades de
produccion.

## TD-017 - Hardening y logs HTTP estructurados

Fecha: 2026-08-06

Estado: Aceptada

Decision:
- Helmet aplica cabeceras defensivas y Express oculta `X-Powered-By`.
- Los cuerpos JSON se limitan a 100 KB.
- Login, registro y recuperacion tienen limites independientes.
- Cada respuesta incluye `X-Request-ID` y cada peticion genera un log JSON con
  metodo, ruta, estado y duracion.
- No se habilita CORS porque frontend y API comparten origen.

Privacidad:
Los logs no almacenan cuerpos, contraseñas, tokens ni direcciones IP. Los
errores internos comparten el identificador de peticion para correlacionar la
respuesta con el registro del servidor.

Limite actual:
El contador de rate limiting vive en memoria y es correcto para una unica
instancia. Antes de ejecutar varias replicas debe utilizarse un almacen
compartido, por ejemplo Redis.

## TD-018 - Copia conjunta de base de datos y fotografias

Fecha: 2026-08-06

Estado: Aceptada

Decision:
El stack de produccion crea una copia inmediata al arrancar y despues una cada
24 horas. Cada conjunto contiene un `pg_dump` en formato custom, un archivo
comprimido de fotografias y hashes SHA-256. Se conserva durante 14 dias por
defecto y se publica mediante renombrado atomico.

Orden de arranque:
El servicio espera a que el backend este saludable, no solo PostgreSQL, para
asegurar que las migraciones han terminado antes de la primera copia.

Validacion:
Se comprobaron los hashes y se restauro el volcado en una base vacia; la copia
recuperada contenia las cinco migraciones actuales.

Limite actual:
`BACKUP_HOST_PATH` reside inicialmente en el host. Antes de admitir usuarios
reales debe replicarse fuera del servidor para cubrir la perdida total de la
maquina.

## TD-019 - PDF editorial generado en el navegador

Fecha: 2026-08-28

Estado: Aceptada

Decision:
Generar una vista A4 imprimible en una pestaña separada a partir de la ficha
autenticada. El usuario selecciona las fotografias y utiliza el dialogo nativo
del navegador para guardar el resultado como PDF.

Contenido:
- portada con identidad marina y relato factual de la inmersion,
- fecha, duracion, profundidad, centro, lastre y material,
- compañeros y notas respetando saltos de linea,
- hasta cinco fotografias JPEG, PNG o WebP seleccionadas,
- nombre del propietario y marca DeepLog.

Motivo:
El navegador ya ha cargado y autorizado los datos y binarios privados. Su motor
de impresion aporta paginacion A4 y compatibilidad con todos los formatos de
imagen admitidos sin duplicar archivos en el servidor, exponer URLs publicas o
añadir una dependencia de PDF y conversion de imagen al backend.

Privacidad y limite:
La vista solo existe localmente y no cambia la privacidad de la inmersion. La
descarga requiere elegir `Guardar como PDF` en la interfaz de impresion del
navegador; no es una descarga silenciosa. Los enlaces compartibles se
implementaran por separado en la Semana 12 con controles de caducidad y
revocacion.

Validacion:
Se verificaron compilacion, escape de contenido, datos con tildes, notas
multilinea, seleccion de fotografias, diseño editorial, maquetacion responsive
y apertura desde una ficha real. La suite conserva 13 pruebas superadas y 0
vulnerabilidades de produccion.

## TD-020 - Capsulas privadas mediante enlace y QR

Fecha: 2026-09-02

Estado: Aceptada

Decision:
Cada capsula utiliza 32 bytes aleatorios y conserva solo el hash SHA-256 del
token. El propietario selecciona campos y fotografias, caducidad y contraseña;
los enlaces activos pueden revocarse sin modificar la inmersion original.

Seguridad y privacidad:
- la contraseña opcional se guarda con BCrypt,
- el desbloqueo emite un JWT de 15 minutos limitado a una unica capsula,
- las fotografias publicas se sirven por posicion y no por su ID interno,
- la ficha no expone correo, perfil ni IDs y declara `noindex,nofollow,noarchive`,
- respuestas y fotografias publicas usan `Cache-Control: no-store`,
- el logger sustituye el token de la ruta por `[redacted]`,
- los intentos publicos y de contraseña tienen limites independientes.

Limites:
El enlace original no puede recuperarse porque el token no se almacena. Si se
pierde, debe crearse otro. La URL y el QR usaran el dominio real cuando se
complete el despliegue pendiente de la Semana 9.

Validacion:
La migracion 006 esta aplicada. Se probaron permisos cruzados, visibilidad,
foto compartida, hash, contraseña, JWT temporal, revocacion y logs. Las 16
pruebas backend pasan y el flujo real se verifico en escritorio y a 390 px.

Auditoria:
`npm audit --omit=dev` informa de tres avisos moderados transitivos en `qs` sin
version corregida publicada. DeepLog no usa formularios URL-encoded y fuerza el
parser de query simple, por lo que no expone el parser afectado. Se actualizara
el bloqueo cuando el proveedor publique la correccion.

## TD-021 - Memoria historica sin recomendaciones

Fecha: 2026-09-02

Estado: Aceptada

Decision:
Cada inmersion puede registrar traje (`humedo`, `seco`, `shorty` o ninguno),
grosor de 0 a 15 mm, botella de acero o aluminio, capacidad de 3 a 20 litros y
agua salada o dulce. Todos los campos son opcionales para conservar registros
anteriores y admitir datos parciales.

La memoria busca hasta cinco inmersiones del usuario autenticado con lastre
registrado y coincidencia exacta en cada condicion informada. La inmersion que
se esta editando puede excluirse de los resultados.

Limite de seguridad:
La interfaz muestra fecha, centro y lastre como hechos historicos. No calcula
un lastre, no completa el formulario y repite que los resultados no son una
recomendacion. Las decisiones de configuracion siguen correspondiendo al
buceador, su formacion y las condiciones reales de la inmersion.

Validacion:
La migracion 007 esta aplicada. Las 17 pruebas backend verifican persistencia,
edicion, filtros, exclusion y aislamiento entre usuarios. El recorrido visual
recupero una experiencia coincidente sin alterar el lastre, sin errores de
consola y con una columna correcta a 390 px.

## TD-022 - Analisis descriptivo con contexto y tamaño de muestra

Fecha: 2026-09-09

Estado: Aceptada

Decision:
La API calcula las estadisticas con agregaciones SQL limitadas al usuario
autenticado. Expone patrones de lastre por configuracion, comparativa entre
material propio y de alquiler, tres compañeros y centros frecuentes, y las 12
inmersiones mas recientes en orden cronologico.

Presentacion:
- cada agrupacion informa del numero de registros utilizado,
- el lastre muestra media y rango observado,
- profundidad y duracion usan escalas visuales independientes,
- un unico registro se presenta como dato, no como tendencia,
- los estados sin datos explican que campos debe completar el usuario.

Limites:
Los promedios comparan registros historicos y no condiciones controladas. No
establecen causalidad, no generan rankings sociales y no recomiendan lastre,
equipo ni practicas de seguridad. La actividad semestral continua en el panel
general y la evolucion avanzada se limita a 12 inmersiones para mantenerla
legible.

Validacion:
Las 18 pruebas de integracion verifican calculos, orden temporal y aislamiento
entre usuarios. Se comprobo el panel con datos reales en el navegador, sus
etiquetas accesibles y la ausencia de errores o avisos en consola.

## TD-023 - Exportacion transmitida y borrado transaccional

Fecha: 2026-09-09

Estado: Aceptada

Decision:
DeepLog ofrece JSON versionado como formato canonico, CSV UTF-8 para analisis y
un ZIP con ambos documentos y las fotografias originales. Las inmersiones se
consultan en lotes de 100; JSON y CSV se escriben incrementalmente y Archiver
incorpora los binarios mediante streams.

Motivo:
El usuario puede abandonar la aplicacion conservando sus datos en formatos
abiertos. El procesamiento incremental evita que el tamaño total de las fotos o
del historial se replique en memoria. `sourceId` relaciona datos y carpetas sin
imponer IDs internos a una futura importacion.

Eliminacion:
Se exige la contraseña actual y la palabra `ELIMINAR`. Una transaccion bloquea
la cuenta, recoge las claves privadas y elimina el usuario; las claves foraneas
con cascada retiran inmersiones, compañeros, metadatos, enlaces y tokens. Los
archivos se borran despues del commit y cualquier JWT anterior falla al no
existir ya su usuario.

Limites:
La exportacion no crea un snapshot bloqueante, por lo que una modificacion
concurrente puede aparecer entre lotes. Las copias operativas respetan su
periodo de retencion antes de desaparecer. La politica exacta debe publicarse
antes del despliegue real.

Validacion:
Las 21 pruebas cubren formatos, cabeceras, tres lotes con 205 inmersiones, ZIP,
contraseña incorrecta, cascada, borrado fisico de fotos y token obsoleto. El
recorrido visual comprobo descarga, mensajes y confirmacion sin errores de
consola.

## TD-024 - Aprendizaje cualitativo y privado

Fecha: 2026-09-16

Estado: Aceptada

Decision:
La reflexion posterior vive en `dive_reflections`, con relacion uno-a-uno y
cascada respecto a la inmersion. Registra texto libre, habilidad, una sensacion
verbal entre tres opciones y proximo objetivo. No almacena puntuaciones.

Privacidad y producto:
La reflexion se muestra en la ficha, PDF y exportacion del propietario. Las
capsulas compartidas no la incluyen porque son datos personales y requeririan
una eleccion de visibilidad explicita. La cronologia enseña hasta ocho entradas
por fecha y reproduce las palabras del usuario sin inferir rendimiento.

Limites:
DeepLog no evalua capacidades ni ofrece consejos de seguridad. `comfortable`,
`mixed` y `challenging` describen una percepcion puntual, no nivel tecnico. La
evolucion no compara personas ni calcula tendencias numericas.

Validacion:
La migracion 008 esta aplicada. Las 23 pruebas comprueban validacion, propiedad,
aislamiento, cronologia y exportacion. El guardado real se verifico en navegador
sin errores de consola.

## TD-025 - Contrato ejecutable y pruebas por riesgo

Fecha: 2026-09-16

Estado: Aceptada

Decision:
La API publica un contrato OpenAPI 3.1 en JSON que enumera sus operaciones,
seguridad, entradas, limites y envoltorios de respuesta. El JSON se genera desde
un script versionado y una prueba compara el inventario esperado, evita
`operationId` duplicados y exige Bearer JWT en todos los recursos privados.

Estrategia:
La calidad se divide en unitarias sin infraestructura, integracion HTTP contra
PostgreSQL real y un E2E critico independiente. El E2E crea una cuenta, inicia
sesion, registra una inmersion y vuelve a consultarla. La matriz de riesgos da
prioridad a propiedad, autenticacion, borrado, comparticion y contrato sobre un
porcentaje de lineas sin contexto.

Motivo:
La separacion localiza fallos con rapidez y conserva pruebas realistas donde
importa la persistencia. OpenAPI convierte el comportamiento existente en un
contrato util para clientes futuros, documentacion, entrevistas y una posible
migracion de frontend sin cambiar `/api/v1`.

Limites:
Todavia no hay navegador E2E automatizado, CI ni proveedor de correo real. La
suite HTTP cubre el backend y las revisiones visuales siguen siendo manuales.
La Semana 19 ejecutara el mismo gate en GitHub Actions.

Validacion:
Las 10 pruebas unitarias pasan sin infraestructura. La suite completa supera
34 pruebas: 10 unitarias, 23 de integracion y 1 E2E contra PostgreSQL real. Los
comandos y la limpieza de datos estan definidos en `docs/TEST_STRATEGY.md`.

## TD-026 - Sesiones rotatorias, revocables y protegidas frente a CSRF

Fecha: 2026-09-16

Estado: Aceptada

Decision:
El access token JWT dura 15 minutos, solo vive en memoria y contiene la familia
de sesion. El refresh token es opaco, se almacena unicamente como SHA-256 y se
envia en una cookie `httpOnly`, `SameSite=Strict`, limitada a `/api/v1/auth` y
`Secure` en produccion. Cada uso crea un secreto nuevo e invalida el anterior.

Seguridad:
La renovacion y los cierres de sesion requieren una cookie CSRF legible y el
mismo valor en `X-CSRF-Token`; su hash tambien queda ligado a la sesion en la
base de datos. La reutilizacion de un refresh ya rotado revoca toda su familia.
El middleware comprueba que la familia del JWT sigue activa, por lo que logout,
logout global y cambio de contraseña invalidan el acceso inmediatamente.

Roles:
No se incorpora RBAC porque DeepLog solo tiene actualmente un actor autenticado:
el propietario de sus datos. Inventar roles sin administracion, moderacion o
colaboracion añadiria superficie de error sin resolver un caso de uso. Se
introduciran cuando exista una segunda responsabilidad real y sus permisos se
puedan definir y probar.

Limites:
Las sesiones expiran por defecto a los 30 dias y no almacenan IP ni agente de
usuario para evitar telemetria innecesaria. La cookie `Secure` solo aparece bajo
produccion/HTTPS; el entorno local HTTP conserva `httpOnly` y `SameSite`.

Validacion:
La migracion 009 crea `auth_sessions`. Las pruebas cubren atributos de cookies,
CSRF ausente, rotacion, reutilizacion, logout individual, logout global y
revocacion al cambiar la contraseña. OpenAPI documenta los tres endpoints y la
suite completa supera 42 pruebas sin fallos.

## TD-027 - CI estricto y despliegue por promocion de SHA

Fecha: 2026-09-16

Estado: Aceptada

Decision:
Cada push y pull request contra `main` debe superar sintaxis, OpenAPI
determinista, 42 pruebas contra PostgreSQL 16, auditoria npm desde severidad
moderada y construccion de imagenes de desarrollo y produccion. Las dependencias
se instalan exclusivamente con `npm ci` y el lockfile.

Entrega:
El despliegue es manual por entorno y recibe una revision que se resuelve a SHA
inmutable. Staging y produccion usan GitHub Environments y secretos separados;
produccion debe exigir aprobacion. Antes de actualizar se crea un backup y se
conserva el commit anterior para rollback de aplicacion.

Migraciones:
Se adopta expand/contract. Una migracion aplicada no se edita y la version
anterior debe tolerar las ampliaciones de esquema. El rollback de codigo no
revierte SQL; una alteracion destructiva exige ventana de mantenimiento y
restauracion de backup verificado.

Seguridad:
El workflow solo concede lectura de contenido. SSH usa una clave dedicada y un
`known_hosts` suministrado como secreto, nunca `ssh-keyscan` sin verificar. No se
usan actions de terceros para desplegar.

Limites:
Los YAML y todos los gates se han validado localmente. GitHub, los Environments,
el servidor y los secretos aun no existen, por lo que no se declara una entrega
remota realizada. La activacion se detalla en `docs/RELEASE_STRATEGY.md`.

Validacion:
42 pruebas y auditoria con 0 vulnerabilidades. Compose de desarrollo y produccion
validados; imagenes backend/frontend de ambos entornos construidas correctamente.

## TD-028 - Observabilidad minima y privada por defecto

Fecha: 2026-09-16

Estado: Aceptada

Decision:
Se adopta Pino por su JSON estructurado, rendimiento y redaccion central. Se
separan liveness y readiness; esta ultima consulta PostgreSQL. Sentry es
opcional y recibe solo excepciones manuales, sin integraciones automaticas,
trazas, usuario, peticion ni breadcrumbs.

Frontend:
El navegador no envia mensajes ni stacks. Una allowlist admite tipo, ruta local
sin query y linea/columna. `X-Request-ID` correlaciona capas sin identidad.

Operaciones:
Un watchdog comprueba disponibilidad y copias completas. El webhook recibe solo
codigos genericos. Se aceptan 14 dias de logs en staging, 30 en produccion y un
maximo de 90 para errores agregados. Vease `docs/OBSERVABILITY.md`.

Limites:
Sin servidor no hay Sentry, webhook ni monitor externo activos. El watchdog
interno no detecta la perdida completa del host.

Validacion:
La suite supera 42 pruebas, incluidas redaccion, allowlist y readiness con
PostgreSQL. OpenAPI inventaria 34 operaciones.

## TD-029 - Perfil privado y progreso sin ranking social

Fecha: 2026-09-30

Estado: Aceptada

Decision:
El perfil se modela como recurso uno-a-uno separado de autenticacion. Biografia,
certificacion y año son opcionales; `shareNameByDefault` empieza en `false`. La
foto se guarda en el volumen privado, valida MIME, firma y tamaño y requiere JWT.

Privacidad:
Foto y biografia no aparecen en enlaces. La preferencia solo preselecciona el
nombre y puede cambiarse antes de crear cada capsula. No hay perfil publico,
seguidores, puntos ni clasificacion global.

Accesibilidad:
Se versiona una matriz WCAG 2.2 AA y se añaden salto al contenido, foco visible,
teclado para tabs, estados vivos y formularios semanticos. VoiceOver, zoom,
reflow y contraste renderizado deben verificarse antes de produccion.

Validacion:
Migracion aplicada sobre PostgreSQL, OpenAPI con 39 operaciones, suite completa
de 46 pruebas y revision visual del dashboard y editor superadas. `npm audit`
informa 0 vulnerabilidades. VoiceOver, medicion de contraste y zoom extremo se
conservan como controles manuales previos a produccion.

## TD-030 - Ubicaciones privadas y PWA de solo lectura

Fecha: 2026-09-30

Estado: Aceptada

Decision:
Las coordenadas son opcionales y pertenecen exclusivamente al usuario. La
precision aproximada se redondea a dos decimales antes de guardarse. El mapa no
consume tiles externos y los enlaces QR no incluyen ubicacion.

Offline:
El service worker cachea solo recursos estaticos. La aplicacion conserva la
ultima pagina y mapa sincronizados para consulta durante una perdida de red,
elimina esa copia al cerrar sesion y no almacena tokens. Toda escritura requiere
servidor para evitar colas y conflictos invisibles.

Validacion:
Migracion `011`, OpenAPI con 40 operaciones, aislamiento por propietario,
redondeo aproximado y limites geograficos cubiertos. Suite: 47 pruebas.

## TD-031 - React gradual sin reescritura previa a produccion

Fecha: 2026-10-14

Estado: Aceptada

Decision:
La POC confirma React, TypeScript y TanStack Query como direccion futura, pero
el frontend vanilla seguira siendo el cliente de produccion de la Semana 24.
La migracion se realizara por verticales tras validar el producto, conservando
`/api/v1` y exigiendo paridad funcional, visual, accesible y de pruebas.

Descartado por ahora:
Next.js no aporta SSR necesario; Tailwind duplicaria el sistema CSS actual y
shadcn/ui alteraria componentes propios sin una carencia demostrada. El detalle
de metricas y alternativas esta en `docs/FRONTEND_EVOLUTION_ADR.md`.


## TD-032 - Endurecimiento tras auditoria de seguridad

Fecha: 2026-10-30

Estado: Aceptada

Hallazgos verificados con pruebas reales y su correccion:
- Las fotografias conservaban EXIF: una capsula publica entregaba GPS exacto y
  modelo de movil aunque la ubicacion se marcase aproximada. Ahora `sharp`
  aplica la orientacion y reescribe la imagen sin metadatos antes de guardarla.
- El login respondia ~100 veces mas rapido para correos inexistentes, lo que
  permitia enumerar cuentas. Se compara siempre contra un hash de igual coste.
- Las fechas `DATE` se convertian a medianoche local: con el servidor fuera de
  UTC cada lectura y cada edicion retrasaban un dia. El driver las devuelve ya
  como `YYYY-MM-DD`.
- Los enlaces compartidos y QR usaban `http://` detras de Caddy porque Nginx
  sobrescribia `X-Forwarded-Proto`, y el origen salia de la cabecera `Host`.
  Produccion exige `PUBLIC_APP_URL` y Nginx conserva el esquema original.
- No habia `Content-Security-Policy`. Nginx y Caddy la envian con
  `script-src 'self'`; se verifico sin violaciones en dashboard, ficha, PDF,
  QR y vista publica.
- Abrir la PWA sin red borraba la copia local y mostraba el login. Ahora se
  muestra la ultima copia y los controles de escritura quedan desactivados.
- Exportacion CSV protegida frente a inyeccion de formulas.
- Las capsulas ocultan el nombre por defecto tambien en la API.
- Fecha "futura" calculada en UTC rechazaba inmersiones registradas tras la
  medianoche en Espana.
- Dependencias actualizadas (multer, body-parser, qs, zod 4, sharp 0.35):
  `npm audit` sin vulnerabilidades.

Pendiente consciente:
El registro sigue respondiendo `409` si el correo existe. Unificar la respuesta
exige verificacion por correo, que llegara con el proveedor transaccional.

## TD-033 - Mapamundi propio en lugar de tiles externos

Fecha: 2026-10-30

Estado: Aceptada

Contexto:
El mapa del dashboard situaba los pins sobre un fondo decorativo, sin
continentes, y las inmersiones de una misma costa se solapaban. Un proveedor de
tiles (OpenStreetMap, MapTiler...) lo resolveria, pero el navegador pediria al
proveedor justo las zonas donde bucea el usuario, contradiciendo TD-030.

Decision:
Los continentes se dibujan en SVG a partir de Natural Earth 1:50m (dominio
publico, paquete `world-atlas`), simplificado y guardado como modulo estatico
(`frontend/js/world-map-data.js`, ~137 KB, ~40 KB comprimido). Proyeccion
equirectangular, la misma que ya usaban los pins. La vista se ajusta a las
inmersiones del usuario con un zoom minimo de ~6 grados, porque los datos son
de escala regional. Los pins cercanos se agrupan en pantalla; un grupo acerca
la vista y, si ya no se puede separar (mismo punto de buceo), muestra la lista.

Consecuencias:
- Ninguna coordenada sale de DeepLog y la CSP no cambia (`connect-src 'self'`).
- Funciona sin conexion: el service worker cachea el modulo de datos.
- No hay detalle a nivel de calle. Si se necesita, la evolucion prevista es
  servir teselas vectoriales propias (Protomaps/PMTiles) desde el mismo Nginx.

Validacion:
`frontend/tests/dive-map.test.js` cubre encuadre en pantallas anchas y
estrechas, zoom minimo, agrupacion y ausencia de URLs externas. Probado en
navegador con 21 inmersiones (escritorio y 390 px) sin violaciones de CSP.

## TD-034 - Pestañas con direccion propia en lugar de una pagina larga

Fecha: 2026-11-21

Estado: Aceptada

Contexto:
El dashboard apilaba perfil, estadisticas, mapa, historial, bitacora y cuenta
en una sola pagina. En movil exigia mucho desplazamiento y cualquier dato
quedaba lejos.

Decision:
Cinco pestañas (Inicio, Inmersiones, Mapa, Estadisticas, Perfil) gestionadas
por `frontend/js/tabs.js`, sin dependencias. El estado vive en el hash
(`#/mapa`): no necesita configurar el servidor para rutas, funciona con el
service worker y conserva atras/adelante. Solo los hashes `#/` pertenecen al
router, asi que enlaces internos como el de "saltar al contenido" siguen
funcionando. Los paneles se ocultan con `hidden`; todos los datos se cargan al
entrar, de modo que cambiar de pestaña es instantaneo. Una sola `<nav>` sirve
para escritorio (arriba) y movil (barra inferior fija) cambiando solo CSS.

Consecuencias:
- Los identificadores existentes del DOM se conservan; la logica de la app no
  cambia, solo donde vive cada bloque.
- El mapa se dibuja aunque su pestaña este oculta y se reajusta al mostrarse
  gracias al `ResizeObserver` de `dive-map.js`.
- En movil la cabecera pierde `backdrop-filter`: con el desenfoque, la barra
  fija quedaba anclada a la cabecera y no al pie de la pantalla.

Validacion:
`frontend/tests/tabs.test.js` cubre direcciones, enlaces internos y que cada
pestaña tenga enlace y panel. Probado en navegador (1366 px y 390 px): enlace
directo tras login, atras, recarga, foco y barra inferior sin desbordes.

## TD-035 - Temas Superficie y Abismo con variables CSS

Fecha: 2026-11-21

Estado: Aceptada

Contexto:
`styles.css` tenia unos 200 colores escritos a mano. Un modo oscuro sobre esa
base habria exigido duplicar cientos de reglas.

Decision:
Una migracion unica sustituyo cada color por una variable segun su papel
(texto, fondo, borde o sombra). El valor claro es el original; el oscuro se
derivo por papel (superficies claras a azul marino, tintas oscuras a tinta
clara, acentos conservados, sombras mas profundas) y se ajusto a mano donde
hacia falta. El tema activo vive en `html[data-theme]`. `js/theme-init.js`, un
script clasico de la propia app cargado antes de la hoja de estilos, lo aplica
sin parpadeo; `js/theme.js` gestiona la preferencia (`light`, `dark` o
`auto`), escucha cambios del sistema y actualiza `theme-color`. La preferencia
se guarda en `localStorage` como comodidad por dispositivo; si el
almacenamiento falla, se sigue el sistema.

Consecuencias:
- Un tema nuevo solo redefine variables.
- Una prueba impide reintroducir colores literales fuera de los bloques de
  variables.
- El PDF de una inmersion usa su propia hoja de estilos y sigue siendo claro,
  pensado para imprimir.

Validacion:
`frontend/tests/theme.test.js` y capturas de todas las pestanas, la ficha, el
formulario y el login en ambos temas a 1366 px y 390 px, sin avisos de la CSP.

## TD-036 - Estilo Abismo: tipografias propias y perfil aproximado

Fecha: 2026-11-21

Estado: Aceptada

Contexto:
Se diseñaron tres direcciones visuales en Figma (Arrecife, Abismo y Carta
nautica) y se eligio Abismo, con la navegacion arriba.

Decision:
Sora e IBM Plex Mono se sirven desde la propia app (`frontend/fonts/`, unos
78 KB en total, subconjunto latino con acentos), lo que respeta la CSP
(`font-src 'self'`) y no filtra visitas a terceros; el service worker las
cachea para el modo sin conexion. Rayos, particulas y brillos son CSS puro
sobre el fondo existente y usan variables, asi que cada tema tiene su
version. El "perfil de inmersion" de Inicio es esquematico: DeepLog solo
guarda profundidad maxima y duracion, por lo que `js/dive-profile.js`
construye una curva con ritmos habituales (descenso ~18 m/min, ascenso
~9 m/min, parada de 3 min a 5 m por debajo de 10 m) y la interfaz la presenta
como aproximada.

Consecuencias:
- No se muestra como medido nada que no lo sea.
- Si en el futuro se importan perfiles reales (UDDF), la misma tarjeta podra
  dibujarlos sustituyendo la funcion.

Validacion:
`frontend/tests/dive-profile.test.js` y capturas de todas las vistas en ambos
temas a 1366 px y 390 px, sin avisos de la CSP.

## TD-037 - Animaciones decorativas con CSS y View Transitions

Fecha: 2026-11-21

Estado: Aceptada

Contexto:
Se pidieron animaciones de seleccion y de transicion entre paginas y entre
modo claro y oscuro, sin perjudicar la accesibilidad ni el rendimiento.

Decision:
Todo el movimiento es CSS salvo dos piezas pequeñas en `js/motion.js`: el
contador de cifras (`requestAnimationFrame`) y el cambio de tema dentro de
`document.startViewTransition`, que recorta la vista nueva con un circulo que
nace del boton pulsado. La direccion de la transicion entre pestañas
(`data-direction="deeper|shallower"`) sale del orden de las pestañas, que ya
representan profundidades. No se añade ninguna libreria. Ninguna animacion
transmite informacion: con `prefers-reduced-motion` o con la opcion «Reducir
animaciones» (`localStorage deeplog.motion`, aplicada antes de pintar por
`theme-init.js`) se anulan animaciones y transiciones y el tema cambia sin
View Transition.

Consecuencias:
- Navegadores sin View Transitions cambian de tema al instante, sin error.
- La linea del perfil usa `pathLength="1"` y deja de usar
  `vector-effect: non-scaling-stroke`, que medía el trazo en pixeles de
  pantalla y rompia el dibujo; el SVG escala de forma uniforme.

Validacion:
`frontend/tests/motion.test.js` y comprobacion en Chromium a 1366 px y 390 px:
direccion de cada cambio de pestaña, circulo del tema fotograma a fotograma,
dibujo del perfil, contador, persistencia de «Reducir animaciones» tras
recargar y ausencia de avisos de la CSP.

## TD-038 - Superficie como agua poco profunda

Fecha: 2026-11-22

Estado: Aceptada

Contexto:
El modo claro se veia casi blanco y las burbujas apenas se distinguian. Se
pidio mas color, un azul de poca profundidad y burbujas visibles, manteniendo
el nombre «Superficie». Se compararon tres propuestas (Laguna, Arrecife y
Bajio) con capturas reales y se eligio la mas intensa.

Decision:
El fondo pasa a un degradado de aguamarina a azul con un brillo de sol arriba.
Un pseudo-elemento del fondo dibuja causticas (manchas de luz desenfocadas que
se mueven despacio) y las burbujas son blancas con borde y reflejo. Todo usa
variables `--shallow-*`, `--caustic` y `--bubble-*` y solo aplica a
`data-theme="light"`; Abismo no cambia. El color de la barra del navegador
(`theme-color`) pasa a `#c9f6f1`.

Consecuencias:
- El texto que queda directamente sobre el agua (presentacion del acceso,
  escala de profundidad, saludo de Inicio) usa tinta mas oscura
  (`--on-water`), con un contraste medido de 6,4:1 a 10,4:1.
- Las causticas se detienen con «Reducir animaciones» o con el ajuste del
  sistema, como el resto del movimiento.

Validacion:
Capturas de todas las vistas en Superficie a 1366 px y 390 px, contraste
medido sobre el fondo real y sin avisos de la CSP.

## TD-039 - Hoja de estilos dividida por secciones

Fecha: 2026-11-22

Estado: Aceptada

Contexto:
`frontend/styles.css` habia crecido a unas 3.100 lineas escritas en varias
etapas, con estilos de formato distintos y reglas que ya no usaba nada (la
cabecera anterior a las pestañas, un boton secundario, una etiqueta offline).

Decision:
Se divide en 18 archivos numerados en `frontend/styles/`, cortando por las
secciones que ya existian y **sin cambiar el orden de ninguna regla**, de modo
que la cascada es identica. `index.html` los enlaza con `<link>` en ese orden
(sin `@import`, que encadenaria descargas) y el service worker los guarda para
el modo sin conexion. Se aplica Prettier una vez, sin añadirlo como
dependencia, y se eliminan 5 clases y 7 variables de color sin uso.

Consecuencias:
- Cada seccion se puede leer y revisar por separado; los temas y las
  animaciones quedan al final porque sobrescriben a lo anterior.
- `tests/pwa-shell.test.js` falla si se añade un archivo sin enlazarlo o sin
  guardarlo para el modo sin conexion; los tests de CSS leen todos los
  archivos en orden (`tests/styles.js`).
- Los nombres de los tokens generados (`--c-bg-23`...) siguen sin significado;
  renombrarlos es un trabajo aparte.

Validacion:
36 capturas (todas las pestañas, acceso, ficha y formulario, en ambos temas,
escritorio y movil) comparadas pixel a pixel antes y despues: solo difieren
pixeles sueltos de antialiasing en zonas con desenfoque, igual que entre dos
capturas del mismo codigo.

## TD-040 - Revision del frontend con Modern Web Guidance

Fecha: 2026-11-23

Estado: Aceptada

Contexto:
Se adopta la skill Modern Web Guidance (Google Chrome, Microsoft Edge,
Mozilla Firefox y MDN) para revisar el frontend frente a las practicas
actuales de la plataforma web. Su escaneo automatico cubre ~20 % de las guias
y encontro 3 casos; el resto se reviso tema a tema (dialogos, formularios,
temas y tipografia, navegacion y movimiento, rendimiento/PWA/seguridad) con
informes que citan la guia, el archivo y la linea.

Decision:
Se aplican los hallazgos con valor real, cada uno con su guia y su alternativa
cuando la funcion no es Baseline ampliamente disponible. Decisiones del
propietario: barra inferior hasta 960 px (tablets en vertical); preguntar
«¿Descartar cambios?» al cerrar un formulario con cambios; boton «Mostrar
contraseña»; el boton del tema que coincide con el sistema vuelve a
Automatico. Lo principal:
- Dialogos: `closedby` solo donde cerrar fuera es seguro (con alternativa
  por puntero), nombre accesible en todos, sin desplazamiento de fondo,
  cierre de todos al caducar la sesion, foco correcto tras borrar o editar.
- Formularios: errores fuera del nombre accesible (`aria-describedby`,
  `aria-invalid`), fecha maxima en hora local (Temporal o getters locales),
  signo menos en coordenadas en iPhone, 16 px solo en pantallas tactiles,
  `field-sizing` como mejora progresiva.
- Tema: `theme-color` y `color-scheme` antes de pintar, sincronia entre
  pestañas, Forced Colors, precarga de Sora, `text-wrap`.
- Navegacion: sin desbordamiento horizontal de 320 a 1440 px, enlace de salto
  real, `scroll-padding`, spinners lentos con movimiento reducido.
- PWA y rendimiento: modo sin conexion arreglado (version de `api.js`), sin
  tokens en Cache Storage, cache-first para archivos con `?v=` y cache larga en
  nginx (aplica lo previsto en TD-011), vista inicial antes de pintar, mapa
  bajo demanda, decimales con coma, manifiesto con `id` e iconos PNG.

Consecuencias:
- Como los archivos con `?v=` se sirven cache-first, **todo cambio de un
  archivo exige subir su `?v=`** y el nombre de la cache del service worker.
  `tests/pwa-shell.test.js` comprueba que todo import esta en la cache.
- Pendiente: Trusted Types (plan en `docs/TRUSTED_TYPES_PLAN.md`), miniaturas
  de fotos (requiere backend) y la escala de texto del sistema al 200 %.

Validacion:
Tests de frontend de 30 a 75. Scripts de Playwright por area (dialogos 17,
formularios 21, PWA 45, tema y navegacion 17 comprobaciones) sobre la version
integrada, barrido de anchos 320-1440 px y comparacion de capturas: solo
cambian decimales, saltos de linea por `text-wrap` y el icono del ojo.
