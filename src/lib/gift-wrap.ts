/** Identifies historical gift-wrap line items on existing orders. */
export const GIFT_WRAP_PRODUCT_ID = "gift-wrap";

export function isGiftWrapProductId(productId: string): boolean {
  return productId === GIFT_WRAP_PRODUCT_ID;
}
