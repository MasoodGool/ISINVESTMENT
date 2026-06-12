// In-memory sliding-window rate limiter. Suitable for a single-node
// deployment (the standard topology for this app); swap for a Redis-backed
// implementation if you run multiple instances behind a load balancer.

interface Window {
  timestamps: number[];
}

const windows = new Map<string, Window>();

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the next attempt is allowed (0 when ok). */
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const cutoff = now - windowMs;
  let win = windows.get(key);
  if (!win) {
    win = { timestamps: [] };
    windows.set(key, win);
  }
  win.timestamps = win.timestamps.filter((t) => t > cutoff);

  if (win.timestamps.length >= limit) {
    const oldest = win.timestamps[0];
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  win.timestamps.push(now);

  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (windows.size > 10_000) {
    for (const [k, v] of windows) {
      if (v.timestamps.every((t) => t <= cutoff)) windows.delete(k);
    }
  }

  return { ok: true, retryAfterSeconds: 0 };
}

/** Test helper — clears all rate-limit state. */
export function resetRateLimits(): void {
  windows.clear();
}
