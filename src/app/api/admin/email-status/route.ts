import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { isSmtpConfigured } from "@/lib/email";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  return NextResponse.json({ configured: isSmtpConfigured() });
}
