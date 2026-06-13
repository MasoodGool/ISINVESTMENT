import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  computePortfolioTaxSummary,
  currentTaxYear,
  formatTaxYear,
} from "@/lib/tax";
import { formatDate, formatZar } from "@/lib/format";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const generatedAtFmt = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function TaxPackPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const taxYear = sp.year ? Number(sp.year) : currentTaxYear();

  const [summary, notes] = await Promise.all([
    computePortfolioTaxSummary(taxYear),
    prisma.taxYearNote.findMany({ where: { taxYear }, orderBy: { createdAt: "asc" } }),
  ]);

  await audit(
    user,
    "tax-pack.view",
    "Export",
    null,
    `Generated tax pack for ${formatTaxYear(taxYear)}`,
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 print:py-0">
      {/* Screen-only toolbar */}
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <Link
          href={`/tax?year=${taxYear}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ChevronLeft className="h-4 w-4" /> Back to tax report
        </Link>
        <PrintButton />
      </div>

      {/* Document */}
      <article className="rounded-lg border border-zinc-200 bg-white p-8 text-zinc-900 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="avoid-break border-b border-zinc-300 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                ISINVESTMENT
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Rental income tax pack
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                South African tax year {formatTaxYear(taxYear)} (1 March{" "}
                {taxYear - 1} – 28/29 February {taxYear})
              </p>
            </div>
            <div className="text-right text-xs text-zinc-500">
              <div>Prepared by {user.name}</div>
              <div>{generatedAtFmt.format(new Date())}</div>
            </div>
          </div>
        </header>

        {/* Portfolio summary */}
        <section className="avoid-break mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Portfolio summary
          </h2>
          <table className="mt-2 w-full border-collapse text-sm">
            <tbody>
              <tr className="border-b border-zinc-100">
                <td className="py-1.5">Total rental income (received)</td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatZar(summary.rentalIncomeCents)}
                </td>
              </tr>
              <tr className="border-b border-zinc-100">
                <td className="py-1.5 text-zinc-600">Less: total deductions</td>
                <td className="py-1.5 text-right tabular-nums text-zinc-600">
                  ({formatZar(summary.totalRevenueDeductionsCents)})
                </td>
              </tr>
              <tr className="border-b-2 border-zinc-300 font-semibold">
                <td className="py-1.5">
                  {summary.isLoss ? "Net rental loss" : "Net rental income"}
                </td>
                <td
                  className={`py-1.5 text-right tabular-nums ${
                    summary.isLoss ? "text-red-700" : "text-green-700"
                  }`}
                >
                  {summary.isLoss ? "(" : ""}
                  {formatZar(Math.abs(summary.netRentalCents))}
                  {summary.isLoss ? ")" : ""}
                </td>
              </tr>
              {summary.capitalExpensesTotalCents > 0 && (
                <tr>
                  <td className="py-1.5 text-zinc-600">
                    Capital this year (CGT base cost; not deductible)
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-zinc-600">
                    {formatZar(summary.capitalExpensesTotalCents)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {summary.ringFenceRisk && (
            <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <b>Section 20A note:</b> the portfolio is in a net rental loss. SARS may
              ring-fence the assessed loss for high earners where the activity has been
              a loss in 3 of the last 5 years. Review before offsetting against other
              income.
            </p>
          )}
        </section>

        {/* Per-property breakdown */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            By property
          </h2>
          {summary.perProperty.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No properties for this year.</p>
          ) : (
            <div className="mt-2 space-y-6">
              {summary.perProperty.map((p) => (
                <div key={p.propertyId} className="avoid-break">
                  <h3 className="text-sm font-semibold">{p.propertyName}</h3>
                  <table className="mt-1 w-full border-collapse text-sm">
                    <tbody>
                      <tr className="border-b border-zinc-100 font-medium">
                        <td className="py-1">Rental income (received)</td>
                        <td className="py-1 text-right tabular-nums">
                          {formatZar(p.rentalIncomeCents)}
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-100">
                        <td className="py-1 pl-4 text-zinc-600">
                          Less: Bond interest (s11(a))
                        </td>
                        <td className="py-1 text-right tabular-nums text-zinc-600">
                          ({formatZar(p.bondInterestCents)})
                        </td>
                      </tr>
                      {p.amortisedInitiationFeesCents > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-1 pl-4 text-zinc-600">
                            Less: Bond initiation amortised (PN 31 / s24J)
                          </td>
                          <td className="py-1 text-right tabular-nums text-zinc-600">
                            ({formatZar(p.amortisedInitiationFeesCents)})
                          </td>
                        </tr>
                      )}
                      {p.expensesByCategory.map((c) => (
                        <tr key={c.code} className="border-b border-zinc-100">
                          <td className="py-1 pl-4 text-zinc-600">Less: {c.label}</td>
                          <td className="py-1 text-right tabular-nums text-zinc-600">
                            ({formatZar(c.amountCents)})
                          </td>
                        </tr>
                      ))}
                      <tr className="border-b-2 border-zinc-300 font-semibold">
                        <td className="py-1">
                          {p.isLoss ? "Net rental loss" : "Net rental income"}
                        </td>
                        <td
                          className={`py-1 text-right tabular-nums ${
                            p.isLoss ? "text-red-700" : "text-green-700"
                          }`}
                        >
                          {p.isLoss ? "(" : ""}
                          {formatZar(Math.abs(p.netRentalCents))}
                          {p.isLoss ? ")" : ""}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {p.capitalExpenses.length > 0 && (
                    <div className="mt-1 text-xs text-zinc-500">
                      Capital (CGT base cost):{" "}
                      {p.capitalExpenses
                        .map((c) => `${c.label} ${formatZar(c.amountCents)}`)
                        .join(" · ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Notes */}
        {notes.length > 0 && (
          <section className="avoid-break mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Notes
            </h2>
            <ul className="mt-2 space-y-2 text-sm">
              {notes.map((n) => (
                <li key={n.id} className="border-l-2 border-zinc-200 pl-3">
                  <span className="whitespace-pre-wrap">{n.body}</span>
                  <span className="ml-2 text-xs text-zinc-400">
                    ({formatDate(n.createdAt)})
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="avoid-break mt-10 border-t border-zinc-200 pt-4 text-xs text-zinc-500">
          <p>
            Figures map to the <b>Local rental income</b> section of the ITR12. Income
            is on the received (cash) basis. This pack is a record-keeping aid and{" "}
            <b>not tax advice</b> — review with a registered tax practitioner before
            filing.
          </p>
          <p className="mt-2">
            Generated by ISINVESTMENT on {generatedAtFmt.format(new Date())}.
          </p>
        </footer>
      </article>
    </div>
  );
}
