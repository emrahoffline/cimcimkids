import type { ProductColor } from "./types";
import { canonicalizeAge } from "./product-ages";

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const IMAGE_RE = /^\/products\/(?:uploads\/)?[a-zA-Z0-9._-]+$/;

export function isValidProductImagePath(src: unknown): src is string {
  return typeof src === "string" && IMAGE_RE.test(src);
}

export function normalizeProductImages(
  images: unknown,
  fallbackImage?: unknown
): string[] {
  const list: string[] = [];
  if (Array.isArray(images)) {
    for (const item of images) {
      if (isValidProductImagePath(item) && !list.includes(item)) {
        list.push(item);
      }
    }
  }
  if (list.length === 0 && isValidProductImagePath(fallbackImage)) {
    list.push(fallbackImage);
  }
  return list;
}

export function parseProductColors(raw: unknown): ProductColor[] {
  if (!Array.isArray(raw)) return [];
  const colors: ProductColor[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const labelTr =
      typeof o.labelTr === "string" ? o.labelTr.trim().slice(0, 40) : "";
    const labelEn =
      typeof o.labelEn === "string"
        ? o.labelEn.trim().slice(0, 40)
        : labelTr;
    if (!labelTr) continue;
    const hex =
      typeof o.hex === "string" && HEX_RE.test(o.hex.trim())
        ? o.hex.trim()
        : "#cccccc";
    const id =
      typeof o.id === "string" && o.id.trim()
        ? o.id.trim().slice(0, 40)
        : slugColorId(labelTr);
    const sizeStock = parseColorSizeStock(o.sizeStock);
    const stock = sizeStock
      ? Object.values(sizeStock).reduce((total, qty) => total + qty, 0)
      : parseColorStock(o.stock);
    colors.push({
      id,
      labelTr,
      labelEn: labelEn || labelTr,
      hex,
      ...(stock === undefined ? {} : { stock }),
      ...(sizeStock ? { sizeStock } : {}),
    });
  }
  return colors.slice(0, 20);
}

function parseColorSizeStock(
  raw: unknown
): Record<string, number> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const sizeStock: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const age = canonicalizeAge(key);
    if (!age) continue;
    const qty = parseColorStock(value);
    if (qty === undefined) continue;
    sizeStock[age] = qty;
  }
  return Object.keys(sizeStock).length > 0 ? sizeStock : undefined;
}

export function parseColorStock(value: unknown): number | undefined {
  const numeric = typeof value === "number" ? value : Number(value);
  if (typeof value === "string" && value.trim() === "") return undefined;
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(0, Math.min(99999, Math.floor(numeric)));
}

export function slugColorId(label: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || `color-${Date.now()}`
  );
}

/** Suggested color presets for admin UI. */
export const COLOR_PRESETS: { labelTr: string; labelEn: string; hex: string }[] =
  [
    { labelTr: "Pembe", labelEn: "Pink", hex: "#f8a5c2" },
    { labelTr: "Mavi", labelEn: "Blue", hex: "#74b9ff" },
    { labelTr: "Beyaz", labelEn: "White", hex: "#f5f5f5" },
    { labelTr: "Siyah", labelEn: "Black", hex: "#2d3436" },
    { labelTr: "Kırmızı", labelEn: "Red", hex: "#e17055" },
    { labelTr: "Sarı", labelEn: "Yellow", hex: "#ffeaa7" },
    { labelTr: "Yeşil", labelEn: "Green", hex: "#55efc4" },
    { labelTr: "Mor", labelEn: "Purple", hex: "#a29bfe" },
    { labelTr: "Bej", labelEn: "Beige", hex: "#dfd3c3" },
    { labelTr: "Gri", labelEn: "Grey", hex: "#b2bec3" },
  ];
