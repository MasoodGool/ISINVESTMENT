import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/rbac";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordForm } from "./form";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>
        <p className="mt-1 text-sm text-zinc-500">Profile and sign-in settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Name</span>
            <span className="font-medium">{user.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Role</span>
            <Badge tone="blue">{ROLE_LABELS[user.role as Role] ?? user.role}</Badge>
          </div>
          <p className="text-xs text-zinc-500">
            {ROLE_DESCRIPTIONS[user.role as Role]}
            {" "}Ask an administrator if you need a different role.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            You stay signed in on this device; other devices keep their sessions
            until they expire.
          </CardDescription>
        </CardHeader>
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}
