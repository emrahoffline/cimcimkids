import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getCustomers, getOrders, getProducts, isOrderUnread } from "@/lib/db";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const [products, customers, orders] = await Promise.all([
    getProducts(),
    getCustomers(),
    getOrders(),
  ]);

  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  return NextResponse.json({
    productCount: products.length,
    inStockCount: products.filter((p) => p.inStock).length,
    customerCount: customers.filter((c) => c.role === "customer").length,
    orderCount: orders.length,
    pendingOrders: orders.filter(
      (o) => o.status === "pending" || o.status === "pending_payment"
    ).length,
    unreadOrders: orders.filter(isOrderUnread).length,
    totalRevenue,
    recentOrders: orders.slice(0, 5).map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      unread: isOrderUnread(order),
    })),
  });
}
