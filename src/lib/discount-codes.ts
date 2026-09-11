/** Client-safe discount code helpers (no server-only imports). */

export type DiscountKind = "percent" | "amount";

export type DiscountCodeRecord = {
  id: string;
  code: string;
  kind: DiscountKind;
  value: number;
  minSubtotal: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function normalizeDiscountCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidDiscountCodeFormat(code: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]{2,23}$/.test(code);
}

export function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeDiscountAmount(
  eligibleSubtotal: number,
  kind: DiscountKind,
  value: number,
  minSubtotal = 0
): number {
  const base = roundMoney(eligibleSubtotal);
  if (base <= 0) return 0;
  if (minSubtotal > 0 && base < minSubtotal) return 0;
  const amount =
    kind === "percent"
      ? base * (Math.min(100, Math.max(0, value)) / 100)
      : Math.max(0, value);
  return Math.min(base, roundMoney(amount));
}

export function isDiscountCodeCurrentlyValid(
  row: Pick<
    DiscountCodeRecord,
    "active" | "startsAt" | "expiresAt" | "maxUses" | "usedCount"
  >,
  now = Date.now()
): boolean {
  if (!row.active) return false;
  if (row.startsAt) {
    const start = Date.parse(row.startsAt);
    if (Number.isFinite(start) && now < start) return false;
  }
  if (row.expiresAt) {
    const end = Date.parse(row.expiresAt);
    if (Number.isFinite(end) && now > end) return false;
  }
  if (row.maxUses != null && row.usedCount >= row.maxUses) return false;
  return true;
}
