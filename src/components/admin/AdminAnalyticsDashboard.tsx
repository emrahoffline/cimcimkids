"use client";

import Image from "next/image";
import {
  BarChart3,
  Clock3,
  Eye,
  Globe2,
  Heart,
  MapPin,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { formatPrice } from "@/lib/products";

type AnalyticsData = {
  salesChart: {
    date: string;
    label: string;
    revenue: number;
    orders: number;
  }[];
  topSellers: {
    productId: string;
    name: string;
    image: string;
    sold: number;
    revenue: number;
  }[];
  topFavorites: {
    productId: string;
    name: string;
    image: string;
    count: number;
  }[];
  sessionStats: {
    avgDurationSec: number;
    totalSessions: number;
    totalPageViews: number;
  };
  locations: {
    city: string;
    country: string;
    visits: number;
    percentage: number;
  }[];
  summary: {
    chartRevenueTotal: number;
    chartOrdersTotal: number;
  };
  allTime: {
    revenue: number;
    orders: number;
    itemsSold: number;
    updatedAt: string;
  };
};

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} sn`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min} dk ${sec} sn` : `${min} dk`;
}

function SalesChart({ data }: { data: AnalyticsData["salesChart"] }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="flex h-56 items-end gap-2 sm:gap-3">
      {data.map((day) => {
        const height = Math.max((day.revenue / maxRevenue) * 100, day.revenue > 0 ? 8 : 2);
        return (
          <div key={day.date} className="group flex flex-1 flex-col items-center gap-2">
            <div className="relative flex h-44 w-full items-end justify-center">
              <div
                className="w-full max-w-[2.5rem] rounded-t-lg bg-gradient-to-t from-olive to-olive/60 transition group-hover:from-bamboo group-hover:to-bamboo/70"
                style={{ height: `${height}%` }}
                title={`${day.label}: ${formatPrice(day.revenue, "tr")}`}
              />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-medium text-gray-500 sm:text-xs">{day.label}</p>
              {day.orders > 0 && (
                <p className="text-[10px] text-gray-400">{day.orders} sip.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RankList({
  items,
  type,
}: {
  type: "sales" | "favorites";
  items: AnalyticsData["topSellers"] | AnalyticsData["topFavorites"];
}) {
  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-400">
        Henüz veri yok
      </p>
    );
  }

  const max =
    type === "sales"
      ? Math.max(...(items as AnalyticsData["topSellers"]).map((i) => i.sold), 1)
      : Math.max(...(items as AnalyticsData["topFavorites"]).map((i) => i.count), 1);

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const value =
          type === "sales"
            ? (item as AnalyticsData["topSellers"]["0"]).sold
            : (item as AnalyticsData["topFavorites"]["0"]).count;
        const width = Math.max((value / max) * 100, 8);

        return (
          <div key={item.productId} className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
              {index + 1}
            </span>
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {item.image ? (
                <Image src={item.image} alt={item.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-400">
                  AB
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                <p className="shrink-0 text-sm font-semibold text-olive">
                  {type === "sales"
                    ? `${value} adet`
                    : `${value} fav`}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${
                    type === "sales"
                      ? "bg-gradient-to-r from-olive to-olive/70"
                      : "bg-gradient-to-r from-red-400 to-red-500"
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
              {type === "sales" && (
                <p className="mt-1 text-xs text-gray-400">
                  {formatPrice((item as AnalyticsData["topSellers"]["0"]).revenue, "tr")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminAnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const kpis = [
    {
      label: "14 Günlük Satış",
      value: formatPrice(data.summary.chartRevenueTotal, "tr"),
      sub: `${data.summary.chartOrdersTotal} sipariş`,
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Ort. Oturum Süresi",
      value: formatDuration(data.sessionStats.avgDurationSec),
      sub: `${data.sessionStats.totalSessions} oturum`,
      icon: Clock3,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Sayfa Görüntüleme",
      value: data.sessionStats.totalPageViews,
      sub: "Son kayıtlar",
      icon: Eye,
      color: "bg-violet-50 text-violet-700",
    },
    {
      label: "En Çok Ziyaret",
      value: data.locations[0]
        ? `${data.locations[0].city}`
        : "—",
      sub: data.locations[0]
        ? `${data.locations[0].country} · %${data.locations[0].percentage}`
        : "Veri yok",
      icon: MapPin,
      color: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="admin-card overflow-hidden bg-gradient-to-br from-[#1a1f1a] to-olive p-4 text-white sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-bamboo-light">
          <ShoppingBag className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium uppercase tracking-wider text-white/80">
            Tüm Zamanlar
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          <div>
            <p className="text-sm text-white/70">Toplam Gelir</p>
            <p className="mt-1 text-2xl font-semibold sm:text-3xl">
              {formatPrice(data.allTime.revenue, "tr")}
            </p>
          </div>
          <div>
            <p className="text-sm text-white/70">Toplam Sipariş</p>
            <p className="mt-1 text-2xl font-semibold sm:text-3xl">
              {data.allTime.orders}
            </p>
          </div>
          <div>
            <p className="text-sm text-white/70">Satılan Ürün</p>
            <p className="mt-1 text-2xl font-semibold sm:text-3xl">
              {data.allTime.itemsSold}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-white/50">
          Son güncelleme:{" "}
          {new Date(data.allTime.updatedAt).toLocaleString("tr-TR")}
          {" · "}İptal edilen siparişler hariç
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="admin-card p-3 sm:p-5">
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 sm:text-sm">{kpi.label}</p>
                <p className="mt-1 truncate text-lg font-semibold text-gray-900 sm:text-2xl">
                  {kpi.value}
                </p>
                <p className="mt-1 text-[10px] text-gray-400 sm:text-xs">
                  {kpi.sub}
                </p>
              </div>
              <div className={`hidden rounded-xl p-2.5 sm:block ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
        <div className="admin-card overflow-x-auto p-4 sm:p-5 xl:col-span-2">
          <div className="mb-4 sm:mb-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 sm:text-lg">
              <BarChart3 className="h-5 w-5 shrink-0 text-olive" />
              Satış Grafiği
            </h2>
            <p className="text-sm text-gray-500">Son 14 gün gelir trendi</p>
          </div>
          <div className="min-w-[320px]">
            <SalesChart data={data.salesChart} />
          </div>
        </div>

        <div className="admin-card p-4 sm:p-5">
          <div className="mb-4 sm:mb-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 sm:text-lg">
              <Globe2 className="h-5 w-5 shrink-0 text-olive" />
              Konum Dağılımı
            </h2>
            <p className="text-sm text-gray-500">
              Ziyaretçilerin şehir bazlı girişleri
            </p>
          </div>
          {data.locations.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              Henüz konum verisi yok
            </p>
          ) : (
            <div className="space-y-4">
              {data.locations.map((loc) => (
                <div key={`${loc.city}-${loc.country}`}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">
                      {loc.city}, {loc.country}
                    </span>
                    <span className="text-gray-500">
                      {loc.visits} · %{loc.percentage}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-bamboo to-olive"
                      style={{ width: `${loc.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="admin-card p-4 sm:p-5">
          <div className="mb-4 sm:mb-5">
            <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
              En Çok Satılanlar
            </h2>
            <p className="text-sm text-gray-500">
              Siparişlere göre ürün performansı
            </p>
          </div>
          <RankList type="sales" items={data.topSellers} />
        </div>

        <div className="admin-card p-4 sm:p-5">
          <div className="mb-4 sm:mb-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 sm:text-lg">
              <Heart className="h-5 w-5 shrink-0 text-red-500" />
              En Çok Favorilenenler
            </h2>
            <p className="text-sm text-gray-500">Favori eklenme sayıları</p>
          </div>
          <RankList type="favorites" items={data.topFavorites} />
        </div>
      </div>
    </div>
  );
}
