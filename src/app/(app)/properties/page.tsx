import Link from "next/link";
import { Building2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatDate, formatZar } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function PropertiesPage() {
  const properties = await prisma.property.findMany({
    where: { archived: false },
    orderBy: { createdAt: "desc" },
    include: {
      leases: { where: { status: "Active" }, take: 1, include: { tenant: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Your investment portfolio. Click a property to see rent, expenses, loan, and tax.
          </p>
        </div>
        <Link href="/properties/new">
          <Button>+ New property</Button>
        </Link>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Add your first investment property to start tracking it."
          action={
            <Link href="/properties/new">
              <Button>
                <Building2 className="mr-2 h-4 w-4" />
                Add a property
              </Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <Table>
              <THead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Location</Th>
                  <Th>Tenant</Th>
                  <Th className="text-right">Monthly rent</Th>
                  <Th className="text-right">Purchased</Th>
                </Tr>
              </THead>
              <TBody>
                {properties.map((p) => {
                  const lease = p.leases[0];
                  return (
                    <Tr key={p.id}>
                      <Td>
                        <Link
                          href={`/properties/${p.id}`}
                          className="font-medium text-zinc-900 hover:underline"
                        >
                          {p.name}
                        </Link>
                      </Td>
                      <Td>
                        <Badge tone="neutral">{p.type}</Badge>
                      </Td>
                      <Td className="text-zinc-600">
                        {p.city}, {p.province}
                      </Td>
                      <Td>
                        {lease ? (
                          lease.tenant.fullName
                        ) : (
                          <span className="text-zinc-400">Vacant</span>
                        )}
                      </Td>
                      <Td className="text-right tabular-nums">
                        {lease ? formatZar(lease.monthlyRent) : "—"}
                      </Td>
                      <Td className="text-right text-zinc-500">
                        {formatDate(p.purchaseDate)}
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
