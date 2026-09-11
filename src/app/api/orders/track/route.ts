import { NextResponse } from "next/server";
import { getOrders } from "@/lib/db";
import { statusToStep } from "@/lib/order-status";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(ip, {
    windowMs: 60_000,
    max: 20,
    keyPrefix: "track",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "tooManyRequests" },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const orderNumber =
    typeof (body as { orderNumber?: unknown }).orderNumber === "string"
      ? (body as { orderNumber: string }).orderNumber.trim().toUpperCase()
      : "";
  const email =
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email.trim().toLowerCase()
      : "";

  if (!orderNumber || !email || email.length > 254) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const orders = await getOrders();
  const order = orders.find(
    (o) =>
      o.orderNumber.toUpperCase() === orderNumber &&
      o.customerEmail.toLowerCase() === email
  );

  if (!order) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.status,
    step: statusToStep(order.status),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt ?? order.createdAt,
    itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
    total: order.total,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
    })),
    history: (order.statusHistory ?? []).map((h) => ({
      status: h.status,
      at: h.at,
    })),
    cargoCarrier: order.cargoCarrier,
    cargoPostNumber: order.cargoPostNumber,
    cargoTrackingUrl: order.cargoTrackingUrl,
  });
}
