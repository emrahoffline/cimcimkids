import "server-only";
import { isGiftCardProductId } from "./gift-cards";
import { isGiftWrapProductId } from "./gift-wrap";
import { prisma, requireDatabaseUrl } from "./prisma";
import { isShippingProductId } from "./shipping";

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
    !isShippingProductId(productId)
  );
}

function quantitiesByProduct(
  items: { productId: string; quantity: number }[]
) {
  const quantities = new Map<string, number>();
  for (const item of items) {
    if (!isPhysicalProduct(item.productId)) continue;
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity
    );
  }
  return quantities;
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
      select: { productId: true, quantity: true },
    });

    for (const [productId, quantity] of quantitiesByProduct(items)) {
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
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, stockDeductedAt: { not: null } },
      data: { stockDeductedAt: null },
    });
    if (claimed.count === 0) return false;

    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { productId: true, quantity: true },
    });
    for (const [productId, quantity] of quantitiesByProduct(items)) {
      await tx.product.updateMany({
        where: { id: productId },
        data: {
          stockQuantity: { increment: quantity },
          inStock: true,
        },
      });
    }

    return true;
  });
}
