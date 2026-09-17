import { SHIPPING_IMAGE } from "./shipping";

export const COD_FEE_RATE = 0.045;
export const COD_FEE_PRODUCT_ID = "cod-service-fee";

export function hasCodFee(paymentMethod: string | undefined): boolean {
  return paymentMethod === "card_on_delivery";
}

export function isCodFeeProductId(productId: string): boolean {
  return productId === COD_FEE_PRODUCT_ID;
}

export function calculateCodFee(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * COD_FEE_RATE * 100) / 100;
}

export function totalWithCodFee(
  amount: number,
  paymentMethod: string | undefined
): number {
  const fee = hasCodFee(paymentMethod) ? calculateCodFee(amount) : 0;
  return Math.round((amount + fee) * 100) / 100;
}

export function codFeeLine(locale: string, amount: number) {
  return {
    productId: COD_FEE_PRODUCT_ID,
    name:
      locale === "en"
        ? "Cash on delivery service fee (4.5%)"
        : "Kapıda ödeme hizmet bedeli (%4,5)",
    price: amount,
    quantity: 1,
    image: SHIPPING_IMAGE,
    ageLabel: undefined,
  };
}
