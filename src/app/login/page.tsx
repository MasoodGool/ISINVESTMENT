import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  // First run: no users yet — bootstrap an administrator account instead.
  const userCount = await prisma.user.count();
  if (userCount === 0) redirect("/setup");

  const sp = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-50">
      <LoginForm from={sp.from ?? "/"} />
    </div>
  );
}
