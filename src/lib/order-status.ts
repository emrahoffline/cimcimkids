export type OrderStatus =
  | "pending_payment"
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderStatusHistoryEntry = {
  status: OrderStatus;
  at: string;
};

export function parseStatusHistory(raw: unknown): OrderStatusHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: OrderStatusHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.status !== "string" || typeof o.at !== "string") continue;
    out.push({
      status: o.status as OrderStatus,
      at: o.at,
    });
  }
  return out;
}

export function appendStatusHistory(
  history: OrderStatusHistoryEntry[],
  status: OrderStatus,
  at = new Date().toISOString()
): OrderStatusHistoryEntry[] {
  const last = history[history.length - 1];
  if (last?.status === status) return history;
  return [...history, { status, at }];
}

/** Timeline step index for customer tracking UI (0–4). Cancelled → -1. */
export function statusToStep(status: OrderStatus): number {
  switch (status) {
    case "pending_payment":
      return 0;
    case "pending":
    case "confirmed":
      return 1;
    case "preparing":
      return 2;
    case "shipped":
      return 3;
    case "delivered":
      return 4;
    case "cancelled":
      return -1;
    default:
      return 0;
  }
}
