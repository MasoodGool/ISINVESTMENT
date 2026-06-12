import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { currentTaxYear, formatTaxYear, taxYearRange } from "@/lib/tax";
import { toCsv, centsToRandString, csvResponse, type CsvValue } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const taxYear = Number(url.searchParams.get("year")) || currentTaxYear();
  const { start, end } = taxYearRange(taxYear);

  const payments = await prisma.rentPayment.findMany({
    where: { paidOn: { gte: start, lte: end } },
    include: { lease: { include: { property: true, tenant: true } } },
    orderBy: [{ paidOn: "asc" }],
  });

  const rows: CsvValue[][] = [
    [
      "Paid on",
      "Property",
      "Tenant",
      "Period start",
      "Period end",
      "Amount (R)",
      "Status",
      "Reference",
    ],
    ...payments.map((p) => [
      p.paidOn,
      p.lease.property.name,
      p.lease.tenant.fullName,
      p.periodStart,
      p.periodEnd,
      centsToRandString(p.amount),
      p.status,
      p.reference,
    ]),
  ];

  await audit(
    user,
    "export.rent-payments",
    "Export",
    null,
    `Exported rent payments CSV for ${formatTaxYear(taxYear)}`,
  );
  return csvResponse(`rent-payments-${taxYear}.csv`, toCsv(rows));
}
