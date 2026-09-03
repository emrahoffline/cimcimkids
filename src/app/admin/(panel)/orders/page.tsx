"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import type { Order } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { useAdminNotifications } from "@/components/admin/useAdminNotifications";

const statuses = [
  { value: "pending_payment", label: "Ödeme Bekleniyor" },
  { value: "pending", label: "Beklemede" },
  { value: "confirmed", label: "Onaylandı" },
  { value: "preparing", label: "Hazırlanıyor" },
  { value: "shipped", label: "Kargoda" },
  { value: "delivered", label: "Teslim Edildi" },
  { value: "cancelled", label: "İptal" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);
  const { markAllSeen, refresh: refreshNotifications } = useAdminNotifications();

  const load = async () => {
    const res = await fetch("/api/admin/orders");
    setOrders(await res.json());
  };

  useEffect(() => {
    let active = true;

    async function init() {
      await load();
      try {
        const statusRes = await fetch("/api/admin/email-status");
        if (statusRes.ok) {
          const data = (await statusRes.json()) as { configured?: boolean };
          if (active) setSmtpConfigured(Boolean(data.configured));
        }
      } catch {
        /* banner optional */
      }
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

  const resendEmail = async (id: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resendEmail: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error || "E-posta gönderilemedi.");
      return;
    }
    window.alert("Sipariş maili müşteriye gönderildi.");
  };

  return (
    <>
      <AdminHeader title="Siparişler" />
      <main className="admin-main">
        {smtpConfigured === false && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Sipariş mailleri gönderilemiyor: sunucuda Gmail SMTP şifresi
            (uygulama şifresi) tanımlı değil. Müşteriye ürün özeti ancak bu
            ayar eklendikten sonra gider.
          </div>
        )}
        <div className="admin-card overflow-hidden">
          <div className="admin-table-wrap">
            <table className="admin-table w-full min-w-[960px]">
              <thead>
                <tr>
                  <th>Sipariş No</th>
                  <th>Müşteri</th>
                  <th>Adres</th>
                  <th>Ürünler</th>
                  <th>Tutar</th>
                  <th>Ödeme</th>
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
                {orders.map((order) => (
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
                      <p>{order.customerName}</p>
                      <p className="text-xs text-gray-400">{order.customerEmail}</p>
                      {order.customerPhone && (
                        <p className="text-xs text-gray-400">{order.customerPhone}</p>
                      )}
                    </td>
                    <td className="max-w-[18rem] whitespace-pre-wrap text-xs text-gray-700">
                      {order.shippingAddress || "—"}
                    </td>
                    <td className="text-xs">
                      {order.items.map((i) => (
                        <p key={i.productId}>
                          {i.name} × {i.quantity}
                        </p>
                      ))}
                    </td>
                    <td>{formatPrice(order.total, "tr")}</td>
                    <td className="text-xs text-gray-600">
                      {order.paymentMethod === "card" ? (
                        <>
                          <p>Kart</p>
                          {order.paymentLastFour ? (
                            <p className="text-gray-400">
                              **** {order.paymentLastFour}
                              {order.paidAt ? " · ödendi" : ""}
                            </p>
                          ) : (
                            <p className="text-gray-400">
                              {order.paidAt ? "ödendi" : "bekleniyor"}
                            </p>
                          )}
                        </>
                      ) : (
                        "Havale/EFT"
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
                      <button
                        type="button"
                        className="mt-1 block text-xs text-olive underline"
                        onClick={() => resendEmail(order.id)}
                      >
                        Mail gönder
                      </button>
                    </td>
                    <td className="whitespace-nowrap text-gray-400">
                      {new Date(order.createdAt).toLocaleString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
