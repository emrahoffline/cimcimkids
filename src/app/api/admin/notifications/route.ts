import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getUnreadOrders, markOrdersSeen } from "@/lib/db";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const unread = await getUnreadOrders();

  return NextResponse.json({
    count: unread.length,
    orders: unread.slice(0, 10).map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    })),
  });
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const marked = await markOrdersSeen(body.ids);

  return NextResponse.json({ ok: true, marked });
}
