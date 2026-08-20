import type { Product } from "./types";

export function getProductName(product: Product, locale: string) {
  if (locale === "tr") return product.nameTr;
  return product.nameEn?.trim() || product.nameTr;
}

export function getProductDesc(product: Product, locale: string) {
  if (locale === "tr") return product.descTr;
  return product.descEn?.trim() || product.descTr;
}

export function formatPrice(price: number, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(price);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
