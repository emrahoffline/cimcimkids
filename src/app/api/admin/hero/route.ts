import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import {
  createHeroSlide,
  deleteHeroSlide,
  getHeroSlides,
  updateHeroSlide,
} from "@/lib/db";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const slides = await getHeroSlides();
  return NextResponse.json(slides);
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const imageUrl =
    body && typeof body === "object" && typeof (body as { imageUrl?: unknown }).imageUrl === "string"
      ? (body as { imageUrl: string }).imageUrl
      : "";
  const altTr =
    body && typeof body === "object" && typeof (body as { altTr?: unknown }).altTr === "string"
      ? (body as { altTr: string }).altTr
      : "";
  const altEn =
    body && typeof body === "object" && typeof (body as { altEn?: unknown }).altEn === "string"
      ? (body as { altEn: string }).altEn
      : "";

  if (!imageUrl.trim()) {
    return NextResponse.json(
      { error: "Görsel gerekli." },
      { status: 400 }
    );
  }

  try {
    const slide = await createHeroSlide({ imageUrl, altTr, altEn });
    return NextResponse.json(slide, { status: 201 });
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

  const { id, imageUrl, altTr, altEn, active, sortOrder } = body as {
    id?: unknown;
    imageUrl?: unknown;
    altTr?: unknown;
    altEn?: unknown;
    active?: unknown;
    sortOrder?: unknown;
  };

  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const updated = await updateHeroSlide(id, {
    ...(typeof imageUrl === "string" ? { imageUrl } : {}),
    ...(typeof altTr === "string" ? { altTr } : {}),
    ...(typeof altEn === "string" ? { altEn } : {}),
    ...(typeof active === "boolean" ? { active } : {}),
    ...(typeof sortOrder === "number" && Number.isFinite(sortOrder)
      ? { sortOrder }
      : {}),
  });

  if (!updated) {
    return NextResponse.json({ error: "Slayt bulunamadı." }, { status: 404 });
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

  const removed = await deleteHeroSlide(id);
  if (!removed) {
    return NextResponse.json({ error: "Slayt bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
