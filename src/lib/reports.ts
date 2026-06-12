import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Rent roll — for a given calendar month, what rent was expected per lease
// and what was actually received. Payments are attributed to the month their
// billing period starts in, matching how landlords reconcile statements.
// ---------------------------------------------------------------------------

export interface RentRollRow {
  propertyId: string;
  propertyName: string;
  leaseId: string | null;
  tenantName: string | null;
  expectedCents: number;
  receivedCents: number;
  status: "Paid" | "Partial" | "Outstanding" | "Vacant";
}

export interface RentRoll {
  year: number;
  month: number; // 1-12
  rows: RentRollRow[];
  totalExpectedCents: number;
  totalReceivedCents: number;
  totalOutstandingCents: number;
  occupiedCount: number;
  vacantCount: number;
}

export function monthRange(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

export async function computeRentRoll(year: number, month: number): Promise<RentRoll> {
  const { start, end } = monthRange(year, month);

  const properties = await prisma.property.findMany({
    where: { archived: false },
    orderBy: { name: "asc" },
    include: {
      leases: {
        // Leases overlapping the month, regardless of current status, so
        // historical months stay accurate after a tenant moves out.
        where: {
          startDate: { lte: end },
          OR: [{ endDate: null }, { endDate: { gte: start } }],
        },
        include: {
          tenant: true,
          payments: { where: { periodStart: { gte: start, lte: end } } },
        },
        orderBy: { startDate: "desc" },
      },
    },
  });

  const rows: RentRollRow[] = [];
  for (const property of properties) {
    if (property.leases.length === 0) {
      rows.push({
        propertyId: property.id,
        propertyName: property.name,
        leaseId: null,
        tenantName: null,
        expectedCents: 0,
        receivedCents: 0,
        status: "Vacant",
      });
      continue;
    }
    for (const lease of property.leases) {
      const receivedCents = lease.payments.reduce((s, p) => s + p.amount, 0);
      const expectedCents = lease.monthlyRent;
      rows.push({
        propertyId: property.id,
        propertyName: property.name,
        leaseId: lease.id,
        tenantName: lease.tenant.fullName,
        expectedCents,
        receivedCents,
        status:
          receivedCents >= expectedCents
            ? "Paid"
            : receivedCents > 0
              ? "Partial"
              : "Outstanding",
      });
    }
  }

  const totalExpectedCents = rows.reduce((s, r) => s + r.expectedCents, 0);
  const totalReceivedCents = rows.reduce((s, r) => s + r.receivedCents, 0);

  return {
    year,
    month,
    rows,
    totalExpectedCents,
    totalReceivedCents,
    totalOutstandingCents: Math.max(0, totalExpectedCents - totalReceivedCents),
    occupiedCount: rows.filter((r) => r.status !== "Vacant").length,
    vacantCount: rows.filter((r) => r.status === "Vacant").length,
  };
}

// ---------------------------------------------------------------------------
// Monthly cashflow — trailing N months of rent received (cash basis),
// deductible expenses, and bond interest.
// ---------------------------------------------------------------------------

export interface MonthCashflow {
  year: number;
  month: number; // 1-12
  rentCents: number;
  expensesCents: number;
  interestCents: number;
  netCents: number;
}

export async function computeMonthlyCashflow(
  months: number,
  now: Date = new Date(),
): Promise<MonthCashflow[]> {
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1));
  const last = monthRange(now.getUTCFullYear(), now.getUTCMonth() + 1).end;

  const [payments, expenses, statements] = await Promise.all([
    prisma.rentPayment.findMany({
      where: {
        paidOn: { gte: first, lte: last },
        lease: { property: { archived: false } },
      },
      select: { paidOn: true, amount: true },
    }),
    prisma.expense.findMany({
      where: {
        date: { gte: first, lte: last },
        isCapital: false,
        isReclaimable: true,
        property: { archived: false },
      },
      select: { date: true, amount: true },
    }),
    prisma.loanStatement.findMany({
      where: {
        periodEnd: { gte: first, lte: last },
        loan: { property: { archived: false } },
      },
      select: { periodEnd: true, interestCharged: true },
    }),
  ]);

  const buckets = new Map<string, MonthCashflow>();
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + i, 1));
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
    buckets.set(key, {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      rentCents: 0,
      expensesCents: 0,
      interestCents: 0,
      netCents: 0,
    });
  }

  const bucketFor = (d: Date) => buckets.get(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`);

  for (const p of payments) {
    const b = bucketFor(p.paidOn);
    if (b) b.rentCents += p.amount;
  }
  for (const e of expenses) {
    const b = bucketFor(e.date);
    if (b) b.expensesCents += e.amount;
  }
  for (const s of statements) {
    const b = bucketFor(s.periodEnd);
    if (b) b.interestCents += s.interestCharged;
  }

  const result = Array.from(buckets.values());
  for (const m of result) {
    m.netCents = m.rentCents - m.expensesCents - m.interestCents;
  }
  return result;
}
