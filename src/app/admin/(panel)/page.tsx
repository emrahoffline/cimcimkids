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
  totalRevenue: number;
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
};

const statusLabels: Record<string, string> = {
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
          sub: `${stats.pendingOrders} bekleyen`,
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
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="admin-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{card.value}</p>
                  {card.sub && (
                    <p className="mt-0.5 text-xs text-gray-400">{card.sub}</p>
                  )}
                </div>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold">Son Siparişler</h2>
            <Link href="/admin/orders" className="text-sm text-olive hover:underline">
              Tümünü gör →
            </Link>
          </div>
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
                <tr key={order.id}>
                  <td className="font-medium">{order.orderNumber}</td>
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
      </main>
    </>
  );
}
