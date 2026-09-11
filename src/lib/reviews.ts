import { isGiftCardProductId } from "./gift-cards";
import { isGiftWrapProductId } from "./gift-wrap";
import { isShippingProductId } from "./shipping";

export const REVIEW_COMMENT_MAX = 800;
export const REVIEW_COMMENT_MIN = 10;
export const REVIEW_NAME_MAX = 80;
export const REVIEW_IMAGE_MAX = 3;
export const REVIEW_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const REVIEWABLE_ORDER_STATUSES = [
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
] as const;

export type ReviewableOrderStatus = (typeof REVIEWABLE_ORDER_STATUSES)[number];

export type ReviewSummary = {
  average: number;
  count: number;
};

export type PublicReview = {
  id: string;
  rating: number;
  comment: string;
  images: string[];
  displayName: string;
  createdAt: string;
};

export type AdminReview = PublicReview & {
  productId: string;
  productSlug: string;
  productName: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  hidden: boolean;
};

export function isReviewableProductId(productId: string): boolean {
  return (
    Boolean(productId) &&
    !isGiftCardProductId(productId) &&
    !isShippingProductId(productId) &&
    !isGiftWrapProductId(productId)
  );
}

export function isReviewableOrderStatus(status: string): boolean {
  return (REVIEWABLE_ORDER_STATUSES as readonly string[]).includes(status);
}

export function clampRating(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  if (i < 1 || i > 5) return null;
  return i;
}

export function sanitizeReviewComment(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, REVIEW_COMMENT_MAX);
}

export function sanitizeReviewImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    if (!/^\/products\/uploads\/reviews\/[a-zA-Z0-9._-]+$/.test(item)) continue;
    out.push(item);
    if (out.length >= REVIEW_IMAGE_MAX) break;
  }
  return out;
}

export function publicReviewerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Müşteri";
  if (parts.length === 1) {
    return parts[0].slice(0, REVIEW_NAME_MAX);
  }
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].slice(0, 1);
  return `${first} ${lastInitial}.`.slice(0, REVIEW_NAME_MAX);
}

export function roundAverage(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 10) / 10;
}
