"use client";

import { useMemo, useState } from "react";
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
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { formatPrice } from "@/lib/products";
import { trafficSourceLabel } from "@/lib/analytics-traffic";

type TrafficRangeKey = "live" | "day" | "week" | "month";
type SalesRangeKey = "daily" | "weekly" | "monthly";

type AnalyticsData = {
  salesChart: {
    date: string;
    label: string;
    revenue: number;
    orders: number;
  }[];
  salesCharts?: Record<SalesRangeKey, AnalyticsData["salesChart"]>;
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
  cartProducts: {
    productId: string;
    name: string;
    image: string;
    quantity: number;
    carts: number;
    value: number;
    lastUpdatedAt: string;
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
    ranges?: Record<
      TrafficRangeKey,
      {
        visitors: number;
        views: number;
        pages: { path: string; label: string; views: number; visitors: number }[];
        cities: {
          city: string;
          country: string;
          visitors: number;
          views: number;
        }[];
      }
    >;
  };
};

const TRAFFIC_RANGES: {
  id: TrafficRangeKey;
  label: string;
  hint: string;
}[] = [
  { id: "live", label: "Canlı", hint: "Son 30 dakika" },
  { id: "day", label: "Bugün", hint: "Bugün 00:00’dan beri" },
  { id: "week", label: "7 gün", hint: "Son 7 gün" },
  { id: "month", label: "Bu ay", hint: "Ayın başından beri" },
];

const SALES_RANGES: {
  id: SalesRangeKey;
  label: string;
  hint: string;
  summaryLabel: string;
}[] = [
  {
    id: "daily",
    label: "Günlük",
    hint: "Son 14 gün gelir trendi",
    summaryLabel: "14 Günlük Satış",
  },
  {
    id: "weekly",
    label: "Haftalık",
    hint: "Son 12 hafta gelir trendi",
    summaryLabel: "12 Haftalık Satış",
  },
  {
    id: "monthly",
    label: "Aylık",
    hint: "Son 12 ay gelir trendi",
    summaryLabel: "12 Aylık Satış",
  },
];

const EMPTY_RANGE = {
  visitors: 0,
  views: 0,
  pages: [] as { path: string; label: string; views: number; visitors: number }[],
  cities: [] as {
    city: string;
    country: string;
    visitors: number;
    views: number;
  }[],
};

function TrafficStatList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: {
    key: string;
    label: string;
    sub?: string;
    visitors: number;
    views: number;
  }[];
}) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        {title}
        {rows.length > 0 ? (
          <span className="ml-1 font-normal normal-case text-gray-400">
            ({rows.length})
          </span>
        ) : null}
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">{empty}</p>
      ) : (
        <div className="max-h-72 overflow-y-auto overscroll-contain sm:max-h-80">
          <div className="hidden grid-cols-[minmax(0,1fr)_4.5rem_5.5rem] gap-2 pb-2 text-xs text-gray-500 sm:grid">
            <span>{title === "Şehirler" ? "Şehir" : "Sayfa"}</span>
            <span className="text-right">Kişi</span>
            <span className="text-right">Görüntüleme</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {rows.map((row) => (
              <li
                key={row.key}
                className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[minmax(0,1fr)_4.5rem_5.5rem] sm:items-start sm:gap-2"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium leading-snug text-gray-800">
                    {row.label}
                  </p>
                  {row.sub ? (
                    <p className="break-words text-xs text-gray-400">{row.sub}</p>
                  ) : null}
                </div>
                <div className="flex gap-4 text-xs tabular-nums text-gray-500 sm:contents">
                  <p className="sm:pt-0.5 sm:text-right sm:text-sm sm:text-gray-600">
                    <span className="sm:hidden">{row.visitors} kişi</span>
                    <span className="hidden sm:inline">{row.visitors}</span>
                  </p>
                  <p className="sm:pt-0.5 sm:text-right sm:text-sm sm:text-gray-600">
                    <span className="sm:hidden">{row.views} görünt.</span>
                    <span className="hidden sm:inline">{row.views}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

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
  const [trafficRange, setTrafficRange] = useState<TrafficRangeKey>("live");
  const [salesRange, setSalesRange] = useState<SalesRangeKey>("daily");
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
    ranges: {
      live: EMPTY_RANGE,
      day: EMPTY_RANGE,
      week: EMPTY_RANGE,
      month: EMPTY_RANGE,
    },
  };
  const ranges = live.ranges ?? {
    live: {
      visitors: live.activeVisitors,
      views: live.viewsLast30m,
      pages: live.pages,
      cities: live.cities,
    },
    day: EMPTY_RANGE,
    week: EMPTY_RANGE,
    month: EMPTY_RANGE,
  };
  const snapshot = ranges[trafficRange] ?? EMPTY_RANGE;
  const rangeMeta =
    TRAFFIC_RANGES.find((item) => item.id === trafficRange) ?? TRAFFIC_RANGES[0];
  const stayRate = Math.max(0, 100 - live.bounceRate);
  const pageRows = useMemo(
    () =>
      snapshot.pages.map((row) => ({
        key: row.path,
        label: row.label,
        visitors: row.visitors,
        views: row.views,
      })),
    [snapshot.pages]
  );
  const cityRows = useMemo(
    () =>
      snapshot.cities.map((row) => ({
        key: `${row.city}-${row.country}`,
        label: row.city,
        sub: row.country,
        visitors: row.visitors,
        views: row.views,
      })),
    [snapshot.cities]
  );
  const salesRangeMeta =
    SALES_RANGES.find((item) => item.id === salesRange) ?? SALES_RANGES[0];
  const selectedSalesChart =
    data.salesCharts?.[salesRange] ?? data.salesChart;
  const selectedSalesTotal = selectedSalesChart.reduce(
    (totals, item) => ({
      revenue: totals.revenue + item.revenue,
      orders: totals.orders + item.orders,
    }),
    { revenue: 0, orders: 0 }
  );
  const kpis = [
    {
      label: salesRangeMeta.summaryLabel,
      value: formatPrice(selectedSalesTotal.revenue, "tr"),
      sub: `${selectedSalesTotal.orders} sipariş`,
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
      <div
        className="admin-card overflow-hidden p-4 text-white sm:p-6"
        style={{
          background: "linear-gradient(135deg, #1a1f1a 0%, #3db8a8 100%)",
        }}
      >
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

      <div className="admin-card min-w-0 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 sm:text-lg">
                <Radio className="h-5 w-5 shrink-0 text-olive" />
                Canlı trafik
              </h2>
              <p className="text-sm text-gray-500">
                {rangeMeta.hint}
                {trafficRange === "live" ? " · 15 sn’de bir yenilenir" : ""}
              </p>
            </div>
            <p className="shrink-0 text-sm text-gray-600">
              <span className="font-semibold text-olive">{snapshot.visitors}</span>{" "}
              kişi · {snapshot.views} görüntüleme
            </p>
          </div>
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
            {TRAFFIC_RANGES.map((item) => {
              const active = item.id === trafficRange;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTrafficRange(item.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-olive text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
        {snapshot.pages.length === 0 && snapshot.cities.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Bu dönemde sayfa görüntüleme yok
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <TrafficStatList
              title="Sayfalar"
              empty="Sayfa verisi yok"
              rows={pageRows}
            />
            <TrafficStatList
              title="Şehirler"
              empty="Şehir verisi yok"
              rows={cityRows}
            />
          </div>
        )}
      </div>

      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="admin-card min-w-0 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
            Sitede kalma / çıkış
          </h2>
          <p className="mt-1 text-sm text-gray-500">Son 7 gün</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-xl bg-emerald-50 px-3 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                Sitede kaldı
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-800">
                %{stayRate}
              </p>
              <p className="mt-1 break-words text-xs leading-snug text-emerald-700/80">
                {Math.max(0, live.endedSessions - live.bouncedSessions)} oturum
              </p>
            </div>
            <div className="rounded-xl bg-rose-50 px-3 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-rose-700">
                Tek sayfada çıktı
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-rose-800">
                %{live.bounceRate}
              </p>
              <p className="mt-1 break-words text-xs leading-snug text-rose-700/80">
                {live.bouncedSessions}/{live.endedSessions} oturum
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-500">
            Çıkış sayfaları
          </p>
          {live.exits.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400">
              Çıkış sayfası henüz birikmedi
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100">
              {live.exits.map((row) => (
                <li
                  key={row.path}
                  className="flex items-start justify-between gap-3 py-2.5 text-sm"
                >
                  <span className="min-w-0 break-words leading-snug text-gray-800">
                    {row.label}
                  </span>
                  <span className="shrink-0 pt-0.5 tabular-nums text-gray-500">
                    {row.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin-card min-w-0 p-4 sm:p-5">
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
                <div key={row.source} className="min-w-0">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <span className="break-words font-medium text-gray-800">
                      {trafficSourceLabel(row.source)}
                    </span>
                    <span className="shrink-0 text-sm text-gray-500">
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
        <div className="mb-4 sm:mb-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 sm:text-lg">
            <ShoppingCart className="h-5 w-5 shrink-0 text-bamboo" />
            Sepetlerdeki Ürünler
          </h2>
          <p className="text-sm text-gray-500">
            Kayıtlı müşterilerin güncel sepetleri · 15 sn’de bir yenilenir
          </p>
        </div>
        {data.cartProducts.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            Müşteri sepetlerinde ürün yok
          </p>
        ) : (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {data.cartProducts.map((item) => (
              <div
                key={item.productId}
                className="flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-gray-100 p-3"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
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
                  <p className="line-clamp-2 break-words text-sm font-medium leading-snug text-gray-900">
                    {item.name}
                  </p>
                  <p className="mt-0.5 break-words text-sm font-semibold text-olive">
                    {item.quantity} adet · {item.carts} sepette
                  </p>
                  <p className="break-words text-xs text-gray-400">
                    Toplam {formatPrice(item.value, "tr")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
        <div className="admin-card overflow-x-auto p-4 sm:p-5 xl:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 sm:text-lg">
                <BarChart3 className="h-5 w-5 shrink-0 text-olive" />
                Gelir Grafiği
              </h2>
              <p className="text-sm text-gray-500">{salesRangeMeta.hint}</p>
            </div>
            <div className="flex gap-1">
              {SALES_RANGES.map((item) => {
                const active = item.id === salesRange;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSalesRange(item.id)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "bg-olive text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="min-w-[560px]">
            <SalesChart data={selectedSalesChart} />
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
