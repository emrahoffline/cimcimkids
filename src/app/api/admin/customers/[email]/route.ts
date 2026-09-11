import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getCustomerProfile } from "@/lib/shopper-db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { email } = await params;
  const decoded = decodeURIComponent(email || "");
  const profile = await getCustomerProfile(decoded);
  if (!profile) {
    return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
