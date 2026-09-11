import { createHash, randomBytes } from "crypto";

/** Stable code derived from product id (for migrations / backfill). */
export function productCodeFromId(id: string): string {
  return `CKP-${createHash("sha256").update(id).digest("hex").slice(0, 8).toUpperCase()}`;
}

/** Random product code, e.g. CKP-A1B2C3D4. */
export function generateProductCode(): string {
  return `CKP-${randomBytes(4).toString("hex").toUpperCase()}`;
}
