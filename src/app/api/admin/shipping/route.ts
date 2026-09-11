import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getOrders, saveOrders } from "@/lib/db";
import { appendStatusHistory } from "@/lib/order-status";
import {
  cancelNavlungoShipment,
  createNavlungoShipment,
  isNavlungoConfigured,
  listNavlungoCarriers,
  listNavlungoSenders,
  NavlungoError,
} from "@/lib/navlungo";
import { cancelShippingExpense, recordShippingExpense } from "@/lib/expenses-db";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  if (!isNavlungoConfigured()) {
    return NextResponse.json({
      configured: false,
      carriers: [],
      senders: [],
    });
  }

  try {
    const [carriers, senders] = await Promise.all([
      listNavlungoCarriers(),
      listNavlungoSenders().catch(() => []),
    ]);
    return NextResponse.json({
      configured: true,
      carriers: [
        {
          id: 1,
          name: "Navlungo otomatik (kapsama göre)",
          sameDay: false,
          standard: true,
        },
        ...carriers.filter((c) => c.id !== 1),
      ],
      senders,
    });
  } catch (err) {
    const message =
      err instanceof NavlungoError ? err.message : "Navlungo taşıyıcıları alınamadı.";
    console.error("[admin/shipping] list failed:", err);
    return NextResponse.json({ error: message, configured: true }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  if (!isNavlungoConfigured()) {
    return NextResponse.json(
      { error: "Navlungo bağlı değil. NAVLUNGO_USERNAME ve NAVLUNGO_PASSWORD ekleyin." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const orderId =
    body && typeof body === "object"
      ? String((body as { orderId?: unknown }).orderId ?? "")
      : "";
  const carrierId = Number((body as { carrierId?: unknown })?.carrierId);
  const desi = Number((body as { desi?: unknown })?.desi);
  const packageCount = Number((body as { packageCount?: unknown })?.packageCount) || 1;
  const postType = Number((body as { postType?: unknown })?.postType) === 1 ? 1 : 2;

  if (!orderId) {
    return NextResponse.json({ error: "Sipariş seçilmedi." }, { status: 400 });
  }
  if (!Number.isFinite(carrierId) || carrierId <= 0) {
    return NextResponse.json({ error: "Kargo firması seçin." }, { status: 400 });
  }
  if (!Number.isFinite(desi) || desi <= 0) {
    return NextResponse.json({ error: "Desi / ağırlık girin." }, { status: 400 });
  }

  const orders = await getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }
  if (order.status === "cancelled" || order.status === "pending_payment") {
    return NextResponse.json(
      { error: "Ödeme onaylanmadan kargo oluşturulamaz." },
      { status: 400 }
    );
  }
  if (order.cargoPostNumber) {
    return NextResponse.json({
      postNumber: order.cargoPostNumber,
      trackingUrl: order.cargoTrackingUrl,
      barcodeUrl: order.cargoBarcodeUrl,
      carrier: order.cargoCarrier,
    });
  }
  if (!order.customerPhone) {
    return NextResponse.json(
      { error: "Siparişte telefon yok. Kargo için alıcı telefonu gerekir." },
      { status: 400 }
    );
  }

  const city = order.invoiceCity || "";
  const district = order.invoiceDistrict || "";
  const address =
    (order.shippingAddress ?? "")
      .replace(new RegExp(`,\\s*${district}\\s*,\\s*${city}\\s*$`, "i"), "")
      .replace(new RegExp(`,\\s*${city}\\s*$`, "i"), "")
      .trim() ||
    order.shippingAddress ||
    "";
  if (!city || !district || !address) {
    return NextResponse.json(
      { error: "Siparişte il / ilçe / adres eksik." },
      { status: 400 }
    );
  }

  try {
    const shipment = await createNavlungoShipment({
      referenceId: order.orderNumber,
      carrierId,
      postType,
      recipient: {
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail,
        address,
        city,
        district,
      },
      desi,
      packageCount,
      note: order.orderNumber,
    });

    order.cargoCarrier = shipment.carrierName || String(carrierId);
    order.cargoCarrierId = shipment.carrierId || carrierId;
    order.cargoPostNumber = shipment.postNumber;
    order.cargoTrackingUrl = shipment.trackingUrl;
    order.cargoBarcodeUrl = shipment.barcodeUrl;
    order.cargoDesi = desi;
    order.cargoCost = shipment.cost;
    if (order.status !== "shipped" && order.status !== "delivered") {
      order.status = "shipped";
      order.statusHistory = appendStatusHistory(order.statusHistory ?? [], "shipped");
    }
    await saveOrders(orders);
    if (shipment.cost && shipment.cost > 0) {
      try {
        await recordShippingExpense({
          orderId: order.id,
          orderNumber: order.orderNumber,
          postNumber: shipment.postNumber,
          carrier: shipment.carrierName,
          amount: shipment.cost,
          desi,
        });
      } catch (err) {
        console.error("[admin/shipping] expense save failed:", err);
      }
    }

    return NextResponse.json({
      postNumber: shipment.postNumber,
      trackingUrl: shipment.trackingUrl,
      barcodeUrl: shipment.barcodeUrl,
      carrier: shipment.carrierName,
      cost: shipment.cost,
    });
  } catch (err) {
    const message =
      err instanceof NavlungoError ? err.message : "Kargo oluşturulamadı.";
    console.error("[admin/shipping] create failed:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  if (!isNavlungoConfigured()) {
    return NextResponse.json({ error: "Navlungo bağlı değil." }, { status: 400 });
  }

  const orderId = new URL(request.url).searchParams.get("orderId") || "";
  if (!orderId) {
    return NextResponse.json({ error: "Sipariş seçilmedi." }, { status: 400 });
  }

  const orders = await getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }
  if (!order.cargoPostNumber) {
    return NextResponse.json({ error: "Bu siparişte kargo yok." }, { status: 400 });
  }
  if (order.status === "delivered") {
    return NextResponse.json(
      { error: "Teslim edilmiş kargo iptal edilemez." },
      { status: 400 }
    );
  }

  try {
    await cancelNavlungoShipment(order.cargoPostNumber);
  } catch (err) {
    const message = err instanceof NavlungoError ? err.message : "Kargo iptal edilemedi.";
    const alreadyGone = /iptal/i.test(message) && /zaten|already|bulunamadı|not found/i.test(message);
    if (!alreadyGone) {
      console.error("[admin/shipping] cancel failed:", err);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  try {
    await cancelShippingExpense(order.cargoPostNumber);
  } catch (err) {
    console.error("[admin/shipping] expense cancel failed:", err);
  }

  order.cargoCarrier = undefined;
  order.cargoCarrierId = undefined;
  order.cargoPostNumber = undefined;
  order.cargoTrackingUrl = undefined;
  order.cargoBarcodeUrl = undefined;
  order.cargoCost = undefined;
  if (order.status === "shipped") {
    order.status = "preparing";
    order.statusHistory = appendStatusHistory(order.statusHistory ?? [], "preparing");
  }
  await saveOrders(orders);
  return NextResponse.json({ ok: true });
}
