"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const NOT_ADMIN = "Only administrators can manage users.";

// --------------------------------------------------------------------------
// Create user
// --------------------------------------------------------------------------

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  role: z.enum(ROLES),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`),
});

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin();
  if (!admin) return { error: NOT_ADMIN };

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    };
  }
  const d = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: d.email } });
  if (existing) {
    return { error: "A user with that email already exists." };
  }

  const user = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      role: d.role,
      passwordHash: await hashPassword(d.password),
    },
  });

  await audit(
    admin,
    "user.create",
    "User",
    user.id,
    `Created ${user.email} as ${ROLE_LABELS[d.role]}`,
  );
  revalidatePath("/settings/users");
  return { ok: true };
}

// --------------------------------------------------------------------------
// Change role
// --------------------------------------------------------------------------

export async function updateUserRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin();
  if (!admin) return { error: NOT_ADMIN };

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId || !ROLES.includes(role as Role)) return { error: "Invalid request." };

  if (userId === admin.id) {
    return { error: "You can't change your own role. Ask another administrator." };
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  await audit(
    admin,
    "user.role",
    "User",
    user.id,
    `Changed ${user.email} to ${ROLE_LABELS[role as Role]}`,
  );
  revalidatePath("/settings/users");
  return { ok: true };
}

// --------------------------------------------------------------------------
// Activate / deactivate
// --------------------------------------------------------------------------

export async function setUserActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin();
  if (!admin) return { error: NOT_ADMIN };

  const userId = String(formData.get("userId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!userId) return { error: "Invalid request." };

  if (userId === admin.id) {
    return { error: "You can't deactivate your own account." };
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { active },
  });

  await audit(
    admin,
    active ? "user.activate" : "user.deactivate",
    "User",
    user.id,
    `${active ? "Activated" : "Deactivated"} ${user.email}`,
  );
  revalidatePath("/settings/users");
  return { ok: true };
}

// --------------------------------------------------------------------------
// Reset password
// --------------------------------------------------------------------------

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin();
  if (!admin) return { error: NOT_ADMIN };

  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!userId) return { error: "Invalid request." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });

  await audit(admin, "user.password-reset", "User", user.id, `Reset password for ${user.email}`);
  revalidatePath("/settings/users");
  return { ok: true };
}
