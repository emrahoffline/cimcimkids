import { promises as fs } from "fs";
import path from "path";
import type { Order, OrderItem } from "./db";
import type { Product } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
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

type AnalyticsStore = {
  events: AnalyticsEvent[];
  allTime?: AllTimeTotals;
};

export type AllTimeTotals = {
  revenue: number;
  orders: number;
  itemsSold: number;
  updatedAt: string;
};

async function readStore(): Promise<AnalyticsStore> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, "analytics.json"), "utf-8");
    return JSON.parse(raw) as AnalyticsStore;
  } catch {
    return { events: [] };
  }
}

async function writeStore(store: AnalyticsStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const events = store.events.slice(-MAX_EVENTS);
  await fs.writeFile(
    path.join(DATA_DIR, "analytics.json"),
    JSON.stringify({ events, allTime: store.allTime }, null, 2),
    "utf-8"
  );
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
  const store = await readStore();
  const allTime = buildAllTimeStats(orders);
  store.allTime = allTime;
  await writeStore(store);
  return allTime;
}

export async function getStoredAllTimeTotals(): Promise<AllTimeTotals | null> {
  const store = await readStore();
  return store.allTime ?? null;
}

export async function recordAnalyticsEvent(
  event: Omit<AnalyticsEvent, "id" | "createdAt">
): Promise<void> {
  const store = await readStore();
  store.events.push({
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  });
  await writeStore(store);
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
    const delta = event.type === "favorite_add" ? 1 : event.type === "favorite_remove" ? -1 : 0;
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
  const store = await readStore();
  const sessionStats = buildSessionStats(store.events);
  const allTime = buildAllTimeStats(orders);

  if (
    !store.allTime ||
    store.allTime.revenue !== allTime.revenue ||
    store.allTime.orders !== allTime.orders
  ) {
    await syncAllTimeTotals(orders);
  }

  return {
    allTime,
    salesChart: buildSalesChart(orders, 14),
    topSellers: buildTopSellers(orders, products),
    topFavorites: buildTopFavorites(store.events, products),
    sessionStats,
    locations: buildLocationStats(store.events),
    summary: {
      chartRevenueTotal: buildSalesChart(orders, 14).reduce((s, d) => s + d.revenue, 0),
      chartOrdersTotal: buildSalesChart(orders, 14).reduce((s, d) => s + d.orders, 0),
    },
  };
}
