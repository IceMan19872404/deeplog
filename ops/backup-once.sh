#!/bin/sh
set -eu

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_set="${BACKUP_DIR}/${timestamp}"
temporary_set="${backup_set}.tmp"
trap 'rm -rf "${temporary_set}"' EXIT

mkdir -p "${temporary_set}"

pg_dump \
  --host="${DB_HOST}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="${temporary_set}/database.dump"

tar -czf "${temporary_set}/photos.tar.gz" -C "${UPLOADS_DIR}" .

(
  cd "${temporary_set}"
  sha256sum database.dump photos.tar.gz > SHA256SUMS
)

mv "${temporary_set}" "${backup_set}"

find "${BACKUP_DIR}" \
  -mindepth 1 \
  -maxdepth 1 \
  -type d \
  ! -name '*.tmp' \
  -mtime "+${BACKUP_RETENTION_DAYS}" \
  -exec rm -rf {} \;

printf '{"level":"info","event":"backup_completed","backup":"%s"}\n' "${timestamp}"
