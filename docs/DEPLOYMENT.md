# Despliegue de DeepLog 2.0

Esta guia describe el despliegue de produccion preparado durante la Semana 9.
El entorno local habitual sigue usando `docker-compose.yml`; produccion utiliza
`compose.production.yml` y no expone PostgreSQL, la API ni Nginx directamente.
La promocion automatizada, aprobaciones y rollback se describen en
`docs/RELEASE_STRATEGY.md`.

## Arquitectura

```text
Internet -> Caddy (80/443) -> Nginx (frontend y proxy /api) -> Express
                                                        -> PostgreSQL
```

Caddy gestiona los certificados TLS, su renovacion y la redireccion de HTTP a
HTTPS. Solo Caddy publica puertos del servidor. PostgreSQL y Express permanecen
en una red Docker interna.

## Requisitos del servidor

- Servidor Linux con Docker Engine y Docker Compose.
- Un dominio o subdominio administrado por el propietario.
- Registros DNS `A` y, si corresponde, `AAAA` apuntando al servidor.
- Puertos TCP `80` y `443` accesibles desde internet.
- Puerto UDP `443` para HTTP/3.
- Espacio persistente para PostgreSQL, fotografias y certificados.

Una maquina pequeña con 1 vCPU y 2 GB de RAM es suficiente para la primera
version y un volumen reducido de usuarios. Debe medirse antes de aumentar uso.

## Configuracion inicial

Desde la raiz del proyecto:

```bash
cp .env.production.example .env.production
```

Editar `.env.production` y sustituir todos los valores de ejemplo. Se pueden
generar secretos con:

```bash
openssl rand -base64 48
```

Variables obligatorias:

- `DOMAIN`: dominio publico, por ejemplo `deeplog.example.com`.
- `ACME_EMAIL`: correo utilizado para la gestion de certificados.
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`: credenciales de PostgreSQL.
- `JWT_SECRET`: secreto aleatorio de al menos 32 caracteres.
- `REFRESH_TOKEN_DAYS`: vigencia maxima de una familia de sesion; 30 por defecto.

Compose deriva `PUBLIC_APP_URL=https://$DOMAIN` para la API. Los enlaces
compartidos y sus QR usan siempre ese origen; la API no arranca en produccion
si no es una URL `https://`.

`.env.production` esta ignorado por Git y nunca debe compartirse ni subirse al
repositorio.

## Validar antes de arrancar

```bash
docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  config --quiet
```

Construir las imagenes:

```bash
docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  build
```

## Arrancar produccion

```bash
docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  up -d
```

Comprobar servicios y logs:

```bash
docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  ps

docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  logs --tail=100
```

Validacion publica:

```bash
curl https://TU_DOMINIO/api/v1/health
curl https://TU_DOMINIO/api/v1/health/ready
```

La respuesta debe incluir `"status":"ok"`. Caddy solo podra emitir el
certificado cuando DNS apunte al servidor y los puertos 80/443 sean accesibles.

## Observabilidad

Definir `APP_RELEASE` con el SHA desplegado. `SENTRY_DSN` y
`MONITOR_WEBHOOK_URL` son opcionales: vacios mantienen el envio externo
desactivado. `monitor` comprueba readiness cada `MONITOR_INTERVAL_SECONDS` y
considera atrasada una copia al superar `MAX_BACKUP_AGE_SECONDS`.

```bash
docker compose --env-file .env.production -f compose.production.yml logs monitor
docker compose --env-file .env.production -f compose.production.yml run --rm monitor \
  /bin/sh /ops/monitor-once.sh
```

Antes de recibir usuarios se aplicaran los plazos de `docs/OBSERVABILITY.md` y
un monitor externo para detectar la caida total del host.

## Actualizar la aplicacion

Despues de incorporar una version nueva:

```bash
docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  up -d --build
```

Las migraciones se ejecutan al arrancar la API. Los volumenes no se eliminan al
recrear contenedores.

## Limpiar metadatos de fotos anteriores

Las fotos subidas antes del 2026-10-30 pueden conservar GPS y modelo de
dispositivo en su EXIF. Ejecutar una vez (es idempotente):

```bash
docker compose --env-file .env.production -f compose.production.yml exec backend \
  npm run photos:strip-metadata
```

## Datos persistentes

- `postgres_data`: usuarios, inmersiones y metadatos.
- `dive_uploads`: fotografias privadas.
- `caddy_data`: certificados y estado TLS.
- `caddy_config`: estado interno de Caddy.
- `BACKUP_HOST_PATH`: carpetas fechadas con base de datos, fotografias y hashes.

No ejecutar `docker compose down -v` en produccion: `-v` elimina los volumenes
y, por tanto, los datos.

## Copias de seguridad

El servicio `backup` espera a que la API este saludable para garantizar que
las migraciones hayan terminado. Ejecuta una copia al arrancar y despues cada
`BACKUP_INTERVAL_SECONDS` (24 horas por defecto). Cada carpeta contiene:

- `database.dump`: PostgreSQL en formato custom, comprimido y restaurable con
  `pg_restore`.
- `photos.tar.gz`: contenido del volumen privado de fotografias.
- `SHA256SUMS`: hashes para comprobar integridad antes de restaurar.

Las carpetas con mas de `BACKUP_RETENTION_DAYS` se eliminan automaticamente
(14 dias por defecto). La escritura usa una carpeta temporal y un renombrado
final para no presentar copias incompletas como validas.

Crear una copia adicional manual:

```bash
docker compose \
  --env-file .env.production \
  -f compose.production.yml \
  run --rm backup /bin/sh /ops/backup-once.sh
```

Comprobar los hashes desde el host, sustituyendo la carpeta fechada:

```bash
cd backups/AAAAMMDDTHHMMSSZ
sha256sum -c SHA256SUMS
```

La restauracion debe hacerse primero en una base vacia y durante una ventana
de mantenimiento. Ejemplo para la base de datos:

```bash
docker compose --env-file .env.production -f compose.production.yml exec db \
  sh -c 'createdb -U "$POSTGRES_USER" deeplog_restore'

docker compose --env-file .env.production -f compose.production.yml run --rm \
  backup sh -c 'pg_restore --exit-on-error --no-owner --no-privileges \
  -h db -U "$DB_USER" -d deeplog_restore \
  /backups/AAAAMMDDTHHMMSSZ/database.dump'
```

Las fotos se recuperan extrayendo `photos.tar.gz` en el volumen
`dive_uploads`, con el stack detenido para evitar escrituras concurrentes.
Antes de admitir usuarios reales se debe copiar `BACKUP_HOST_PATH` a otro
proveedor o maquina: una copia guardada solo en el mismo servidor no protege
frente a perdida completa del host.

## Pendiente para publicar

1. Elegir proveedor de servidor.
2. Registrar o asignar el dominio.
3. Configurar DNS y firewall.
4. Completar `.env.production` directamente en el servidor.
5. Arrancar el stack y verificar HTTPS desde una red externa.
