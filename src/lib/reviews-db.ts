import "server-only";
import type { ProductReview as DbProductReview, OrderStatus } from "@prisma/client";
import { prisma, requireDatabaseUrl, hasDatabaseUrl, isNextBuild } from "./prisma";
import { getProductById } from "./products-server";
import {
  clampRating,
  isReviewableOrderStatus,
  isReviewableProductId,
  publicReviewerName,
  roundAverage,
  sanitizeReviewComment,
  type AdminReview,
  type PublicReview,
  type ReviewSummary,
} from "./reviews";
import { normalizeShopperEmail, isValidShopperEmail } from "./shopper";

export type { AdminReview, PublicReview, ReviewSummary };

function emptyDb() {
  if (!hasDatabaseUrl()) {
    if (isNextBuild()) return true;
    requireDatabaseUrl();
  }
  return false;
}

function mapPublic(row: DbProductReview): PublicReview {
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    displayName: publicReviewerName(row.customerName),
    createdAt: row.createdAt.toISOString(),
  };
}

function mapAdmin(row: DbProductReview): AdminReview {
  return {
    ...mapPublic(row),
    productId: row.productId,
    productSlug: row.productSlug,
    productName: row.productName,
    orderNumber: row.orderNumber,
    customerEmail: row.customerEmail,
    customerName: row.customerName,
    hidden: row.hidden,
  };
}

export async function getReviewSummary(
  productId: string
): Promise<ReviewSummary> {
  if (emptyDb()) return { average: 0, count: 0 };
  const agg = await prisma.productReview.aggregate({
    where: { productId, hidden: false },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const count = agg._count._all;
  return {
    average: count ? roundAverage(agg._avg.rating ?? 0) : 0,
    count,
  };
}

export async function getReviewSummaries(
  productIds: string[]
): Promise<Record<string, ReviewSummary>> {
  const ids = [...new Set(productIds.filter(Boolean))];
  const out: Record<string, ReviewSummary> = {};
  for (const id of ids) out[id] = { average: 0, count: 0 };
  if (!ids.length || emptyDb()) return out;

  const rows = await prisma.productReview.groupBy({
    by: ["productId"],
    where: { productId: { in: ids }, hidden: false },
    _avg: { rating: true },
    _count: { _all: true },
  });
  for (const row of rows) {
    out[row.productId] = {
      average: roundAverage(row._avg.rating ?? 0),
      count: row._count._all,
    };
  }
  return out;
}

export async function listVisibleReviews(
  productId: string
): Promise<PublicReview[]> {
  if (emptyDb()) return [];
  const rows = await prisma.productReview.findMany({
    where: { productId, hidden: false },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return rows.map(mapPublic);
}

export async function listAdminReviews(): Promise<AdminReview[]> {
  if (emptyDb()) return [];
  const rows = await prisma.productReview.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return rows.map(mapAdmin);
}

export async function setReviewHidden(
  id: string,
  hidden: boolean
): Promise<AdminReview | null> {
  requireDatabaseUrl();
  try {
    const row = await prisma.productReview.update({
      where: { id },
      data: { hidden },
    });
    return mapAdmin(row);
  } catch {
    return null;
  }
}

export async function deleteReview(id: string): Promise<boolean> {
  requireDatabaseUrl();
  try {
    await prisma.productReview.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function createVerifiedReview(input: {
  productId: string;
  orderNumber: string;
  email: string;
  rating: unknown;
  comment?: unknown;
}): Promise<
  | { ok: true; review: PublicReview }
  | { ok: false; error: string; status: number }
> {
  requireDatabaseUrl();

  const productId = input.productId.trim();
  if (!isReviewableProductId(productId)) {
    return { ok: false, error: "INVALID_PRODUCT", status: 400 };
  }

  const rating = clampRating(input.rating);
  if (rating == null) {
    return { ok: false, error: "INVALID_RATING", status: 400 };
  }

  const email = normalizeShopperEmail(input.email);
  if (!isValidShopperEmail(email)) {
    return { ok: false, error: "INVALID_EMAIL", status: 400 };
  }

  const orderNumber = input.orderNumber.trim().toUpperCase().slice(0, 40);
  if (!orderNumber) {
    return { ok: false, error: "INVALID_ORDER", status: 400 };
  }

  const comment = sanitizeReviewComment(input.comment);
  if (comment && comment.length < 10) {
    return { ok: false, error: "COMMENT_TOO_SHORT", status: 400 };
  }

  const product = await getProductById(productId);
  if (!product) {
    return { ok: false, error: "PRODUCT_NOT_FOUND", status: 404 };
  }

  const order = await prisma.order.findFirst({
    where: {
      orderNumber: { equals: orderNumber, mode: "insensitive" },
      customerEmail: email,
    },
    include: { items: true },
  });

  if (!order) {
    return { ok: false, error: "ORDER_NOT_FOUND", status: 404 };
  }
  if (!isReviewableOrderStatus(order.status as OrderStatus | string)) {
    return { ok: false, error: "ORDER_NOT_ELIGIBLE", status: 400 };
  }

  const purchased = order.items.some(
    (item) => item.productId === productId && isReviewableProductId(item.productId)
  );
  if (!purchased) {
    return { ok: false, error: "PRODUCT_NOT_IN_ORDER", status: 400 };
  }

  const existing = await prisma.productReview.findUnique({
    where: {
      productId_customerEmail: { productId, customerEmail: email },
    },
  });
  if (existing) {
    return { ok: false, error: "ALREADY_REVIEWED", status: 409 };
  }

  try {
    const row = await prisma.productReview.create({
      data: {
        productId,
        productSlug: product.slug,
        productName: product.nameTr || product.nameEn,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerEmail: email,
        customerName: order.customerName.slice(0, 80),
        rating,
        comment,
      },
    });
    return { ok: true, review: mapPublic(row) };
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    if (code === "P2002") {
      return { ok: false, error: "ALREADY_REVIEWED", status: 409 };
    }
    throw err;
  }
}
