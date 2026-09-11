import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import {
  deleteReview,
  listAdminReviews,
  setReviewHidden,
} from "@/lib/reviews-db";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const reviews = await listAdminReviews();
  return NextResponse.json(reviews);
}

export async function PATCH(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const id =
    body && typeof body === "object" && typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id
      : "";
  const hidden =
    body && typeof body === "object" && typeof (body as { hidden?: unknown }).hidden === "boolean"
      ? (body as { hidden: boolean }).hidden
      : null;

  if (!id || hidden == null) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const updated = await setReviewHidden(id, hidden);
  if (!updated) {
    return NextResponse.json({ error: "Yorum bulunamadı." }, { status: 404 });
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

  const ok = await deleteReview(id);
  if (!ok) {
    return NextResponse.json({ error: "Yorum bulunamadı." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
