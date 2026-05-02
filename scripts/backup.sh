#!/usr/bin/env bash
#
# Nightly backup: pg_dump → restic snapshot to Backblaze B2.
#
# Layout (per project.md):
#   - Postgres dump → $PG_DUMP_DIR/dump-$(date).sql.gz, three days retained locally
#   - Uploads dir + app config bundled into a restic snapshot
#   - Retention: --keep-daily 7 --keep-weekly 4 --keep-monthly 6
#
# Required env (typically sourced from /etc/restic/env, mode 0600):
#   RESTIC_REPOSITORY      e.g. b2:my-bucket:roster
#   RESTIC_PASSWORD        repo encryption password
#   B2_ACCOUNT_ID          Backblaze application key id
#   B2_ACCOUNT_KEY         Backblaze application key
#   DATABASE_URL           libpq URL for pg_dump
#   UPLOAD_DIR             absolute path, e.g. /var/app/uploads
#   APP_CONFIG_DIR         absolute path, e.g. /etc/app  (optional)
#   PG_DUMP_DIR            absolute path, e.g. /var/backups/pg  (default below)
#   LAST_SUCCESS_FILE      absolute path, e.g. /var/backups/last-success  (default below)
#
# Cron (run as root or a service user with read access to all targets):
#   0 2 * * * /opt/classroom-roster/scripts/backup.sh >> /var/log/roster-backup.log 2>&1
#
# Run weekly prune separately (slow):
#   0 3 * * 0 RESTIC_PRUNE=1 /opt/classroom-roster/scripts/backup.sh >> /var/log/roster-backup.log 2>&1

set -euo pipefail

if [[ "${1:-}" == "--source-env" && -n "${2:-}" ]]; then
  # Allow `backup.sh --source-env /etc/restic/env` for cron simplicity.
  # shellcheck disable=SC1090
  source "$2"
  shift 2
fi

: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY not set}"
: "${RESTIC_PASSWORD:?RESTIC_PASSWORD not set}"
: "${B2_ACCOUNT_ID:?B2_ACCOUNT_ID not set}"
: "${B2_ACCOUNT_KEY:?B2_ACCOUNT_KEY not set}"
: "${DATABASE_URL:?DATABASE_URL not set}"
: "${UPLOAD_DIR:?UPLOAD_DIR not set}"
PG_DUMP_DIR="${PG_DUMP_DIR:-/var/backups/pg}"
LAST_SUCCESS_FILE="${LAST_SUCCESS_FILE:-/var/backups/last-success}"
APP_CONFIG_DIR="${APP_CONFIG_DIR:-}"

export RESTIC_REPOSITORY RESTIC_PASSWORD B2_ACCOUNT_ID B2_ACCOUNT_KEY

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(ts)] $*"; }

mkdir -p "$PG_DUMP_DIR"
mkdir -p "$(dirname "$LAST_SUCCESS_FILE")"

DUMP_FILE="$PG_DUMP_DIR/dump-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"

log "pg_dump → $DUMP_FILE"
pg_dump --no-owner --no-privileges --format=plain "$DATABASE_URL" | gzip -c > "$DUMP_FILE.tmp"
mv "$DUMP_FILE.tmp" "$DUMP_FILE"
log "pg_dump done: $(stat -c %s "$DUMP_FILE" 2>/dev/null || stat -f %z "$DUMP_FILE") bytes"

# Keep last 3 local dumps.
ls -1t "$PG_DUMP_DIR"/dump-*.sql.gz 2>/dev/null | tail -n +4 | xargs -r rm -f

BACKUP_TARGETS=("$PG_DUMP_DIR" "$UPLOAD_DIR")
if [[ -n "$APP_CONFIG_DIR" && -d "$APP_CONFIG_DIR" ]]; then
  BACKUP_TARGETS+=("$APP_CONFIG_DIR")
fi

# First run: init repo if absent. Idempotent.
if ! restic snapshots --no-lock >/dev/null 2>&1; then
  log "Initializing restic repository at $RESTIC_REPOSITORY"
  restic init
fi

log "restic backup ${BACKUP_TARGETS[*]}"
restic backup --tag nightly "${BACKUP_TARGETS[@]}"

log "restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6"
restic forget --tag nightly --keep-daily 7 --keep-weekly 4 --keep-monthly 6

if [[ "${RESTIC_PRUNE:-}" == "1" ]]; then
  log "restic prune (weekly)"
  restic prune
fi

date -u +"%Y-%m-%dT%H:%M:%SZ" > "$LAST_SUCCESS_FILE"
log "Backup OK; wrote $LAST_SUCCESS_FILE"
