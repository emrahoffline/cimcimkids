import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { isEFaturaConfigured } from "@/lib/invoice-config";
import {
  issueInvoiceForOrder,
  listInvoices,
} from "@/lib/invoices-db";
import { EFaturaError } from "@/lib/efatura/errors";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const invoices = await listInvoices();
  return NextResponse.json({
    configured: isEFaturaConfigured(),
    invoices,
  });
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const orderId =
    body && typeof body === "object"
      ? String((body as { orderId?: unknown }).orderId ?? "")
      : "";
  if (!orderId) {
    return NextResponse.json({ error: "Sipariş seçilmedi." }, { status: 400 });
  }

  try {
    const { invoice } = await issueInvoiceForOrder(orderId);
    return NextResponse.json(invoice);
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    const map: Record<string, [number, string]> = {
      EFATURA_NOT_CONFIGURED: [
        400,
        "Bien web servis bilgisi yok. BIEN_USERNAME ve BIEN_PASSWORD ekleyin.",
      ],
      ORDER_NOT_FOUND: [404, "Sipariş bulunamadı."],
      ORDER_NOT_PAID: [
        400,
        "Ödeme onaylanmadan fatura kesilemez. Önce sipariş durumunu güncelleyin.",
      ],
      MISSING_TAX_ID: [400, "Kurumsal siparişte VKN yok."],
      INVOICE_IN_PROGRESS: [409, "Fatura zaten gönderiliyor."],
    };
    if (code && map[code]) {
      const [status, message] = map[code];
      return NextResponse.json({ error: message }, { status });
    }
    const message =
      err instanceof EFaturaError
        ? err.message
        : "Fatura kesilemedi. Entegratör yanıtını kontrol edin.";
    console.error("[admin/invoices] issue failed:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
