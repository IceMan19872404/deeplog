# Estrategia de CI/CD, migraciones y rollback

Fecha de revision: 2026-09-16

## Estado actual

DeepLog dispone de automatizacion versionada, pero todavia no tiene remoto de
GitHub, servidor, dominio ni entornos configurados. Por tanto, CI y deploy estan
preparados y validados localmente; no se afirma que hayan ejecutado en GitHub o
contra infraestructura real.

El proyecto es ahora un repositorio Git independiente en `deeplog/`. No se ha
creado ningun remoto ni commit en nombre del usuario.

## Integracion continua

`.github/workflows/ci.yml` se ejecuta en cada push o pull request contra `main`
y tambien manualmente. Aplica estos gates en orden:

1. `npm ci` desde el lockfile.
2. Sintaxis de codigo, pruebas y generador OpenAPI.
3. Regeneracion determinista de `openapi.json`.
4. Suite unitaria, integracion y E2E contra PostgreSQL 16 real.
5. `npm audit` incluyendo dependencias de desarrollo; cualquier aviso moderado,
   alto o critico falla el job.
6. Validacion de Compose y construccion de imagenes de desarrollo.
7. Validacion de Compose y construccion de imagenes de produccion.

El job de imagenes solo empieza si el quality gate termina correctamente. Los
push sucesivos a la misma referencia cancelan ejecuciones antiguas de CI.

## Entornos

El workflow manual `.github/workflows/deploy.yml` acepta `staging` o
`production`. Ambos deben configurarse como GitHub Environments con secretos
separados. `production` debe exigir revisores y no permitir despliegues directos
sin aprobacion.

Secretos por entorno:

- `DEPLOY_HOST`: servidor SSH.
- `DEPLOY_USER`: usuario sin acceso root interactivo.
- `DEPLOY_PATH`: clon existente del repositorio en el servidor.
- `DEPLOY_SSH_KEY`: clave privada dedicada al despliegue.
- `DEPLOY_KNOWN_HOSTS`: huella SSH verificada fuera del workflow.
- `DEPLOY_HEALTH_URL`: origen HTTPS, sin `/api/v1/health`.

El servidor conserva `.env.staging` o `.env.production`; esos archivos nunca se
transfieren desde GitHub ni entran en el repositorio.

## Flujo de entrega

1. Integrar un cambio en `main` solo con CI verde.
2. Lanzar `Deploy` a staging indicando un commit o tag inmutable.
3. El workflow vuelve a ejecutar CI antes de conectarse al servidor.
4. Si ya existe una instalacion, crea una copia de seguridad previa.
5. Actualiza al SHA resuelto, valida Compose, construye y levanta servicios.
6. Comprueba el healthcheck HTTPS desde el runner.
7. Tras smoke test, lanzar exactamente el mismo SHA a production.
8. GitHub pausa production hasta la aprobacion del revisor configurado.

## Migraciones

Las migraciones SQL son incrementales, ordenadas y se ejecutan al arrancar la
API. Deben seguir estrategia expand/contract:

- primero añadir tablas o columnas compatibles y desplegar codigo que tolere
  datos anteriores;
- migrar o completar datos en una entrega separada si el volumen lo exige;
- eliminar estructuras antiguas solo cuando ninguna version desplegable las use;
- no editar una migracion ya aplicada; crear siempre otra con el numero siguiente.

Antes de production se prueba la migracion en staging con una copia anonimizada
o un conjunto representativo. El backup previo es obligatorio.

## Rollback

El workflow recuerda el commit remoto anterior. Si falla checkout, build o
arranque, restaura ese commit y reconstruye el stack. Si falla el healthcheck
externo despues del SSH, el operador ejecuta el mismo procedimiento documentado:

```bash
cd /ruta/deeplog
git checkout --detach SHA_ANTERIOR
docker compose --env-file .env.production -f compose.production.yml up -d --build
```

El rollback de aplicacion no deshace SQL. Con migraciones expand/contract, la
version anterior debe seguir funcionando. Si una migracion daña datos o no es
compatible, se detiene el stack y se restaura el backup verificado siguiendo
`docs/DEPLOYMENT.md`; nunca se improvisa un `DOWN` destructivo en produccion.

## Activacion pendiente

1. Crear el repositorio remoto y hacer el primer push revisado.
2. Crear los Environments `staging` y `production`.
3. Exigir aprobación en `production` y proteger `main` con el check `Quality gate`.
4. Preparar servidor y secretos de staging.
5. Ejecutar CI y el primer deploy de staging.
6. Ensayar rollback antes de habilitar production.
