import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getOrders } from "@/lib/db";
import { getNavlungoBarcodePdf, NavlungoError } from "@/lib/navlungo";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function labelErrorResponse(request: Request, message: string, status = 422) {
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/html") && !accept.includes("application/json")) {
    const html = `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Etiket</title>
  </head>
  <body style="font-family:system-ui,sans-serif;padding:24px;max-width:28rem;line-height:1.5">
    <h1 style="font-size:1.1rem;margin:0 0 8px">Etiket henüz hazır değil</h1>
    <p style="margin:0 0 12px">${escapeHtml(message)}</p>
    <p style="margin:0;color:#555">Kargo numarası oluşmuş olabilir. Siparişler sayfasından Etiket’e birkaç saniye sonra tekrar basın.</p>
  </body>
</html>`;
    return new NextResponse(html, {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const orderId = new URL(request.url).searchParams.get("orderId") || "";
  const orders = await getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order?.cargoPostNumber) {
    return labelErrorResponse(request, "Bu siparişte kargo etiketi yok.", 404);
  }

  try {
    const pdf = await getNavlungoBarcodePdf(order.cargoPostNumber);
    const filename = `${order.cargoPostNumber}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message =
      err instanceof NavlungoError ? err.message : "Etiket alınamadı.";
    console.error("[admin/shipping] label failed:", err);
    return labelErrorResponse(request, message);
  }
}
