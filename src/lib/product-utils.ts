import type { Product } from "./types";

export function getProductName(product: Product, locale: string) {
  return locale === "tr" ? product.nameTr : product.nameEn;
}

export function getProductDesc(product: Product, locale: string) {
  return locale === "tr" ? product.descTr : product.descEn;
}

export function formatPrice(price: number, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/** Storefront and admin prices are whole lira (no kuruş). */
export function roundLira(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
