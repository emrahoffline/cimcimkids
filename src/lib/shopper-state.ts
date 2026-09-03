import "server-only";
import { prisma, requireDatabaseUrl } from "./prisma";

export type ShopperCartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  colorLabel?: string;
  ageLabel?: string;
};

export type ShopperFavoriteItem = {
  id: string;
  slug: string;
  image: string;
  price: number;
  name: string;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function money(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function qty(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.min(99, Math.max(1, Math.floor(n)));
}

export function sanitizeCart(raw: unknown): ShopperCartItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ShopperCartItem[] = [];
  for (const row of raw.slice(0, 50)) {
    const r = asRecord(row);
    if (!r) continue;
    const id = str(r.productId) || str(r.id);
    if (!id) continue;
    const item: ShopperCartItem = {
      id,
      slug: str(r.slug),
      name: str(r.name) || str(r.translationKey) || id,
      price: money(r.price),
      image: str(r.image),
      quantity: qty(r.quantity),
    };
    const colorLabel = str(r.colorLabel);
    const ageLabel = str(r.ageLabel);
    if (colorLabel) item.colorLabel = colorLabel;
    if (ageLabel) item.ageLabel = ageLabel;
    out.push(item);
  }
  return out;
}

export function sanitizeFavorites(raw: unknown): ShopperFavoriteItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ShopperFavoriteItem[] = [];
  const seen = new Set<string>();
  for (const row of raw.slice(0, 80)) {
    const r = asRecord(row);
    if (!r) continue;
    const id = str(r.id) || str(r.productId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      slug: str(r.slug),
      image: str(r.image),
      price: money(r.price),
      name: str(r.name) || str(r.translationKey) || id,
    });
  }
  return out;
}

export async function getShopperState(email: string): Promise<{
  cart: ShopperCartItem[];
  favorites: ShopperFavoriteItem[];
  updatedAt?: string;
} | null> {
  requireDatabaseUrl();
  const row = await prisma.shopperState.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!row) return null;
  return {
    cart: sanitizeCart(row.cart),
    favorites: sanitizeFavorites(row.favorites),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertShopperState(data: {
  email: string;
  cart?: unknown;
  favorites?: unknown;
}): Promise<void> {
  requireDatabaseUrl();
  const email = data.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return;

  const existing = await prisma.shopperState.findUnique({ where: { email } });
  const cart =
    data.cart !== undefined
      ? sanitizeCart(data.cart)
      : existing
        ? sanitizeCart(existing.cart)
        : [];
  const favorites =
    data.favorites !== undefined
      ? sanitizeFavorites(data.favorites)
      : existing
        ? sanitizeFavorites(existing.favorites)
        : [];

  await prisma.shopperState.upsert({
    where: { email },
    create: {
      email,
      cart: cart as object[],
      favorites: favorites as object[],
    },
    update: {
      cart: cart as object[],
      favorites: favorites as object[],
    },
  });
}
