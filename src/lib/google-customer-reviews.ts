export const GOOGLE_MERCHANT_ID = Number(
  process.env.NEXT_PUBLIC_GOOGLE_MERCHANT_ID ?? "5844059915"
);

const GCR_STORAGE_KEY = "cimcim-gcr-optin";

export type GcrOptInPayload = {
  orderId: string;
  email: string;
  estimatedDeliveryDate: string;
};

export function estimatedDeliveryDate(daysAhead = 5): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function saveGcrOptIn(input: { orderId: string; email: string }): void {
  if (typeof window === "undefined") return;
  const orderId = input.orderId.trim();
  const email = input.email.trim().toLowerCase();
  if (!orderId || !email.includes("@")) return;
  const payload: GcrOptInPayload = {
    orderId,
    email,
    estimatedDeliveryDate: estimatedDeliveryDate(),
  };
  try {
    sessionStorage.setItem(GCR_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

export function readGcrOptIn(orderId?: string): GcrOptInPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(GCR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GcrOptInPayload>;
    if (
      typeof parsed.orderId !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.estimatedDeliveryDate !== "string"
    ) {
      return null;
    }
    if (orderId && parsed.orderId !== orderId) return null;
    return {
      orderId: parsed.orderId,
      email: parsed.email,
      estimatedDeliveryDate: parsed.estimatedDeliveryDate,
    };
  } catch {
    return null;
  }
}
