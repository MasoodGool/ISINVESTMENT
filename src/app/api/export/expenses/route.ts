import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getCategory } from "@/lib/sars";
import { currentTaxYear, formatTaxYear, taxYearRange } from "@/lib/tax";
import { toCsv, centsToRandString, csvResponse, type CsvValue } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const taxYear = Number(url.searchParams.get("year")) || currentTaxYear();
  const { start, end } = taxYearRange(taxYear);

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lte: end } },
    include: { property: true },
    orderBy: [{ date: "asc" }],
  });

  const rows: CsvValue[][] = [
    [
      "Date",
      "Property",
      "Category",
      "Description",
      "Vendor",
      "Amount (R)",
      "Treatment",
      "Notes",
    ],
    ...expenses.map((e) => [
      e.date,
      e.property.name,
      getCategory(e.categoryCode)?.label ?? e.categoryCode,
      e.description,
      e.vendor,
      centsToRandString(e.amount),
      e.isCapital ? "Capital (CGT base cost)" : "Deductible",
      e.notes,
    ]),
  ];

  await audit(
    user,
    "export.expenses",
    "Export",
    null,
    `Exported expense ledger CSV for ${formatTaxYear(taxYear)}`,
  );
  return csvResponse(`expenses-${taxYear}.csv`, toCsv(rows));
}
