import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { centsToRand, isoDateInput } from "@/lib/format";
import { EditPropertyForm } from "./form";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role)) redirect(`/properties/${id}`);

  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href={`/properties/${property.id}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ChevronLeft className="h-4 w-4" /> {property.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit property</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Changes to purchase price and acquisition costs flow through to yield and
          CGT base cost calculations.
        </p>
      </div>

      <EditPropertyForm
        propertyId={property.id}
        defaults={{
          name: property.name,
          type: property.type,
          addressLine1: property.addressLine1,
          addressLine2: property.addressLine2 ?? "",
          city: property.city,
          province: property.province,
          postalCode: property.postalCode ?? "",
          purchaseDate: isoDateInput(property.purchaseDate),
          purchasePrice: String(centsToRand(property.purchasePrice)),
          acquisitionCosts: String(centsToRand(property.acquisitionCosts)),
          notes: property.notes ?? "",
        }}
      />
    </div>
  );
}
