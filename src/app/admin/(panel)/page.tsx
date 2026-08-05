"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Package, Users, ShoppingCart, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/products";

type Stats = {
  productCount: number;
  inStockCount: number;
  customerCount: number;
  orderCount: number;
  pendingOrders: number;
  unreadOrders: number;
  totalRevenue: number;
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
    unread?: boolean;
  }[];
};

const statusLabels: Record<string, string> = {
  pending_payment: "Ödeme Bekleniyor",
  pending: "Beklemede",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  shipped: "Kargoda",
  delivered: "Teslim",
  cancelled: "İptal",
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  const cards = stats
    ? [
        {
          label: "Toplam Gelir",
          value: formatPrice(stats.totalRevenue, "tr"),
          icon: TrendingUp,
          color: "text-bamboo",
        },
        {
          label: "Siparişler",
          value: stats.orderCount,
          sub: `${stats.pendingOrders} bekleyen · ${stats.unreadOrders} yeni`,
          icon: ShoppingCart,
          color: "text-blue-600",
        },
        {
          label: "Ürünler",
          value: stats.productCount,
          sub: `${stats.inStockCount} stokta`,
          icon: Package,
          color: "text-olive",
        },
        {
          label: "Müşteriler",
          value: stats.customerCount,
          icon: Users,
          color: "text-purple-600",
        },
      ]
    : [];

  return (
    <>
      <AdminHeader title="Kontrol Paneli" />
      <main className="admin-main">
        {stats && stats.unreadOrders > 0 && (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="font-medium text-amber-900">
                {stats.unreadOrders} yeni sipariş bildirimi
              </p>
              <p className="text-sm text-amber-700">
                Okunmamış siparişlerinizi kontrol edin.
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
            >
              Siparişlere Git
            </Link>
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="admin-card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 sm:text-sm">{card.label}</p>
                  <p className="mt-1 truncate text-lg font-semibold sm:text-2xl">
                    {card.value}
                  </p>
                  {card.sub && (
                    <p className="mt-0.5 text-[10px] text-gray-400 sm:text-xs">
                      {card.sub}
                    </p>
                  )}
                </div>
                <card.icon className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${card.color}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="admin-card overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <h2 className="font-semibold">Son Siparişler</h2>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <Link href="/admin/analytics" className="text-sm text-olive hover:underline">
                İstatistikler →
              </Link>
              <Link href="/admin/orders" className="text-sm text-olive hover:underline">
                Tümünü gör →
              </Link>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th>Sipariş</th>
                  <th>Müşteri</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      Henüz sipariş yok
                    </td>
                  </tr>
                )}
                {stats?.recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={order.unread ? "bg-amber-50/80" : undefined}
                  >
                    <td className="font-medium">
                      {order.orderNumber}
                      {order.unread && (
                        <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          Yeni
                        </span>
                      )}
                    </td>
                    <td>{order.customerName}</td>
                    <td>{formatPrice(order.total, "tr")}</td>
                    <td>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString("tr-TR")}
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
