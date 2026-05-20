# Deploying to Hetzner + Coolify

End-to-end for a fresh deploy. The repo's `Dockerfile` does the heavy lifting; Coolify just orchestrates Postgres, the persistent uploads volume, env vars, and SSL.

---

## 0. Before you touch Coolify

You need five things lined up before anything in the Coolify UI works.

### 0a. VPS sized for the build

`next build` on Turbopack wants memory. **2 GB minimum**, 4 GB comfortable. Hetzner's `cx22` (4 GB / 2 vCPU) is the smallest size I'd trust. If your VPS has 1 GB, the build will OOM-kill silently and Coolify will show "Build failed" with no useful log line.

```bash
# on the VPS
free -h
```

If RAM is tight, add a 2 GB swap file as a quick fix:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile \
  && sudo mkswap /swapfile && sudo swapon /swapfile \
  && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 0b. DNS pointing at the VPS

Pick a subdomain (e.g. `roster.example.com`) and add an **A record** in your DNS provider pointing at the VPS's public IPv4. Add a matching **AAAA record** for IPv6 if your VPS has one. Verify resolution **before** moving on — Coolify's Let's Encrypt provisioning will fail if DNS hasn't propagated.

```bash
dig +short roster.example.com  # should return the VPS IP
```

(15 minutes is a typical propagation window; can be near-instant if your registrar is fast.)

### 0c. Coolify connected to GitHub

The `classroom-roster` repo on GitHub is **private**. Coolify can't pull from it without explicit access. The cleanest path is Coolify's GitHub App:

1. In Coolify: **Sources → New → GitHub App**.
2. Click **Install GitHub App** — that opens GitHub.
3. Grant it access to **just the `classroom-roster` repo** (or all repos if you'd rather).
4. Back in Coolify, the source should now show your username and a green checkmark.

Alternatives if you'd rather not install an App:

- Make the repo public (`gh repo edit badfounder/classroom-roster --visibility public`).
- Or add a per-deploy SSH key as a GitHub **Deploy Key**, then paste the private half into Coolify under **Sources → Private Key**.

### 0d. `NEXTAUTH_SECRET` decided and saved

Generate it once now and put it in a password manager — you'll paste it into Coolify in step 3 and you do not want to rotate it casually (every active session invalidates).

```bash
openssl rand -base64 32
```

### 0e. A local Docker smoke test (optional but cheap)

If you want to catch build errors before you watch them happen on the VPS:

```bash
docker build -t classroom-roster:local .
docker run --rm -p 3100:3000 \
  -e DATABASE_URL=postgresql://user:password@host.docker.internal:5433/classroom_roster \
  -e NEXTAUTH_URL=http://localhost:3100 \
  -e NEXTAUTH_SECRET=throwaway \
  classroom-roster:local
```

Then open <http://localhost:3100>. If the landing page renders, the image is good.

---

## 1. Provision Postgres

In Coolify: **Resources → New resource → Database → PostgreSQL**.

- Name: `classroom-roster-db`
- Postgres version: 16 or 17
- Leave the generated credentials as-is; Coolify will inject them via env vars on attached services.
- Click **Deploy**.

Once it's running, copy the **Internal connection string** Coolify shows on the database page (e.g. `postgres://postgres:****@postgresql-<id>:5432/postgres`). You'll paste that into the app's `DATABASE_URL` in the next step.

> Tip: rename the default `postgres` database to `classroom_roster` via Coolify's terminal if you want consistency with local dev, but it's not required — the app talks to whatever URL you give it.

---

## 2. Add the app as a service

**Resources → New resource → Application → Public Repository** (or **Private Repository** if your repo isn't public).

- Repository: `https://github.com/<you>/classroom-roster`
- Branch: `main`
- Build pack: **Dockerfile** (Coolify will auto-detect the `Dockerfile` in the repo root)
- Port: `3000`

Don't deploy yet — finish env vars and the volume first.

---

## 3. Environment variables

On the application's **Environment Variables** tab, add:

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | the internal connection string from step 1 | uses Coolify's internal network, never crosses the public internet |
| `NEXTAUTH_URL` | `https://roster.your-domain.com` | exact public URL with protocol, no trailing slash |
| `NEXTAUTH_SECRET` | run `openssl rand -base64 32` and paste | cookie signing key — keep it stable across deploys |
| `UPLOAD_DIR` | `/app/uploads` | matches the volume mount in step 4 |
| `ANTHROPIC_API_KEY` | optional | only set if you want the "✨ Detect seats from photo" button to work |

The `Dockerfile` defaults `NODE_ENV`, `PORT`, `HOSTNAME`, and `UPLOAD_DIR`. Don't override them unless you have a reason.

---

## 4. Persistent storage for uploads

Without this every redeploy wipes every student photo. **Storage → Add → Persistent Storage**:

- Mount path (inside the container): `/app/uploads`
- Name / host path: let Coolify manage it — it'll create a Docker volume backed by the host

If you'd rather use a host bind mount (e.g. so you can rsync the directory directly for backups), set:

- Source: `/srv/roster-uploads`
- Destination: `/app/uploads`

Either way, what matters is that **the path matches `UPLOAD_DIR`**.

---

## 5. Domain + SSL

On the application's **General** tab:

- **Domains**: `https://roster.your-domain.com` (the same value you set `NEXTAUTH_URL` to, minus protocol differences). Coolify provisions a Let's Encrypt cert automatically once the DNS record resolves.
- **Health check**: GET on `/` is fine; the landing page renders without a database.

---

## 6. First deploy

Click **Deploy**. Coolify will:

1. Clone your repo
2. Build the Dockerfile (multi-stage; ~2–4 minutes on a fresh cache)
3. Start the container with the env vars and volume from steps 3 & 4
4. Provision SSL once the domain resolves

Tail the build log if anything looks stuck. The first build pulls a few hundred MB of npm packages; subsequent builds reuse the layer cache.

---

## 7. Run migrations (one-time per schema change)

The app does **not** run migrations on container start — that would be a footgun if you ever roll back a deploy. Open Coolify's terminal for the application (**Terminal** tab) and run:

```bash
node scripts/migrate.mjs
```

This is idempotent: applied files get skipped. After future deploys that add new files under `db/migrations/`, run the same command again.

> If `migrate.mjs` errors with `DATABASE_URL is not set`, you launched the terminal before the env vars were attached. Restart the container, then reopen the terminal.

---

## 8. Create the first teacher account

Visit `https://roster.your-domain.com/signup` and create your teacher account. There's no admin UI for "first user" — anyone who hits `/signup` becomes a teacher, so close that route off after you're set up if you want (rotate your `NEXTAUTH_SECRET`, restrict at the proxy, or just trust the demo-class isolation since teachers only see their own classes).

---

## 9. Backups

The `runbooks/restore.md` describes the restic + Backblaze B2 flow. For Coolify, run [scripts/backup.sh](../scripts/backup.sh) from the host (not the container) so it can `pg_dump` over the network and `restic` the host-mounted uploads directory.

Cron stanza on the Hetzner host:

```cron
0 2 * * * /opt/classroom-roster/scripts/backup.sh --source-env /etc/restic/env >> /var/log/roster-backup.log 2>&1
17 * * * * /opt/classroom-roster/scripts/check-backup-fresh.sh
```

The relevant env vars on the host:

```bash
DATABASE_URL=postgresql://postgres:****@<coolify-postgres-public-host>:5432/postgres
UPLOAD_DIR=/srv/roster-uploads
```

(If you used a Coolify-managed volume instead of a host bind, point `restic` at Docker's volume path: `/var/lib/docker/volumes/<volume-name>/_data`.)

---

## 10. Subsequent deploys

Push to `main` on GitHub → Coolify auto-pulls and rebuilds (if you've enabled the GitHub webhook on the application's **Source** tab). For manual deploys, hit **Redeploy** in the Coolify UI.

If a deploy introduces a new migration, run `node scripts/migrate.mjs` from the Terminal **after** the new container is up — that ordering guarantees the schema is compatible with the code that's about to read it.

---

## Common things that go wrong

- **"Invalid `NEXTAUTH_URL`"** → it has to start with `https://` (or `http://` in dev). No trailing slash.
- **`role "user" does not exist`** → you copied the Postgres connection string but kept the local `user:password` placeholder. Use the Coolify-supplied URL verbatim.
- **Photos disappear after a redeploy** → no persistent volume on `/app/uploads`. Add one (step 4) and lost-photo damage is on whatever was uploaded since the last backup.
- **`ANTHROPIC_API_KEY` button missing** → key not set, or set but no classroom photo uploaded yet. Either way, the manual / rows / tables layouts still work.
- **Build OOM-killed** → bump the VPS to at least 2 GB RAM. Next 16's build with Turbopack is hungrier than v15.
