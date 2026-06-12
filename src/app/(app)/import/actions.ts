"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getWriter, NOT_AUTHORIZED } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getCategory } from "@/lib/sars";
import { formatZar } from "@/lib/format";

export interface ImportState {
  ok?: boolean;
  error?: string;
  imported?: { expenses: number; payments: number };
}

const rowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  description: z.string().trim().min(1).max(500),
  /** Signed cents from the statement; negative = debit. */
  amountCents: z.number().int(),
  kind: z.enum(["expense", "rent"]),
  categoryCode: z.string().optional(),
});

const payloadSchema = z.object({
  propertyId: z.string().min(1),
  rows: z.array(rowSchema).min(1, "Nothing selected to import").max(1000),
});

export async function importRowsAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const user = await getWriter();
  if (!user) return { error: NOT_AUTHORIZED };

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "Malformed import payload." };
  }
  const parsed = payloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid import payload." };
  }
  const { propertyId, rows } = parsed.data;

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return { error: "Property not found." };

  const expenseRows = rows.filter((r) => r.kind === "expense");
  const rentRows = rows.filter((r) => r.kind === "rent");

  for (const r of expenseRows) {
    if (!r.categoryCode || !getCategory(r.categoryCode)) {
      return { error: `Pick a category for "${r.description}".` };
    }
  }

  let activeLeaseId: string | null = null;
  if (rentRows.length > 0) {
    const activeLease = await prisma.lease.findFirst({
      where: { propertyId, status: "Active" },
      orderBy: { startDate: "desc" },
    });
    if (!activeLease) {
      return {
        error:
          "Some rows are marked as rent but this property has no active lease. " +
          "Create the lease first, or mark those rows as expenses/skip.",
      };
    }
    activeLeaseId = activeLease.id;
  }

  await prisma.$transaction(async (tx) => {
    for (const r of expenseRows) {
      const cat = getCategory(r.categoryCode!)!;
      const isCapital = cat.defaultIsCapital;
      await tx.expense.create({
        data: {
          propertyId,
          date: new Date(r.date),
          amount: Math.abs(r.amountCents),
          categoryCode: cat.code,
          description: r.description,
          isCapital,
          isReclaimable: !isCapital,
          notes: "Imported from bank statement",
        },
      });
    }
    for (const r of rentRows) {
      const paidOn = new Date(r.date);
      const periodStart = new Date(
        Date.UTC(paidOn.getUTCFullYear(), paidOn.getUTCMonth(), 1),
      );
      const periodEnd = new Date(
        Date.UTC(paidOn.getUTCFullYear(), paidOn.getUTCMonth() + 1, 0),
      );
      await tx.rentPayment.create({
        data: {
          leaseId: activeLeaseId!,
          paidOn,
          periodStart,
          periodEnd,
          amount: Math.abs(r.amountCents),
          status: "Paid",
          reference: r.description.slice(0, 100),
          notes: "Imported from bank statement",
        },
      });
    }
  });

  const totalCents = rows.reduce((s, r) => s + Math.abs(r.amountCents), 0);
  await audit(
    user,
    "import.bank-statement",
    "Property",
    propertyId,
    `Imported ${expenseRows.length} expense(s) and ${rentRows.length} rent payment(s) ` +
      `totalling ${formatZar(totalCents)} into ${property.name}`,
  );

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/");
  revalidatePath("/tax");
  revalidatePath("/reports");
  revalidatePath("/rent-roll");
  return { ok: true, imported: { expenses: expenseRows.length, payments: rentRows.length } };
}
