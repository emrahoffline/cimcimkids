import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { upsertShopperState } from "@/lib/shopper-state";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(ip, { windowMs: 60_000, max: 40, keyPrefix: "shopper" });
  if (!rl.ok) {
    return NextResponse.json({ ok: true });
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  await upsertShopperState({
    email,
    cart: (body as { cart?: unknown }).cart,
    favorites: (body as { favorites?: unknown }).favorites,
  });

  return NextResponse.json({ ok: true });
}
