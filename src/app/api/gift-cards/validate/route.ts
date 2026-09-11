import { NextResponse } from "next/server";
import { getGiftCardByCode } from "@/lib/gift-cards-db";
import {
  giftCardAppliedAmount,
  normalizeGiftCardCode,
} from "@/lib/gift-cards";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(ip, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: "gift-validate",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const codeRaw =
    body && typeof body === "object" && typeof (body as { code?: unknown }).code === "string"
      ? (body as { code: string }).code
      : "";
  const subtotal =
    body &&
    typeof body === "object" &&
    typeof (body as { subtotal?: unknown }).subtotal === "number"
      ? (body as { subtotal: number }).subtotal
      : 0;

  const code = normalizeGiftCardCode(codeRaw);
  if (!code || code.length < 6) {
    return NextResponse.json(
      { error: "Geçerli bir hediye kartı kodu girin." },
      { status: 400 }
    );
  }

  const card = await getGiftCardByCode(code);
  if (!card || card.status !== "active" || card.remainingBalance <= 0) {
    return NextResponse.json(
      { error: "Hediye kartı geçersiz veya bakiyesi yok." },
      { status: 404 }
    );
  }

  const applied = giftCardAppliedAmount(subtotal, card.remainingBalance);

  return NextResponse.json({
    code: card.code,
    remainingBalance: card.remainingBalance,
    applied,
  });
}
