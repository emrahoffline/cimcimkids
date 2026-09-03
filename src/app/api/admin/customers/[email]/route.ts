import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { prisma, requireDatabaseUrl } from "@/lib/prisma";
import { getShopperState } from "@/lib/shopper-state";

function normalizeEmail(raw: string): string {
  return decodeURIComponent(raw).trim().toLowerCase();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { email: raw } = await params;
  const email = normalizeEmail(raw);
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Geçersiz e-posta" }, { status: 400 });
  }

  requireDatabaseUrl();

  const [account, orders, shopper, subscriber] = await Promise.all([
    prisma.customer.findUnique({ where: { email } }),
    prisma.order.findMany({
      where: { customerEmail: email },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    getShopperState(email),
    prisma.subscriber.findUnique({ where: { email } }),
  ]);

  if (!account && orders.length === 0 && !shopper) {
    return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
  }

  const latest = orders[0];
  const paid = orders.filter((o) => o.status !== "cancelled");
  const totalSpent = paid.reduce((sum, o) => sum + o.total, 0);
  const itemsPurchased = paid.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0
  );

  const purchasedMap = new Map<
    string,
    { productId: string; name: string; image: string; quantity: number; total: number }
  >();
  for (const order of paid) {
    for (const item of order.items) {
      const current = purchasedMap.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        image: item.image,
        quantity: 0,
        total: 0,
      };
      current.quantity += item.quantity;
      current.total += item.price * item.quantity;
      purchasedMap.set(item.productId, current);
    }
  }

  return NextResponse.json({
    email,
    name: account?.name || latest?.customerName || email,
    image: account?.image ?? null,
    phone: latest?.customerPhone ?? null,
    address: latest?.shippingAddress ?? null,
    hasAccount: Boolean(account),
    role: account?.role ?? null,
    createdAt: account?.createdAt?.toISOString() ?? latest?.createdAt.toISOString(),
    lastLoginAt: account?.lastLoginAt?.toISOString() ?? null,
    newsletter: Boolean(subscriber),
    stats: {
      orderCount: orders.length,
      paidOrderCount: paid.length,
      cancelledCount: orders.length - paid.length,
      totalSpent,
      itemsPurchased,
      averageOrder: paid.length ? totalSpent / paid.length : 0,
      favoriteCount: shopper?.favorites.length ?? 0,
      cartCount: shopper?.cart.reduce((s, i) => s + i.quantity, 0) ?? 0,
      cartValue: shopper?.cart.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0,
      lastOrderAt: latest?.createdAt.toISOString() ?? null,
    },
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt.toISOString(),
      shippingAddress: o.shippingAddress,
      customerPhone: o.customerPhone,
      items: o.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        image: i.image,
      })),
    })),
    purchasedItems: [...purchasedMap.values()].sort((a, b) => b.quantity - a.quantity),
    cart: shopper?.cart ?? [],
    favorites: shopper?.favorites ?? [],
    shopperUpdatedAt: shopper?.updatedAt ?? null,
  });
}
