import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { sendAdminTestPush } from "@/lib/admin-push";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

  try {
    await sendAdminTestPush(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Test gönderilemedi" },
      { status: 400 }
    );
  }
}
