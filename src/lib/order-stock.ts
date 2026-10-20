import "server-only";
import type { Prisma } from "@prisma/client";
import { isGiftCardProductId } from "./gift-cards";
import { isGiftWrapProductId } from "./gift-wrap";
import { prisma, requireDatabaseUrl } from "./prisma";
import { isShippingProductId } from "./shipping";
import { isCodFeeProductId } from "./cod-fee";
import { sendPendingStockNotifications } from "./stock-notifications";
import { parseProductColors } from "./product-variants";
import { canonicalizeAge } from "./product-ages";
import {
  colorHasSizeStock,
  colorStockTotal,
  hasColorStock,
  sizeStockTotal,
} from "./product-stock";

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

type StockLine = {
  productId: string;
  ageLabel: string | null;
  colorId: string | null;
  quantity: number;
};

function sizeQuantities(items: StockLine[]) {
  const quantities = new Map<
    string,
    { productId: string; ageLabel: string | null; quantity: number }
  >();
  for (const item of items) {
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

type ColorDelta = {
  colorId: string;
  ageLabel: string | null;
  quantity: number;
};

async function applyColorStockChange(
  tx: Prisma.TransactionClient,
  productId: string,
  deltas: ColorDelta[]
) {
  await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`;
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { colors: true, nameTr: true },
  });
  if (!product) {
    throw new OrderStockError("Siparişteki ürün artık bulunamıyor.", productId);
  }
  const colors = parseProductColors(product.colors);
  for (const delta of deltas) {
    const index = colors.findIndex((color) => color.id === delta.colorId);
    if (index < 0) {
      if (delta.quantity > 0) continue;
      throw new OrderStockError(
        `"${product.nameTr}" için seçilen renk artık yok.`,
        productId
      );
    }
    const color = colors[index];
    if (colorHasSizeStock(color)) {
      const age = canonicalizeAge(delta.ageLabel ?? "");
      const sizeStock = { ...(color.sizeStock ?? {}) };
      if (!age) {
        throw new OrderStockError(
          `"${product.nameTr}" (${color.labelTr}) için beden seçilmedi.`,
          productId
        );
      }
      const next = (sizeStock[age] ?? 0) + delta.quantity;
      if (next < 0) {
        throw new OrderStockError(
          `"${product.nameTr}" (${color.labelTr}, ${age}) için yeterli stok kalmadı.`,
          productId
        );
      }
      sizeStock[age] = next;
      colors[index] = {
        ...color,
        sizeStock,
        stock: sizeStockTotal(sizeStock),
      };
      continue;
    }
    const next = (color.stock ?? 0) + delta.quantity;
    if (next < 0) {
      throw new OrderStockError(
        `"${product.nameTr}" (${color.labelTr}) için yeterli stok kalmadı.`,
        productId
      );
    }
    colors[index] = { ...color, stock: next };
  }
  const total = colorStockTotal(colors);
  await tx.product.update({
    where: { id: productId },
    data: {
      colors: colors as Prisma.InputJsonValue,
      stockQuantity: total,
      inStock: total > 0,
    },
  });
}

async function partitionLines(
  tx: Prisma.TransactionClient,
  items: StockLine[],
  mode: "deduct" | "restore"
) {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const products =
    productIds.length === 0
      ? []
      : await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, colors: true, nameTr: true },
        });
  const colorProducts = new Map(
    products
      .map((product) => {
        const colors = parseProductColors(product.colors);
        return hasColorStock(colors)
          ? ([product.id, { nameTr: product.nameTr, colors }] as const)
          : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  );
  const colorDeltas = new Map<string, Map<string, ColorDelta>>();
  const sizeLines: StockLine[] = [];

  for (const item of items) {
    const tracked = colorProducts.get(item.productId);
    if (!tracked || !item.colorId) {
      if (mode === "deduct" && tracked && !item.colorId) {
        throw new OrderStockError(
          `"${tracked?.nameTr ?? "Ürün"}" için renk seçilmedi.`,
          item.productId
        );
      }
      sizeLines.push(item);
      continue;
    }
    const color = tracked.colors.find((entry) => entry.id === item.colorId);
    const perSize = colorHasSizeStock(color);
    if (mode === "deduct" && perSize && !item.ageLabel) {
      throw new OrderStockError(
        `"${tracked.nameTr}" için beden seçilmedi.`,
        item.productId
      );
    }
    const key = perSize
      ? `${item.colorId}::${item.ageLabel ?? ""}`
      : item.colorId;
    const grouped = colorDeltas.get(item.productId) ?? new Map<string, ColorDelta>();
    const current = grouped.get(key);
    grouped.set(key, {
      colorId: item.colorId,
      ageLabel: perSize ? item.ageLabel : null,
      quantity: (current?.quantity ?? 0) + item.quantity,
    });
    colorDeltas.set(item.productId, grouped);
  }

  return { colorDeltas, sizeLines };
}

async function applySizeStockChange(
  tx: Prisma.TransactionClient,
  lines: StockLine[],
  mode: "deduct" | "restore"
) {
  for (const { productId, ageLabel, quantity } of sizeQuantities(lines)) {
    const sizeRow = ageLabel
      ? await tx.productSizeStock.findUnique({
          where: { productId_ageLabel: { productId, ageLabel } },
          select: { id: true },
        })
      : null;
    if (sizeRow) {
      if (mode === "deduct") {
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
      } else {
        await tx.productSizeStock.update({
          where: { id: sizeRow.id },
          data: { stockQuantity: { increment: quantity } },
        });
      }
      await syncProductTotal(tx, productId);
      continue;
    }

    if (mode === "deduct") {
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
}

async function loadPhysicalLines(orderId: string, tx: Prisma.TransactionClient) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: {
      productId: true,
      ageLabel: true,
      colorId: true,
      quantity: true,
    },
  });
  return items.filter(
    (item) => isPhysicalProduct(item.productId) && item.quantity > 0
  );
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

    const items = await loadPhysicalLines(orderId, tx);
    const { colorDeltas, sizeLines } = await partitionLines(tx, items, "deduct");
    for (const [productId, deltas] of colorDeltas) {
      await applyColorStockChange(
        tx,
        productId,
        [...deltas.values()].map((delta) => ({
          ...delta,
          quantity: -delta.quantity,
        }))
      );
    }
    await applySizeStockChange(tx, sizeLines, "deduct");
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

    const items = await loadPhysicalLines(orderId, tx);
    const { colorDeltas, sizeLines } = await partitionLines(
      tx,
      items,
      "restore"
    );
    for (const [productId, deltas] of colorDeltas) {
      await applyColorStockChange(tx, productId, [...deltas.values()]);
    }
    await applySizeStockChange(tx, sizeLines, "restore");

    return {
      restored: true,
      productIds: [...new Set(items.map((item) => item.productId))],
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
