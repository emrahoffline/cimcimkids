export const GA_MEASUREMENT_ID = (
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-XFDECWVB9H"
).trim();

export function isGaConfigured(): boolean {
  return /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID);
}

export type GaPurchaseItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
};

export type GaPurchasePayload = {
  orderId: string;
  value: number;
  items: GaPurchaseItem[];
};

const PURCHASE_STORAGE_KEY = "cimcim-ga-purchase";

type GtagFn = (...args: unknown[]) => void;

function gtag(): GtagFn | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { gtag?: GtagFn }).gtag;
}

function whenGtagReady(cb: (send: GtagFn) => void): void {
  if (typeof window === "undefined" || !isGaConfigured()) return;
  const start = Date.now();
  const tick = () => {
    const send = gtag();
    if (send) {
      cb(send);
      return;
    }
    if (Date.now() - start > 10_000) return;
    window.setTimeout(tick, 250);
  };
  tick();
}

export function saveGaPurchase(input: GaPurchasePayload): void {
  if (typeof window === "undefined") return;
  const orderId = input.orderId.trim();
  if (!orderId) return;
  const payload: GaPurchasePayload = {
    orderId,
    value: Number.isFinite(input.value) ? Math.max(0, input.value) : 0,
    items: input.items.filter(
      (item) => item.item_id && item.item_name && item.quantity > 0
    ),
  };
  try {
    sessionStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

export function readGaPurchase(orderId?: string): GaPurchasePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PURCHASE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GaPurchasePayload>;
    if (typeof parsed.orderId !== "string") return null;
    if (orderId && parsed.orderId !== orderId) return null;
    return {
      orderId: parsed.orderId,
      value: typeof parsed.value === "number" ? parsed.value : 0,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return null;
  }
}

export function trackGaPageView(path: string): void {
  whenGtagReady((send) => {
    send("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    });
  });
}

export function trackGaPurchase(input: GaPurchasePayload): void {
  const orderId = input.orderId.trim();
  if (!orderId) return;
  const sentKey = `cimcim-ga-purchase-sent-${orderId}`;
  try {
    if (sessionStorage.getItem(sentKey) === "1") return;
    sessionStorage.setItem(sentKey, "1");
  } catch {
    /* still send once this page load */
  }
  whenGtagReady((send) => {
    send("event", "purchase", {
      transaction_id: orderId,
      value: Math.max(0, input.value),
      currency: "TRY",
      items: input.items,
    });
  });
}
