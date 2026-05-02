# Restore runbook

> A backup that has never been restored is not a backup. Run a restore drill once a quarter against a scratch VM, and update this doc with any friction.

## What's in a backup

Each restic snapshot tagged `nightly` contains:

- `${PG_DUMP_DIR}` (default `/var/backups/pg`) — recent `pg_dump` files (last three days kept locally before snapshotting).
- `${UPLOAD_DIR}` (e.g. `/var/app/uploads`) — class and student photos. Server stores them as `classes/{class_id}/...` and `students/{student_id}/...` under this root.
- `${APP_CONFIG_DIR}` (e.g. `/etc/app`) if configured — application config and `.env` files. Secrets (restic password, B2 keys) live here too; the restic password also lives offline (printed/filed) since losing it means the backups are unrecoverable.

Retention: 7 daily, 4 weekly, 6 monthly. `restic prune` runs weekly via `RESTIC_PRUNE=1 backup.sh`.

## Pre-flight

Before touching anything, capture the failure context:

1. What is broken? (VPS gone / disk failure / accidental delete / corrupted DB)
2. What is the loss boundary? Restoring last night's snapshot means losing today's submissions.
3. Tell affected teachers/students that the app may be briefly read-only.

## Restore environment setup

Spin up a fresh VM (or use a clean directory on a temp box) and install:

```bash
# Postgres client (and optionally server, if restoring there)
apt-get install -y postgresql-client gzip

# restic
apt-get install -y restic   # or: download static binary from https://github.com/restic/restic/releases
```

Place the restic credentials. **Do not paste these into shell history.** Source from a file:

```bash
cat > /tmp/restic.env <<EOF
export RESTIC_REPOSITORY="b2:my-bucket:roster"
export RESTIC_PASSWORD="..."          # from offline copy if /etc/restic/env is gone
export B2_ACCOUNT_ID="..."
export B2_ACCOUNT_KEY="..."
EOF
chmod 600 /tmp/restic.env
source /tmp/restic.env
```

Verify access:

```bash
restic snapshots --tag nightly | tail -10
```

You should see one row per night for the retained window.

## Full restore

### 1. Pick a snapshot

```bash
restic snapshots --tag nightly
# pick the latest pre-incident ID, e.g. 8e3d9a2f
SNAPSHOT_ID=8e3d9a2f
```

### 2. Pull files to a scratch directory

```bash
mkdir -p /tmp/restore
restic restore "$SNAPSHOT_ID" --target /tmp/restore
```

This recreates the original absolute paths under `/tmp/restore`, e.g. `/tmp/restore/var/app/uploads/...` and `/tmp/restore/var/backups/pg/dump-*.sql.gz`.

### 3. Reload Postgres

Pick the most recent dump in the snapshot:

```bash
ls -lt /tmp/restore/var/backups/pg/dump-*.sql.gz | head -3
DUMP=/tmp/restore/var/backups/pg/dump-YYYYMMDDTHHMMSSZ.sql.gz
```

Create a clean target database and load:

```bash
createdb -h <host> -U <user> classroom_roster_restored
gunzip -c "$DUMP" | psql -h <host> -U <user> -d classroom_roster_restored --set ON_ERROR_STOP=on
```

If you are restoring in place (overwriting the live DB), drop and recreate first:

```bash
dropdb classroom_roster && createdb classroom_roster
gunzip -c "$DUMP" | psql --set ON_ERROR_STOP=on classroom_roster
```

### 4. Restore upload files

```bash
rsync -av /tmp/restore/var/app/uploads/  /var/app/uploads/
chown -R app:app /var/app/uploads
```

### 5. Restore app config (only if lost)

```bash
rsync -av /tmp/restore/etc/app/  /etc/app/
chmod 600 /etc/app/.env
```

### 6. Sanity check

Smoke tests before reopening to users:

```bash
# DB row counts match expectations
psql classroom_roster -c 'SELECT count(*) FROM teachers; SELECT count(*) FROM classes; SELECT count(*) FROM students;'

# A known student record
psql classroom_roster -c "SELECT legal_name, preferred_name FROM students LIMIT 5;"

# Photo files match DB rows (no orphans, no missing)
node /opt/classroom-roster/scripts/check-orphans.mjs
```

Then bring the app process back up and load the dashboard.

## Targeted restore: single class

If only one class was deleted by mistake:

1. Restore the latest dump into a *separate* DB (`classroom_roster_restored`).
2. Identify the class id and pull its rows:
   ```sql
   \copy (SELECT * FROM classes WHERE name = 'Period 3') TO 'class.csv' CSV;
   \copy (SELECT * FROM students WHERE class_id = '...') TO 'students.csv' CSV;
   \copy (SELECT * FROM seating_positions WHERE class_id = '...') TO 'seating.csv' CSV;
   ```
3. Re-insert into the live DB (be mindful of FK ordering: classes → students → seating_positions).
4. Copy the class's photo subtrees from the snapshot:
   ```bash
   rsync -av /tmp/restore/var/app/uploads/classes/$CLASS_ID/  /var/app/uploads/classes/$CLASS_ID/
   rsync -av /tmp/restore/var/app/uploads/students/$STUDENT_ID/  /var/app/uploads/students/$STUDENT_ID/
   ```

## Quarterly drill checklist

Run this once a quarter on a scratch VM and update this doc with any friction.

- [ ] Pulled the snapshot to a fresh box (no stale state from the live one).
- [ ] Loaded the Postgres dump into a fresh database without errors.
- [ ] Verified the row counts match the live DB (give or take a day's submissions).
- [ ] Verified at least one student record by name.
- [ ] Verified a known photo opens via the API route after wiring up the restored uploads dir.
- [ ] `check-orphans.mjs` reports clean.
- [ ] Recorded total restore time (target: < 30 minutes for a single-class app).

## Recovery if the restic password is lost

The encrypted repository on B2 is unrecoverable without the password. If `/etc/restic/env` is destroyed and the offline copy is also lost, you have **no backup**.

Mitigations to keep current:

1. Print the password and file it physically (safe, password manager card, etc.).
2. Store a sealed copy in a separate password manager owned by a different person, if applicable.
3. Re-verify the offline copy as part of the quarterly drill.

## Known friction (update during drills)

_(Empty until the first drill — fill in here.)_
