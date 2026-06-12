import { prisma } from "@/lib/db";
import { computeMonthlyCashflow } from "@/lib/reports";
import { computePortfolioTaxSummary, currentTaxYear, formatTaxYear } from "@/lib/tax";
import { formatZar } from "@/lib/format";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";

const monthLabel = new Intl.DateTimeFormat("en-ZA", { month: "short", year: "2-digit" });

export default async function ReportsPage() {
  const taxYear = currentTaxYear();
  const [cashflow, taxSummary, activeLeaseCount, propertyCount] = await Promise.all([
    computeMonthlyCashflow(12),
    computePortfolioTaxSummary(taxYear),
    prisma.lease.count({
      where: { status: "Active", property: { archived: false } },
    }),
    prisma.property.count({ where: { archived: false } }),
  ]);

  const totals = cashflow.reduce(
    (acc, m) => ({
      rentCents: acc.rentCents + m.rentCents,
      expensesCents: acc.expensesCents + m.expensesCents,
      interestCents: acc.interestCents + m.interestCents,
      netCents: acc.netCents + m.netCents,
    }),
    { rentCents: 0, expensesCents: 0, interestCents: 0, netCents: 0 },
  );

  const occupancyPct =
    propertyCount > 0 ? Math.round((activeLeaseCount / propertyCount) * 100) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Portfolio performance over the trailing 12 months.
        </p>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Rent received (12m)" value={formatZar(totals.rentCents)} />
        <Stat
          label="Operating costs (12m)"
          value={formatZar(totals.expensesCents + totals.interestCents)}
          hint={`Expenses ${formatZar(totals.expensesCents)} + interest ${formatZar(totals.interestCents)}`}
        />
        <Stat
          label="Net cashflow (12m)"
          value={formatZar(totals.netCents)}
          tone={totals.netCents >= 0 ? "green" : "red"}
        />
        <Stat
          label="Occupancy"
          value={occupancyPct === null ? "—" : `${occupancyPct}%`}
          hint={`${activeLeaseCount} active lease(s), ${propertyCount} propert${propertyCount === 1 ? "y" : "ies"}`}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Monthly cashflow</CardTitle>
          <CardDescription>
            Rent on a cash (received) basis; expenses exclude capital items; interest
            from captured loan statements.
          </CardDescription>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <THead>
              <Tr>
                <Th>Month</Th>
                <Th className="text-right">Rent received</Th>
                <Th className="text-right">Expenses</Th>
                <Th className="text-right">Bond interest</Th>
                <Th className="text-right">Net</Th>
              </Tr>
            </THead>
            <TBody>
              {cashflow.map((m) => (
                <Tr key={`${m.year}-${m.month}`}>
                  <Td className="text-zinc-600">
                    {monthLabel.format(new Date(Date.UTC(m.year, m.month - 1, 1)))}
                  </Td>
                  <Td className="text-right tabular-nums">{formatZar(m.rentCents)}</Td>
                  <Td className="text-right tabular-nums text-zinc-600">
                    ({formatZar(m.expensesCents)})
                  </Td>
                  <Td className="text-right tabular-nums text-zinc-600">
                    ({formatZar(m.interestCents)})
                  </Td>
                  <Td
                    className={`text-right tabular-nums font-medium ${
                      m.netCents >= 0 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {formatZar(m.netCents)}
                  </Td>
                </Tr>
              ))}
              <Tr className="font-semibold border-t border-zinc-200">
                <Td>Total</Td>
                <Td className="text-right tabular-nums">{formatZar(totals.rentCents)}</Td>
                <Td className="text-right tabular-nums">({formatZar(totals.expensesCents)})</Td>
                <Td className="text-right tabular-nums">({formatZar(totals.interestCents)})</Td>
                <Td
                  className={`text-right tabular-nums ${
                    totals.netCents >= 0 ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {formatZar(totals.netCents)}
                </Td>
              </Tr>
            </TBody>
          </Table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax year to date — {formatTaxYear(taxYear)}</CardTitle>
          <CardDescription>
            Net position per property for the current SA tax year. Full detail on the
            Tax report page.
          </CardDescription>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <THead>
              <Tr>
                <Th>Property</Th>
                <Th className="text-right">Rental income</Th>
                <Th className="text-right">Deductions</Th>
                <Th className="text-right">Net</Th>
              </Tr>
            </THead>
            <TBody>
              {taxSummary.perProperty.map((p) => (
                <Tr key={p.propertyId}>
                  <Td className="font-medium">{p.propertyName}</Td>
                  <Td className="text-right tabular-nums">
                    {formatZar(p.rentalIncomeCents)}
                  </Td>
                  <Td className="text-right tabular-nums text-zinc-600">
                    ({formatZar(p.totalRevenueDeductionsCents)})
                  </Td>
                  <Td
                    className={`text-right tabular-nums font-medium ${
                      p.isLoss ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    {formatZar(p.netRentalCents)}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
