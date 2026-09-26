export const META_PIXEL_ID = (
  process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "18022194509239771"
).trim();

export function isMetaPixelConfigured(): boolean {
  return /^\d{10,20}$/.test(META_PIXEL_ID);
}

type FbqFn = (...args: unknown[]) => void;

function fbq(): FbqFn | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { fbq?: FbqFn }).fbq;
}

function whenFbqReady(cb: (send: FbqFn) => void): void {
  if (typeof window === "undefined" || !isMetaPixelConfigured()) return;
  const start = Date.now();
  const tick = () => {
    const send = fbq();
    if (send) {
      cb(send);
      return;
    }
    if (Date.now() - start > 10_000) return;
    window.setTimeout(tick, 250);
  };
  tick();
}

export function trackMetaPageView(): void {
  whenFbqReady((send) => {
    send("track", "PageView");
  });
}

export function trackMetaPurchase(input: {
  orderId: string;
  value: number;
  items: { item_id: string; item_name: string; price: number; quantity: number }[];
}): void {
  const orderId = input.orderId.trim();
  if (!orderId) return;
  const sentKey = `cimcim-meta-purchase-sent-${orderId}`;
  try {
    if (sessionStorage.getItem(sentKey) === "1") return;
    sessionStorage.setItem(sentKey, "1");
  } catch {
    /* still send once this page load */
  }
  whenFbqReady((send) => {
    send("track", "Purchase", {
      value: Math.max(0, input.value),
      currency: "TRY",
      content_ids: input.items.map((item) => item.item_id),
      contents: input.items.map((item) => ({
        id: item.item_id,
        quantity: item.quantity,
        item_price: item.price,
      })),
      content_type: "product",
      num_items: input.items.reduce((sum, item) => sum + item.quantity, 0),
    });
  });
}
