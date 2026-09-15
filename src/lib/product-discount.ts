import type { Product } from "./types";
import { roundLira } from "./product-utils";

/** Sale price shown and charged after a discount (nearest whole TRY). */
export function roundedSalePrice(
  product: Pick<Product, "price" | "compareAtPrice">
): number {
  if (
    typeof product.compareAtPrice === "number" &&
    Number.isFinite(product.compareAtPrice) &&
    product.compareAtPrice > product.price
  ) {
    return roundLira(product.price);
  }
  return product.price;
}

/** Base price used for discount math (original if already on sale). */
export function getDiscountBasePrice(product: Product): number {
  if (
    typeof product.compareAtPrice === "number" &&
    Number.isFinite(product.compareAtPrice) &&
    product.compareAtPrice > 0
  ) {
    return product.compareAtPrice;
  }
  return product.price;
}

export function applyPercentDiscount(
  product: Product,
  percent: number
): Pick<Product, "price" | "compareAtPrice"> {
  const pct = Math.min(100, Math.max(0, percent));
  const base = getDiscountBasePrice(product);
  const price = roundLira(base * (1 - pct / 100));
  return {
    compareAtPrice: base,
    price: Math.max(0, price),
  };
}

export function applyAmountDiscount(
  product: Product,
  amount: number
): Pick<Product, "price" | "compareAtPrice"> {
  const cut = Math.max(0, amount);
  const base = getDiscountBasePrice(product);
  return {
    compareAtPrice: base,
    price: Math.max(0, roundLira(base - cut)),
  };
}

export function clearDiscount(
  product: Product
): Pick<Product, "price" | "compareAtPrice"> {
  const restored =
    typeof product.compareAtPrice === "number" &&
    Number.isFinite(product.compareAtPrice)
      ? product.compareAtPrice
      : product.price;
  return {
    price: restored,
    compareAtPrice: null,
  };
}
