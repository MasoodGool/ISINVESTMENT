import { Nav } from "@/components/nav";

// All authenticated pages depend on per-request session state and live data —
// never prerender at build time.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  );
}
