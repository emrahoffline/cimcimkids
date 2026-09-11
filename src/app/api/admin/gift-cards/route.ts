import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import {
  createAdminGiftCard,
  getGiftCards,
  updateGiftCardStatus,
} from "@/lib/gift-cards-db";
import {
  GIFT_CARD_MAX_AMOUNT,
  GIFT_CARD_MIN_AMOUNT,
} from "@/lib/gift-cards";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const cards = await getGiftCards();
  return NextResponse.json(cards);
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const amount = Number((body as { amount?: unknown }).amount);
  if (
    !Number.isFinite(amount) ||
    amount < GIFT_CARD_MIN_AMOUNT ||
    amount > GIFT_CARD_MAX_AMOUNT
  ) {
    return NextResponse.json(
      {
        error: `Tutar ${GIFT_CARD_MIN_AMOUNT}–${GIFT_CARD_MAX_AMOUNT} TL arasında olmalı.`,
      },
      { status: 400 }
    );
  }

  try {
    const card = await createAdminGiftCard({
      amount,
      recipientEmail:
        typeof (body as { recipientEmail?: unknown }).recipientEmail === "string"
          ? (body as { recipientEmail: string }).recipientEmail
          : undefined,
      recipientName:
        typeof (body as { recipientName?: unknown }).recipientName === "string"
          ? (body as { recipientName: string }).recipientName
          : undefined,
      message:
        typeof (body as { message?: unknown }).message === "string"
          ? (body as { message: string }).message
          : undefined,
    });
    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Oluşturulamadı." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const id =
    body && typeof body === "object" && typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id
      : "";
  const status =
    body && typeof body === "object" && typeof (body as { status?: unknown }).status === "string"
      ? (body as { status: string }).status
      : "";

  if (!id || !["active", "void", "exhausted"].includes(status)) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const updated = await updateGiftCardStatus(
    id,
    status as "active" | "void" | "exhausted"
  );
  if (!updated) {
    return NextResponse.json({ error: "Kart bulunamadı." }, { status: 404 });
  }
  return NextResponse.json(updated);
}
