import type { AnalyticsEventType as PrismaEventType } from "@prisma/client";
import type { Order } from "./db";
import type { Product } from "./types";
import { prisma, requireDatabaseUrl } from "./prisma";

const MAX_EVENTS = 3000;

export type AnalyticsEventType =
  | "page_view"
  | "session_end"
  | "favorite_add"
  | "favorite_remove";

export type AnalyticsEvent = {
  id: string;
  type: AnalyticsEventType;
  sessionId: string;
  path?: string;
  productId?: string;
  productName?: string;
  durationSec?: number;
  country?: string;
  city?: string;
  timezone?: string;
  createdAt: string;
};

export type AllTimeTotals = {
  revenue: number;
  orders: number;
  itemsSold: number;
  updatedAt: string;
};

function mapEvent(e: {
  id: string;
  type: PrismaEventType;
  sessionId: string;
  path: string | null;
  productId: string | null;
  productName: string | null;
  durationSec: number | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  createdAt: Date;
}): AnalyticsEvent {
  return {
    id: e.id,
    type: e.type,
    sessionId: e.sessionId,
    path: e.path ?? undefined,
    productId: e.productId ?? undefined,
    productName: e.productName ?? undefined,
    durationSec: e.durationSec ?? undefined,
    country: e.country ?? undefined,
    city: e.city ?? undefined,
    timezone: e.timezone ?? undefined,
    createdAt: e.createdAt.toISOString(),
  };
}

async function getEvents(): Promise<AnalyticsEvent[]> {
  requireDatabaseUrl();
  const rows = await prisma.analyticsEvent.findMany({
    orderBy: { createdAt: "asc" },
    take: MAX_EVENTS,
  });
  return rows.map(mapEvent);
}

export function buildAllTimeStats(orders: Order[]): AllTimeTotals {
  const valid = orders.filter((o) => o.status !== "cancelled");

  return {
    revenue: valid.reduce((sum, order) => sum + order.total, 0),
    orders: valid.length,
    itemsSold: valid.reduce(
      (sum, order) =>
        sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    ),
    updatedAt: new Date().toISOString(),
  };
}

export async function syncAllTimeTotals(orders: Order[]): Promise<AllTimeTotals> {
  requireDatabaseUrl();
  const allTime = buildAllTimeStats(orders);
  await prisma.analyticsAllTime.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      revenue: allTime.revenue,
      orders: allTime.orders,
      itemsSold: allTime.itemsSold,
    },
    update: {
      revenue: allTime.revenue,
      orders: allTime.orders,
      itemsSold: allTime.itemsSold,
    },
  });
  return allTime;
}

export async function getStoredAllTimeTotals(): Promise<AllTimeTotals | null> {
  requireDatabaseUrl();
  const row = await prisma.analyticsAllTime.findUnique({ where: { id: 1 } });
  if (!row) return null;
  return {
    revenue: row.revenue,
    orders: row.orders,
    itemsSold: row.itemsSold,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function recordAnalyticsEvent(
  event: Omit<AnalyticsEvent, "id" | "createdAt">
): Promise<void> {
  requireDatabaseUrl();
  await prisma.analyticsEvent.create({
    data: {
      type: event.type,
      sessionId: event.sessionId,
      path: event.path ?? null,
      productId: event.productId ?? null,
      productName: event.productName ?? null,
      durationSec: event.durationSec ?? null,
      country: event.country ?? null,
      city: event.city ?? null,
      timezone: event.timezone ?? null,
    },
  });

  const count = await prisma.analyticsEvent.count();
  if (count > MAX_EVENTS) {
    const oldest = await prisma.analyticsEvent.findMany({
      orderBy: { createdAt: "asc" },
      take: count - MAX_EVENTS,
      select: { id: true },
    });
    if (oldest.length) {
      await prisma.analyticsEvent.deleteMany({
        where: { id: { in: oldest.map((e) => e.id) } },
      });
    }
  }
}

function dayKey(date: string) {
  return date.slice(0, 10);
}

function lastNDays(n: number) {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function formatDayLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export function buildSalesChart(orders: Order[], days = 14) {
  const range = lastNDays(days);
  const byDay = new Map(range.map((d) => [d, { revenue: 0, orders: 0 }]));

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const key = dayKey(order.createdAt);
    const bucket = byDay.get(key);
    if (bucket) {
      bucket.revenue += order.total;
      bucket.orders += 1;
    }
  }

  return range.map((date) => ({
    date,
    label: formatDayLabel(date),
    revenue: byDay.get(date)?.revenue ?? 0,
    orders: byDay.get(date)?.orders ?? 0,
  }));
}

export function buildTopSellers(orders: Order[], products: Product[], limit = 5) {
  const counts = new Map<string, { sold: number; revenue: number; name: string }>();

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    for (const item of order.items) {
      const existing = counts.get(item.productId) ?? {
        sold: 0,
        revenue: 0,
        name: item.name,
      };
      existing.sold += item.quantity;
      existing.revenue += item.price * item.quantity;
      counts.set(item.productId, existing);
    }
  }

  return [...counts.entries()]
    .map(([productId, data]) => {
      const product = products.find((p) => p.id === productId);
      return {
        productId,
        name: product?.nameTr ?? data.name,
        image: product?.image ?? "",
        sold: data.sold,
        revenue: data.revenue,
      };
    })
    .sort((a, b) => b.sold - a.sold)
    .slice(0, limit);
}

export function buildTopFavorites(
  events: AnalyticsEvent[],
  products: Product[],
  limit = 5
) {
  const counts = new Map<string, number>();

  for (const event of events) {
    if (!event.productId) continue;
    const delta =
      event.type === "favorite_add"
        ? 1
        : event.type === "favorite_remove"
          ? -1
          : 0;
    if (delta === 0) continue;
    counts.set(event.productId, (counts.get(event.productId) ?? 0) + delta);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .map(([productId, count]) => {
      const product = products.find((p) => p.id === productId);
      const lastName =
        events.findLast(
          (e) => e.productId === productId && e.productName
        )?.productName ?? productId;
      return {
        productId,
        name: product?.nameTr ?? lastName,
        image: product?.image ?? "",
        count,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function buildSessionStats(events: AnalyticsEvent[]) {
  const sessions = events.filter((e) => e.type === "session_end" && e.durationSec);
  const pageViews = events.filter((e) => e.type === "page_view");
  const uniqueSessions = new Set(pageViews.map((e) => e.sessionId)).size;

  if (sessions.length === 0) {
    return {
      avgDurationSec: 0,
      totalSessions: uniqueSessions,
      totalPageViews: pageViews.length,
    };
  }

  const totalDuration = sessions.reduce((sum, e) => sum + (e.durationSec ?? 0), 0);
  return {
    avgDurationSec: Math.round(totalDuration / sessions.length),
    totalSessions: uniqueSessions,
    totalPageViews: pageViews.length,
  };
}

export function buildLocationStats(events: AnalyticsEvent[], limit = 8) {
  const views = events.filter((e) => e.type === "page_view");
  const counts = new Map<string, { city: string; country: string; visits: number }>();

  for (const event of views) {
    const city = event.city?.trim() || "Bilinmiyor";
    const country = event.country?.trim() || "Bilinmiyor";
    const key = `${city}|${country}`;
    const existing = counts.get(key) ?? { city, country, visits: 0 };
    existing.visits += 1;
    counts.set(key, existing);
  }

  const total = views.length || 1;
  return [...counts.values()]
    .sort((a, b) => b.visits - a.visits)
    .slice(0, limit)
    .map((item) => ({
      ...item,
      percentage: Math.round((item.visits / total) * 100),
    }));
}

export async function getAdminAnalytics(orders: Order[], products: Product[]) {
  const events = await getEvents();
  const sessionStats = buildSessionStats(events);
  const allTime = buildAllTimeStats(orders);
  const stored = await getStoredAllTimeTotals();

  if (
    !stored ||
    stored.revenue !== allTime.revenue ||
    stored.orders !== allTime.orders
  ) {
    await syncAllTimeTotals(orders);
  }

  const salesChart = buildSalesChart(orders, 14);

  return {
    allTime,
    salesChart,
    topSellers: buildTopSellers(orders, products),
    topFavorites: buildTopFavorites(events, products),
    sessionStats,
    locations: buildLocationStats(events),
    summary: {
      chartRevenueTotal: salesChart.reduce((s, d) => s + d.revenue, 0),
      chartOrdersTotal: salesChart.reduce((s, d) => s + d.orders, 0),
    },
  };
}
