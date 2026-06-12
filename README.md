# ISINVESTMENT

A South African property investment platform that makes letting income easy
to manage and **SARS season painless** — built for landlords, portfolio
managers, and the accountants who serve them.

## Features

### Portfolio operations
- **Properties** with first-class support for student accommodation
  (per-room leases) alongside standard residential / sectional title units,
  with archive support for disposed properties.
- **Tenants directory** — searchable, with lease history and contact details.
- **Leases** with monthly rent, deposits, start/end dates.
- **Rent roll** — month-by-month expected vs received rent per lease, arrears
  flags, and occupancy at a glance.
- **Rent payments** ledger with status tracking (paid / partial / late).
- **Loans** with per-period statements that capture the **deductible
  interest portion** specifically (the figure SARS wants on your ITR12).
- **Expenses** categorised against a SARS-aware catalog that flags
  capital vs revenue items and warns when a "repair" is really an
  improvement (capital, not deductible).
- **Bank statement import** — upload a CSV from any major SA bank, review
  auto-suggested SARS categories (rent credits matched to the active
  lease), and bulk-import a month of transactions in one confirmed step.

### Reporting & tax
- **Tax year report** producing the figures for the *Local rental income*
  section of your ITR12, per-property and consolidated, for the SA tax year
  (1 March – end of February).
- **CSV exports** — tax report, expense ledger, and rent payments per tax
  year, ready for your accountant or eFiling.
- **Reports** — trailing-12-month cashflow, occupancy, and tax
  year-to-date position per property.
- **ROI metrics** — gross/net yield, cash-on-cash, CGT base cost per property.
- **Tax year notes** — context your accountant needs (vacancies, payouts,
  ring-fencing history), kept with each tax year.

### Enterprise
- **Multi-user access with roles**:
  - *Administrator* — everything, including user management and the audit log
  - *Manager* — create/edit portfolio data, run reports and exports
  - *Viewer* — read-only (ideal for your accountant at tax time)
- **Audit log** — every change (and export) recorded with who/what/when.
- **Hardened auth** — scrypt password hashing, signed JWT session cookies,
  login rate limiting, timing-safe comparisons.
- **Security headers**, `/api/health` probe for load balancers, Docker
  packaging, CI (typecheck, lint, unit tests, build).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Prisma 6 + SQLite for dev (Postgres-ready — swap one line; see
  [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))
- Tailwind v3 + lucide-react icons
- Server actions for mutations, zod for validation
- Vitest for unit tests, GitHub Actions for CI

## Getting started

```bash
cp .env.example .env       # set SESSION_SECRET (openssl rand -base64 32)
npm install                # also runs `prisma generate`
npm run db:push            # create the SQLite schema
npm run db:seed            # sample data + admin@example.com / change-me-now
npm run dev                # http://localhost:3000
```

Sign in with the seeded admin (`admin@example.com` / `change-me-now` — change
it immediately under **Users**), or skip seeding and the app will walk you
through creating the first administrator at `/setup`.

Useful scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit tests (tax engine, auth, CSV, rate limiter) |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run db:reset` | Recreate schema + reseed |
| `npm run db:studio` | Prisma Studio data browser |

## SARS notes baked in

- SA tax year runs **1 March → end of February**. The tax report uses this.
- **Section 11(a)** general deduction governs day-to-day rental expenses.
- **Section 13sex** (5% allowance on cost of new residential units, 5+ units) is
  surfaced as an expense category. Use it carefully — talk to your tax advisor.
- **Capital vs revenue**: Improvements (extensions, replacing the whole roof
  with a better one, adding a granny flat) are capital, not deductible —
  they form part of the base cost for CGT instead. The expense form warns
  you when you pick a category that is commonly capital.
- **Bond initiation fees** are amortised over the loan term
  (Practice Note 31 / s24J) automatically.
- **Section 20A ring-fencing**: When net rental is a loss and a taxpayer
  earns above the threshold, SARS may ring-fence the loss. The dashboard
  flags negative net positions for review.

This tool helps you get the numbers right; **it is not tax advice**. Run
the report, hand it to your accountant or paste it into eFiling.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Docker, Postgres, and
production hardening. Security posture and reporting are covered in
[SECURITY.md](SECURITY.md).

## Roadmap

- Document store for receipts (S3 / local disk)
- ITR12 PDF export
- Mobile / PWA
