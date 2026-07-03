import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getCustomers } from "@/lib/db";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const customers = await getCustomers();
  return NextResponse.json(
    customers.filter((c) => c.role === "customer").sort(
      (a, b) =>
        new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime()
    )
  );
}
