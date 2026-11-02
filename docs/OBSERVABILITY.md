# Observabilidad y privacidad

Revision: 2026-09-16

## Señales disponibles

- Pino escribe JSON en `stdout` con servicio, entorno, evento,
  `X-Request-ID`, metodo, ruta sin query string, estado y duracion.
- `GET /api/v1/health` comprueba el proceso y `/health/ready` tambien PostgreSQL.
- Sentry recibe excepciones manuales solo cuando existe `SENTRY_DSN`.
- El navegador informa unicamente tipo, ruta local y linea/columna.
- `monitor` comprueba readiness y antiguedad de la ultima copia; su webhook
  opcional recibe solo un codigo de evento generico.

## Datos prohibidos

No se registran cuerpos, contraseñas, JWT, refresh o CSRF tokens, cookies,
autorizacion, correo, IP, comentarios, compañeros, fotos ni parametros de
busqueda. Los tokens de enlaces publicos se sustituyen por `[redacted]`.

Pino mantiene una lista defensiva de campos censurados. Sentry desactiva sus
integraciones automaticas, trazas y PII; `beforeSend` elimina `user`, `request`
y `breadcrumbs` y limpia correos y tokens. La telemetria web usa una allowlist
Zod estricta y rate limit; no admite mensajes, stacks ni URL completas.

## Correlacion y retencion

Cada respuesta incluye `X-Request-ID`, que relaciona log HTTP, excepcion y señal
del navegador sin usar identidad personal.

- Desarrollo local: logs efimeros.
- Staging: 14 dias.
- Produccion: 30 dias.
- Errores agregados en Sentry: 90 dias como maximo.
- Backups: 14 dias por defecto, mediante `BACKUP_RETENTION_DAYS`.

El proveedor debe aplicar estos limites antes de admitir usuarios. El acceso se
restringira al responsable tecnico y no se exportara telemetria a marketing.

## Alertas operativas

`monitor` se ejecuta cada cinco minutos. Falla si readiness no responde o no
hay una copia completa con menos de 26 horas. El margen de dos horas tolera la
duracion de la copia diaria. El webhook solo recibe `availability_failed`,
`backup_missing` o `backup_stale`.

El watchdog interno no detecta la caida total del servidor. Al publicar se
configurara ademas un monitor externo contra `/api/v1/health`.

## Respuesta basica

1. Localizar evento y `X-Request-ID`, sin solicitar datos sensibles.
2. Confirmar readiness, logs y estado de PostgreSQL.
3. Revisar la ultima copia completa y sus hashes.
4. Mitigar o revertir mediante `RELEASE_STRATEGY.md`.
5. Documentar causa y correccion sin copiar datos personales.
