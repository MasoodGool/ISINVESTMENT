"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { randToCents } from "@/lib/format";
import { getCategory } from "@/lib/sars";

export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function fail(parsed: z.SafeParseError<unknown>): ActionState {
  return {
    error: "Please fix the errors below.",
    fieldErrors: Object.fromEntries(
      parsed.error.issues.map((i) => [i.path.join("."), i.message]),
    ),
  };
}

// --------------------------------------------------------------------------
// Lease (creates the tenant inline if needed)
// --------------------------------------------------------------------------

const leaseSchema = z.object({
  propertyId: z.string().min(1),
  tenantName: z.string().trim().min(1, "Tenant name is required"),
  tenantEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  tenantPhone: z.string().trim().optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().or(z.literal("")),
  monthlyRent: z.coerce.number().positive("Must be > 0"),
  depositAmount: z.coerce.number().nonnegative("Must be ≥ 0").optional(),
  notes: z.string().optional().or(z.literal("")),
});

export async function createLeaseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = leaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed);
  const d = parsed.data;

  await prisma.$transaction(async (tx) => {
    // End any active lease on this property first.
    await tx.lease.updateMany({
      where: { propertyId: d.propertyId, status: "Active" },
      data: { status: "Ended", endDate: new Date(d.startDate) },
    });

    const tenant = await tx.tenant.create({
      data: {
        fullName: d.tenantName,
        email: d.tenantEmail || null,
        phone: d.tenantPhone || null,
      },
    });

    await tx.lease.create({
      data: {
        propertyId: d.propertyId,
        tenantId: tenant.id,
        startDate: new Date(d.startDate),
        endDate: d.endDate ? new Date(d.endDate) : null,
        monthlyRent: randToCents(d.monthlyRent),
        depositAmount: randToCents(d.depositAmount ?? 0),
        status: "Active",
        notes: d.notes || null,
      },
    });
  });

  revalidatePath(`/properties/${d.propertyId}`);
  revalidatePath("/properties");
  revalidatePath("/");
  revalidatePath("/tax");
  return { ok: true };
}

// --------------------------------------------------------------------------
// Rent payment
// --------------------------------------------------------------------------

const rentSchema = z.object({
  propertyId: z.string().min(1),
  leaseId: z.string().min(1, "Lease is required"),
  paidOn: z.string().min(1, "Date is required"),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  amount: z.coerce.number().positive("Must be > 0"),
  status: z.enum(["Paid", "Partial", "Late", "Pending"]).default("Paid"),
  reference: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export async function createRentPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = rentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed);
  const d = parsed.data;

  await prisma.rentPayment.create({
    data: {
      leaseId: d.leaseId,
      paidOn: new Date(d.paidOn),
      periodStart: new Date(d.periodStart),
      periodEnd: new Date(d.periodEnd),
      amount: randToCents(d.amount),
      status: d.status,
      reference: d.reference || null,
      notes: d.notes || null,
    },
  });

  revalidatePath(`/properties/${d.propertyId}`);
  revalidatePath("/");
  revalidatePath("/tax");
  return { ok: true };
}

// --------------------------------------------------------------------------
// Expense
// --------------------------------------------------------------------------

const expenseSchema = z.object({
  propertyId: z.string().min(1),
  date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().positive("Must be > 0"),
  categoryCode: z.string().min(1, "Category is required"),
  description: z.string().trim().min(1, "Description is required"),
  vendor: z.string().optional().or(z.literal("")),
  isCapital: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional(),
  notes: z.string().optional().or(z.literal("")),
});

export async function createExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed);
  const d = parsed.data;

  const cat = getCategory(d.categoryCode);
  // Default capital flag from the category, allow override via checkbox.
  const userOverride = d.isCapital === "on" || d.isCapital === "true";
  const isCapital = userOverride || (cat?.defaultIsCapital ?? false);

  await prisma.expense.create({
    data: {
      propertyId: d.propertyId,
      date: new Date(d.date),
      amount: randToCents(d.amount),
      categoryCode: d.categoryCode,
      description: d.description,
      vendor: d.vendor || null,
      isCapital,
      isReclaimable: !isCapital,
      notes: d.notes || null,
    },
  });

  revalidatePath(`/properties/${d.propertyId}`);
  revalidatePath("/");
  revalidatePath("/tax");
  return { ok: true };
}

// --------------------------------------------------------------------------
// Loan
// --------------------------------------------------------------------------

const loanSchema = z.object({
  propertyId: z.string().min(1),
  lender: z.string().trim().min(1, "Lender is required"),
  accountNumber: z.string().optional().or(z.literal("")),
  originalBalance: z.coerce.number().positive("Must be > 0"),
  startDate: z.string().min(1, "Start date is required"),
  termMonths: z.coerce.number().int().positive("Must be > 0"),
  interestRate: z.coerce.number().nonnegative("Must be ≥ 0"),
  initiationFees: z.coerce.number().nonnegative("Must be ≥ 0").optional(),
  notes: z.string().optional().or(z.literal("")),
});

export async function createLoanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed);
  const d = parsed.data;

  await prisma.loan.create({
    data: {
      propertyId: d.propertyId,
      lender: d.lender,
      accountNumber: d.accountNumber || null,
      originalBalance: randToCents(d.originalBalance),
      startDate: new Date(d.startDate),
      termMonths: d.termMonths,
      interestRate: d.interestRate,
      initiationFees: randToCents(d.initiationFees ?? 0),
      notes: d.notes || null,
    },
  });

  revalidatePath(`/properties/${d.propertyId}`);
  revalidatePath("/");
  revalidatePath("/tax");
  return { ok: true };
}

// --------------------------------------------------------------------------
// Loan statement
// --------------------------------------------------------------------------

const statementSchema = z.object({
  propertyId: z.string().min(1),
  loanId: z.string().min(1, "Loan is required"),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  openingBalance: z.coerce.number().nonnegative("Must be ≥ 0"),
  closingBalance: z.coerce.number().nonnegative("Must be ≥ 0"),
  interestCharged: z.coerce.number().nonnegative("Must be ≥ 0"),
  feesCharged: z.coerce.number().nonnegative("Must be ≥ 0").optional(),
  principalPaid: z.coerce.number().nonnegative("Must be ≥ 0").optional(),
  notes: z.string().optional().or(z.literal("")),
});

export async function createLoanStatementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = statementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed);
  const d = parsed.data;

  await prisma.loanStatement.create({
    data: {
      loanId: d.loanId,
      periodStart: new Date(d.periodStart),
      periodEnd: new Date(d.periodEnd),
      openingBalance: randToCents(d.openingBalance),
      closingBalance: randToCents(d.closingBalance),
      interestCharged: randToCents(d.interestCharged),
      feesCharged: randToCents(d.feesCharged ?? 0),
      principalPaid: randToCents(d.principalPaid ?? 0),
      notes: d.notes || null,
    },
  });

  revalidatePath(`/properties/${d.propertyId}`);
  revalidatePath("/");
  revalidatePath("/tax");
  return { ok: true };
}
