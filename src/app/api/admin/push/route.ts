import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import {
  deleteAdminPushSubscription,
  getVapidPublicKey,
  saveAdminPushSubscription,
  sendAdminTestPush,
} from "@/lib/admin-push";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: "Push yapılandırılmamış", publicKey: "" },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey });
}

export async function POST(request: Request) {
  const { session, error } = await requireAdminApi();
  if (error) return error;

  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint =
    body && typeof body === "object" && typeof (body as { endpoint?: unknown }).endpoint === "string"
      ? (body as { endpoint: string }).endpoint
      : "";
  const p256dh =
    body &&
    typeof body === "object" &&
    body !== null &&
    typeof (body as { keys?: { p256dh?: unknown } }).keys?.p256dh === "string"
      ? (body as { keys: { p256dh: string } }).keys.p256dh
      : "";
  const auth =
    body &&
    typeof body === "object" &&
    body !== null &&
    typeof (body as { keys?: { auth?: unknown } }).keys?.auth === "string"
      ? (body as { keys: { auth: string } }).keys.auth
      : "";

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Geçersiz abonelik" }, { status: 400 });
  }

  try {
    await saveAdminPushSubscription({ endpoint, p256dh, auth, userEmail: email });
    let testSent = false;
    let testError = "";
    try {
      await sendAdminTestPush(endpoint);
      testSent = true;
    } catch (err) {
      testError = err instanceof Error ? err.message : "Test gönderilemedi";
      console.error("[push] test after subscribe:", err);
    }
    return NextResponse.json({ ok: true, testSent, testError });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kayıt başarısız" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const endpoint =
    body && typeof body === "object" && typeof (body as { endpoint?: unknown }).endpoint === "string"
      ? (body as { endpoint: string }).endpoint
      : "";

  if (!endpoint) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  await deleteAdminPushSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
