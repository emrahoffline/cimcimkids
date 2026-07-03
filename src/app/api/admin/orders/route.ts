import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getOrders, saveOrders } from "@/lib/db";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const orders = await getOrders();
  return NextResponse.json(orders);
}

export async function PATCH(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { id, status } = await request.json();
  const orders = await getOrders();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  order.status = status;
  await saveOrders(orders);
  return NextResponse.json(order);
}
