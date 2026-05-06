"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { randToCents } from "@/lib/format";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(["Residential", "Sectional", "Commercial", "Other"]),
  addressLine1: z.string().trim().min(1, "Address is required"),
  addressLine2: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required"),
  province: z.string().trim().min(1, "Province is required"),
  postalCode: z.string().trim().optional().or(z.literal("")),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  purchasePrice: z.coerce.number().nonnegative("Must be ≥ 0"),
  acquisitionCosts: z.coerce.number().nonnegative("Must be ≥ 0").optional(),
  notes: z.string().trim().optional().or(z.literal("")),
});

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createPropertyAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    };
  }

  const data = parsed.data;
  const created = await prisma.property.create({
    data: {
      name: data.name,
      type: data.type,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 || null,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode || null,
      purchaseDate: new Date(data.purchaseDate),
      purchasePrice: randToCents(data.purchasePrice),
      acquisitionCosts: randToCents(data.acquisitionCosts ?? 0),
      notes: data.notes || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/properties");
  redirect(`/properties/${created.id}`);
}
