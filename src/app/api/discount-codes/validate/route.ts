import { NextResponse } from "next/server";
import { getDiscountCodeByCode } from "@/lib/discount-codes-db";
import {
  computeDiscountAmount,
  isDiscountCodeCurrentlyValid,
  isValidDiscountCodeFormat,
  normalizeDiscountCode,
} from "@/lib/discount-codes";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(ip, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: "discount-validate",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const codeRaw =
    body && typeof body === "object" && typeof (body as { code?: unknown }).code === "string"
      ? (body as { code: string }).code
      : "";
  const subtotal =
    body &&
    typeof body === "object" &&
    typeof (body as { subtotal?: unknown }).subtotal === "number"
      ? (body as { subtotal: number }).subtotal
      : 0;

  const code = normalizeDiscountCode(codeRaw);
  if (!isValidDiscountCodeFormat(code)) {
    return NextResponse.json(
      { error: "Geçerli bir indirim kodu girin." },
      { status: 400 }
    );
  }

  const row = await getDiscountCodeByCode(code);
  if (!row || !isDiscountCodeCurrentlyValid(row)) {
    return NextResponse.json(
      { error: "İndirim kodu geçersiz veya süresi dolmuş." },
      { status: 404 }
    );
  }

  const amount = computeDiscountAmount(
    subtotal,
    row.kind,
    row.value,
    row.minSubtotal
  );
  if (amount <= 0) {
    const min = row.minSubtotal > 0 ? ` En az ${row.minSubtotal} TL ürün tutarı gerekir.` : "";
    return NextResponse.json(
      { error: `Bu kod şu anki sepete uygulanamıyor.${min}` },
      { status: 400 }
    );
  }

  return NextResponse.json({
    code: row.code,
    kind: row.kind,
    value: row.value,
    minSubtotal: row.minSubtotal,
    amount,
  });
}
