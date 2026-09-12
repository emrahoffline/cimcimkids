"use client";

import Image from "next/image";
import {
  BarChart3,
  Clock3,
  Eye,
  Globe2,
  Heart,
  MapPin,
  Radio,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { formatPrice } from "@/lib/products";
import { trafficSourceLabel } from "@/lib/analytics-traffic";

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
    uniqueVisitors: number;
  };
  locations: {
    city: string;
    country: string;
    visits: number;
    pageViews?: number;
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
  live?: {
    activeVisitors: number;
    viewsLast30m: number;
    bounceRate: number;
    bouncedSessions: number;
    endedSessions: number;
    pages: { path: string; label: string; views: number; visitors: number }[];
    cities: { city: string; country: string; visitors: number; views: number }[];
    exits: { path: string; label: string; count: number }[];
    sources: {
      source: string;
      sessions: number;
      orders: number;
      revenue: number;
    }[];
    viewedNotSold: {
      productId: string;
      name: string;
      image: string;
      views: number;
      sold: number;
    }[];
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
          <div key={item.productId} className="flex items-start gap-3">
            <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
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
              <p className="break-words text-sm font-medium leading-snug text-gray-900">
                {item.name}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-olive">
                {type === "sales" ? `${value} adet` : `${value} fav`}
              </p>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
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
  const live = data.live ?? {
    activeVisitors: 0,
    viewsLast30m: 0,
    bounceRate: 0,
    bouncedSessions: 0,
    endedSessions: 0,
    pages: [],
    cities: [],
    exits: [],
    sources: [],
    viewedNotSold: [],
  };
  const kpis = [
    {
      label: "14 Günlük Satış",
      value: formatPrice(data.summary.chartRevenueTotal, "tr"),
      sub: `${data.summary.chartOrdersTotal} sipariş`,
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Tekil Ziyaretçi",
      value: data.sessionStats.uniqueVisitors,
      sub: `${data.sessionStats.totalSessions} oturum`,
      icon: Globe2,
      color: "bg-sky-50 text-sky-700",
    },
    {
      label: "Ort. Oturum Süresi",
      value: formatDuration(data.sessionStats.avgDurationSec),
      sub: "Sekme kapanana kadar",
      icon: Clock3,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Sayfa Görüntüleme",
      value: data.sessionStats.totalPageViews,
      sub: "Tüm zamanlar",
      icon: Eye,
      color: "bg-violet-50 text-violet-700",
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

      <div className="admin-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 sm:text-lg">
              <Radio className="h-5 w-5 shrink-0 text-olive" />
              Canlı trafik
            </h2>
            <p className="text-sm text-gray-500">
              Son 30 dakika · 15 sn’de bir yenilenir
            </p>
          </div>
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-olive">
              {live.activeVisitors}
            </span>{" "}
            aktif · {live.viewsLast30m} görüntüleme
          </p>
        </div>
        {live.pages.length === 0 && live.cities.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Son 30 dakikada sayfa görüntüleme yok
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-x-auto">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Sayfalar
              </p>
              {live.pages.length === 0 ? (
                <p className="text-sm text-gray-400">Veri yok</p>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500">
                      <th className="pb-2 font-medium">Sayfa</th>
                      <th className="pb-2 text-right font-medium">Kişi</th>
                      <th className="pb-2 text-right font-medium">Görüntüleme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {live.pages.map((row) => (
                      <tr key={row.path} className="border-t border-gray-100">
                        <td className="py-2 pr-3 font-medium text-gray-800">
                          {row.label}
                        </td>
                        <td className="py-2 text-right tabular-nums text-gray-600">
                          {row.visitors}
                        </td>
                        <td className="py-2 text-right tabular-nums text-gray-600">
                          {row.views}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="overflow-x-auto">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Şehirler
              </p>
              {live.cities.length === 0 ? (
                <p className="text-sm text-gray-400">Veri yok</p>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500">
                      <th className="pb-2 font-medium">Şehir</th>
                      <th className="pb-2 text-right font-medium">Kişi</th>
                      <th className="pb-2 text-right font-medium">Görüntüleme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {live.cities.map((row) => (
                      <tr
                        key={`${row.city}-${row.country}`}
                        className="border-t border-gray-100"
                      >
                        <td className="py-2 pr-3 font-medium text-gray-800">
                          {row.city}
                          <span className="block text-xs font-normal text-gray-400 sm:ml-1 sm:inline sm:text-sm sm:text-gray-500">
                            {row.country}
                          </span>
                        </td>
                        <td className="py-2 text-right tabular-nums text-gray-600">
                          {row.visitors}
                        </td>
                        <td className="py-2 text-right tabular-nums text-gray-600">
                          {row.views}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="admin-card p-4 sm:p-5">
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
            Sitede kalma / çıkış
          </h2>
          <p className="mt-1 text-sm text-gray-500">Son 7 gün</p>
          <p className="mt-3 text-2xl font-semibold text-gray-900">
            %{live.bounceRate}
          </p>
          <p className="text-sm text-gray-500">
            tek sayfada çıkış oranı · {live.bouncedSessions}/
            {live.endedSessions} oturum
          </p>
          {live.exits.length === 0 ? (
            <p className="mt-6 text-sm text-gray-400">
              Çıkış sayfası henüz birikmedi
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {live.exits.map((row) => (
                <div
                  key={row.path}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate text-gray-800">
                    {row.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-gray-500">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card p-4 sm:p-5">
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
            Google’dan gelenler
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Son 7 gün oturum ve eşleşen sipariş
          </p>
          {live.sources.length === 0 ? (
            <p className="mt-6 text-sm text-gray-400">
              Kaynak etiketi yeni; Google Alışveriş tıklamaları bundan sonra
              görünür
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {live.sources.map((row) => (
                <div key={row.source}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-gray-800">
                      {trafficSourceLabel(row.source)}
                    </span>
                    <span className="text-gray-500">
                      {row.sessions} oturum · {row.orders} sipariş
                    </span>
                  </div>
                  {row.revenue > 0 ? (
                    <p className="text-xs text-olive">
                      {formatPrice(row.revenue, "tr")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="admin-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
          İlgi çeken, satılmayan
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Son 14 günde bakılan ama siparişe girmeyen ürünler
        </p>
        {live.viewedNotSold.length === 0 ? (
          <p className="py-6 text-sm text-gray-400">
            Şu an bu listede ürün yok
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {live.viewedNotSold.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.views} görüntüleme · 0 satış
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
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
              <MapPin className="h-5 w-5 shrink-0 text-olive" />
              Konum Dağılımı
            </h2>
            <p className="text-sm text-gray-500">
              Tüm zamanlar · tekil ziyaretçiye göre
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
                  <div className="mb-1 flex flex-col gap-0.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="min-w-0 break-words font-medium text-gray-800">
                      {loc.city}, {loc.country}
                    </span>
                    <span className="shrink-0 text-xs text-gray-500 sm:text-sm">
                      {loc.visits} ziyaretçi · %{loc.percentage}
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
