export const STORE_CONFIG = {
  iban: process.env.NEXT_PUBLIC_IBAN ?? "TR590006701000000208433897",
  accountHolder:
    process.env.NEXT_PUBLIC_ACCOUNT_HOLDER ?? "Nuriye Kostak",
  bankName: process.env.NEXT_PUBLIC_BANK_NAME ?? "Yapı Kredi",
  /** E.164 without + for wa.me links */
  whatsappPhone:
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "905337007318",
  /** Physical merchandise total (TRY) at/above which shipping is free */
  freeShippingMin: Number(process.env.NEXT_PUBLIC_FREE_SHIPPING_MIN ?? 1500),
  /** Flat shipping charged below the free-shipping threshold (TRY, VAT included) */
  shippingFee: (() => {
    const n = Number(process.env.NEXT_PUBLIC_SHIPPING_FEE ?? 119);
    return Number.isFinite(n) && n >= 0 ? n : 119;
  })(),
  instagramUrl:
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ??
    "https://www.instagram.com/cimcimkids/",
  instagramHandle: "@cimcimkids",
  trendyolUrl:
    process.env.NEXT_PUBLIC_TRENDYOL_URL ?? "https://ty.gl/cen90bphjnv69",
  hepsiburadaUrl:
    process.env.NEXT_PUBLIC_HEPSIBURADA_URL ??
    "https://www.hepsiburada.com/magaza/cimcimkids",
  facebookUrl:
    process.env.NEXT_PUBLIC_FACEBOOK_URL ??
    "https://www.facebook.com/cimcimkids",
} as const;

export function formatIban(iban: string) {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

export function isFreeShipping(subtotal: number) {
  return subtotal >= STORE_CONFIG.freeShippingMin;
}

export function amountUntilFreeShipping(subtotal: number) {
  return Math.max(0, STORE_CONFIG.freeShippingMin - subtotal);
}

/** Shipping charged to the customer. 0 when there is nothing physical to ship or the threshold is met. */
export function getShippingFee(physicalSubtotal: number) {
  if (physicalSubtotal <= 0) return 0;
  if (isFreeShipping(physicalSubtotal)) return 0;
  const fee = STORE_CONFIG.shippingFee;
  return Number.isFinite(fee) && fee > 0 ? fee : 0;
}

export function getWhatsAppUrl(prefilledText?: string) {
  const base = `https://wa.me/${STORE_CONFIG.whatsappPhone}`;
  if (!prefilledText?.trim()) return base;
  return `${base}?text=${encodeURIComponent(prefilledText.trim())}`;
}
