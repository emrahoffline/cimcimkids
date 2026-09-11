import { NextResponse } from "next/server";
import {
  createVerifiedReview,
  getReviewSummary,
  listVisibleReviews,
} from "@/lib/reviews-db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_PRODUCT: "Geçersiz ürün.",
  INVALID_RATING: "Lütfen 1–5 arası bir puan seçin.",
  INVALID_EMAIL: "Geçerli bir e-posta girin.",
  INVALID_ORDER: "Sipariş numarasını girin.",
  COMMENT_TOO_SHORT: "Yorum en az 10 karakter olmalı.",
  PRODUCT_NOT_FOUND: "Ürün bulunamadı.",
  ORDER_NOT_FOUND: "Sipariş numarası ve e-posta eşleşmedi.",
  ORDER_NOT_ELIGIBLE:
    "Yorum için siparişinizin onaylanmış olması gerekir.",
  PRODUCT_NOT_IN_ORDER: "Bu ürün bu siparişte yok.",
  ALREADY_REVIEWED: "Bu ürüne zaten yorum yaptınız.",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId")?.trim() || "";
  if (!productId || productId.length > 80) {
    return NextResponse.json({ error: "Geçersiz ürün." }, { status: 400 });
  }

  const [summary, reviews] = await Promise.all([
    getReviewSummary(productId),
    listVisibleReviews(productId),
  ]);

  return NextResponse.json({ summary, reviews });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(ip, {
    windowMs: 60_000,
    max: 8,
    keyPrefix: "review-create",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const productId =
    typeof (body as { productId?: unknown }).productId === "string"
      ? (body as { productId: string }).productId
      : "";
  const orderNumber =
    typeof (body as { orderNumber?: unknown }).orderNumber === "string"
      ? (body as { orderNumber: string }).orderNumber
      : "";
  const email =
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email
      : "";
  const comment = (body as { comment?: unknown }).comment;
  const rating = (body as { rating?: unknown }).rating;

  try {
    const result = await createVerifiedReview({
      productId,
      orderNumber,
      email,
      rating,
      comment,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: ERROR_MESSAGES[result.error] || result.error },
        { status: result.status }
      );
    }
    const summary = await getReviewSummary(productId.trim());
    return NextResponse.json(
      { review: result.review, summary },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Yorum kaydedilemedi." },
      { status: 500 }
    );
  }
}
