import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Unauthenticated liveness/readiness probe for load balancers and uptime
 * monitors (excluded from the auth middleware matcher). Reports database
 * connectivity without leaking any data.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "up" });
  } catch {
    return Response.json({ status: "degraded", db: "down" }, { status: 503 });
  }
}
