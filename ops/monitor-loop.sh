#!/bin/sh
set -eu

interval="${MONITOR_INTERVAL_SECONDS:-300}"

while true; do
  /bin/sh /ops/monitor-once.sh || true
  sleep "$interval"
done
