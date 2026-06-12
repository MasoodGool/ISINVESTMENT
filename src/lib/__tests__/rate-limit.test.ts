import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to the limit within the window", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit("k", 5, 60_000, t0 + i).ok).toBe(true);
    }
    expect(rateLimit("k", 5, 60_000, t0 + 10).ok).toBe(false);
  });

  it("reports seconds until retry", () => {
    const t0 = 1_000_000;
    rateLimit("k", 1, 60_000, t0);
    const result = rateLimit("k", 1, 60_000, t0 + 30_000);
    expect(result.ok).toBe(false);
    expect(result.retryAfterSeconds).toBe(30);
  });

  it("frees slots when the window slides past old attempts", () => {
    const t0 = 1_000_000;
    rateLimit("k", 1, 60_000, t0);
    expect(rateLimit("k", 1, 60_000, t0 + 59_999).ok).toBe(false);
    expect(rateLimit("k", 1, 60_000, t0 + 60_001).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    const t0 = 1_000_000;
    rateLimit("a", 1, 60_000, t0);
    expect(rateLimit("a", 1, 60_000, t0 + 1).ok).toBe(false);
    expect(rateLimit("b", 1, 60_000, t0 + 1).ok).toBe(true);
  });
});
