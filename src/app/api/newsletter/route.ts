import { NextResponse } from "next/server";
import { addNewsletterSubscriber } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rlIp = rateLimit(ip, {
    windowMs: 60_000,
    max: 5,
    keyPrefix: "newsletter-ip",
  });
  if (!rlIp.ok) {
    return NextResponse.json({ error: "tooManyRequests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const emailRaw =
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email.trim().toLowerCase()
      : "";
  const locale =
    (body as { locale?: unknown }).locale === "en" ? "en" : "tr";

  if (!emailRaw || emailRaw.length > 254 || !EMAIL_RE.test(emailRaw)) {
    return NextResponse.json({ error: "invalidEmail" }, { status: 400 });
  }

  const rlEmail = rateLimit(emailRaw, {
    windowMs: 60 * 60_000,
    max: 3,
    keyPrefix: "newsletter-email",
  });
  if (!rlEmail.ok) {
    return NextResponse.json({ error: "tooManyRequests" }, { status: 429 });
  }

  // Kaydet ama anında e-posta gönderme (mail bomb / spam riski).
  // Çift onay (double opt-in) production'da SMTP + token ile eklenmeli.
  const { created } = await addNewsletterSubscriber({
    email: emailRaw,
    locale,
    source: "newsletter",
  });

  return NextResponse.json({
    ok: true,
    alreadySubscribed: !created,
  });
}
