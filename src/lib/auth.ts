import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { canAdminister, canWrite, type Role } from "@/lib/rbac";

const COOKIE_NAME = "isi_session";
const ALGORITHM = "HS256";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a string of at least 32 characters. " +
        "Generate one with: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  /** User id. */
  sub: string;
  email: string;
  name: string;
  role: Role;
}

/** The session user, freshly loaded from the database. */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

async function sign(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecretKey(), {
      algorithms: [ALGORITHM],
    });
    if (!payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(user: {
  id: string;
  email: string;
  name: string;
  role: string;
}): Promise<void> {
  const token = await sign({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
  });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Resolve the session against the database so role changes and
 * deactivation take effect immediately, not at token expiry.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.active) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role as Role };
}

/** For server actions: the current user if they may modify data, else null. */
export async function getWriter(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role)) return null;
  return user;
}

/** For server actions/pages: the current user if they are an admin, else null. */
export async function getAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || !canAdminister(user.role)) return null;
  return user;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

/** Standard error message returned by actions when RBAC denies a write. */
export const NOT_AUTHORIZED =
  "You don't have permission to make changes. Ask an administrator to upgrade your role.";
