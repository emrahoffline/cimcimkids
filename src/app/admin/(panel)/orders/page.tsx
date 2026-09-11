"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import type { Order } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { useAdminNotifications } from "@/components/admin/useAdminNotifications";
import { adminCustomerPath } from "@/lib/shopper";
import { ShippingModal } from "@/components/admin/ShippingModal";

const statuses = [
  { value: "pending_payment", label: "Ödeme Bekleniyor" },
  { value: "pending", label: "Beklemede" },
  { value: "confirmed", label: "Onaylandı" },
  { value: "preparing", label: "Hazırlanıyor" },
  { value: "shipped", label: "Kargoda" },
  { value: "delivered", label: "Teslim Edildi" },
  { value: "cancelled", label: "İptal" },
];

const invoiceStatusLabel: Record<string, string> = {
  pending: "Bekliyor",
  sending: "Gönderiliyor",
  sent: "Kesildi",
  failed: "Hata",
  cancelled: "İptal",
};

function cargoCostText(order: Order) {
  if (typeof order.cargoCost !== "number" || order.cargoCost <= 0) return null;
  return formatPrice(order.cargoCost, "tr");
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState("");
  const [shippingOrder, setShippingOrder] = useState<Order | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { markAllSeen, refresh: refreshNotifications } = useAdminNotifications();

  const load = async () => {
    const res = await fetch("/api/admin/orders");
    setOrders(await res.json());
  };

  useEffect(() => {
    let active = true;

    async function init() {
      await load();
      if (!active) return;
      await markAllSeen();
      refreshNotifications();
    }

    init();
    const id = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [markAllSeen, refreshNotifications]);

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
    refreshNotifications();
  };

  const issueInvoice = async (orderId: string) => {
    setIssuingId(orderId);
    setInvoiceError("");
    const res = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json().catch(() => ({}));
    setIssuingId(null);
    if (!res.ok) {
      setInvoiceError(data.error || "Fatura kesilemedi");
      return;
    }
    load();
  };

  const cancelCargo = async (orderId: string) => {
    if (!confirm("Bu kargoyu Navlungo’da iptal etmek istiyor musunuz?")) return;
    setCancellingId(orderId);
    setInvoiceError("");
    const res = await fetch(`/api/admin/shipping?orderId=${encodeURIComponent(orderId)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setCancellingId(null);
    if (!res.ok) {
      setInvoiceError(data.error || "Kargo iptal edilemedi");
      return;
    }
    load();
  };

  return (
    <>
      <AdminHeader title="Siparişler" />
      <main className="admin-main space-y-4">
        {invoiceError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {invoiceError}
          </p>
        )}
        {shippingOrder && (
          <ShippingModal
            order={shippingOrder}
            onClose={() => setShippingOrder(null)}
            onDone={() => {
              setShippingOrder(null);
              load();
            }}
          />
        )}
        <div className="space-y-3 md:hidden">
          {orders.length === 0 && (
            <div className="admin-card px-4 py-8 text-center text-sm text-gray-400">
              Henüz sipariş yok
            </div>
          )}
          {orders.map((order) => {
            const inv = order.invoice;
            const paid = order.status !== "pending_payment" && order.status !== "cancelled";
            return (
              <article
                key={order.id}
                className={`admin-card space-y-3 p-4 ${
                  order.adminSeen === false ? "bg-amber-50/80" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">
                      {order.orderNumber}
                      {order.adminSeen === false && (
                        <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          Yeni
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-gray-900">
                    {formatPrice(order.total, "tr")}
                  </p>
                </div>
                <div>
                  <Link
                    href={adminCustomerPath(order.customerEmail)}
                    className="inline-flex min-h-[44px] max-w-full items-center break-words font-medium text-bamboo underline decoration-bamboo/40 underline-offset-2"
                  >
                    {order.customerName}
                  </Link>
                  <p className="break-all text-xs text-gray-400">{order.customerEmail}</p>
                  {order.customerPhone && (
                    <p className="text-xs text-gray-400">{order.customerPhone}</p>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-gray-600">
                  {order.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}
                </p>
                {order.items.some((i) => i.productId === "gift-wrap") && (
                  <p className="text-xs font-medium text-olive">
                    Hediye paketi
                    {order.giftNote ? ` — ${order.giftNote}` : ""}
                  </p>
                )}
                <p className="break-words text-xs text-gray-500">
                  {order.invoiceKind === "corporate"
                    ? `Kurumsal · ${order.companyTitle ?? ""} · VKN ${order.taxId ?? "—"}`
                    : order.taxId
                      ? `Bireysel · TCKN ${order.taxId}`
                      : "Bireysel"}
                </p>
                <p className="text-xs text-gray-400">
                  {order.paymentMethod === "card"
                    ? `Kart${order.lastFourDigits ? ` ****${order.lastFourDigits}` : ""}`
                    : "Havale/EFT"}
                </p>
                {order.discountCode && (order.discountAmount ?? 0) > 0 && (
                  <p className="text-xs font-medium text-olive">
                    İndirim {order.discountCode} −{formatPrice(order.discountAmount ?? 0, "tr")}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="min-h-[44px] flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                  >
                    {statuses.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {inv?.status === "sent" ? (
                    <a
                      href={`/api/admin/invoices/${inv.id}/pdf`}
                      className="inline-flex min-h-[44px] items-center rounded-lg border border-gray-200 px-3 text-xs font-medium text-bamboo"
                    >
                      PDF
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled={!paid || issuingId === order.id}
                      onClick={() => issueInvoice(order.id)}
                      className="min-h-[44px] rounded-lg border border-gray-200 px-3 text-xs font-medium disabled:opacity-40"
                    >
                      {issuingId === order.id
                        ? "Kesiliyor..."
                        : inv?.status === "failed"
                          ? "Tekrar dene"
                          : "Fatura kes"}
                    </button>
                  )}
                  {order.cargoPostNumber ? (
                    <>
                      {cargoCostText(order) && (
                        <p className="w-full text-xs font-medium text-gray-700">
                          Kargo gideri {cargoCostText(order)}
                        </p>
                      )}
                      <a
                        href={`/api/admin/shipping/label?orderId=${encodeURIComponent(order.id)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-gray-200 px-3 text-xs font-medium text-bamboo"
                      >
                        Etiket
                      </a>
                      {order.cargoTrackingUrl && (
                        <a
                          href={order.cargoTrackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[44px] items-center rounded-lg border border-gray-200 px-3 text-xs font-medium"
                        >
                          {order.cargoCarrier || "Takip"}
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={cancellingId === order.id}
                        onClick={() => cancelCargo(order.id)}
                        className="min-h-[44px] rounded-lg border border-red-200 px-3 text-xs font-medium text-red-700 disabled:opacity-40"
                      >
                        {cancellingId === order.id ? "İptal..." : "Kargo iptal"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={!paid}
                      onClick={() => setShippingOrder(order)}
                      className="min-h-[44px] rounded-lg border border-gray-200 px-3 text-xs font-medium disabled:opacity-40"
                    >
                      Kargo
                    </button>
                  )}
                </div>
                {inv?.errorMessage && (
                  <p className="break-words text-[11px] text-red-500">{inv.errorMessage}</p>
                )}
              </article>
            );
          })}
        </div>

        <div className="admin-card hidden overflow-hidden md:block">
          <div className="admin-table-wrap">
            <table className="admin-table w-full min-w-[960px]">
              <thead>
                <tr>
                  <th>Sipariş No</th>
                  <th>Müşteri</th>
                  <th>Ürünler</th>
                  <th>Tutar</th>
                  <th>Fatura</th>
                  <th>Kargo</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      Henüz sipariş yok
                    </td>
                  </tr>
                )}
                {orders.map((order) => {
                  const inv = order.invoice;
                  const paid = order.status !== "pending_payment" && order.status !== "cancelled";
                  return (
                    <tr
                      key={order.id}
                      className={
                        order.adminSeen === false ? "bg-amber-50/80" : undefined
                      }
                    >
                      <td className="font-medium">
                        {order.orderNumber}
                        {order.adminSeen === false && (
                          <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            Yeni
                          </span>
                        )}
                      </td>
                      <td>
                        <p>
                          <Link
                            href={adminCustomerPath(order.customerEmail)}
                            className="font-medium text-bamboo underline decoration-bamboo/40 underline-offset-2 hover:decoration-bamboo"
                          >
                            {order.customerName}
                          </Link>
                        </p>
                        <p className="text-xs text-gray-400">{order.customerEmail}</p>
                        {order.customerPhone && (
                          <p className="text-xs text-gray-400">{order.customerPhone}</p>
                        )}
                        {order.shippingAddress && (
                          <p className="mt-1 text-xs text-gray-400">
                            {order.shippingAddress}
                          </p>
                        )}
                        {order.items.some((i) => i.productId === "gift-wrap") && (
                          <p className="mt-1 text-xs font-medium text-olive">
                            Hediye paketi
                            {order.giftNote ? ` — ${order.giftNote}` : ""}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          {order.invoiceKind === "corporate"
                            ? `Kurumsal · ${order.companyTitle ?? ""} · VKN ${order.taxId ?? "—"}`
                            : order.taxId
                              ? `Bireysel · TCKN ${order.taxId}`
                              : "Bireysel"}
                        </p>
                      </td>
                      <td className="text-xs">
                        {order.items.map((i) => (
                          <p key={`${order.id}-${i.productId}`}>
                            {i.name} × {i.quantity}
                          </p>
                        ))}
                      </td>
                      <td>
                        {formatPrice(order.total, "tr")}
                        <p className="mt-1 text-xs text-gray-400">
                          {order.paymentMethod === "card"
                            ? `Kart${order.lastFourDigits ? ` ****${order.lastFourDigits}` : ""}`
                            : "Havale/EFT"}
                        </p>
                        {order.discountCode && (order.discountAmount ?? 0) > 0 && (
                          <p className="mt-1 text-xs font-medium text-olive">
                            {order.discountCode} −{formatPrice(order.discountAmount ?? 0, "tr")}
                          </p>
                        )}
                      </td>
                      <td className="text-xs">
                        {inv?.status === "sent" ? (
                          <div className="space-y-1">
                            <p className="font-medium text-emerald-700">
                              {inv.documentType === "e_invoice"
                                ? "e-Fatura"
                                : "e-Arşiv"}{" "}
                              {inv.invoiceNumber || ""}
                            </p>
                            <a
                              href={`/api/admin/invoices/${inv.id}/pdf`}
                              className="text-bamboo underline"
                            >
                              PDF
                            </a>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {inv?.status && (
                              <p
                                className={
                                  inv.status === "failed"
                                    ? "text-red-600"
                                    : "text-gray-500"
                                }
                              >
                                {invoiceStatusLabel[inv.status] ?? inv.status}
                              </p>
                            )}
                            {inv?.errorMessage && (
                              <p className="max-w-[180px] text-[11px] text-red-500">
                                {inv.errorMessage}
                              </p>
                            )}
                            <button
                              type="button"
                              disabled={!paid || issuingId === order.id}
                              onClick={() => issueInvoice(order.id)}
                              className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium hover:bg-gray-50 disabled:opacity-40"
                            >
                              {issuingId === order.id
                                ? "Kesiliyor..."
                                : inv?.status === "failed"
                                  ? "Tekrar dene"
                                  : "Fatura kes"}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="text-xs">
                        {order.cargoPostNumber ? (
                          <div className="space-y-1">
                            <p className="font-medium text-gray-700">
                              {order.cargoCarrier || "Kargo"} {order.cargoPostNumber}
                            </p>
                            {cargoCostText(order) && (
                              <p className="text-[11px] text-gray-500">
                                Gider {cargoCostText(order)}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={`/api/admin/shipping/label?orderId=${encodeURIComponent(order.id)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-bamboo underline"
                              >
                                Etiket
                              </a>
                              {order.cargoTrackingUrl && (
                                <a
                                  href={order.cargoTrackingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-bamboo underline"
                                >
                                  Takip
                                </a>
                              )}
                              <button
                                type="button"
                                disabled={cancellingId === order.id}
                                onClick={() => cancelCargo(order.id)}
                                className="text-red-600 underline disabled:opacity-40"
                              >
                                {cancellingId === order.id ? "İptal..." : "İptal"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!paid}
                            onClick={() => setShippingOrder(order)}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium hover:bg-gray-50 disabled:opacity-40"
                          >
                            Kargo
                          </button>
                        )}
                      </td>
                      <td>
                        <select
                          className="min-h-[40px] rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                        >
                          {statuses.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="whitespace-nowrap text-gray-400">
                        {new Date(order.createdAt).toLocaleString("tr-TR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
