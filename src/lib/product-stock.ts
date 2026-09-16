import type { Product } from "./types";
import { canonicalizeAge } from "./product-ages";

export type ProductSizeStock = Record<string, number>;

export function normalizeSizeStock(
  raw: unknown,
  ages: string[]
): ProductSizeStock {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const normalized: ProductSizeStock = {};
  for (const rawAge of ages) {
    const age = canonicalizeAge(rawAge);
    if (!age || age in normalized) continue;
    const value = Number(source[age] ?? source[rawAge] ?? 0);
    normalized[age] =
      Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }
  return normalized;
}

export function sizeStockTotal(sizeStock: ProductSizeStock): number {
  return Object.values(sizeStock).reduce(
    (total, value) => total + Math.max(0, Math.floor(value)),
    0
  );
}

export function hasSizeStock(product: Pick<Product, "sizeStock">): boolean {
  return Object.keys(product.sizeStock ?? {}).length > 0;
}

export function stockForAge(
  product: Pick<Product, "sizeStock" | "stockQuantity">,
  ageLabel?: string | null
): number {
  const entries = product.sizeStock ?? {};
  if (Object.keys(entries).length === 0) {
    return Math.max(0, Math.floor(product.stockQuantity ?? 0));
  }
  const age = canonicalizeAge(ageLabel ?? "");
  return age ? Math.max(0, Math.floor(entries[age] ?? 0)) : 0;
}
