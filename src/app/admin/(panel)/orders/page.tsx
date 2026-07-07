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

  return (
    <>
      <AdminHeader title="Siparişler" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="admin-card overflow-x-auto">
          <table className="admin-table w-full min-w-[720px]">
            <thead>
              <tr>
                <th>Sipariş No</th>
                <th>Müşteri</th>
                <th>Ürünler</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
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
                  <td className="text-xs">
                    {order.items.map((i) => (
                      <p key={i.productId}>
                        {i.name} × {i.quantity}
                      </p>
                    ))}
                  </td>
                  <td>{formatPrice(order.total, "tr")}</td>
                  <td>
                    <select
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
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
                  <td className="text-gray-400">
                    {new Date(order.createdAt).toLocaleString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
