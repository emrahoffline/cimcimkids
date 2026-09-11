export const SHOPPER_EMAIL_KEY = "cimcimkids-shopper-email";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ShopperCartItem = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  colorLabel?: string;
  ageLabel?: string;
};

export type ShopperFavoriteItem = {
  id: string;
  slug: string;
  image: string;
  price: number;
  translationKey?: string;
  name?: string;
};

export type PurchasedProduct = {
  productId: string;
  name: string;
  image: string;
  quantity: number;
  revenue: number;
};

export type CustomerReview = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  orderNumber: string;
  rating: number;
  comment: string;
  images: string[];
  hidden: boolean;
  createdAt: string;
};

export type CustomerProfileOrder = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: { productId: string; name: string; quantity: number; price: number }[];
};

export type CustomerProfile = {
  email: string;
  name: string;
  phone?: string;
  shippingAddress?: string;
  invoiceKind?: "individual" | "corporate";
  taxId?: string;
  taxOffice?: string;
  companyTitle?: string;
  invoiceDistrict?: string;
  invoiceCity?: string;
  account: {
    name: string | null;
    image: string | null;
    createdAt: string;
    lastLoginAt: string;
    orderCount: number;
    totalSpent: number;
  } | null;
  orders: CustomerProfileOrder[];
  purchasedProducts: PurchasedProduct[];
  reviews: CustomerReview[];
  cart: ShopperCartItem[];
  favorites: ShopperFavoriteItem[];
  stats: {
    orderCount: number;
    totalSpent: number;
    cartCount: number;
    favoriteCount: number;
    reviewCount: number;
    reviewAverage: number;
    timeOnSiteSec: number;
    pageViews: number;
    sessions: number;
    lastSeenAt?: string;
    shopperUpdatedAt?: string;
  };
};

export function normalizeShopperEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, 200);
}

export function isValidShopperEmail(value: string): boolean {
  return EMAIL_RE.test(normalizeShopperEmail(value));
}

export function adminCustomerPath(email: string): string {
  return `/admin/customers/${encodeURIComponent(normalizeShopperEmail(email))}`;
}

export function rememberShopperEmail(email: string) {
  if (typeof window === "undefined") return;
  const value = normalizeShopperEmail(email);
  if (!EMAIL_RE.test(value)) return;
  try {
    localStorage.setItem(SHOPPER_EMAIL_KEY, value);
    window.dispatchEvent(new Event("cimcim-shopper-email"));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readRememberedShopperEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    const value = localStorage.getItem(SHOPPER_EMAIL_KEY) ?? "";
    return EMAIL_RE.test(value) ? value : "";
  } catch {
    return "";
  }
}

export function customerTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return `tel:${phone}`;
  let national = digits;
  if (national.startsWith("90") && national.length >= 12) national = national.slice(2);
  if (national.startsWith("0")) national = national.slice(1);
  return `tel:+90${national}`;
}

export function customerWhatsAppHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  let n = digits;
  if (n.startsWith("0")) n = `90${n.slice(1)}`;
  else if (!n.startsWith("90")) n = `90${n}`;
  return `https://wa.me/${n}`;
}

export function formatDurationTr(seconds: number): string {
  const sec = Math.max(0, Math.round(seconds));
  if (sec < 60) return `${sec} sn`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min < 60) return rem > 0 ? `${min} dk ${rem} sn` : `${min} dk`;
  const hr = Math.floor(min / 60);
  const minRem = min % 60;
  if (minRem === 0) return `${hr} sa`;
  return `${hr} sa ${minRem} dk`;
}
