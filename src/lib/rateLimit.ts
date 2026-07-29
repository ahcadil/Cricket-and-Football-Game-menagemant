// Tiny in-memory sliding-window rate limiter. Single-instance only (dev / one
// Node server) — swap for Redis when you scale horizontally. Good enough to
// blunt password brute-force on the login route.

const hits = new Map<string, number[]>();

export interface RateResult { ok: boolean; retryAfter: number }

/**
 * @param key    bucket identifier (e.g. `login:${ip}:${email}`)
 * @param limit  max attempts allowed within the window
 * @param windowMs  window length in ms
 */
export function rateLimit(key: string, limit = 5, windowMs = 60_000): RateResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const arr = (hits.get(key) ?? []).filter(t => t > cutoff);
  if (arr.length >= limit) {
    const retryAfter = Math.ceil((arr[0] + windowMs - now) / 1000);
    hits.set(key, arr);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }
  arr.push(now);
  hits.set(key, arr);

  // opportunistic cleanup so the map can't grow unbounded
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      const live = v.filter(t => t > cutoff);
      if (live.length === 0) hits.delete(k); else hits.set(k, live);
    }
  }
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP from proxy headers (dev falls back to "local"). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "local";
}
