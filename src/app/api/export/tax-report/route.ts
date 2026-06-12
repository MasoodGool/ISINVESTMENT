import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { computePortfolioTaxSummary, currentTaxYear, formatTaxYear } from "@/lib/tax";
import { toCsv, centsToRandString, csvResponse, type CsvValue } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const taxYear = Number(url.searchParams.get("year")) || currentTaxYear();
  const summary = await computePortfolioTaxSummary(taxYear);

  const rows: CsvValue[][] = [
    ["ISINVESTMENT tax report", `SA tax year ${formatTaxYear(taxYear)}`],
    [],
    ["Property", "Line", "Amount (R)"],
  ];

  for (const p of summary.perProperty) {
    rows.push([p.propertyName, "Rental income (received)", centsToRandString(p.rentalIncomeCents)]);
    rows.push([
      p.propertyName,
      "Less: Bond interest (s11(a))",
      centsToRandString(-p.bondInterestCents),
    ]);
    if (p.amortisedInitiationFeesCents > 0) {
      rows.push([
        p.propertyName,
        "Less: Bond initiation amortised (PN 31 / s24J)",
        centsToRandString(-p.amortisedInitiationFeesCents),
      ]);
    }
    for (const c of p.expensesByCategory) {
      rows.push([p.propertyName, `Less: ${c.label}`, centsToRandString(-c.amountCents)]);
    }
    rows.push([
      p.propertyName,
      p.isLoss ? "Net rental loss" : "Net rental income",
      centsToRandString(p.netRentalCents),
    ]);
    for (const c of p.capitalExpenses) {
      rows.push([
        p.propertyName,
        `Capital (CGT base cost, not deductible): ${c.label}`,
        centsToRandString(c.amountCents),
      ]);
    }
    rows.push([]);
  }

  rows.push(["PORTFOLIO", "Total rental income", centsToRandString(summary.rentalIncomeCents)]);
  rows.push([
    "PORTFOLIO",
    "Total deductions",
    centsToRandString(-summary.totalRevenueDeductionsCents),
  ]);
  rows.push([
    "PORTFOLIO",
    summary.isLoss ? "Net rental loss" : "Net rental income",
    centsToRandString(summary.netRentalCents),
  ]);

  await audit(
    user,
    "export.tax-report",
    "Export",
    null,
    `Exported tax report CSV for ${formatTaxYear(taxYear)}`,
  );
  return csvResponse(`tax-report-${taxYear}.csv`, toCsv(rows));
}
