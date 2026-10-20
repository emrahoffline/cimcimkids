import "server-only";

import { prisma, requireDatabaseUrl } from "./prisma";
import { sendBackInStockEmail } from "./email";
import { parseProductColors } from "./product-variants";
import { colorHasSizeStock } from "./product-stock";

export async function sendPendingStockNotifications(
  productId: string
): Promise<number> {
  requireDatabaseUrl();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      sizeStocks: true,
      stockNotifications: {
        where: { sentAt: null },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!product) return 0;

  const availableAges = new Set(
    product.sizeStocks
      .filter((stock) => stock.stockQuantity > 0)
      .map((stock) => stock.ageLabel)
  );
  for (const color of parseProductColors(product.colors)) {
    if (!colorHasSizeStock(color)) continue;
    for (const [age, quantity] of Object.entries(color.sizeStock ?? {})) {
      if (quantity > 0) availableAges.add(age);
    }
  }
  const staleClaim = new Date(Date.now() - 15 * 60 * 1000);
  let sent = 0;

  for (const notification of product.stockNotifications) {
    if (!availableAges.has(notification.ageLabel)) continue;
    const claimed = await prisma.stockNotification.updateMany({
      where: {
        id: notification.id,
        sentAt: null,
        OR: [{ claimedAt: null }, { claimedAt: { lt: staleClaim } }],
      },
      data: { claimedAt: new Date() },
    });
    if (claimed.count === 0) continue;

    try {
      const locale = notification.locale === "en" ? "en" : "tr";
      const delivered = await sendBackInStockEmail({
        email: notification.email,
        locale,
        productName:
          locale === "en"
            ? product.nameEn || product.nameTr
            : product.nameTr || product.nameEn,
        ageLabel: notification.ageLabel,
        slug: product.slug,
      });
      if (!delivered) {
        await prisma.stockNotification.update({
          where: { id: notification.id },
          data: { claimedAt: null },
        });
        continue;
      }
      await prisma.stockNotification.update({
        where: { id: notification.id },
        data: { sentAt: new Date(), claimedAt: null },
      });
      sent += 1;
    } catch (err) {
      console.error("[stock-notifications] e-posta gönderilemedi:", err);
      await prisma.stockNotification
        .update({
          where: { id: notification.id },
          data: { claimedAt: null },
        })
        .catch(() => undefined);
    }
  }

  return sent;
}
