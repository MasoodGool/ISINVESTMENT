import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAdminister, ROLE_LABELS, type Role } from "@/lib/rbac";
import { formatDate } from "@/lib/format";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateUserForm, ChangeRoleForm, ToggleActiveForm, ResetPasswordForm } from "./forms";

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!canAdminister(me.role)) redirect("/");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage who can access this instance and what they can do.
        </p>
      </div>

      <Card>
        <CardBody className="p-0">
          <Table>
            <THead>
              <Tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Last sign-in</Th>
                <Th>Reset password</Th>
                <Th></Th>
              </Tr>
            </THead>
            <TBody>
              {users.map((u) => {
                const self = u.id === me.id;
                return (
                  <Tr key={u.id}>
                    <Td className="font-medium">
                      {u.name}
                      {self && (
                        <span className="ml-1.5 text-xs text-zinc-400">(you)</span>
                      )}
                    </Td>
                    <Td className="text-zinc-600">{u.email}</Td>
                    <Td>
                      {self ? (
                        <Badge tone="blue">{ROLE_LABELS[u.role as Role] ?? u.role}</Badge>
                      ) : (
                        <ChangeRoleForm userId={u.id} currentRole={u.role} />
                      )}
                    </Td>
                    <Td>
                      <Badge tone={u.active ? "green" : "red"}>
                        {u.active ? "Active" : "Deactivated"}
                      </Badge>
                    </Td>
                    <Td className="text-zinc-500">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                    </Td>
                    <Td>
                      <ResetPasswordForm userId={u.id} />
                    </Td>
                    <Td>{!self && <ToggleActiveForm userId={u.id} active={u.active} />}</Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a user</CardTitle>
          <CardDescription>
            Managers can edit portfolio data. Viewers (e.g. your accountant) get
            read-only access including reports and exports.
          </CardDescription>
        </CardHeader>
        <CardBody>
          <CreateUserForm />
        </CardBody>
      </Card>
    </div>
  );
}
