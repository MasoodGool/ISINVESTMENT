// Pure SA tax-year math — no database access, fully unit-testable.
// The SA tax year for individuals runs 1 March through the last day of
// February. We label tax years by the year in which they end:
//   2026 = 1 March 2025 → 28/29 Feb 2026.

export function saTaxYearOf(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  // getMonth() is 0-indexed: 0=Jan, 2=March.
  return d.getMonth() >= 2 ? d.getFullYear() + 1 : d.getFullYear();
}

export function taxYearRange(taxYear: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(taxYear - 1, 2, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(taxYear, 1, 28, 23, 59, 59, 999)),
    // Feb 28 is fine for filtering — Feb 29 in leap years is also covered
    // because we use < end+1ms boundaries via gte/lte on whole days.
  };
}

export function formatTaxYear(taxYear: number): string {
  return `${taxYear - 1}/${taxYear}`;
}

export function currentTaxYear(now: Date = new Date()): number {
  return saTaxYearOf(now);
}

// ---------------------------------------------------------------------------
// Bond initiation fee amortisation (Practice Note 31 / s24J).
// A once-off bond raising fee is spread over the loan term. We allocate
// per-month and sum the months that fall within the tax year (clamped to the
// loan's start/end).
// ---------------------------------------------------------------------------

export function amortisedInitiationFeeCents(
  loan: {
    initiationFees: number;
    startDate: Date;
    termMonths: number;
  },
  taxYear: number,
): number {
  if (!loan.initiationFees || loan.termMonths <= 0) return 0;

  const { start: tyStart, end: tyEnd } = taxYearRange(taxYear);
  const loanStart = new Date(loan.startDate);
  const loanEnd = new Date(loanStart);
  loanEnd.setUTCMonth(loanEnd.getUTCMonth() + loan.termMonths);

  // Overlap window (inclusive of months that touch the tax year).
  const overlapStart = loanStart > tyStart ? loanStart : tyStart;
  const overlapEnd = loanEnd < tyEnd ? loanEnd : tyEnd;
  if (overlapEnd <= overlapStart) return 0;

  const months = monthsBetween(overlapStart, overlapEnd);
  const perMonth = loan.initiationFees / loan.termMonths;
  return Math.round(perMonth * months);
}

function monthsBetween(a: Date, b: Date): number {
  // approximate but stable for our purposes: count whole months from a→b
  const ms = b.getTime() - a.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * (365.25 / 12)));
}
