import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

/**
 * Record an entry in the audit trail. Auditing must never break the
 * underlying operation, so failures are logged and swallowed.
 */
export async function audit(
  user: SessionUser | { id?: string; email: string },
  action: string,
  entityType: string,
  entityId: string | null,
  summary: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: "id" in user ? (user.id ?? null) : null,
        userEmail: user.email,
        action,
        entityType,
        entityId,
        summary,
      },
    });
  } catch (err) {
    console.error("audit: failed to record entry", { action, entityType }, err);
  }
}
