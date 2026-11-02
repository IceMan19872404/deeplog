#!/bin/sh
set -eu

while true; do
  if ! /bin/sh /ops/backup-once.sh; then
    printf '{"level":"error","event":"backup_failed"}\n' >&2
  fi
  sleep "${BACKUP_INTERVAL_SECONDS}"
done
