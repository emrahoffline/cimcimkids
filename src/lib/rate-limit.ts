type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

declare global {
  var __aryaRateLimit: Map<string, RateLimitState> | undefined;
}

function getStore(): Map<string, RateLimitState> {
  if (!globalThis.__aryaRateLimit) {
    globalThis.__aryaRateLimit = new Map();
  }
  return globalThis.__aryaRateLimit;
}

function isValidIp(value: string): boolean {
  // Basic IPv4 / IPv6 sanity (reject header injection / garbage).
  if (!value || value.length > 45) return false;
  if (/[^0-9a-fA-F:.]/.test(value)) return false;
  return true;
}

/**
 * Prefer platform-provided IP. Only trust forwarded headers when
 * TRUST_PROXY=true (behind nginx/cloudflare/etc.).
 */
export function getClientIp(request: Request): string {
  const trustProxy = process.env.TRUST_PROXY === "true";

  if (trustProxy) {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) {
      const first = xff.split(",")[0]?.trim() || "";
      if (isValidIp(first)) return first;
    }
    const realIp = request.headers.get("x-real-ip")?.trim() || "";
    if (isValidIp(realIp)) return realIp;
  }

  return "unknown";
}

export function rateLimit(
  key: string,
  { windowMs, max, keyPrefix }: RateLimitOptions
):
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; resetAt: number } {
  const now = Date.now();
  const store = getStore();
  const fullKey = `${keyPrefix ?? "rl"}:${key}`;
  const state = store.get(fullKey);

  if (!state || state.resetAt <= now) {
    const next: RateLimitState = { count: 1, resetAt: now + windowMs };
    store.set(fullKey, next);
    return { ok: true, remaining: Math.max(0, max - 1), resetAt: next.resetAt };
  }

  if (state.count >= max) {
    return { ok: false, resetAt: state.resetAt };
  }

  state.count += 1;
  store.set(fullKey, state);
  return {
    ok: true,
    remaining: Math.max(0, max - state.count),
    resetAt: state.resetAt,
  };
}
