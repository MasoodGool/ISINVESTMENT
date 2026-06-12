# Deployment

ISINVESTMENT ships as a standard Next.js app. The supported topology is a
single node in front of your database; the in-memory login rate limiter and
session model assume one instance (put Redis-backed equivalents in front if
you scale out horizontally).

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | SQLite file URL or Postgres connection string |
| `SESSION_SECRET` | yes | ≥ 32 chars; signs session cookies. `openssl rand -base64 32` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | no | Used by `npm run db:seed` only |

## Option 1 — Docker (recommended)

```bash
echo "SESSION_SECRET=$(openssl rand -base64 32)" > .env
docker compose up -d --build
```

This runs the app on port 3000 with SQLite on a named volume and a
`/api/health` healthcheck. Visit the site and create the first administrator
at `/setup`.

## Option 2 — Bare Node

```bash
npm ci
npm run build
npx prisma db push --skip-generate
npm start             # PORT=3000 by default
```

Run it under a process manager (systemd, PM2) and put a TLS-terminating
reverse proxy (Caddy, nginx) in front. The app sets `Secure` cookies and
HSTS in production, so serve it over HTTPS.

## Switching to Postgres

1. In `prisma/schema.prisma`, change the datasource provider:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Set `DATABASE_URL`, e.g.
   `postgresql://isinvestment:***@db:5432/isinvestment?schema=public`
3. Recreate the client and schema: `npx prisma generate && npx prisma db push`
4. If you use docker-compose, uncomment the `db` service and `db-data`
   volume in `docker-compose.yml`.

For long-lived production databases, graduate from `db push` to Prisma
Migrate (`prisma migrate dev` / `prisma migrate deploy`) so schema changes
are versioned.

## Operational checklist

- [ ] `SESSION_SECRET` is unique per environment and stored in a secret manager
- [ ] HTTPS end-to-end (HSTS is on by default in production)
- [ ] Database backups scheduled (SQLite: snapshot the volume; Postgres: `pg_dump`)
- [ ] `/api/health` wired into your uptime monitoring / load balancer
- [ ] First admin created and the seeded password changed (if you seeded)
- [ ] Accountant access granted as **Viewer**, staff as **Manager** —
      keep **Administrator** to a minimum
- [ ] Audit log reviewed periodically (`/settings/audit`)
