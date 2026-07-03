"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import type { Order } from "@/lib/db";
import { formatPrice } from "@/lib/products";

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

  const load = () => {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then(setOrders);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  };

  return (
    <>
      <AdminHeader title="Siparişler" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="admin-card overflow-hidden">
          <table className="admin-table w-full">
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
                <tr key={order.id}>
                  <td className="font-medium">{order.orderNumber}</td>
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
                    {new Date(order.createdAt).toLocaleDateString("tr-TR")}
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
