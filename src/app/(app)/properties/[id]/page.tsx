import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  computeBaseCost,
  computePropertyROI,
  computePropertyTaxSummary,
  currentTaxYear,
  formatTaxYear,
} from "@/lib/tax";
import { formatDate, formatPercent, formatZar } from "@/lib/format";
import { getCategory } from "@/lib/sars";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import {
  LeaseForm,
  RentPaymentForm,
  ExpenseForm,
  LoanForm,
  LoanStatementForm,
} from "./forms";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const taxYear = currentTaxYear();

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      leases: {
        include: {
          tenant: true,
          payments: { orderBy: { paidOn: "desc" } },
        },
        orderBy: { startDate: "desc" },
      },
      expenses: { orderBy: { date: "desc" } },
      loans: {
        include: { statements: { orderBy: { periodStart: "desc" } } },
        orderBy: { startDate: "asc" },
      },
    },
  });
  if (!property) notFound();

  const [roi, taxSummary, baseCost] = await Promise.all([
    computePropertyROI(property.id),
    computePropertyTaxSummary(property.id, taxYear),
    computeBaseCost(property.id),
  ]);

  const activeLease = property.leases.find((l) => l.status === "Active");
  const allPayments = property.leases.flatMap((l) =>
    l.payments.map((p) => ({ ...p, tenantName: l.tenant.fullName })),
  );
  allPayments.sort((a, b) => +b.paidOn - +a.paidOn);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/properties"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ChevronLeft className="h-4 w-4" /> Properties
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{property.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {property.addressLine1}
              {property.addressLine2 ? `, ${property.addressLine2}` : ""}, {property.city},{" "}
              {property.province}
              {property.postalCode ? ` ${property.postalCode}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="blue">{property.type}</Badge>
            <Badge tone="neutral">Purchased {formatDate(property.purchaseDate)}</Badge>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Gross yield (12m)"
          value={roi.grossYieldPct === null ? "—" : formatPercent(roi.grossYieldPct)}
          hint={`Annual rent ${formatZar(roi.annualRentCents)}`}
        />
        <Stat
          label="Net yield (12m)"
          value={roi.netYieldPct === null ? "—" : formatPercent(roi.netYieldPct)}
          tone={roi.netYieldPct !== null && roi.netYieldPct >= 0 ? "green" : "red"}
          hint="Net of expenses + interest"
        />
        <Stat
          label="Cash-on-cash"
          value={roi.cashOnCashPct === null ? "—" : formatPercent(roi.cashOnCashPct)}
          hint={`Cash invested ${formatZar(roi.cashInvestedCents)}`}
        />
        <Stat
          label="CGT base cost"
          value={formatZar(baseCost.totalCents)}
          hint={`Capital ${formatZar(baseCost.capitalImprovementsCents)} added`}
        />
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <Stat
          label={`Rental income (${formatTaxYear(taxYear)})`}
          value={formatZar(taxSummary.rentalIncomeCents)}
        />
        <Stat
          label="Deductions this year"
          value={formatZar(taxSummary.totalRevenueDeductionsCents)}
          hint={`Bond interest ${formatZar(
            taxSummary.bondInterestCents,
          )}; initiation amortised ${formatZar(taxSummary.amortisedInitiationFeesCents)}`}
        />
        <Stat
          label={taxSummary.isLoss ? "Net rental loss" : "Net rental income"}
          value={formatZar(Math.abs(taxSummary.netRentalCents))}
          tone={taxSummary.isLoss ? "red" : "green"}
        />
      </section>

      {/* ---------------- Lease ---------------- */}
      <Section
        title="Lease"
        description={
          activeLease
            ? `Active tenant: ${activeLease.tenant.fullName}.`
            : "No active lease — the property is vacant."
        }
        addLabel={activeLease ? "Replace lease" : "Add lease"}
        form={<LeaseForm propertyId={property.id} />}
      >
        {property.leases.length === 0 ? (
          <Empty>No leases yet.</Empty>
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>Tenant</Th>
                <Th>Start</Th>
                <Th>End</Th>
                <Th className="text-right">Rent</Th>
                <Th>Status</Th>
              </Tr>
            </THead>
            <TBody>
              {property.leases.map((l) => (
                <Tr key={l.id}>
                  <Td className="font-medium">{l.tenant.fullName}</Td>
                  <Td className="text-zinc-500">{formatDate(l.startDate)}</Td>
                  <Td className="text-zinc-500">{formatDate(l.endDate)}</Td>
                  <Td className="text-right tabular-nums">{formatZar(l.monthlyRent)}</Td>
                  <Td>
                    <Badge tone={l.status === "Active" ? "green" : "neutral"}>{l.status}</Badge>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Section>

      {/* ---------------- Rent payments ---------------- */}
      <Section
        title="Rent payments"
        description="Cash-basis ledger. Use the period dates so the tax report attributes income to the right month."
        addLabel="Record payment"
        form={
          activeLease ? (
            <RentPaymentForm propertyId={property.id} leaseId={activeLease.id} />
          ) : (
            <Alert tone="warning">Create an active lease before recording payments.</Alert>
          )
        }
      >
        {allPayments.length === 0 ? (
          <Empty>No payments recorded yet.</Empty>
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>Paid on</Th>
                <Th>Period</Th>
                <Th>Tenant</Th>
                <Th className="text-right">Amount</Th>
                <Th>Status</Th>
                <Th>Reference</Th>
              </Tr>
            </THead>
            <TBody>
              {allPayments.slice(0, 24).map((p) => (
                <Tr key={p.id}>
                  <Td className="text-zinc-500">{formatDate(p.paidOn)}</Td>
                  <Td className="text-zinc-500">
                    {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                  </Td>
                  <Td>{p.tenantName}</Td>
                  <Td className="text-right tabular-nums font-medium">
                    {formatZar(p.amount)}
                  </Td>
                  <Td>
                    <Badge
                      tone={
                        p.status === "Paid"
                          ? "green"
                          : p.status === "Late"
                            ? "amber"
                            : p.status === "Partial"
                              ? "amber"
                              : "neutral"
                      }
                    >
                      {p.status}
                    </Badge>
                  </Td>
                  <Td className="text-zinc-500">{p.reference ?? "—"}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Section>

      {/* ---------------- Expenses ---------------- */}
      <Section
        title="Expenses"
        description="Capital items are tracked but not deducted against rental income. They build CGT base cost."
        addLabel="Record expense"
        form={<ExpenseForm propertyId={property.id} />}
      >
        {property.expenses.length === 0 ? (
          <Empty>No expenses recorded yet.</Empty>
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>Date</Th>
                <Th>Category</Th>
                <Th>Description</Th>
                <Th>Vendor</Th>
                <Th className="text-right">Amount</Th>
                <Th>Treatment</Th>
              </Tr>
            </THead>
            <TBody>
              {property.expenses.slice(0, 30).map((e) => {
                const cat = getCategory(e.categoryCode);
                return (
                  <Tr key={e.id}>
                    <Td className="text-zinc-500">{formatDate(e.date)}</Td>
                    <Td>{cat?.label ?? e.categoryCode}</Td>
                    <Td>{e.description}</Td>
                    <Td className="text-zinc-500">{e.vendor ?? "—"}</Td>
                    <Td className="text-right tabular-nums font-medium">
                      {formatZar(e.amount)}
                    </Td>
                    <Td>
                      {e.isCapital ? (
                        <Badge tone="amber">Capital</Badge>
                      ) : (
                        <Badge tone="green">Deductible</Badge>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Section>

      {/* ---------------- Loans ---------------- */}
      <Section
        title="Loan & statements"
        description="Capture each statement period so the deductible interest is precise."
        addLabel={property.loans.length === 0 ? "Add loan" : "Add another loan"}
        form={<LoanForm propertyId={property.id} />}
      >
        {property.loans.length === 0 ? (
          <Empty>No loan registered. Add one if this property has a bond.</Empty>
        ) : (
          <div className="space-y-6">
            {property.loans.map((loan) => (
              <Card key={loan.id} className="border-zinc-200">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{loan.lender}</CardTitle>
                      <CardDescription>
                        {formatZar(loan.originalBalance)} over {loan.termMonths} months at{" "}
                        {loan.interestRate.toFixed(2)}% — started{" "}
                        {formatDate(loan.startDate)}
                      </CardDescription>
                    </div>
                    {loan.initiationFees > 0 && (
                      <Badge tone="blue">
                        Initiation fees {formatZar(loan.initiationFees)} amortised
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardBody className="space-y-4">
                  {loan.statements.length === 0 ? (
                    <Empty>No statements yet for this loan.</Empty>
                  ) : (
                    <Table>
                      <THead>
                        <Tr>
                          <Th>Period</Th>
                          <Th className="text-right">Opening</Th>
                          <Th className="text-right">Interest</Th>
                          <Th className="text-right">Fees</Th>
                          <Th className="text-right">Principal</Th>
                          <Th className="text-right">Closing</Th>
                        </Tr>
                      </THead>
                      <TBody>
                        {loan.statements.map((s) => (
                          <Tr key={s.id}>
                            <Td className="text-zinc-500">
                              {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
                            </Td>
                            <Td className="text-right tabular-nums">
                              {formatZar(s.openingBalance)}
                            </Td>
                            <Td className="text-right tabular-nums font-medium text-zinc-900">
                              {formatZar(s.interestCharged)}
                            </Td>
                            <Td className="text-right tabular-nums">
                              {formatZar(s.feesCharged)}
                            </Td>
                            <Td className="text-right tabular-nums">
                              {formatZar(s.principalPaid)}
                            </Td>
                            <Td className="text-right tabular-nums">
                              {formatZar(s.closingBalance)}
                            </Td>
                          </Tr>
                        ))}
                      </TBody>
                    </Table>
                  )}

                  <details className="rounded-md border border-zinc-200 bg-zinc-50/50">
                    <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-zinc-700">
                      + Add statement
                    </summary>
                    <div className="border-t border-zinc-200 bg-white p-4">
                      <LoanStatementForm propertyId={property.id} loanId={loan.id} />
                    </div>
                  </details>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  addLabel,
  form,
  children,
}: {
  title: string;
  description?: string;
  addLabel: string;
  form: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
      </div>
      <Card>
        <CardBody className="p-0">{children}</CardBody>
      </Card>
      <details className="mt-3 rounded-md border border-zinc-200 bg-white">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
          {addLabel}
        </summary>
        <div className="border-t border-zinc-200 p-4">{form}</div>
      </details>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-6 text-sm text-zinc-500">{children}</div>;
}
