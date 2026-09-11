/** Client-safe TCKN / VKN helpers (no server-only imports). */

export type InvoiceBuyerKind = "individual" | "corporate";

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidTckn(value: string): boolean {
  const v = digitsOnly(value);
  if (!/^[1-9][0-9]{10}$/.test(v)) return false;
  const d = v.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const tenth = (((odd * 7 - even) % 10) + 10) % 10;
  if (tenth !== d[9]) return false;
  const sum10 = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return sum10 % 10 === d[10];
}

export function isValidVkn(value: string): boolean {
  const v = digitsOnly(value);
  if (!/^\d{10}$/.test(v)) return false;
  const digits = v.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const tmp = (digits[i] + (9 - i)) % 10;
    let powered = (tmp * 2 ** (9 - i)) % 9;
    if (tmp !== 0 && powered === 0) powered = 9;
    sum += powered;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === digits[9];
}

/** GİB unidentified-person placeholder — never store as the customer's TCKN. */
export const UNIDENTIFIED_PERSON_TAX_ID = "11111111111";

export function buyerTaxNumberForProviders(taxId?: string | null): string {
  const id = digitsOnly(taxId ?? "");
  if (id.length === 11 || id.length === 10) return id;
  return UNIDENTIFIED_PERSON_TAX_ID;
}

export function normalizeTaxId(
  kind: InvoiceBuyerKind,
  raw: string
): string | null {
  const v = digitsOnly(raw);
  if (!v) return null;
  if (kind === "individual") return isValidTckn(v) ? v : null;
  return isValidVkn(v) ? v : null;
}
