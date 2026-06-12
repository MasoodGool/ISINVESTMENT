import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("Tr0ub4dor&3", hash)).toBe(false);
  });

  it("produces unique hashes for the same password (random salt)", async () => {
    const a = await hashPassword("same-password-123");
    const b = await hashPassword("same-password-123");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-password-123", a)).toBe(true);
    expect(await verifyPassword("same-password-123", b)).toBe(true);
  });

  it("encodes the scrypt parameters in the stored hash", async () => {
    const hash = await hashPassword("x".repeat(12));
    const parts = hash.split("$");
    expect(parts[0]).toBe("scrypt");
    expect(parts).toHaveLength(6);
  });

  it("rejects malformed stored hashes without throwing", async () => {
    expect(await verifyPassword("anything", "")).toBe(false);
    expect(await verifyPassword("anything", "bcrypt$whatever")).toBe(false);
    expect(await verifyPassword("anything", "scrypt$bad")).toBe(false);
    expect(
      await verifyPassword("anything", "scrypt$16384$8$1$nothex$alsonothex"),
    ).toBe(false);
  });
});
