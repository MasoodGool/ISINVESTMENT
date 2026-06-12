"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { audit } from "@/lib/audit";

export interface SetupState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const schema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().toLowerCase().email("Invalid email"),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function setupAction(
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  // Hard guard: this action only works while the instance has no users.
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    return { error: "Setup has already been completed. Sign in instead." };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    };
  }
  const d = parsed.data;

  const user = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      passwordHash: await hashPassword(d.password),
      role: "ADMIN",
    },
  });

  await createSession(user);
  await audit(user, "auth.setup", "User", user.id, `Bootstrap admin ${user.email} created`);
  redirect("/");
}
