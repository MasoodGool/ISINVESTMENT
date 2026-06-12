"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getWriter, NOT_AUTHORIZED } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { formatTaxYear } from "@/lib/tax-core";

export interface NoteActionState {
  ok?: boolean;
  error?: string;
}

const createSchema = z.object({
  taxYear: z.coerce.number().int().min(2000).max(2100),
  body: z.string().trim().min(1, "Write something first").max(2000),
});

export async function createTaxNoteAction(
  _prev: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  const user = await getWriter();
  if (!user) return { error: NOT_AUTHORIZED };

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid note." };
  }
  const d = parsed.data;

  const note = await prisma.taxYearNote.create({
    data: { taxYear: d.taxYear, body: d.body },
  });

  await audit(
    user,
    "tax-note.create",
    "TaxYearNote",
    note.id,
    `Added a note to tax year ${formatTaxYear(d.taxYear)}`,
  );
  revalidatePath("/tax");
  return { ok: true };
}

export async function deleteTaxNoteAction(
  _prev: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  const user = await getWriter();
  if (!user) return { error: NOT_AUTHORIZED };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Invalid request." };

  const note = await prisma.taxYearNote.delete({ where: { id } });
  await audit(
    user,
    "tax-note.delete",
    "TaxYearNote",
    note.id,
    `Deleted a note from tax year ${formatTaxYear(note.taxYear)}`,
  );
  revalidatePath("/tax");
  return { ok: true };
}
