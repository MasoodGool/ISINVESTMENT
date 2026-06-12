import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAdminister } from "@/lib/rbac";
import { Card, CardBody } from "@/components/ui/card";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 50;

const dateTimeFormatter = new Intl.DateTimeFormat("en-ZA", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!canAdminister(me.role)) redirect("/");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Every change made in this instance, by whom, and when. {total} entries.
        </p>
      </div>

      <Card>
        <CardBody className="p-0">
          {entries.length === 0 ? (
            <div className="px-5 py-6 text-sm text-zinc-500">No activity yet.</div>
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th>When</Th>
                  <Th>User</Th>
                  <Th>Action</Th>
                  <Th>Detail</Th>
                </Tr>
              </THead>
              <TBody>
                {entries.map((e) => (
                  <Tr key={e.id}>
                    <Td className="whitespace-nowrap text-zinc-500">
                      {dateTimeFormatter.format(e.createdAt)}
                    </Td>
                    <Td className="text-zinc-600">{e.userEmail}</Td>
                    <Td>
                      <Badge tone={e.action.includes("delete") ? "red" : "neutral"}>
                        {e.action}
                      </Badge>
                    </Td>
                    <Td className="text-zinc-700">{e.summary}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {pages > 1 && (
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          {page > 1 && (
            <a className="hover:underline" href={`/settings/audit?page=${page - 1}`}>
              ← Newer
            </a>
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && (
            <a className="hover:underline" href={`/settings/audit?page=${page + 1}`}>
              Older →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
