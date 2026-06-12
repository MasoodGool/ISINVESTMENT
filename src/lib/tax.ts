import { prisma } from "@/lib/db";
import { getCategory } from "@/lib/sars";
import { amortisedInitiationFeeCents, taxYearRange } from "@/lib/tax-core";

// Pure tax-year math lives in tax-core.ts (no DB dependency); re-export so
// existing imports keep working.
export {
  saTaxYearOf,
  taxYearRange,
  formatTaxYear,
  currentTaxYear,
  amortisedInitiationFeeCents,
} from "@/lib/tax-core";

// ---------------------------------------------------------------------------
// Per-property tax-year summary.
// Income: cash-basis (RentPayment.paidOn falls inside the tax year). Most
// individual SA landlords are on the received basis; this matches SARS
// expectation absent an accrual election.
// ---------------------------------------------------------------------------

export interface CategoryTotal {
  code: string;
  label: string;
  group: string;
  amountCents: number;
}

export interface PropertyTaxSummary {
  propertyId: string;
  propertyName: string;
  taxYear: number;
  rentalIncomeCents: number;
  bondInterestCents: number;
  amortisedInitiationFeesCents: number;
  expensesByCategory: CategoryTotal[];
  totalRevenueDeductionsCents: number;
  netRentalCents: number;
  isLoss: boolean;
  capitalExpenses: CategoryTotal[];
  capitalExpensesTotalCents: number;
}

export async function computePropertyTaxSummary(
  propertyId: string,
  taxYear: number,
): Promise<PropertyTaxSummary> {
  const { start, end } = taxYearRange(taxYear);

  const [property, payments, statements, expenses, loans] = await Promise.all([
    prisma.property.findUniqueOrThrow({ where: { id: propertyId } }),
    prisma.rentPayment.findMany({
      where: { lease: { propertyId }, paidOn: { gte: start, lte: end } },
    }),
    prisma.loanStatement.findMany({
      where: { loan: { propertyId }, periodEnd: { gte: start, lte: end } },
    }),
    prisma.expense.findMany({
      where: { propertyId, date: { gte: start, lte: end } },
    }),
    prisma.loan.findMany({ where: { propertyId } }),
  ]);

  const rentalIncomeCents = payments.reduce((sum, p) => sum + p.amount, 0);
  const bondInterestCents = statements.reduce((sum, s) => sum + s.interestCharged, 0);
  const amortisedInitiationFeesCents = loans.reduce(
    (sum, l) => sum + amortisedInitiationFeeCents(l, taxYear),
    0,
  );

  // Group revenue (deductible) expenses by category.
  const revenueMap = new Map<string, CategoryTotal>();
  const capitalMap = new Map<string, CategoryTotal>();

  for (const exp of expenses) {
    const cat = getCategory(exp.categoryCode);
    const label = cat?.label ?? exp.categoryCode;
    const group = cat?.group ?? "Other";
    const target = exp.isCapital || !exp.isReclaimable ? capitalMap : revenueMap;

    const existing = target.get(exp.categoryCode);
    if (existing) {
      existing.amountCents += exp.amount;
    } else {
      target.set(exp.categoryCode, {
        code: exp.categoryCode,
        label,
        group,
        amountCents: exp.amount,
      });
    }
  }

  const expensesByCategory = Array.from(revenueMap.values()).sort(
    (a, b) => b.amountCents - a.amountCents,
  );
  const capitalExpenses = Array.from(capitalMap.values()).sort(
    (a, b) => b.amountCents - a.amountCents,
  );

  const expensesTotalCents = expensesByCategory.reduce((s, e) => s + e.amountCents, 0);
  const totalRevenueDeductionsCents =
    expensesTotalCents + bondInterestCents + amortisedInitiationFeesCents;
  const netRentalCents = rentalIncomeCents - totalRevenueDeductionsCents;
  const capitalExpensesTotalCents = capitalExpenses.reduce((s, e) => s + e.amountCents, 0);

  return {
    propertyId,
    propertyName: property.name,
    taxYear,
    rentalIncomeCents,
    bondInterestCents,
    amortisedInitiationFeesCents,
    expensesByCategory,
    totalRevenueDeductionsCents,
    netRentalCents,
    isLoss: netRentalCents < 0,
    capitalExpenses,
    capitalExpensesTotalCents,
  };
}

// ---------------------------------------------------------------------------
// Portfolio tax-year summary — aggregate across all non-archived properties.
// ---------------------------------------------------------------------------

export interface PortfolioTaxSummary {
  taxYear: number;
  perProperty: PropertyTaxSummary[];
  rentalIncomeCents: number;
  totalRevenueDeductionsCents: number;
  netRentalCents: number;
  isLoss: boolean;
  ringFenceRisk: boolean;
  capitalExpensesTotalCents: number;
}

export async function computePortfolioTaxSummary(
  taxYear: number,
): Promise<PortfolioTaxSummary> {
  const properties = await prisma.property.findMany({ where: { archived: false } });
  const perProperty = await Promise.all(
    properties.map((p) => computePropertyTaxSummary(p.id, taxYear)),
  );

  const rentalIncomeCents = perProperty.reduce((s, p) => s + p.rentalIncomeCents, 0);
  const totalRevenueDeductionsCents = perProperty.reduce(
    (s, p) => s + p.totalRevenueDeductionsCents,
    0,
  );
  const netRentalCents = rentalIncomeCents - totalRevenueDeductionsCents;
  const capitalExpensesTotalCents = perProperty.reduce(
    (s, p) => s + p.capitalExpensesTotalCents,
    0,
  );

  return {
    taxYear,
    perProperty,
    rentalIncomeCents,
    totalRevenueDeductionsCents,
    netRentalCents,
    isLoss: netRentalCents < 0,
    // Section 20A ring-fencing of assessed losses applies to high earners
    // (those at the highest marginal rate) when the activity has been a
    // loss in 3-out-of-5 years etc. We can't know the user's income, so we
    // simply flag a loss as a "review for ring-fencing" prompt.
    ringFenceRisk: netRentalCents < 0,
    capitalExpensesTotalCents,
  };
}

// ---------------------------------------------------------------------------
// CGT base cost = purchase price + acquisition costs + sum(capital expenses,
// all years). Surfaced on the property page so the user can see what the
// disposal base will look like.
// ---------------------------------------------------------------------------

export async function computeBaseCost(propertyId: string): Promise<{
  purchasePriceCents: number;
  acquisitionCostsCents: number;
  capitalImprovementsCents: number;
  totalCents: number;
}> {
  const [property, capitalExpenses] = await Promise.all([
    prisma.property.findUniqueOrThrow({ where: { id: propertyId } }),
    prisma.expense.aggregate({
      where: { propertyId, OR: [{ isCapital: true }, { isReclaimable: false }] },
      _sum: { amount: true },
    }),
  ]);

  const capitalImprovementsCents = capitalExpenses._sum.amount ?? 0;
  return {
    purchasePriceCents: property.purchasePrice,
    acquisitionCostsCents: property.acquisitionCosts,
    capitalImprovementsCents,
    totalCents:
      property.purchasePrice + property.acquisitionCosts + capitalImprovementsCents,
  };
}

// ---------------------------------------------------------------------------
// ROI / yield, computed on a trailing-12-months basis from "now".
// Annualised rental income, all revenue expenses, plus bond interest.
// ---------------------------------------------------------------------------

export interface PropertyROI {
  propertyId: string;
  windowStart: Date;
  windowEnd: Date;
  annualRentCents: number;
  annualRevenueExpensesCents: number;
  annualBondInterestCents: number;
  netAnnualCashflowCents: number;
  totalInvestedCents: number; // purchase price + acquisition costs
  cashInvestedCents: number; // total invested - original loan balance
  grossYieldPct: number | null;
  netYieldPct: number | null;
  cashOnCashPct: number | null;
}

export async function computePropertyROI(
  propertyId: string,
  now: Date = new Date(),
): Promise<PropertyROI> {
  const windowEnd = now;
  const windowStart = new Date(now);
  windowStart.setUTCFullYear(windowStart.getUTCFullYear() - 1);

  const [property, rents, statements, expenses, loans] = await Promise.all([
    prisma.property.findUniqueOrThrow({ where: { id: propertyId } }),
    prisma.rentPayment.findMany({
      where: {
        lease: { propertyId },
        paidOn: { gte: windowStart, lte: windowEnd },
      },
    }),
    prisma.loanStatement.findMany({
      where: {
        loan: { propertyId },
        periodEnd: { gte: windowStart, lte: windowEnd },
      },
    }),
    prisma.expense.findMany({
      where: {
        propertyId,
        isCapital: false,
        isReclaimable: true,
        date: { gte: windowStart, lte: windowEnd },
      },
    }),
    prisma.loan.findMany({ where: { propertyId } }),
  ]);

  const annualRentCents = rents.reduce((s, p) => s + p.amount, 0);
  const annualBondInterestCents = statements.reduce((s, st) => s + st.interestCharged, 0);
  const annualRevenueExpensesCents = expenses.reduce((s, e) => s + e.amount, 0);

  const netAnnualCashflowCents =
    annualRentCents - annualRevenueExpensesCents - annualBondInterestCents;

  const totalInvestedCents = property.purchasePrice + property.acquisitionCosts;
  const totalLoanCents = loans.reduce((s, l) => s + l.originalBalance, 0);
  const cashInvestedCents = Math.max(0, totalInvestedCents - totalLoanCents);

  return {
    propertyId,
    windowStart,
    windowEnd,
    annualRentCents,
    annualRevenueExpensesCents,
    annualBondInterestCents,
    netAnnualCashflowCents,
    totalInvestedCents,
    cashInvestedCents,
    grossYieldPct: totalInvestedCents > 0 ? (annualRentCents / totalInvestedCents) * 100 : null,
    netYieldPct:
      totalInvestedCents > 0
        ? ((annualRentCents - annualRevenueExpensesCents - annualBondInterestCents) /
            totalInvestedCents) *
          100
        : null,
    cashOnCashPct:
      cashInvestedCents > 0
        ? ((annualRentCents - annualRevenueExpensesCents - annualBondInterestCents) /
            cashInvestedCents) *
          100
        : null,
  };
}
