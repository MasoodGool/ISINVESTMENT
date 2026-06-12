import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { EmptyState } from "@/components/ui/empty";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canWrite(user.role)) redirect("/");

  const properties = await prisma.property.findMany({
    where: { archived: false },
    orderBy: { name: "asc" },
    include: { leases: { where: { status: "Active" }, select: { id: true }, take: 1 } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bank statement import</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Bulk-capture a month of transactions: upload a CSV, review the suggested
          SARS categories, and import. Nothing is saved until you confirm.
        </p>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Add a property first, then import its bank statement here."
        />
      ) : (
        <ImportClient
          properties={properties.map((p) => ({
            id: p.id,
            name: p.name,
            hasActiveLease: p.leases.length > 0,
          }))}
        />
      )}
    </div>
  );
}
