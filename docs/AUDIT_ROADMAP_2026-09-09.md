# Auditoria de roadmap - 2026-09-09

## Objetivo

Contrastar la nota de producto y stack con la implementacion real de DeepLog
2.0. Un elemento solo figura como cumplido cuando existe en el repositorio o se
ha verificado; aparecer en una nota no equivale a estar implementado.

## Cumplido

- Arquitectura `routes -> controllers -> services -> repositories -> db`.
- API REST versionada bajo `/api/v1`.
- PostgreSQL con ocho migraciones, indices, claves foraneas y constraints.
- Docker Compose para desarrollo y stack de produccion separado.
- Configuracion DEV/PROD mediante entorno y secretos exigidos en produccion.
- Registro, login JWT, BCrypt, recuperacion de contraseña y CRUD por propietario.
- Validacion Zod, errores centralizados, Helmet, limites de cuerpo y rate limits.
- Mismo origen mediante Nginx; CORS permanece cerrado deliberadamente.
- Escape contextual en frontend y documentos generados.
- Dashboard responsive con mas de tres metricas y grafica de actividad.
- Pruebas de integracion HTTP contra PostgreSQL real.
- Logs JSON correlacionados, healthchecks y backups restaurados.
- Stack de HTTPS y despliegue preparado, aunque aun no publicado.
- PDF editorial, QR privado, fotografias y memoria de configuracion.
- README, decisiones tecnicas, despliegue, backlog y roadmap mantenidos.
- OpenAPI 3.1 con las 40 operaciones de `/api/v1`.
- Pruebas unitarias, integracion y E2E separadas por responsabilidad.
- Matriz de cobertura basada en riesgos y criterio de salida documentados.
- Refresh rotatorio, cookies `httpOnly`, CSRF y revocacion individual/global.
- CI/CD versionado, auditoria limpia, builds Docker y estrategia de rollback.
- Pino, Sentry opcional sin PII, readiness y watchdog de disponibilidad/backups.
- Politica de redaccion, correlacion y retencion de telemetria documentada.
- Perfil privado, foto protegida y progreso personal sin ranking social.
- Mejoras de teclado, foco y estados; auditoria WCAG renderizada pendiente.

## Planificado y ahora calendarizado

- Mapa, GPS y PWA offline parcial: completados en Semana 22.
- React + TypeScript y evaluacion del ecosistema frontend: Semana 23.
- Produccion real, portfolio y 10-20 usuarios: Semana 24.

## No implementado ni aceptado automaticamente

- Next.js, Tailwind, shadcn/ui y TanStack Query son candidatos, no requisitos.
- NestJS/Fastify y Prisma requeririan justificar una migracion del backend que
  hoy ya esta modularizado y probado.
- Vercel, Render, Fly.io, Neon y Supabase son alternativas de proveedor; se
  elegira una combinacion cuando existan dominio y presupuesto.
- No hay roles porque actualmente solo existe el propietario. Añadir RBAC sin
  administracion, moderacion o colaboracion real seria complejidad ficticia.
- No habra ranking social global por defecto; contradice el enfoque privado y
  personal definido para DeepLog. Se mantienen records personales.

## Conclusion

El MVP de la nota esta superado en local y el proyecto tiene una base escalable
real. Los principales huecos para entrevistas no son mas funcionalidades ni
mas frameworks: son contrato OpenAPI, piramide de pruebas, auth de produccion,
CI/CD, URL publica monitorizada, accesibilidad y validacion con usuarios.
