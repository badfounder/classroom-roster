# VPS hardening + cost control

For a Hetzner box running Coolify + this app. Ordered by impact-per-minute-of-effort, not by topic. Do the **green** ones now. Skim the **yellow** ones, do them if you have ten more minutes. Skip the **red** ones unless you start getting real traffic.

| | Item | Time | Why |
|---|---|---|---|
| 🟢 | Hetzner traffic alert | 2 min | The single biggest "surprise bill" risk |
| 🟢 | SSH key-only login + root disabled | 5 min | Closes off the most brute-forced port on the internet |
| 🟢 | `ufw` firewall — only 22, 80, 443 + Coolify | 3 min | Postgres + Coolify proxy port should never be public |
| 🟢 | Automated security updates | 1 min | Free patches in your sleep |
| 🟡 | `fail2ban` on SSH and the app | 10 min | Stops the noise; doesn't change the threat model much |
| 🟡 | Cloudflare in front of the app | 15 min | Free DDoS / WAF / bot filtering. Worth it if anyone's actively poking |
| 🟡 | Backup script actually wired up (`runbooks/restore.md`) | 30 min | Single biggest "I lost everything" risk after delete-the-VPS |
| 🟡 | Anthropic spending limit | 1 min | Cap seat-detection cost runaway |
| 🔴 | Per-class submission rate cap | code change | Already have IP-based rate limit; per-class only matters at scale |
| 🔴 | Custom WAF rules | hours | Only useful if you actually see attack traffic |
| 🔴 | Postgres TLS for internal traffic | 30 min | Already on a private Docker network; defense in depth only |

---

## 🟢 1. Hetzner traffic alert (2 min)

Hetzner Cloud VPS plans include 20 TB/month outbound. Beyond that it's €1.00/TB. Realistic for a classroom app: maybe 10 GB/month. **You'll never overshoot organically.** But a sustained attack or a runaway log can blow through it.

1. https://console.hetzner.cloud → your project → **Servers** → click your VPS.
2. **Graphs** tab — you'll see your current traffic. Look at the baseline.
3. **Hetzner doesn't have per-server hard caps**, but the **Cloud Console** account has a billing-limit feature: top-right menu → **Security** → **Spending limit**. Set it to whatever you're comfortable being on the hook for in a worst case (e.g. €20/month would cover ~20 TB of overage above a €5 server).

If you want explicit notification before you blow the cap, set up a daily traffic check via a script that emails you (cron + the `vnstat` package is the simplest path; let me know if you want the script).

## 🟢 2. SSH: key-only, root disabled (5 min)

The single most-attacked surface on any internet-facing Linux box. From your Mac:

```bash
# First, make sure you can log in with a key (NOT just a password). If you
# already created the VPS with an SSH key, you're set. If not, generate
# one and copy it over:
ssh-keygen -t ed25519 -C "claytonweir mac"
ssh-copy-id root@178.105.186.243
```

Verify you can SSH in **without typing a password** (`ssh root@178.105.186.243` — should just log you in). Then on the VPS:

```bash
sudo nano /etc/ssh/sshd_config
```

Change (or add) these lines:

```
PasswordAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
```

`prohibit-password` means root can still log in *with a key* but not with a password — Coolify needs root SSH for some things, so this is safer than `no`. Then:

```bash
sudo systemctl restart ssh
```

**Test in a new terminal window before closing the current one.** If the new window can SSH in, you're good. If not, the original window is still authenticated and you can revert the change.

## 🟢 3. `ufw` firewall (3 min)

Coolify exposes its admin UI on port 8000 by default. **Anyone on the internet can hit it.** That's bad. Same goes for Postgres if anything weird happened.

```bash
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (Coolify proxies the app through this)
sudo ufw allow 443/tcp  # HTTPS
# Coolify's admin UI — comment this out and use an SSH tunnel instead
# (see below) for stronger security, OR allow only from your home IP:
sudo ufw allow from <YOUR_HOME_IP> to any port 8000 proto tcp
sudo ufw enable
sudo ufw status
```

After this, **port 8000 is no longer publicly reachable** unless you scoped it to your IP. To access the Coolify UI from anywhere, use an SSH tunnel:

```bash
# From your Mac:
ssh -L 8000:localhost:8000 root@178.105.186.243
# Then open http://localhost:8000 in your browser.
```

If you don't have a static home IP and SSH tunneling is annoying, **just leave 8000 open but make absolutely sure your Coolify admin password is strong**. That's not great, but it's the realistic compromise.

## 🟢 4. Automated security updates (1 min)

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades  # say Yes
```

Ubuntu/Debian will now apply security patches automatically. Reboots when needed are configurable in `/etc/apt/apt.conf.d/50unattended-upgrades` — set `Unattended-Upgrade::Automatic-Reboot "true";` if you want auto-reboot at 2 AM (recommended for a hobby box).

---

## 🟡 5. `fail2ban` (10 min)

Bans IPs that fail SSH or HTTP login too many times. Stops your auth log from filling with brute-force noise. Doesn't change the threat model much if you already disabled password auth, but it's good hygiene.

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status
```

Default jail bans SSH brute-forcers after 5 failed attempts for 10 minutes. That's fine. If you want it stricter, edit `/etc/fail2ban/jail.local`.

For app-level protection (someone hammering `/api/auth/callback/credentials`), the app already has IP-based rate limiting on the survey route. If you want me to extend it to login attempts, say so — small code change.

## 🟡 6. Cloudflare in front of the app (15 min)

Cloudflare's free tier gives you:
- L7 DDoS protection
- Bot filtering
- A WAF with reasonable defaults
- Caching of static assets
- Hides your VPS IP

Tradeoff: you have to use a real domain (not sslip.io). If you're staying on sslip.io for now, skip this and revisit when you get a domain.

When you're ready: get a domain (Cloudflare itself sells them at cost), create an A record pointing to your VPS IP with the orange-cloud proxy enabled, swap `NEXTAUTH_URL` to the new domain in Coolify, redeploy. Let's Encrypt + Cloudflare cooperate via "Full (strict)" SSL mode.

## 🟡 7. Backups (30 min, one-time)

You already have everything in [scripts/backup.sh](../scripts/backup.sh) and [runbooks/restore.md](./restore.md). The script just needs an environment file with credentials and a cron entry.

Realistically: a Hetzner snapshot is **not a backup** — it lives on the same provider. The restic + Backblaze B2 path costs ~$1/month for this app's footprint and survives "Hetzner deleted my VPS" scenarios.

## 🟡 8. Anthropic spending limit (1 min)

You're using `ANTHROPIC_API_KEY` for seat detection. Each call is ~$0.01. A teacher pressing "Detect" 100 times would still be $1. But you should still cap it:

1. https://console.anthropic.com/settings/limits
2. Set a **monthly spend limit** — $10 is plenty for this app's realistic usage.
3. Optionally set per-key limits if you want to keep your personal use and the app on separate caps.

---

## 🔴 Stuff probably not worth doing yet

- **Per-class submission rate cap** — the existing IP-based rate limit on `src/lib/survey-rate-limit.ts` is enough until you have multiple classes being abused simultaneously.
- **Custom WAF rules** — only matters if you start seeing attack traffic in your access logs. Cloudflare's defaults are fine until then.
- **Postgres TLS for internal traffic** — the database is on a private Docker network only reachable from the app container. TLS adds no security at this scale.
- **PEN test / security audit** — at this app's footprint, you're better off doing the basics above and spending time elsewhere.

---

## Quick check — am I exposed?

From your Mac:

```bash
# What's listening on the public IP?
nmap -sT -p 1-10000 178.105.186.243
```

Expect to see:
- `22/tcp open  ssh`
- `80/tcp open  http`
- `443/tcp open  https`
- maybe `8000/tcp open` if you didn't restrict it

Anything else open (especially `5432`, `5433`, `6379`, `27017`) is a problem.
