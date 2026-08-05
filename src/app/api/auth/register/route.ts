import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import {
  addNewsletterSubscriber,
  registerCustomer,
} from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(ip, {
    windowMs: 60_000,
    max: 8,
    keyPrefix: "register",
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "tooManyRequests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const name =
    typeof (body as { name?: unknown }).name === "string"
      ? (body as { name: string }).name.trim()
      : "";
  const email =
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : "";
  const password =
    typeof (body as { password?: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";
  const kvkkConsent = (body as { kvkkConsent?: unknown }).kvkkConsent === true;
  const marketingConsent =
    (body as { marketingConsent?: unknown }).marketingConsent === true;
  const locale =
    (body as { locale?: unknown }).locale === "en" ? "en" : "tr";

  if (!kvkkConsent) {
    return NextResponse.json({ error: "kvkkRequired" }, { status: 400 });
  }
  if (!name || name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: "invalidName" }, { status: 400 });
  }
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalidEmail" }, { status: 400 });
  }
  if (isAdminEmail(email)) {
    return NextResponse.json({ error: "adminEmail" }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "weakPassword" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const result = await registerCustomer({
    email,
    name,
    passwordHash,
  });

  if (result.error === "alreadyExists" || result.error === "oauthAccount") {
    // Aynı mesaj: e-posta enumeration + OAuth takeover engeli
    return NextResponse.json({ error: "alreadyExists" }, { status: 409 });
  }

  if (marketingConsent) {
    try {
      await addNewsletterSubscriber({
        email,
        locale,
        source: "newsletter",
      });
    } catch {
      /* abonelik kaydı başarısız olsa da üyelik devam etsin */
    }
  }

  return NextResponse.json({
    ok: true,
    email: result.customer.email,
    name: result.customer.name,
  });
}
