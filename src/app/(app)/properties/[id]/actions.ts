"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { formatZar, randToCents } from "@/lib/format";
import { getCategory } from "@/lib/sars";
import { getWriter, NOT_AUTHORIZED } from "@/lib/auth";
import { audit } from "@/lib/audit";

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
  const user = await getWriter();
  if (!user) return { error: NOT_AUTHORIZED };

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

  await audit(
    user,
    "lease.create",
    "Lease",
    d.propertyId,
    `New lease for ${d.tenantName} at ${formatZar(randToCents(d.monthlyRent))}/month`,
  );
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
  const user = await getWriter();
  if (!user) return { error: NOT_AUTHORIZED };

  const parsed = rentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed);
  const d = parsed.data;

  const payment = await prisma.rentPayment.create({
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

  await audit(
    user,
    "payment.create",
    "RentPayment",
    payment.id,
    `Recorded rent payment of ${formatZar(payment.amount)} (${d.status})`,
  );
  revalidatePath(`/properties/${d.propertyId}`);
  revalidatePath("/");
  revalidatePath("/tax");
  revalidatePath("/rent-roll");
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
  const user = await getWriter();
  if (!user) return { error: NOT_AUTHORIZED };

  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed);
  const d = parsed.data;

  const cat = getCategory(d.categoryCode);
  // Default capital flag from the category, allow override via checkbox.
  const userOverride = d.isCapital === "on" || d.isCapital === "true";
  const isCapital = userOverride || (cat?.defaultIsCapital ?? false);

  const expense = await prisma.expense.create({
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

  await audit(
    user,
    "expense.create",
    "Expense",
    expense.id,
    `Recorded ${cat?.label ?? d.categoryCode} expense of ${formatZar(expense.amount)}`,
  );
  revalidatePath(`/properties/${d.propertyId}`);
  revalidatePath("/");
  revalidatePath("/tax");
  revalidatePath("/reports");
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
  const user = await getWriter();
  if (!user) return { error: NOT_AUTHORIZED };

  const parsed = loanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed);
  const d = parsed.data;

  const loan = await prisma.loan.create({
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

  await audit(
    user,
    "loan.create",
    "Loan",
    loan.id,
    `Added ${d.lender} loan of ${formatZar(loan.originalBalance)}`,
  );
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
  const user = await getWriter();
  if (!user) return { error: NOT_AUTHORIZED };

  const parsed = statementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed);
  const d = parsed.data;

  const statement = await prisma.loanStatement.create({
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

  await audit(
    user,
    "statement.create",
    "LoanStatement",
    statement.id,
    `Added loan statement with interest of ${formatZar(statement.interestCharged)}`,
  );
  revalidatePath(`/properties/${d.propertyId}`);
  revalidatePath("/");
  revalidatePath("/tax");
  return { ok: true };
}

// --------------------------------------------------------------------------
// Deletes — corrections happen; every delete is audited.
// --------------------------------------------------------------------------

const deleteSchema = z.object({
  propertyId: z.string().min(1),
  id: z.string().min(1),
});

export async function deleteRentPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getWriter();
  if (!user) return { error: NOT_AUTHORIZED };

  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };
  const d = parsed.data;

  const payment = await prisma.rentPayment.delete({ where: { id: d.id } });
  await audit(
    user,
    "payment.delete",
    "RentPayment",
    payment.id,
    `Deleted rent payment of ${formatZar(payment.amount)}`,
  );
  revalidatePath(`/properties/${d.propertyId}`);
  revalidatePath("/");
  revalidatePath("/tax");
  revalidatePath("/rent-roll");
  return { ok: true };
}

export async function deleteExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getWriter();
  if (!user) return { error: NOT_AUTHORIZED };

  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };
  const d = parsed.data;

  const expense = await prisma.expense.delete({ where: { id: d.id } });
  const cat = getCategory(expense.categoryCode);
  await audit(
    user,
    "expense.delete",
    "Expense",
    expense.id,
    `Deleted ${cat?.label ?? expense.categoryCode} expense of ${formatZar(expense.amount)}`,
  );
  revalidatePath(`/properties/${d.propertyId}`);
  revalidatePath("/");
  revalidatePath("/tax");
  revalidatePath("/reports");
  return { ok: true };
}

export async function deleteLoanStatementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getWriter();
  if (!user) return { error: NOT_AUTHORIZED };

  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };
  const d = parsed.data;

  const statement = await prisma.loanStatement.delete({ where: { id: d.id } });
  await audit(
    user,
    "statement.delete",
    "LoanStatement",
    statement.id,
    `Deleted loan statement with interest of ${formatZar(statement.interestCharged)}`,
  );
  revalidatePath(`/properties/${d.propertyId}`);
  revalidatePath("/");
  revalidatePath("/tax");
  return { ok: true };
}

// --------------------------------------------------------------------------
// Archive / unarchive property
// --------------------------------------------------------------------------

export async function setPropertyArchivedAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getWriter();
  if (!user) return { error: NOT_AUTHORIZED };

  const propertyId = String(formData.get("propertyId") ?? "");
  const archived = String(formData.get("archived") ?? "") === "true";
  if (!propertyId) return { error: "Invalid request." };

  const property = await prisma.property.update({
    where: { id: propertyId },
    data: { archived },
  });

  await audit(
    user,
    archived ? "property.archive" : "property.unarchive",
    "Property",
    property.id,
    `${archived ? "Archived" : "Unarchived"} ${property.name}`,
  );
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  revalidatePath("/");
  revalidatePath("/tax");
  return { ok: true };
}
