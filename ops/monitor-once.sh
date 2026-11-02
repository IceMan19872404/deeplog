#!/bin/sh
set -eu

HEALTH_URL="${HEALTH_URL:-http://frontend/api/v1/health/ready}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
MAX_BACKUP_AGE_SECONDS="${MAX_BACKUP_AGE_SECONDS:-93600}"
MONITOR_WEBHOOK_URL="${MONITOR_WEBHOOK_URL:-}"
failed=0

emit() {
  level="$1"
  event="$2"
  printf '{"level":"%s","event":"%s","service":"deeplog-monitor"}\n' "$level" "$event"

  if [ "$level" = "error" ] && [ -n "$MONITOR_WEBHOOK_URL" ]; then
    wget -q -O /dev/null \
      --header='Content-Type: application/json' \
      --post-data="{\"event\":\"$event\",\"service\":\"deeplog\"}" \
      "$MONITOR_WEBHOOK_URL" || true
  fi
}

if wget -q -O /dev/null "$HEALTH_URL"; then
  emit info availability_ok
else
  emit error availability_failed
  failed=1
fi

latest_backup="$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d ! -name '*.tmp' 2>/dev/null | sort | tail -n 1)"
if [ -z "$latest_backup" ]; then
  emit error backup_missing
  failed=1
else
  backup_age="$(( $(date +%s) - $(stat -c %Y "$latest_backup") ))"
  if [ "$backup_age" -le "$MAX_BACKUP_AGE_SECONDS" ]; then
    emit info backup_fresh
  else
    emit error backup_stale
    failed=1
  fi
fi

exit "$failed"
