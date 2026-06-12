"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export interface LoginState {
  error?: string;
}

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/");

  if (!email || !password) return { error: "Enter your email and password." };

  const ip = await clientIp();
  const limited = rateLimit(`login:${ip}:${email}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!limited.ok) {
    return {
      error: `Too many attempts. Try again in ${limited.retryAfterSeconds} seconds.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Always verify against something so timing doesn't reveal whether the
  // account exists.
  const ok = await verifyPassword(
    password,
    user?.passwordHash ??
      "scrypt$16384$8$1$00000000000000000000000000000000$" + "0".repeat(128),
  );

  if (!user || !user.active || !ok) {
    return { error: "Invalid email or password." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await createSession(user);
  await audit(user, "auth.login", "Auth", user.id, `${user.email} signed in`);

  // Only allow same-origin relative redirects.
  const target = from.startsWith("/") && !from.startsWith("//") ? from : "/";
  redirect(target);
}
