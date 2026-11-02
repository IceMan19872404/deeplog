# Auditoría funcional completa

Fecha: 2026-10-19

## Alcance

Revisión de todas las capas implementadas hasta la Semana 23: validaciones,
servicios, repositorios, PostgreSQL, contrato HTTP, seguridad de sesión,
frontend estable, PWA, exportaciones, compartición privada y POC React.

La auditoría se ejecutó en los contenedores declarados por el proyecto, con
Node.js 20, PostgreSQL 16 y Nginx. Todos los datos y archivos creados para el
recorrido manual se eliminaron al terminar.

## Resultado automatizado

| Capa | Resultado |
|---|---:|
| Backend unitario | 13/13 |
| Backend integración con PostgreSQL | 33/33 |
| Backend E2E | 1/1 |
| Frontend estable | 7/7 |
| POC React + TypeScript | 2/2 |
| Total | 56/56 |

Comprobaciones adicionales:

- Sintaxis de todos los módulos JavaScript correcta.
- Compilación TypeScript y build de producción de React correctos.
- Contrato OpenAPI: 40 operaciones documentadas y alineadas con las rutas.
- Auditoría `npm`: 0 vulnerabilidades conocidas en backend y POC React.
- `docker compose config`: válido.
- `db`, `backend`, `frontend` y `frontend-react-poc`: saludables.
- Web, health, readiness y POC React: HTTP 200.

## Recorrido funcional real

Se verificaron desde la interfaz y contra la API real:

- Inicio de sesión, recarga con restauración de sesión y cierre de sesión.
- Recuperación de acceso hasta la pantalla de nueva contraseña.
- Errores específicos por campo en registro e inmersiones.
- Perfil privado, certificación, antigüedad y preferencia de nombre.
- Alta y edición de una inmersión con todos los campos disponibles.
- Lastre, propiedad del equipo, traje, botella y tipo de agua.
- Compañeros, centro, notas y coordenadas aproximadas.
- Fotografía privada y galería.
- Consulta de detalle al pulsar la tarjeta.
- Estadísticas, récords, mapa y patrones avanzados.
- Diario de aprendizaje y memoria de configuración.
- Enlace privado, selección de información, caducidad, QR y vista pública.
- Exportaciones JSON, CSV y ZIP completo.
- Generación del documento A4 preparado para PDF.
- Shell offline y recursos versionados de la PWA.
- Login y dashboard de la POC React contra la API real.

Los borrados de foto, reflexión, inmersión y cuenta; la revocación de enlaces;
el cierre global de sesiones; y el cambio efectivo de contraseña se verifican
en integración para evitar acciones destructivas durante la revisión visual.

## Defectos encontrados y corregidos

1. Los mensajes de validación no concordaban en género y número (`El fecha`).
   Se extrajo un generador probado de mensajes.
2. La cookie CSRF no era visible desde la página principal por su `Path`, lo
   que impedía restaurar la sesión tras recargar. La cookie CSRF usa ahora `/`
   y la cookie refresh conserva el alcance restringido de autenticación.
3. Editar una inmersión con fotografías intentaba asignar el array de fotos al
   input de archivo. La excepción dejaba sin cargar centro, compañeros,
   ubicación y notas. El formulario usa ahora una lista explícita de campos.
4. Los formularios dependían de JavaScript para impedir un envío GET. Todos
   tienen ahora un fallback POST que evita credenciales en la URL si falla JS.
5. El service worker cacheaba una entrada antigua y no incluía los módulos
   nuevos. Se versionó el shell y se añadieron pruebas de sus recursos.
6. La auditoría detectó dependencias transitivas vulnerables. Se sustituyó
   `nodemon` por `node --watch` y se actualizó `proxy-addr`; el resultado final
   es 0 vulnerabilidades conocidas.

## Límites reales

- La recuperación genera un token seguro en desarrollo, pero falta integrar
  un proveedor de correo antes de producción.
- El diálogo nativo de impresión no puede automatizarse de extremo a extremo;
  sí se prueba el documento HTML completo que alimenta el PDF.
- La geolocalización del dispositivo requiere permiso del navegador; se
  probaron coordenadas manuales, redondeo, persistencia, privacidad y mapa.
- El recorrido de navegador fue manual asistido. Conviene incorporar
  Playwright al repositorio antes del despliegue público para automatizarlo.
- Dominio, TLS público, backups remotos y restauración en servidor quedan fuera
  porque todavía no existe infraestructura de producción.

## Conclusión

Todas las funcionalidades implementadas y ejecutables en local han quedado
verificadas. El gate final está verde después de aplicar las correcciones y no
se detectan fallos abiertos que bloqueen la siguiente fase.

## Ampliación posterior

El 19 de octubre de 2026 se homogeneizaron los ejemplos del formulario de alta
de inmersiones. Cada uno de sus 18 controles dispone de una muestra que deja de
mostrarse al introducir o seleccionar información. Una prueba de estructura
protege esta cobertura.

También se añadió `backend/scripts/seed-demo-dives.js`, un sembrador local e
idempotente con 20 inmersiones ficticias completas. Los registros cubren
distintas configuraciones, aguas, centros, compañeros, ubicaciones, notas y
reflexiones para poder revisar estadísticas, mapas y memoria de equipo con un
historial representativo. Las fotografías se excluyen deliberadamente porque
requieren archivos reales y consentimiento sobre su contenido.
