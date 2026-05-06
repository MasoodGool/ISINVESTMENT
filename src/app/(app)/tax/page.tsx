import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  computePortfolioTaxSummary,
  currentTaxYear,
  formatTaxYear,
} from "@/lib/tax";
import { formatZar } from "@/lib/format";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Alert } from "@/components/ui/alert";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function TaxPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const taxYear = sp.year ? Number(sp.year) : currentTaxYear();
  const summary = await computePortfolioTaxSummary(taxYear);

  // Year picker: current ± 4 (5 historical, current, 1 ahead).
  const oldestProperty = await prisma.property.findFirst({
    orderBy: { purchaseDate: "asc" },
    select: { purchaseDate: true },
  });
  const earliestYear = oldestProperty
    ? Math.max(2000, oldestProperty.purchaseDate.getFullYear())
    : currentTaxYear() - 4;
  const latestYear = currentTaxYear() + 1;
  const years: number[] = [];
  for (let y = latestYear; y >= earliestYear; y--) years.push(y);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tax report</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Figures for the <b>Local rental income</b> section of your ITR12. SA tax
            year runs 1 March – end of February. <b>Not tax advice</b> — review with
            your accountant before filing.
          </p>
        </div>
        <form className="flex items-center gap-2">
          <label className="text-sm text-zinc-600">Tax year</label>
          <select
            name="year"
            defaultValue={String(taxYear)}
            className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {formatTaxYear(y)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
          >
            View
          </button>
        </form>
      </div>

      {summary.ringFenceRisk && (
        <Alert tone="warning" title="Net rental loss flag">
          Your portfolio is in a net rental loss for {formatTaxYear(taxYear)}. SARS
          may ring-fence the assessed loss under <b>section 20A</b> if your taxable
          income falls in the highest bracket and rental has been a loss in 3 of the
          past 5 years. Discuss with your accountant before claiming the loss
          against other taxable income.
        </Alert>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Rental income" value={formatZar(summary.rentalIncomeCents)} />
        <Stat
          label="Total deductions"
          value={formatZar(summary.totalRevenueDeductionsCents)}
        />
        <Stat
          label={summary.isLoss ? "Net rental loss" : "Net rental income"}
          value={formatZar(Math.abs(summary.netRentalCents))}
          tone={summary.isLoss ? "red" : "green"}
        />
        <Stat
          label="Capital this year"
          value={formatZar(summary.capitalExpensesTotalCents)}
          hint="Adds to CGT base cost; not deductible"
        />
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-base font-semibold tracking-tight">By property</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Each property's contribution to the tax year. Click through for the full
            ledger.
          </p>
        </div>

        {summary.perProperty.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sm text-zinc-500">
                No properties yet — add one to start building your tax report.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {summary.perProperty.map((p) => (
              <Card key={p.propertyId}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>
                        <Link
                          href={`/properties/${p.propertyId}`}
                          className="hover:underline"
                        >
                          {p.propertyName}
                        </Link>
                      </CardTitle>
                      <CardDescription>
                        Rental {formatZar(p.rentalIncomeCents)} · Deductions{" "}
                        {formatZar(p.totalRevenueDeductionsCents)} ·{" "}
                        <span
                          className={p.isLoss ? "text-red-700" : "text-green-700"}
                        >
                          {p.isLoss ? "Loss " : "Net "}
                          {formatZar(Math.abs(p.netRentalCents))}
                        </span>
                      </CardDescription>
                    </div>
                    {p.isLoss && <Badge tone="red">Loss</Badge>}
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  <Table>
                    <THead>
                      <Tr>
                        <Th>Line</Th>
                        <Th className="text-right">Amount</Th>
                      </Tr>
                    </THead>
                    <TBody>
                      <Tr className="font-medium">
                        <Td>Rental income (received)</Td>
                        <Td className="text-right tabular-nums">
                          {formatZar(p.rentalIncomeCents)}
                        </Td>
                      </Tr>
                      <Tr>
                        <Td className="pl-6 text-zinc-600">Less: Bond interest (s11(a))</Td>
                        <Td className="text-right tabular-nums text-zinc-600">
                          ({formatZar(p.bondInterestCents)})
                        </Td>
                      </Tr>
                      {p.amortisedInitiationFeesCents > 0 && (
                        <Tr>
                          <Td className="pl-6 text-zinc-600">
                            Less: Bond initiation amortised (PN 31 / s24J)
                          </Td>
                          <Td className="text-right tabular-nums text-zinc-600">
                            ({formatZar(p.amortisedInitiationFeesCents)})
                          </Td>
                        </Tr>
                      )}
                      {p.expensesByCategory.map((c) => (
                        <Tr key={c.code}>
                          <Td className="pl-6 text-zinc-600">Less: {c.label}</Td>
                          <Td className="text-right tabular-nums text-zinc-600">
                            ({formatZar(c.amountCents)})
                          </Td>
                        </Tr>
                      ))}
                      <Tr className="font-semibold border-t border-zinc-200">
                        <Td>{p.isLoss ? "Net rental loss" : "Net rental income"}</Td>
                        <Td
                          className={`text-right tabular-nums ${
                            p.isLoss ? "text-red-700" : "text-green-700"
                          }`}
                        >
                          {p.isLoss ? "(" : ""}
                          {formatZar(Math.abs(p.netRentalCents))}
                          {p.isLoss ? ")" : ""}
                        </Td>
                      </Tr>
                    </TBody>
                  </Table>

                  {p.capitalExpenses.length > 0 && (
                    <div className="border-t border-zinc-100 px-5 py-4 bg-zinc-50/50">
                      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Capital this year (CGT base cost — not deductible)
                      </div>
                      <ul className="mt-2 space-y-1 text-sm">
                        {p.capitalExpenses.map((c) => (
                          <li key={c.code} className="flex justify-between">
                            <span className="text-zinc-700">{c.label}</span>
                            <span className="tabular-nums text-zinc-700">
                              {formatZar(c.amountCents)}
                            </span>
                          </li>
                        ))}
                        <li className="flex justify-between border-t border-zinc-200 pt-1 font-medium">
                          <span>Total</span>
                          <span className="tabular-nums">
                            {formatZar(p.capitalExpensesTotalCents)}
                          </span>
                        </li>
                      </ul>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Portfolio totals</CardTitle>
            <CardDescription>
              These figures roll up to the consolidated entry on your ITR12.
            </CardDescription>
          </CardHeader>
          <CardBody className="p-0">
            <Table>
              <THead>
                <Tr>
                  <Th>Line</Th>
                  <Th className="text-right">Amount</Th>
                </Tr>
              </THead>
              <TBody>
                <Tr className="font-medium">
                  <Td>Total rental income</Td>
                  <Td className="text-right tabular-nums">
                    {formatZar(summary.rentalIncomeCents)}
                  </Td>
                </Tr>
                <Tr>
                  <Td className="pl-6 text-zinc-600">Total deductions</Td>
                  <Td className="text-right tabular-nums text-zinc-600">
                    ({formatZar(summary.totalRevenueDeductionsCents)})
                  </Td>
                </Tr>
                <Tr className="font-semibold border-t border-zinc-200">
                  <Td>{summary.isLoss ? "Net rental loss" : "Net rental income"}</Td>
                  <Td
                    className={`text-right tabular-nums ${
                      summary.isLoss ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    {summary.isLoss ? "(" : ""}
                    {formatZar(Math.abs(summary.netRentalCents))}
                    {summary.isLoss ? ")" : ""}
                  </Td>
                </Tr>
              </TBody>
            </Table>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
