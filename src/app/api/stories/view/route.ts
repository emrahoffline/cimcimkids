import { NextResponse } from "next/server";
import { incrementStoryView } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const id =
    body && typeof body === "object" && typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id.trim()
      : "";
  if (!id) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  await incrementStoryView(id).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
