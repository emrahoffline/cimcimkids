/** Client-safe customer shipping helpers. */

export const SHIPPING_PRODUCT_ID = "shipping";
export const SHIPPING_IMAGE = "/images/shipping.svg";

export function isShippingProductId(productId: string): boolean {
  return productId === SHIPPING_PRODUCT_ID;
}

export function shippingLine(
  locale: string = "tr",
  amount: number
): {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
} {
  return {
    productId: SHIPPING_PRODUCT_ID,
    name: locale === "en" ? "Shipping" : "Kargo",
    price: amount,
    quantity: 1,
    image: SHIPPING_IMAGE,
  };
}
