"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminAnalyticsDashboard } from "@/components/admin/AdminAnalyticsDashboard";

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

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/admin/analytics")
        .then((r) => r.json())
        .then(setData)
        .catch(() => setData(null));

    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <AdminHeader title="İstatistikler & Raporlar" />
      <main className="admin-main">
        {!data ? (
          <div className="admin-card p-8 text-center text-gray-400 sm:p-10">
            İstatistikler yükleniyor...
          </div>
        ) : (
          <AdminAnalyticsDashboard data={data} />
        )}
      </main>
    </>
  );
}
