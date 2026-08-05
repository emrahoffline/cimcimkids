import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import {
  getNewsletterSubscribers,
  removeNewsletterSubscriber,
} from "@/lib/db";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const subscribers = await getNewsletterSubscribers();
  return NextResponse.json(
    subscribers.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  );
}

export async function DELETE(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const id =
    body && typeof body === "object" && typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id
      : "";

  if (!id) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const removed = await removeNewsletterSubscriber(id);
  if (!removed) {
    return NextResponse.json({ error: "Abone bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
