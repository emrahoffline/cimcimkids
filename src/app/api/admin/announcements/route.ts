import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from "@/lib/db";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const announcements = await getAnnouncements();
  return NextResponse.json(announcements);
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const textTr =
    body && typeof body === "object" && typeof (body as { textTr?: unknown }).textTr === "string"
      ? (body as { textTr: string }).textTr
      : "";
  const textEn =
    body && typeof body === "object" && typeof (body as { textEn?: unknown }).textEn === "string"
      ? (body as { textEn: string }).textEn
      : "";

  if (!textTr.trim()) {
    return NextResponse.json(
      { error: "Duyuru metni gerekli." },
      { status: 400 }
    );
  }

  try {
    const announcement = await createAnnouncement({ textTr, textEn });
    return NextResponse.json(announcement, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kayıt başarısız." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const { id, textTr, textEn, active, sortOrder } = body as {
    id?: unknown;
    textTr?: unknown;
    textEn?: unknown;
    active?: unknown;
    sortOrder?: unknown;
  };

  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const updated = await updateAnnouncement(id, {
    ...(typeof textTr === "string" ? { textTr } : {}),
    ...(typeof textEn === "string" ? { textEn } : {}),
    ...(typeof active === "boolean" ? { active } : {}),
    ...(typeof sortOrder === "number" && Number.isFinite(sortOrder)
      ? { sortOrder }
      : {}),
  });

  if (!updated) {
    return NextResponse.json({ error: "Duyuru bulunamadı." }, { status: 404 });
  }

  return NextResponse.json(updated);
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

  const removed = await deleteAnnouncement(id);
  if (!removed) {
    return NextResponse.json({ error: "Duyuru bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
