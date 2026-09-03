export const GIFT_WRAP_PRICE = 10;
export const GIFT_WRAP_PRODUCT_ID = "giftwrap";
export const GIFT_WRAP_IMAGE = "/images/gift-wrap.svg";
export const GIFT_WRAP_NOTE_MAX = 400;

export function isGiftWrapProductId(productId: string): boolean {
  return productId === GIFT_WRAP_PRODUCT_ID;
}

export function giftWrapAmount(enabled: boolean): number {
  return enabled ? GIFT_WRAP_PRICE : 0;
}

export function parseGiftNote(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, GIFT_WRAP_NOTE_MAX);
}

export function giftWrapItemName(locale: "tr" | "en" = "tr"): string {
  return locale === "en" ? "Gift wrap" : "Hediye Paketi";
}

export function giftWrapOrderItem(locale: "tr" | "en" = "tr") {
  return {
    productId: GIFT_WRAP_PRODUCT_ID,
    name: giftWrapItemName(locale),
    price: GIFT_WRAP_PRICE,
    quantity: 1,
    image: GIFT_WRAP_IMAGE,
  };
}

export function appendGiftWrapToAddress(address: string, note: string): string {
  const lines = [address, "Hediye paketi: Evet"];
  if (note) lines.push(`Hediye notu: ${note}`);
  return lines.join("\n");
}
