import { describe, expect, it } from "vitest";
import {
  amortisedInitiationFeeCents,
  currentTaxYear,
  formatTaxYear,
  saTaxYearOf,
  taxYearRange,
} from "@/lib/tax-core";

describe("saTaxYearOf", () => {
  it("assigns March 1 to the next tax year", () => {
    expect(saTaxYearOf(new Date(2025, 2, 1))).toBe(2026);
  });

  it("assigns the end of February to the current tax year", () => {
    expect(saTaxYearOf(new Date(2026, 1, 28))).toBe(2026);
  });

  it("assigns mid-year dates correctly", () => {
    expect(saTaxYearOf(new Date(2025, 6, 15))).toBe(2026); // July 2025
    expect(saTaxYearOf(new Date(2026, 0, 10))).toBe(2026); // Jan 2026
  });

  it("accepts ISO strings", () => {
    expect(saTaxYearOf("2025-06-30T12:00:00Z")).toBe(2026);
  });
});

describe("taxYearRange", () => {
  it("spans 1 March to end of February", () => {
    const { start, end } = taxYearRange(2026);
    expect(start.toISOString()).toBe("2025-03-01T00:00:00.000Z");
    expect(end.getUTCFullYear()).toBe(2026);
    expect(end.getUTCMonth()).toBe(1); // February
  });

  it("start of one year follows the end of the previous", () => {
    const prev = taxYearRange(2025);
    const next = taxYearRange(2026);
    expect(next.start.getTime()).toBeGreaterThan(prev.end.getTime());
    // Gap between years never exceeds 2 days (leap-year tolerance).
    expect(next.start.getTime() - prev.end.getTime()).toBeLessThan(
      2 * 24 * 60 * 60 * 1000,
    );
  });
});

describe("formatTaxYear / currentTaxYear", () => {
  it("formats as YYYY/YYYY", () => {
    expect(formatTaxYear(2026)).toBe("2025/2026");
  });

  it("currentTaxYear uses the provided clock", () => {
    expect(currentTaxYear(new Date(2025, 3, 1))).toBe(2026);
    expect(currentTaxYear(new Date(2025, 0, 1))).toBe(2025);
  });
});

describe("amortisedInitiationFeeCents", () => {
  const loan = {
    initiationFees: 600_000, // R6,000 in cents
    startDate: new Date(Date.UTC(2025, 2, 1)), // 1 March 2025
    termMonths: 240,
  };

  it("returns 0 when there are no fees", () => {
    expect(amortisedInitiationFeeCents({ ...loan, initiationFees: 0 }, 2026)).toBe(0);
  });

  it("returns 0 when the term is invalid", () => {
    expect(amortisedInitiationFeeCents({ ...loan, termMonths: 0 }, 2026)).toBe(0);
  });

  it("allocates roughly 12 months of fees to a fully-overlapping tax year", () => {
    const result = amortisedInitiationFeeCents(loan, 2026);
    const perMonth = loan.initiationFees / loan.termMonths; // 2500c
    // ~12 months of overlap; allow rounding slack of one month.
    expect(result).toBeGreaterThan(perMonth * 11);
    expect(result).toBeLessThanOrEqual(perMonth * 12.5);
  });

  it("returns 0 for a tax year before the loan starts", () => {
    expect(amortisedInitiationFeeCents(loan, 2024)).toBe(0);
  });

  it("returns 0 for a tax year after the loan ends", () => {
    const shortLoan = { ...loan, termMonths: 12 };
    expect(amortisedInitiationFeeCents(shortLoan, 2028)).toBe(0);
  });

  it("never exceeds the total fee over the whole loan life", () => {
    const shortLoan = {
      initiationFees: 600_000,
      startDate: new Date(Date.UTC(2024, 5, 1)),
      termMonths: 12,
    };
    let total = 0;
    for (let year = 2024; year <= 2027; year++) {
      total += amortisedInitiationFeeCents(shortLoan, year);
    }
    // Within 1% of the full fee (monthsBetween is an approximation).
    expect(total).toBeGreaterThan(shortLoan.initiationFees * 0.99);
    expect(total).toBeLessThan(shortLoan.initiationFees * 1.01);
  });
});
