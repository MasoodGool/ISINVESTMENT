import { NextResponse } from "next/server";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await audit(user, "auth.logout", "Auth", user.id, `${user.email} signed out`);
  }
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
