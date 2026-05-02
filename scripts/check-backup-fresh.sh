#!/usr/bin/env bash
#
# Alert if the last successful backup is more than $MAX_AGE_HOURS old.
# Backed by the timestamp file written by backup.sh.
#
# Cron (every hour):
#   17 * * * * /opt/classroom-roster/scripts/check-backup-fresh.sh
#
# Pipe failures to your alerting channel (mailx, healthchecks.io ping URL, etc.).

set -euo pipefail

LAST_SUCCESS_FILE="${LAST_SUCCESS_FILE:-/var/backups/last-success}"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-26}"

if [[ ! -f "$LAST_SUCCESS_FILE" ]]; then
  echo "BACKUP STALE: $LAST_SUCCESS_FILE missing entirely." >&2
  exit 2
fi

now_epoch=$(date +%s)
file_epoch=$(date -r "$LAST_SUCCESS_FILE" +%s 2>/dev/null \
  || stat -c %Y "$LAST_SUCCESS_FILE")
age_seconds=$(( now_epoch - file_epoch ))
max_seconds=$(( MAX_AGE_HOURS * 3600 ))

if (( age_seconds > max_seconds )); then
  hours=$(( age_seconds / 3600 ))
  echo "BACKUP STALE: last success was ${hours}h ago (>${MAX_AGE_HOURS}h)." >&2
  exit 2
fi

# Silence on success — cron will only mail on non-zero exit.
exit 0
