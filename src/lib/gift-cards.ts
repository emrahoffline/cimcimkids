/** Client-safe gift card helpers (no server-only imports). */

export type GiftCardRecord = {
  id: string;
  code: string;
  initialBalance: number;
  remainingBalance: number;
  status: "pending_payment" | "active" | "exhausted" | "void";
  recipientEmail: string | null;
  recipientName: string | null;
  message: string | null;
  purchasedOrderId: string | null;
  createdByAdmin: boolean;
  createdAt: string;
  updatedAt: string;
};

export const GIFT_CARD_PRODUCT_PREFIX = "giftcard:";

export const GIFT_CARD_DENOMINATIONS = [250, 500, 750, 1000, 1500, 2000] as const;

export const GIFT_CARD_MIN_AMOUNT = 100;
export const GIFT_CARD_MAX_AMOUNT = 10000;

export const GIFT_CARD_IMAGE = "/images/gift-card.svg";

export function isGiftCardProductId(productId: string): boolean {
  return productId.startsWith(GIFT_CARD_PRODUCT_PREFIX);
}

export function parseGiftCardAmount(productId: string): number | null {
  if (!isGiftCardProductId(productId)) return null;
  const n = Number(productId.slice(GIFT_CARD_PRODUCT_PREFIX.length));
  if (!Number.isFinite(n) || n < GIFT_CARD_MIN_AMOUNT || n > GIFT_CARD_MAX_AMOUNT) {
    return null;
  }
  return Math.round(n);
}

export function giftCardProductId(amount: number): string {
  return `${GIFT_CARD_PRODUCT_PREFIX}${Math.round(amount)}`;
}

export function normalizeGiftCardCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function giftCardAppliedAmount(
  cartSubtotal: number,
  remainingBalance: number
): number {
  if (cartSubtotal <= 0 || remainingBalance <= 0) return 0;
  return Math.min(cartSubtotal, remainingBalance);
}

export function payableTotal(cartSubtotal: number, giftApplied: number): number {
  return Math.max(0, Math.round((cartSubtotal - giftApplied) * 100) / 100);
}
