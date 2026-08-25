import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getClientIp,
  rateLimit,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";

const handler = NextAuth(authOptions);

export const GET = handler;

function isCredentialsAttempt(req: Request): boolean {
  const path = new URL(req.url).pathname.toLowerCase();
  return (
    path.includes("/callback/credentials") ||
    path.includes("/signin/credentials")
  );
}

export async function POST(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  if (isCredentialsAttempt(req)) {
    const ip = getClientIp(req);
    const rlIp = rateLimit(ip, {
      windowMs: 15 * 60_000,
      max: 8,
      keyPrefix: "login-ip",
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
          keyPrefix: "login-email",
        });
        if (!rlEmail.ok) return rateLimitExceededResponse(rlEmail.resetAt);
      }
    } catch {
      // Body may not be form-data; NextAuth still handles the request.
    }
  }

  return handler(req, context);
}
