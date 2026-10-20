import type { Product, ProductColor } from "./types";
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

export function colorHasSizeStock(
  color: Pick<ProductColor, "sizeStock"> | undefined
): boolean {
  return !!color?.sizeStock && Object.keys(color.sizeStock).length > 0;
}

export function colorStockTotal(
  colors: Pick<ProductColor, "stock" | "sizeStock">[]
): number {
  return colors.reduce((total, color) => {
    if (colorHasSizeStock(color)) return total + sizeStockTotal(color.sizeStock ?? {});
    const value = Number(color.stock ?? 0);
    return (
      total + (Number.isFinite(value) && value > 0 ? Math.floor(value) : 0)
    );
  }, 0);
}

/** Keep per-size color quantities on the product's current ages. */
export function alignColorSizeStock(
  colors: ProductColor[],
  ages: string[]
): ProductColor[] {
  if (ages.length === 0) return colors;
  return colors.map((color) => {
    if (!colorHasSizeStock(color)) return color;
    const sizeStock = normalizeSizeStock(color.sizeStock, ages);
    return { ...color, sizeStock, stock: sizeStockTotal(sizeStock) };
  });
}

/** True once every color has its own stock count saved. */
export function hasColorStock(
  colors: Pick<ProductColor, "stock">[] | undefined
): boolean {
  return !!colors && colors.length > 0 && colors.every((color) => typeof color.stock === "number");
}

export function usesColorStock(
  product: Pick<Product, "colors">
): boolean {
  return hasColorStock(product.colors);
}

export function findProductColor(
  product: Pick<Product, "colors">,
  colorId?: string | null,
  colorLabel?: string | null
): ProductColor | undefined {
  const colors = product.colors ?? [];
  if (colorId) {
    const byId = colors.find((color) => color.id === colorId);
    if (byId) return byId;
  }
  const label = colorLabel?.trim();
  if (!label) return undefined;
  return colors.find(
    (color) => color.labelTr === label || color.labelEn === label
  );
}

export type VariantStockScope = "color" | "size" | "color-size";

export function variantStockScope(
  product: Pick<Product, "colors">,
  colorId?: string | null,
  colorLabel?: string | null
): VariantStockScope {
  const color = findProductColor(product, colorId, colorLabel);
  if (colorHasSizeStock(color)) return "color-size";
  if (usesColorStock(product)) return "color";
  return "size";
}

export function stockForVariant(
  product: Pick<Product, "colors" | "sizeStock" | "stockQuantity">,
  ageLabel?: string | null,
  colorId?: string | null,
  colorLabel?: string | null
): number {
  const color = findProductColor(product, colorId, colorLabel);
  if (colorHasSizeStock(color)) {
    const age = canonicalizeAge(ageLabel ?? "");
    return age ? Math.max(0, Math.floor(color?.sizeStock?.[age] ?? 0)) : 0;
  }
  if (usesColorStock(product)) {
    return Math.max(0, Math.floor(color?.stock ?? 0));
  }
  return stockForAge(product, ageLabel);
}
