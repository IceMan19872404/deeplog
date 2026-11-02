# Estrategia de pruebas y matriz de riesgos

Fecha de revision: 2026-10-19

## Objetivo

La suite prioriza el daño potencial y no una cifra aislada de cobertura de
lineas. Un cambio no esta listo si falla alguna capa o si modifica el contrato
HTTP sin actualizar `backend/openapi.json` y sus pruebas.

## Capas

| Capa | Comando | Dependencias | Responsabilidad |
|---|---|---|---|
| Unitarias | `npm run test:unit` | Ninguna externa | Validaciones, tokens, redaccion y contrato OpenAPI |
| Integracion | `npm run test:integration` | PostgreSQL | Rutas, repositorios, permisos, exportacion y archivos |
| E2E | `npm run test:e2e` | PostgreSQL | Viaje critico desde una cuenta nueva hasta consultar su inmersion |
| Completa | `npm test` | PostgreSQL | Gate local de las tres capas, ejecutado en serie |
| Frontend estable | `npm test` en `frontend/` | Ninguna externa | Mensajes, formularios, PDF y shell PWA |
| POC React | `npm test && npm run build` en `frontend-react-poc/` | Ninguna externa | Utilidades tipadas y build de produccion |

Las pruebas con datos crean correos unicos y eliminan sus usuarios al terminar.
Las relaciones y fotografias desaparecen mediante las mismas cascadas y reglas
que utiliza la aplicacion.

## Matriz basada en riesgos

Escala: probabilidad e impacto de 1 (bajo) a 3 (alto). La prioridad es su
producto; no pretende sustituir un analisis de seguridad especializado.

| Riesgo | P | I | Prioridad | Control y evidencia actual | Capa |
|---|---:|---:|---:|---|---|
| Acceso a datos de otro usuario | 2 | 3 | 6 | Lectura, edicion, borrado, fotos, estadisticas y memoria aislados por propietario | Integracion |
| Perdida o borrado irreversible | 2 | 3 | 6 | Confirmacion y contraseña, transaccion, exportaciones y backups restaurados | Integracion + operativa |
| Autenticacion aceptada o revocada incorrectamente | 2 | 3 | 6 | JWT corto, refresh rotatorio, deteccion de reutilizacion, CSRF y revocacion inmediata | Unitaria + integracion |
| Enlace compartido revela mas datos de los elegidos | 2 | 3 | 6 | Proyeccion selectiva, token hasheado, caducidad, contraseña y revocacion | Integracion |
| Contrato API diverge del cliente o documentacion | 2 | 2 | 4 | 40 operaciones inventariadas, `operationId` unico y auth comprobada | Unitaria |
| Perfil o foto de otro usuario quedan expuestos | 2 | 3 | 6 | Recurso privado, JWT, almacenamiento no publico y pruebas de propiedad | Integracion |
| Telemetria filtra datos personales o secretos | 2 | 3 | 6 | Allowlist web, redaccion Pino/Sentry y queries omitidas | Unitaria + integracion |
| API o backups fallan sin aviso | 2 | 3 | 6 | Readiness y watchdog con webhook generico | Integracion + operativa |
| Entrada invalida corrompe datos | 2 | 2 | 4 | Zod estricto, limites, fechas y rangos cruzados | Unitaria + integracion |
| Fotografias maliciosas o ajenas | 2 | 2 | 4 | MIME y firma, tamaño y cantidad; almacenamiento y lectura privados | Integracion |
| Exportacion grande agota memoria | 1 | 3 | 3 | Lotes de 100 y streams, caso sintetico de 205 inmersiones | Integracion |
| Flujo principal deja de funcionar | 2 | 3 | 6 | Registro, login, alta y consulta en una prueba independiente | E2E |
| Estadisticas inducen una recomendacion insegura | 1 | 3 | 3 | Solo historial descriptivo, tamaño de muestra y textos de limitacion | Integracion + revision de producto |
| Limitacion de peticiones falla con varias instancias | 2 | 2 | 4 | Memoria local aceptada solo para una instancia | Pendiente de produccion |
| Recuperacion no entrega correo real | 3 | 2 | 6 | Token seguro probado; proveedor de correo aun no integrado | Pendiente de produccion |

## Criterio de salida

- Sintaxis valida mediante `npm run check`.
- Unitarias, integracion y E2E sin fallos.
- Migraciones aplicables sobre PostgreSQL real.
- Contrato OpenAPI actualizado para cualquier cambio HTTP.
- Recorrido visual adicional cuando cambian interfaz, accesibilidad o PDF.

## Limites actuales

La suite contiene 56 pruebas: 47 de backend, 7 del frontend estable y 2 de la
POC React. Se ejecuto completa sin fallos el 2026-10-19; la evidencia funcional
esta en `docs/FUNCTIONAL_AUDIT_2026-10-19.md`. El gate esta definido en GitHub
Actions, pero no se ha ejecutado remotamente porque aun no existe repositorio
GitHub. Tampoco hay navegador automatizado en el repositorio ni medicion de
cobertura por lineas. El recorrido visual sigue siendo manual hasta incorporar
Playwright.
