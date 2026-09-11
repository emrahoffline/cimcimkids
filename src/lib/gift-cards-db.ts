import "server-only";
import { randomBytes } from "crypto";
import type { GiftCard as DbGiftCard, GiftCardStatus } from "@prisma/client";
import { prisma, requireDatabaseUrl, hasDatabaseUrl, isNextBuild } from "./prisma";
import {
  normalizeGiftCardCode,
  type GiftCardRecord,
} from "./gift-cards";

export type { GiftCardRecord };

function mapGiftCard(g: DbGiftCard): GiftCardRecord {
  return {
    id: g.id,
    code: g.code,
    initialBalance: g.initialBalance,
    remainingBalance: g.remainingBalance,
    status: g.status,
    recipientEmail: g.recipientEmail,
    recipientName: g.recipientName,
    message: g.message,
    purchasedOrderId: g.purchasedOrderId,
    createdByAdmin: g.createdByAdmin,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

export function generateGiftCardCode(): string {
  return `CKG-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function getGiftCards(): Promise<GiftCardRecord[]> {
  if (!hasDatabaseUrl()) {
    if (isNextBuild()) return [];
    requireDatabaseUrl();
  }
  const rows = await prisma.giftCard.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapGiftCard);
}

export async function getGiftCardByCode(
  code: string
): Promise<GiftCardRecord | null> {
  requireDatabaseUrl();
  const row = await prisma.giftCard.findUnique({
    where: { code: normalizeGiftCardCode(code) },
  });
  return row ? mapGiftCard(row) : null;
}

export async function createAdminGiftCard(data: {
  amount: number;
  recipientEmail?: string;
  recipientName?: string;
  message?: string;
}): Promise<GiftCardRecord> {
  requireDatabaseUrl();
  const amount = Math.round(data.amount);
  if (!Number.isFinite(amount) || amount < 100 || amount > 10000) {
    throw new Error("Geçersiz tutar");
  }

  let code = generateGiftCardCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.giftCard.findUnique({ where: { code } });
    if (!exists) break;
    code = generateGiftCardCode();
  }

  const created = await prisma.giftCard.create({
    data: {
      id: `gc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      code,
      initialBalance: amount,
      remainingBalance: amount,
      status: "active",
      recipientEmail: data.recipientEmail?.trim().toLowerCase() || null,
      recipientName: data.recipientName?.trim() || null,
      message: data.message?.trim().slice(0, 300) || null,
      createdByAdmin: true,
    },
  });
  return mapGiftCard(created);
}

export async function updateGiftCardStatus(
  id: string,
  status: GiftCardStatus
): Promise<GiftCardRecord | null> {
  requireDatabaseUrl();
  try {
    const updated = await prisma.giftCard.update({
      where: { id },
      data: { status },
    });
    return mapGiftCard(updated);
  } catch {
    return null;
  }
}

/** Activate pending gift cards purchased in an order (after payment confirmed). */
export async function activateGiftCardsForOrder(
  orderId: string
): Promise<GiftCardRecord[]> {
  requireDatabaseUrl();
  const result = await prisma.giftCard.updateMany({
    where: { purchasedOrderId: orderId, status: "pending_payment" },
    data: { status: "active" },
  });
  if (result.count === 0) return [];
  const rows = await prisma.giftCard.findMany({
    where: { purchasedOrderId: orderId },
  });
  return rows.map(mapGiftCard);
}

/** Refund gift card balance when an order that used a gift card is cancelled. */
export async function refundGiftCardForOrder(orderId: string): Promise<void> {
  requireDatabaseUrl();
  await prisma.$transaction(async (tx) => {
    const redemptions = await tx.giftCardRedemption.findMany({
      where: { orderId },
    });
    for (const r of redemptions) {
      const card = await tx.giftCard.findUnique({ where: { id: r.giftCardId } });
      if (!card) continue;
      const nextBalance = card.remainingBalance + r.amount;
      await tx.giftCard.update({
        where: { id: card.id },
        data: {
          remainingBalance: nextBalance,
          status:
            card.status === "void"
              ? "void"
              : nextBalance > 0
                ? "active"
                : "exhausted",
        },
      });
      await tx.giftCardRedemption.delete({ where: { id: r.id } });
    }
  });
}

export async function getGiftCardsForOrder(
  orderId: string
): Promise<GiftCardRecord[]> {
  requireDatabaseUrl();
  const rows = await prisma.giftCard.findMany({
    where: { purchasedOrderId: orderId },
  });
  return rows.map(mapGiftCard);
}
