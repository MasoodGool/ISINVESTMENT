# ISINVESTMENT

A South African property investment platform that makes letting income easy
to manage and **SARS season painless**.

## Phase 1 — what's in here

- **Properties** with first-class support for student accommodation
  (per-room leases) alongside standard residential / sectional title units.
- **Tenants & leases** with monthly rent, deposits, start/end dates.
- **Rent payments** ledger with status tracking (paid / partial / late).
- **Loans** with per-period statements that capture the **deductible
  interest portion** specifically (the figure SARS wants on your ITR12).
- **Expenses** categorised against a SARS-aware catalog that flags
  capital vs revenue items and warns when a "repair" is really an
  improvement (capital, not deductible).
- **Tax year report** that produces the figures for the
  *Local rental income* section of your ITR12, per-property and consolidated,
  for the SA tax year (1 March – end of February).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Prisma 6 + SQLite for dev (Postgres-ready — swap one line)
- Tailwind v3 + lucide-react icons
- Server actions for mutations, zod for validation
- Single-user auth (env-configured password + signed JWT cookie)

## Getting started

```bash
cp .env.example .env       # fill in APP_PASSWORD and SESSION_SECRET
npm install                # also runs `prisma generate`
npm run db:push            # create the SQLite schema
npm run db:seed            # load sample property + student res
npm run dev                # http://localhost:3000
```

Then sign in with the `APP_PASSWORD` from your `.env`.

## SARS notes baked in

- SA tax year runs **1 March → end of February**. The tax report uses this.
- **Section 11(a)** general deduction governs day-to-day rental expenses.
- **Section 13sex** (5% allowance on cost of new residential units, 5+ units) is
  surfaced as an expense category. Use it carefully — talk to your tax advisor.
- **Capital vs revenue**: Improvements (extensions, replacing the whole roof
  with a better one, adding a granny flat) are capital, not deductible —
  they form part of the base cost for CGT instead. The expense form warns
  you when you pick a category that is commonly capital.
- **Section 20A ring-fencing**: When net rental is a loss and a taxpayer
  earns above the threshold, SARS may ring-fence the loss. The dashboard
  flags negative net positions for review.

This tool helps you get the numbers right; **it is not tax advice**. Run
the report, hand it to your accountant or paste it into eFiling.

## Roadmap

- Bank statement CSV import + auto-categorisation
- Document store for receipts (S3 / local disk)
- Multi-user with accountant view-only access
- Capital improvements ledger feeding into a CGT base-cost calculator
- ITR12 PDF export
- Mobile / PWA
