import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { isValidShopperEmail, normalizeShopperEmail } from "@/lib/shopper";
import { upsertShopperState } from "@/lib/shopper-db";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(ip, { windowMs: 60_000, max: 40, keyPrefix: "shopper" });
  if (!rl.ok) {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const email = normalizeShopperEmail(String((body as { email?: unknown }).email ?? ""));
  if (!isValidShopperEmail(email)) {
    return NextResponse.json({ error: "Geçerli e-posta gerekli" }, { status: 400 });
  }

  const visitorIdRaw = (body as { visitorId?: unknown }).visitorId;
  const visitorId =
    typeof visitorIdRaw === "string" && visitorIdRaw.trim()
      ? visitorIdRaw.trim().slice(0, 80)
      : undefined;

  await upsertShopperState({
    email,
    cart: (body as { cart?: unknown }).cart,
    favorites: (body as { favorites?: unknown }).favorites,
    visitorId,
  });

  return NextResponse.json({ ok: true });
}
