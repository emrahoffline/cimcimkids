import { NextResponse } from "next/server";
import { isCardPaymentEnabled } from "@/lib/iyzico";

export async function GET() {
  return NextResponse.json({
    bankTransfer: true,
    card: isCardPaymentEnabled(),
  });
}
