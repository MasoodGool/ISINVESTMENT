import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { getCurrentUser } from "@/lib/auth";

// All authenticated pages depend on per-request session state and live data —
// never prerender at build time.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Middleware already gates on a valid JWT; this re-checks against the
  // database so deactivated users are locked out immediately.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <Nav user={{ name: user.name, email: user.email, role: user.role }} />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  );
}
