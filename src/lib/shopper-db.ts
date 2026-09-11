import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma, requireDatabaseUrl } from "./prisma";
import {
  type CustomerProfile,
  type ShopperCartItem,
  type ShopperFavoriteItem,
  normalizeShopperEmail,
} from "./shopper";

const MAX_ITEMS = 50;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown, max = 400): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function sanitizeShopperCart(value: unknown): ShopperCartItem[] {
  if (!Array.isArray(value)) return [];
  const items: ShopperCartItem[] = [];
  for (const raw of value.slice(0, MAX_ITEMS)) {
    const row = asRecord(raw);
    if (!row) continue;
    const productId = asString(row.productId || row.id, 80);
    if (!productId) continue;
    const quantity = Math.max(1, Math.min(99, Math.floor(asNumber(row.quantity) || 1)));
    items.push({
      id: asString(row.id, 120) || productId,
      productId,
      slug: asString(row.slug, 200),
      name: asString(row.name, 200) || productId,
      image: asString(row.image, 500),
      price: Math.max(0, asNumber(row.price)),
      quantity,
      colorLabel: asString(row.colorLabel, 80) || undefined,
      ageLabel: asString(row.ageLabel, 40) || undefined,
    });
  }
  return items;
}

export function sanitizeShopperFavorites(value: unknown): ShopperFavoriteItem[] {
  if (!Array.isArray(value)) return [];
  const items: ShopperFavoriteItem[] = [];
  const seen = new Set<string>();
  for (const raw of value.slice(0, MAX_ITEMS)) {
    const row = asRecord(raw);
    if (!row) continue;
    const id = asString(row.id, 80);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      slug: asString(row.slug, 200),
      image: asString(row.image, 500),
      price: Math.max(0, asNumber(row.price)),
      translationKey: asString(row.translationKey, 120) || undefined,
      name: asString(row.name, 200) || undefined,
    });
  }
  return items;
}

export async function upsertShopperState(input: {
  email: string;
  cart?: unknown;
  favorites?: unknown;
  visitorId?: string;
}) {
  requireDatabaseUrl();
  const email = normalizeShopperEmail(input.email);
  const visitorId = input.visitorId?.trim().slice(0, 80) || undefined;
  const data: Prisma.ShopperStateUncheckedUpdateInput = {};
  if (input.cart !== undefined) data.cart = sanitizeShopperCart(input.cart);
  if (input.favorites !== undefined) {
    data.favorites = sanitizeShopperFavorites(input.favorites);
  }
  if (visitorId) data.visitorId = visitorId;

  const existing = await prisma.shopperState.findUnique({ where: { email } });
  if (!existing) {
    await prisma.shopperState.create({
      data: {
        email,
        cart: sanitizeShopperCart(input.cart ?? []),
        favorites: sanitizeShopperFavorites(input.favorites ?? []),
        visitorId: visitorId ?? null,
      },
    });
    return;
  }

  if (Object.keys(data).length === 0) return;
  await prisma.shopperState.update({
    where: { email },
    data,
  });
}

export async function getCustomerProfile(
  rawEmail: string
): Promise<CustomerProfile | null> {
  requireDatabaseUrl();
  const email = normalizeShopperEmail(rawEmail);
  if (!email) return null;

  const [account, orderRows, shopper, reviewRows] = await Promise.all([
    prisma.customer.findUnique({ where: { email } }),
    prisma.order.findMany({
      where: { customerEmail: email },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.shopperState.findUnique({ where: { email } }),
    prisma.productReview.findMany({
      where: { customerEmail: email },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!account && orderRows.length === 0 && !shopper) return null;

  const latest = orderRows[0];
  const paidOrders = orderRows.filter((o) => o.status !== "cancelled");

  const purchasedMap = new Map<
    string,
    { name: string; image: string; quantity: number; revenue: number }
  >();
  for (const order of paidOrders) {
    for (const item of order.items) {
      const existing = purchasedMap.get(item.productId) ?? {
        name: item.name,
        image: item.image,
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += item.quantity;
      existing.revenue += item.price * item.quantity;
      if (item.image) existing.image = item.image;
      purchasedMap.set(item.productId, existing);
    }
  }

  const visitorId = shopper?.visitorId ?? undefined;
  let timeOnSiteSec = 0;
  let pageViews = 0;
  let sessions = 0;
  let lastSeenAt: string | undefined;

  if (visitorId) {
    const [visitor, sessionRows] = await Promise.all([
      prisma.analyticsVisitor.findUnique({ where: { id: visitorId } }),
      prisma.analyticsSession.findMany({ where: { visitorId } }),
    ]);
    pageViews = visitor?.pageViews ?? 0;
    sessions = visitor?.sessions ?? sessionRows.length;
    lastSeenAt = visitor?.lastSeenAt.toISOString();
    const now = Date.now();
    for (const row of sessionRows) {
      if (typeof row.durationSec === "number" && row.durationSec > 0) {
        timeOnSiteSec += row.durationSec;
        continue;
      }
      if (!row.endedAt) {
        timeOnSiteSec += Math.min(
          7200,
          Math.max(0, Math.round((now - row.startedAt.getTime()) / 1000))
        );
      }
    }
  }

  const cart = sanitizeShopperCart(shopper?.cart);
  const favorites = sanitizeShopperFavorites(shopper?.favorites);
  const productIds = [
    ...new Set([...favorites.map((i) => i.id), ...cart.map((i) => i.productId)]),
  ].filter(Boolean);
  const products =
    productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, nameTr: true, image: true, slug: true, price: true },
        })
      : [];
  const productById = new Map(products.map((p) => [p.id, p]));
  const favoritesResolved = favorites.map((item) => {
    const product = productById.get(item.id);
    return {
      ...item,
      name: item.name || product?.nameTr || item.slug || item.id,
      image: item.image || product?.image || "",
      slug: item.slug || product?.slug || "",
      price: item.price || product?.price || 0,
    };
  });
  const cartResolved = cart.map((item) => {
    const product = productById.get(item.productId);
    return {
      ...item,
      name: item.name || product?.nameTr || item.productId,
      image: item.image || product?.image || "",
      slug: item.slug || product?.slug || "",
    };
  });

  return {
    email,
    name: latest?.customerName || account?.name || email,
    phone: latest?.customerPhone ?? undefined,
    shippingAddress: latest?.shippingAddress ?? undefined,
    invoiceKind: latest?.invoiceKind,
    taxId: latest?.taxId ?? undefined,
    taxOffice: latest?.taxOffice ?? undefined,
    companyTitle: latest?.companyTitle ?? undefined,
    invoiceDistrict: latest?.invoiceDistrict ?? undefined,
    invoiceCity: latest?.invoiceCity ?? undefined,
    account: account
      ? {
          name: account.name,
          image: account.image,
          createdAt: account.createdAt.toISOString(),
          lastLoginAt: account.lastLoginAt.toISOString(),
          orderCount: account.orderCount,
          totalSpent: account.totalSpent,
        }
      : null,
    orders: orderRows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
    })),
    purchasedProducts: [...purchasedMap.entries()]
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.quantity - a.quantity),
    reviews: reviewRows.map((row) => ({
      id: row.id,
      productId: row.productId,
      productSlug: row.productSlug,
      productName: row.productName,
      orderNumber: row.orderNumber,
      rating: row.rating,
      comment: row.comment,
      images: row.images,
      hidden: row.hidden,
      createdAt: row.createdAt.toISOString(),
    })),
    cart: cartResolved,
    favorites: favoritesResolved,
    stats: {
      orderCount: paidOrders.length,
      totalSpent: paidOrders.reduce((sum, o) => sum + o.total, 0),
      cartCount: cartResolved.reduce((sum, i) => sum + i.quantity, 0),
      favoriteCount: favoritesResolved.length,
      reviewCount: reviewRows.length,
      reviewAverage:
        reviewRows.length > 0
          ? Math.round(
              (reviewRows.reduce((sum, row) => sum + row.rating, 0) /
                reviewRows.length) *
                10
            ) / 10
          : 0,
      timeOnSiteSec,
      pageViews,
      sessions,
      lastSeenAt,
      shopperUpdatedAt: shopper?.updatedAt.toISOString(),
    },
  };
}
