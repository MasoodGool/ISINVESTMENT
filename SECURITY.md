# Security

## Posture

- **Authentication** — email + password. Passwords are hashed with scrypt
  (N=16384, r=8, p=1, 64-byte keys, per-user random salts); parameters are
  encoded in the stored hash so they can be raised without invalidating
  credentials. Login attempts are rate-limited per IP+email and use
  timing-safe comparisons, including a dummy verification when the account
  does not exist.
- **Sessions** — HS256-signed JWTs in `HttpOnly`, `SameSite=Lax` cookies
  (`Secure` in production), 14-day expiry. Every request re-resolves the
  session against the database, so deactivating a user locks them out
  immediately.
- **Authorisation** — three roles (Administrator / Manager / Viewer)
  enforced server-side in every mutating server action and admin page, not
  just hidden in the UI.
- **Audit** — all mutations, exports, and sign-ins/outs are recorded with
  the acting user, action, entity, and timestamp.
- **Transport & headers** — HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, restrictive Referrer/Permissions
  policies; `X-Powered-By` disabled.
- **Input validation** — all form input is validated with zod before
  touching the database; money is stored as integer cents.
- **CSRF** — mutations go through Next.js server actions, which enforce
  same-origin checks; the session cookie is `SameSite=Lax`.

## Deployment expectations

- Serve over HTTPS only.
- Keep `SESSION_SECRET` (≥ 32 chars) in a secret manager; rotating it
  invalidates all sessions.
- The login rate limiter is in-memory and assumes a single node.

## Reporting a vulnerability

Open a private security advisory on the repository, or email the
maintainer. Please do not file public issues for exploitable problems.
