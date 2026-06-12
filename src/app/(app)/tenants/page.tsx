import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, formatZar } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/card";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const tenants = await prisma.tenant.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      leases: {
        include: { property: true },
        orderBy: { startDate: "desc" },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tenants</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Everyone who has held a lease. Tenants are created when you add a lease
            on a property.
          </p>
        </div>
        <form className="flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name, email, phone…"
            className="h-9 w-64 rounded-md border border-zinc-300 bg-white px-3 text-sm placeholder:text-zinc-400"
          />
          <button
            type="submit"
            className="h-9 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Search
          </button>
        </form>
      </div>

      {tenants.length === 0 ? (
        <EmptyState
          title={q ? "No tenants match your search" : "No tenants yet"}
          description={
            q
              ? "Try a different name, email, or phone number."
              : "Add a lease on a property to create your first tenant."
          }
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <Table>
              <THead>
                <Tr>
                  <Th>Tenant</Th>
                  <Th>Contact</Th>
                  <Th>Property</Th>
                  <Th className="text-right">Rent</Th>
                  <Th>Lease</Th>
                  <Th>Since</Th>
                </Tr>
              </THead>
              <TBody>
                {tenants.map((t) => {
                  const lease =
                    t.leases.find((l) => l.status === "Active") ?? t.leases[0];
                  return (
                    <Tr key={t.id}>
                      <Td className="font-medium">{t.fullName}</Td>
                      <Td className="text-zinc-600">
                        <div>{t.email ?? "—"}</div>
                        {t.phone && <div className="text-xs text-zinc-500">{t.phone}</div>}
                      </Td>
                      <Td>
                        {lease ? (
                          <Link
                            href={`/properties/${lease.propertyId}`}
                            className="hover:underline"
                          >
                            {lease.property.name}
                          </Link>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </Td>
                      <Td className="text-right tabular-nums">
                        {lease ? formatZar(lease.monthlyRent) : "—"}
                      </Td>
                      <Td>
                        {lease ? (
                          <Badge tone={lease.status === "Active" ? "green" : "neutral"}>
                            {lease.status}
                          </Badge>
                        ) : (
                          <Badge tone="neutral">None</Badge>
                        )}
                      </Td>
                      <Td className="text-zinc-500">
                        {lease ? formatDate(lease.startDate) : "—"}
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
