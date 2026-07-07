import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getAdminAnalytics } from "@/lib/analytics-db";
import { getOrders, getProducts } from "@/lib/db";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const [orders, products] = await Promise.all([getOrders(), getProducts()]);
  const analytics = await getAdminAnalytics(orders, products);

  return NextResponse.json(analytics);
}
