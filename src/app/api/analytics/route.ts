import { NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/lib/analytics-db";
import { resolveVisitorGeo } from "@/lib/analytics-geo";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(ip, { windowMs: 60_000, max: 120, keyPrefix: "analytics" });
  if (!rl.ok) {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json().catch(() => null);

  if (!body?.type || !body?.sessionId) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const allowed = ["page_view", "session_end", "favorite_add", "favorite_remove"];
  if (!allowed.includes(body.type)) {
    return NextResponse.json({ error: "Geçersiz olay" }, { status: 400 });
  }

  const geo =
    body.type === "page_view"
      ? await resolveVisitorGeo(request)
      : { country: body.country, city: body.city };

  await recordAnalyticsEvent({
    type: body.type,
    sessionId: String(body.sessionId),
    path: body.path,
    productId: body.productId,
    productName: body.productName,
    durationSec:
      typeof body.durationSec === "number" ? Math.min(body.durationSec, 7200) : undefined,
    country: geo.country,
    city: geo.city,
    timezone: body.timezone,
  });

  return NextResponse.json({ ok: true });
}
