"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { randToCents } from "@/lib/format";
import { getWriter, NOT_AUTHORIZED } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { PropertyFormState } from "@/components/property-form";

const schema = z.object({
  propertyId: z.string().min(1),
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

export async function updatePropertyAction(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await getWriter();
  if (!user) return { error: NOT_AUTHORIZED };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    };
  }
  const d = parsed.data;

  const updated = await prisma.property.update({
    where: { id: d.propertyId },
    data: {
      name: d.name,
      type: d.type,
      addressLine1: d.addressLine1,
      addressLine2: d.addressLine2 || null,
      city: d.city,
      province: d.province,
      postalCode: d.postalCode || null,
      purchaseDate: new Date(d.purchaseDate),
      purchasePrice: randToCents(d.purchasePrice),
      acquisitionCosts: randToCents(d.acquisitionCosts ?? 0),
      notes: d.notes || null,
    },
  });

  await audit(user, "property.update", "Property", updated.id, `Updated ${updated.name}`);
  revalidatePath("/");
  revalidatePath("/properties");
  revalidatePath(`/properties/${updated.id}`);
  revalidatePath("/tax");
  redirect(`/properties/${updated.id}`);
}
