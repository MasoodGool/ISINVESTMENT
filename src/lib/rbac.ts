// Role-based access control. Roles are stored as strings on User.role;
// keep this module dependency-free so both server and client code can use it.

export const ROLES = ["ADMIN", "MANAGER", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  VIEWER: "Viewer (read-only)",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Full access, including user management and the audit log.",
  MANAGER: "Create and edit portfolio data; run reports and exports.",
  VIEWER: "Read-only access to everything — ideal for your accountant.",
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/** Can create/edit/delete portfolio data (properties, leases, expenses…). */
export function canWrite(role: string): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** Can manage users and view the audit log. */
export function canAdminister(role: string): boolean {
  return role === "ADMIN";
}
