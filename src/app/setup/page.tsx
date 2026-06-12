import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // Only reachable while the instance has no users.
  const userCount = await prisma.user.count();
  if (userCount > 0) redirect("/login");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-50">
      <SetupForm />
    </div>
  );
}
