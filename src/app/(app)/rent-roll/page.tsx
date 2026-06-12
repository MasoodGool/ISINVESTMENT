import Link from "next/link";
import { computeRentRoll } from "@/lib/reports";
import { formatZar } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty";

const monthLabel = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" });

function parseMonthParam(value: string | undefined): { year: number; month: number } {
  const m = value?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function monthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export default async function RentRollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const { year, month } = parseMonthParam(sp.month);
  const roll = await computeRentRoll(year, month);

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const label = monthLabel.format(new Date(Date.UTC(year, month - 1, 1)));

  const arrears = roll.rows.filter(
    (r) => r.status === "Partial" || r.status === "Outstanding",
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rent roll</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Expected vs received rent per lease, attributed to the billing period.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50"
            href={`/rent-roll?month=${monthParam(prev.year, prev.month)}`}
          >
            ← {monthLabel.format(new Date(Date.UTC(prev.year, prev.month - 1, 1)))}
          </Link>
          <span className="px-2 font-medium">{label}</span>
          <Link
            className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50"
            href={`/rent-roll?month=${monthParam(next.year, next.month)}`}
          >
            {monthLabel.format(new Date(Date.UTC(next.year, next.month - 1, 1)))} →
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Expected" value={formatZar(roll.totalExpectedCents)} />
        <Stat
          label="Received"
          value={formatZar(roll.totalReceivedCents)}
          tone={roll.totalReceivedCents >= roll.totalExpectedCents ? "green" : undefined}
        />
        <Stat
          label="Outstanding"
          value={formatZar(roll.totalOutstandingCents)}
          tone={roll.totalOutstandingCents > 0 ? "red" : "green"}
        />
        <Stat
          label="Occupancy"
          value={`${roll.occupiedCount}/${roll.occupiedCount + roll.vacantCount}`}
          hint={roll.vacantCount > 0 ? `${roll.vacantCount} vacant` : "Fully let"}
        />
      </section>

      {arrears.length > 0 && (
        <Alert tone="warning" title={`${arrears.length} lease(s) in arrears for ${label}`}>
          Follow up on the outstanding amounts below, and capture any payments you
          have received against the right billing period.
        </Alert>
      )}

      {roll.rows.length === 0 ? (
        <EmptyState
          title="No properties"
          description="Add a property and a lease to see the rent roll."
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <Table>
              <THead>
                <Tr>
                  <Th>Property</Th>
                  <Th>Tenant</Th>
                  <Th className="text-right">Expected</Th>
                  <Th className="text-right">Received</Th>
                  <Th className="text-right">Outstanding</Th>
                  <Th>Status</Th>
                </Tr>
              </THead>
              <TBody>
                {roll.rows.map((r) => (
                  <Tr key={`${r.propertyId}-${r.leaseId ?? "vacant"}`}>
                    <Td>
                      <Link
                        href={`/properties/${r.propertyId}`}
                        className="font-medium hover:underline"
                      >
                        {r.propertyName}
                      </Link>
                    </Td>
                    <Td className={r.tenantName ? "" : "text-zinc-400"}>
                      {r.tenantName ?? "Vacant"}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {r.status === "Vacant" ? "—" : formatZar(r.expectedCents)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {r.status === "Vacant" ? "—" : formatZar(r.receivedCents)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {r.status === "Vacant"
                        ? "—"
                        : formatZar(Math.max(0, r.expectedCents - r.receivedCents))}
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          r.status === "Paid"
                            ? "green"
                            : r.status === "Partial"
                              ? "amber"
                              : r.status === "Outstanding"
                                ? "red"
                                : "neutral"
                        }
                      >
                        {r.status}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
