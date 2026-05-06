import Link from "next/link";
import { Building2, TrendingDown, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  computePortfolioTaxSummary,
  computePropertyROI,
  currentTaxYear,
  formatTaxYear,
} from "@/lib/tax";
import { formatPercent, formatZar } from "@/lib/format";
import { Stat } from "@/components/ui/stat";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const taxYear = currentTaxYear();
  const [summary, properties] = await Promise.all([
    computePortfolioTaxSummary(taxYear),
    prisma.property.findMany({
      where: { archived: false },
      orderBy: { createdAt: "asc" },
      include: {
        leases: {
          where: { status: "Active" },
          take: 1,
          include: { tenant: true },
          orderBy: { startDate: "desc" },
        },
      },
    }),
  ]);

  if (properties.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="Dashboard" subtitle="Your property portfolio at a glance." />
        <EmptyState
          title="No properties yet"
          description="Add your first property to start tracking rent, expenses, and your SARS position."
          action={
            <Link href="/properties/new">
              <Button>
                <Building2 className="mr-2 h-4 w-4" />
                Add a property
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const rois = await Promise.all(properties.map((p) => computePropertyROI(p.id)));
  const portfolioInvested = rois.reduce((s, r) => s + r.totalInvestedCents, 0);
  const portfolioAnnualRent = rois.reduce((s, r) => s + r.annualRentCents, 0);
  const portfolioNetCashflow = rois.reduce((s, r) => s + r.netAnnualCashflowCents, 0);
  const portfolioGrossYield =
    portfolioInvested > 0 ? (portfolioAnnualRent / portfolioInvested) * 100 : null;
  const portfolioNetYield =
    portfolioInvested > 0 ? (portfolioNetCashflow / portfolioInvested) * 100 : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle={`Portfolio overview — SA tax year ${formatTaxYear(taxYear)}.`}
      />

      {summary.ringFenceRisk && (
        <Alert tone="warning" title="Net rental loss this tax year">
          Net rental income is negative. SARS may ring-fence the assessed loss under
          section 20A if your taxable income falls in the highest bracket and the
          activity has been a loss in 3 of the last 5 years. Review with your
          accountant before claiming the loss against other income.
        </Alert>
      )}

      <section>
        <h2 className="text-sm font-medium text-zinc-700 mb-3">Portfolio</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            label="Total invested"
            value={formatZar(portfolioInvested)}
            hint={`${properties.length} ${properties.length === 1 ? "property" : "properties"}`}
          />
          <Stat
            label="Annualised rent"
            value={formatZar(portfolioAnnualRent)}
            hint="Trailing 12 months"
          />
          <Stat
            label="Gross yield"
            value={portfolioGrossYield === null ? "—" : formatPercent(portfolioGrossYield)}
            hint="Annual rent ÷ invested"
          />
          <Stat
            label="Net cashflow (12m)"
            value={formatZar(portfolioNetCashflow)}
            tone={portfolioNetCashflow >= 0 ? "green" : "red"}
            hint={
              portfolioNetYield === null
                ? "Net of expenses + bond interest"
                : `${formatPercent(portfolioNetYield)} net yield`
            }
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-700 mb-3">
          Tax position — {formatTaxYear(taxYear)}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Stat label="Rental income (received)" value={formatZar(summary.rentalIncomeCents)} />
          <Stat
            label="Deductible expenses"
            value={formatZar(summary.totalRevenueDeductionsCents)}
            hint="Bond interest + revenue expenses + amortised initiation fees"
          />
          <Stat
            label={summary.isLoss ? "Net rental loss" : "Net rental income"}
            value={formatZar(Math.abs(summary.netRentalCents))}
            tone={summary.isLoss ? "red" : "green"}
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-700">Properties</h2>
          <Link href="/properties/new">
            <Button size="sm" variant="outline">
              + New property
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((p, idx) => {
            const roi = rois[idx];
            const lease = p.leases[0];
            const cashflowTone = roi.netAnnualCashflowCents >= 0 ? "green" : "red";
            return (
              <Link key={p.id} href={`/properties/${p.id}`} className="group">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="group-hover:text-zinc-700">
                          {p.name}
                        </CardTitle>
                        <CardDescription className="mt-0.5">
                          {p.city}, {p.province}
                        </CardDescription>
                      </div>
                      <Badge tone="blue">{p.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Tenant</span>
                      <span className="font-medium">
                        {lease ? lease.tenant.fullName : "Vacant"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Monthly rent</span>
                      <span className="font-medium">
                        {lease ? formatZar(lease.monthlyRent) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Gross yield</span>
                      <span className="font-medium tabular-nums">
                        {roi.grossYieldPct === null
                          ? "—"
                          : formatPercent(roi.grossYieldPct)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Net cashflow (12m)</span>
                      <span
                        className={`inline-flex items-center gap-1 font-medium tabular-nums ${
                          cashflowTone === "green" ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {cashflowTone === "green" ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {formatZar(roi.netAnnualCashflowCents)}
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
    </div>
  );
}
