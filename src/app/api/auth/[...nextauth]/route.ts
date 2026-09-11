import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getClientIp,
  rateLimit,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";

const handler = NextAuth(authOptions);

export const GET = handler;

/**
 * Rate-limit credential (password) admin login attempts.
 * NextAuth posts to /api/auth/callback/credentials (and related paths).
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  const url = new URL(req.url);
  const path = url.pathname.toLowerCase();
  const isCredentialsAttempt =
    path.includes("/callback/credentials") ||
    path.includes("/signin/credentials");

  if (isCredentialsAttempt) {
    const ip = getClientIp(req);
    const rlIp = rateLimit(ip, {
      windowMs: 15 * 60_000,
      max: 10,
      keyPrefix: "admin-login-ip",
    });
    if (!rlIp.ok) return rateLimitExceededResponse(rlIp.resetAt);

    try {
      const form = await req.clone().formData();
      const email = String(form.get("email") || "")
        .toLowerCase()
        .trim();
      if (email) {
        const rlEmail = rateLimit(email, {
          windowMs: 15 * 60_000,
          max: 5,
          keyPrefix: "admin-login-email",
        });
        if (!rlEmail.ok) return rateLimitExceededResponse(rlEmail.resetAt);
      }
    } catch {
      // Body may not be form-data; still allow NextAuth to handle the request.
    }
  }

  return handler(req, context);
}
