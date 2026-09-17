import "server-only";
import type { Prisma } from "@prisma/client";
import { isGiftCardProductId } from "./gift-cards";
import { isGiftWrapProductId } from "./gift-wrap";
import { prisma, requireDatabaseUrl } from "./prisma";
import { isShippingProductId } from "./shipping";
import { isCodFeeProductId } from "./cod-fee";
import { sendPendingStockNotifications } from "./stock-notifications";

export class OrderStockError extends Error {
  constructor(
    message: string,
    readonly productId?: string
  ) {
    super(message);
    this.name = "OrderStockError";
  }
}

function isPhysicalProduct(productId: string) {
  return (
    !isGiftCardProductId(productId) &&
    !isGiftWrapProductId(productId) &&
    !isShippingProductId(productId) &&
    !isCodFeeProductId(productId)
  );
}

function quantitiesByProduct(
  items: { productId: string; ageLabel: string | null; quantity: number }[]
) {
  const quantities = new Map<
    string,
    { productId: string; ageLabel: string | null; quantity: number }
  >();
  for (const item of items) {
    if (!isPhysicalProduct(item.productId)) continue;
    const key = `${item.productId}::${item.ageLabel ?? "-"}`;
    const current = quantities.get(key);
    quantities.set(key, {
      productId: item.productId,
      ageLabel: item.ageLabel,
      quantity: (current?.quantity ?? 0) + item.quantity,
    });
  }
  return [...quantities.values()];
}

async function syncProductTotal(
  tx: Prisma.TransactionClient,
  productId: string
) {
  const aggregate = await tx.productSizeStock.aggregate({
    where: { productId },
    _sum: { stockQuantity: true },
    _count: true,
  });
  if (aggregate._count === 0) return;
  const total = aggregate._sum.stockQuantity ?? 0;
  await tx.product.update({
    where: { id: productId },
    data: { stockQuantity: total, inStock: total > 0 },
  });
}

/** Deduct each order's stock once, even if a payment callback is repeated. */
export async function deductOrderStock(orderId: string): Promise<boolean> {
  requireDatabaseUrl();
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, stockDeductedAt: null },
      data: { stockDeductedAt: new Date() },
    });
    if (claimed.count === 0) return false;

    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { productId: true, ageLabel: true, quantity: true },
    });

    for (const { productId, ageLabel, quantity } of quantitiesByProduct(items)) {
      const sizeRow = ageLabel
        ? await tx.productSizeStock.findUnique({
            where: { productId_ageLabel: { productId, ageLabel } },
            select: { id: true },
          })
        : null;
      if (sizeRow) {
        const updatedSize = await tx.productSizeStock.updateMany({
          where: { id: sizeRow.id, stockQuantity: { gte: quantity } },
          data: { stockQuantity: { decrement: quantity } },
        });
        if (updatedSize.count === 0) {
          const product = await tx.product.findUnique({
            where: { id: productId },
            select: { nameTr: true },
          });
          throw new OrderStockError(
            product
              ? `"${product.nameTr}" (${ageLabel}) için yeterli stok kalmadı.`
              : "Siparişteki ürün artık bulunamıyor.",
            productId
          );
        }
        await syncProductTotal(tx, productId);
        continue;
      }
      const updated = await tx.product.updateMany({
        where: { id: productId, stockQuantity: { gte: quantity } },
        data: { stockQuantity: { decrement: quantity } },
      });
      if (updated.count === 0) {
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { nameTr: true },
        });
        throw new OrderStockError(
          product
            ? `"${product.nameTr}" için yeterli stok kalmadı.`
            : "Siparişteki ürün artık bulunamıyor.",
          productId
        );
      }
      await tx.product.updateMany({
        where: { id: productId },
        data: { inStock: true },
      });
      await tx.product.updateMany({
        where: { id: productId, stockQuantity: { lte: 0 } },
        data: { inStock: false },
      });
    }

    return true;
  });
}

/** Restore stock once when an order whose stock was deducted is cancelled. */
export async function restoreOrderStock(orderId: string): Promise<boolean> {
  requireDatabaseUrl();
  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, stockDeductedAt: { not: null } },
      data: { stockDeductedAt: null },
    });
    if (claimed.count === 0) {
      return { restored: false, productIds: [] as string[] };
    }

    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { productId: true, ageLabel: true, quantity: true },
    });
    for (const { productId, ageLabel, quantity } of quantitiesByProduct(items)) {
      const sizeRow = ageLabel
        ? await tx.productSizeStock.findUnique({
            where: { productId_ageLabel: { productId, ageLabel } },
            select: { id: true },
          })
        : null;
      if (sizeRow) {
        await tx.productSizeStock.update({
          where: { id: sizeRow.id },
          data: { stockQuantity: { increment: quantity } },
        });
        await syncProductTotal(tx, productId);
        continue;
      }
      await tx.product.updateMany({
        where: { id: productId },
        data: {
          stockQuantity: { increment: quantity },
          inStock: true,
        },
      });
    }

    return {
      restored: true,
      productIds: [
        ...new Set(
          items
            .filter((item) => isPhysicalProduct(item.productId))
            .map((item) => item.productId)
        ),
      ],
    };
  });
  await Promise.all(
    result.productIds.map((productId) =>
      sendPendingStockNotifications(productId).catch((err) => {
        console.error("[stock-notifications] iade bildirimi gönderilemedi:", err);
      })
    )
  );
  return result.restored;
}
