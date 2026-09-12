import type { AnalyticsEventType as PrismaEventType } from "@prisma/client";
import type { Order } from "./db";
import type { Product } from "./types";
import { prisma, requireDatabaseUrl } from "./prisma";
import {
  isTrafficSource,
  productSlugFromPath,
  describeStorePath,
} from "./analytics-traffic";
import { isGiftCardProductId } from "./gift-cards";
import { isGiftWrapProductId } from "./gift-wrap";
import { isShippingProductId } from "./shipping";

/** Keep recent raw events for favorites/detail; totals live in durable tables */
const MAX_EVENTS = 10000;

export type AnalyticsEventType =
  | "page_view"
  | "session_end"
  | "favorite_add"
  | "favorite_remove";

export type AnalyticsEvent = {
  id: string;
  type: AnalyticsEventType;
  sessionId: string;
  visitorId?: string;
  path?: string;
  productId?: string;
  productName?: string;
  durationSec?: number;
  country?: string;
  city?: string;
  timezone?: string;
  source?: string;
  referrer?: string;
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
  visitorId: string | null;
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
    visitorId: e.visitorId ?? undefined,
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

function locationId(city: string, country: string) {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
}

async function getEvents(): Promise<AnalyticsEvent[]> {
  requireDatabaseUrl();
  const rows = await prisma.analyticsEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: MAX_EVENTS,
  });
  return rows.map(mapEvent).reverse();
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

async function ensureTrafficRow() {
  await prisma.analyticsTraffic.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      pageViews: 0,
      sessions: 0,
      uniqueVisitors: 0,
      totalSessionDurationSec: 0,
      completedSessions: 0,
    },
    update: {},
  });
}

async function pruneEventsIfNeeded() {
  const count = await prisma.analyticsEvent.count();
  if (count <= MAX_EVENTS) return;
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

export async function recordAnalyticsEvent(
  event: Omit<AnalyticsEvent, "id" | "createdAt">
): Promise<void> {
  requireDatabaseUrl();
  await ensureTrafficRow();

  const visitorId = event.visitorId?.trim() || "";
  const sessionId = event.sessionId.trim();
  const city = event.city?.trim() || "Bilinmiyor";
  const country = event.country?.trim() || "Bilinmiyor";
  const locId = locationId(city, country);

  await prisma.analyticsEvent.create({
    data: {
      type: event.type,
      sessionId,
      visitorId: visitorId || null,
      path: event.path ?? null,
      productId: event.productId ?? null,
      productName: event.productName ?? null,
      durationSec: event.durationSec ?? null,
      country: event.country ?? null,
      city: event.city ?? null,
      timezone: event.timezone ?? null,
    },
  });

  if (event.type === "page_view" && visitorId && sessionId) {
    const landingPath = (event.path || "/").slice(0, 240);
    const source = isTrafficSource(event.source) ? event.source : null;
    const referrer = event.referrer?.trim().slice(0, 300) || null;
    await prisma.$transaction(async (tx) => {
      const existingVisitor = await tx.analyticsVisitor.findUnique({
        where: { id: visitorId },
      });
      const isNewVisitor = !existingVisitor;

      if (isNewVisitor) {
        await tx.analyticsVisitor.create({
          data: {
            id: visitorId,
            country,
            city,
            pageViews: 1,
            sessions: 1,
          },
        });
      } else {
        await tx.analyticsVisitor.update({
          where: { id: visitorId },
          data: {
            pageViews: { increment: 1 },
            lastSeenAt: new Date(),
            ...(existingVisitor.country
              ? {}
              : { country, city }),
          },
        });
      }

      const existingSession = await tx.analyticsSession.findUnique({
        where: { id: sessionId },
      });
      const isNewSession = !existingSession;

      if (isNewSession) {
        await tx.analyticsSession.create({
          data: {
            id: sessionId,
            visitorId,
            pageViews: 1,
            country,
            city,
            landingPath,
            exitPath: landingPath,
            source,
            referrer,
          },
        });
        if (!isNewVisitor) {
          await tx.analyticsVisitor.update({
            where: { id: visitorId },
            data: { sessions: { increment: 1 } },
          });
        }
      } else if (!existingSession.endedAt) {
        await tx.analyticsSession.update({
          where: { id: sessionId },
          data: { pageViews: { increment: 1 }, exitPath: landingPath },
        });
      }

      let isNewAtLocation = false;
      try {
        await tx.analyticsLocationVisitor.create({
          data: { visitorId, locationId: locId },
        });
        isNewAtLocation = true;
      } catch {
        // already counted for this location
      }

      const loc = await tx.analyticsLocation.findUnique({ where: { id: locId } });
      if (!loc) {
        await tx.analyticsLocation.create({
          data: {
            id: locId,
            city,
            country,
            pageViews: 1,
            uniqueVisitors: isNewAtLocation ? 1 : 0,
          },
        });
      } else {
        await tx.analyticsLocation.update({
          where: { id: locId },
          data: {
            pageViews: { increment: 1 },
            ...(isNewAtLocation ? { uniqueVisitors: { increment: 1 } } : {}),
          },
        });
      }

      await tx.analyticsTraffic.update({
        where: { id: 1 },
        data: {
          pageViews: { increment: 1 },
          ...(isNewVisitor ? { uniqueVisitors: { increment: 1 } } : {}),
          ...(isNewSession ? { sessions: { increment: 1 } } : {}),
        },
      });
    });
  }

  if (event.type === "session_end" && sessionId) {
    const duration = Math.max(0, Math.min(event.durationSec ?? 0, 7200));
    await prisma.$transaction(async (tx) => {
      const session = await tx.analyticsSession.findUnique({
        where: { id: sessionId },
      });
      if (!session || session.endedAt) return;

      await tx.analyticsSession.update({
        where: { id: sessionId },
        data: {
          endedAt: new Date(),
          durationSec: duration,
        },
      });

      if (duration >= 2) {
        await tx.analyticsTraffic.update({
          where: { id: 1 },
          data: {
            totalSessionDurationSec: { increment: duration },
            completedSessions: { increment: 1 },
          },
        });
      }
    });
  }

  await pruneEventsIfNeeded();
}

/** Calendar day key in Europe/Istanbul (YYYY-MM-DD) */
function istanbulDayKey(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function lastNIstanbulDays(n: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const cursor = new Date(Date.UTC(y, m - 1, day));

  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setUTCDate(cursor.getUTCDate() - i);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    days.push(`${yyyy}-${mm}-${dd}`);
  }
  return days;
}

function formatDayLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export function buildSalesChart(orders: Order[], days = 14) {
  const range = lastNIstanbulDays(days);
  const byDay = new Map(range.map((d) => [d, { revenue: 0, orders: 0 }]));

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const key = istanbulDayKey(order.createdAt);
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

async function getTrafficStats() {
  requireDatabaseUrl();
  await ensureTrafficRow();
  const row = await prisma.analyticsTraffic.findUniqueOrThrow({
    where: { id: 1 },
  });
  const avgDurationSec =
    row.completedSessions > 0
      ? Math.round(row.totalSessionDurationSec / row.completedSessions)
      : 0;

  return {
    avgDurationSec,
    totalSessions: row.sessions,
    totalPageViews: row.pageViews,
    uniqueVisitors: row.uniqueVisitors,
  };
}

async function getLocationStats(limit = 8) {
  requireDatabaseUrl();
  const rows = await prisma.analyticsLocation.findMany({
    orderBy: [{ uniqueVisitors: "desc" }, { pageViews: "desc" }],
    take: limit,
  });
  const totalVisitors =
    rows.reduce((s, r) => s + r.uniqueVisitors, 0) ||
    rows.reduce((s, r) => s + r.pageViews, 0) ||
    1;

  return rows.map((r) => ({
    city: r.city,
    country: r.country,
    visits: r.uniqueVisitors,
    pageViews: r.pageViews,
    percentage: Math.round(
      ((r.uniqueVisitors || r.pageViews) / totalVisitors) * 100
    ),
  }));
}

function isPaidOrder(order: Order) {
  return order.status !== "cancelled" && order.status !== "pending_payment";
}

export type LivePageRow = {
  path: string;
  label: string;
  views: number;
  visitors: number;
};

export type LiveExitRow = {
  path: string;
  label: string;
  count: number;
};

export type LiveSourceRow = {
  source: string;
  sessions: number;
  orders: number;
  revenue: number;
};

export type LiveInterestRow = {
  productId: string;
  name: string;
  image: string;
  views: number;
  sold: number;
};

export type LiveInsights = {
  activeVisitors: number;
  viewsLast30m: number;
  pages: LivePageRow[];
  bounceRate: number;
  bouncedSessions: number;
  endedSessions: number;
  exits: LiveExitRow[];
  sources: LiveSourceRow[];
  viewedNotSold: LiveInterestRow[];
};

async function buildLiveInsights(
  orders: Order[],
  products: Product[]
): Promise<LiveInsights> {
  requireDatabaseUrl();
  const now = Date.now();
  const thirtyMinAgo = new Date(now - 30 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const nameBySlug = new Map(products.map((p) => [p.slug, p.nameTr]));
  const productBySlug = new Map(products.map((p) => [p.slug, p]));

  const [liveViews, weekSessions, productViews] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { type: "page_view", createdAt: { gte: thirtyMinAgo } },
      select: { path: true, visitorId: true },
    }),
    prisma.analyticsSession.findMany({
      where: { startedAt: { gte: sevenDaysAgo } },
      select: {
        visitorId: true,
        pageViews: true,
        endedAt: true,
        exitPath: true,
        landingPath: true,
        source: true,
        startedAt: true,
      },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        type: "page_view",
        createdAt: { gte: fourteenDaysAgo },
        path: { contains: "/products/" },
      },
      select: { path: true },
    }),
  ]);

  const pageMap = new Map<
    string,
    { views: number; visitors: Set<string> }
  >();
  const liveVisitors = new Set<string>();
  for (const row of liveViews) {
    const path = row.path || "/";
    const bucket = pageMap.get(path) ?? { views: 0, visitors: new Set() };
    bucket.views += 1;
    if (row.visitorId) {
      bucket.visitors.add(row.visitorId);
      liveVisitors.add(row.visitorId);
    }
    pageMap.set(path, bucket);
  }
  const pages = [...pageMap.entries()]
    .map(([path, bucket]) => ({
      path,
      label: describeStorePath(path, nameBySlug),
      views: bucket.views,
      visitors: bucket.visitors.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const ended = weekSessions.filter((s) => s.endedAt);
  const bounced = ended.filter((s) => s.pageViews <= 1);
  const bounceRate =
    ended.length > 0 ? Math.round((bounced.length / ended.length) * 100) : 0;

  const exitMap = new Map<string, number>();
  for (const session of ended) {
    const path = session.exitPath || session.landingPath;
    if (!path) continue;
    exitMap.set(path, (exitMap.get(path) ?? 0) + 1);
  }
  const exits = [...exitMap.entries()]
    .map(([path, count]) => ({
      path,
      label: describeStorePath(path, nameBySlug),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const sourceSessionCounts = new Map<string, number>();
  for (const session of weekSessions) {
    const source = isTrafficSource(session.source) ? session.source : "direct";
    sourceSessionCounts.set(
      source,
      (sourceSessionCounts.get(source) ?? 0) + 1
    );
  }

  const paid = orders.filter(
    (order) => isPaidOrder(order) && new Date(order.createdAt) >= sevenDaysAgo
  );
  const emails = [...new Set(paid.map((o) => o.customerEmail.toLowerCase()))];
  const shoppers =
    emails.length === 0
      ? []
      : await prisma.shopperState.findMany({
          where: { email: { in: emails } },
          select: { email: true, visitorId: true },
        });
  const visitorByEmail = new Map(
    shoppers
      .filter((s) => s.visitorId)
      .map((s) => [s.email.toLowerCase(), s.visitorId as string])
  );
  const googleSessionsByVisitor = new Map<string, string>();
  for (const session of weekSessions) {
    if (
      session.source !== "google_shopping" &&
      session.source !== "google_organic" &&
      session.source !== "google_paid"
    ) {
      continue;
    }
    const prev = googleSessionsByVisitor.get(session.visitorId);
    if (!prev || session.source === "google_shopping") {
      googleSessionsByVisitor.set(session.visitorId, session.source);
    }
  }

  const sourceOrders = new Map<string, { orders: number; revenue: number }>();
  for (const order of paid) {
    const visitorId = visitorByEmail.get(order.customerEmail.toLowerCase());
    const source = visitorId
      ? googleSessionsByVisitor.get(visitorId) || "direct"
      : "direct";
    const bucket = sourceOrders.get(source) ?? { orders: 0, revenue: 0 };
    bucket.orders += 1;
    bucket.revenue += order.total;
    sourceOrders.set(source, bucket);
  }

  const sourceKeys = [
    "google_shopping",
    "google_organic",
    "google_paid",
    "instagram",
    "direct",
    "referral",
  ];
  const sources = sourceKeys
    .map((source) => ({
      source,
      sessions: sourceSessionCounts.get(source) ?? 0,
      orders: sourceOrders.get(source)?.orders ?? 0,
      revenue: sourceOrders.get(source)?.revenue ?? 0,
    }))
    .filter((row) => row.sessions > 0 || row.orders > 0);

  const viewCounts = new Map<string, number>();
  for (const row of productViews) {
    const slug = productSlugFromPath(row.path || "");
    if (!slug) continue;
    viewCounts.set(slug, (viewCounts.get(slug) ?? 0) + 1);
  }
  const soldCounts = new Map<string, number>();
  for (const order of orders.filter(
    (o) => isPaidOrder(o) && new Date(o.createdAt) >= fourteenDaysAgo
  )) {
    for (const item of order.items) {
      if (
        isGiftCardProductId(item.productId) ||
        isGiftWrapProductId(item.productId) ||
        isShippingProductId(item.productId)
      ) {
        continue;
      }
      soldCounts.set(
        item.productId,
        (soldCounts.get(item.productId) ?? 0) + item.quantity
      );
    }
  }

  const viewedNotSold = [...viewCounts.entries()]
    .map(([slug, views]) => {
      const product = productBySlug.get(slug);
      if (!product) return null;
      if (
        isGiftCardProductId(product.id) ||
        isGiftWrapProductId(product.id) ||
        isShippingProductId(product.id)
      ) {
        return null;
      }
      const sold = soldCounts.get(product.id) ?? 0;
      if (sold > 0) return null;
      return {
        productId: product.id,
        name: product.nameTr,
        image: product.image ?? "",
        views,
        sold,
      };
    })
    .filter((row): row is LiveInterestRow => Boolean(row))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  return {
    activeVisitors: liveVisitors.size,
    viewsLast30m: liveViews.length,
    pages,
    bounceRate,
    bouncedSessions: bounced.length,
    endedSessions: ended.length,
    exits,
    sources,
    viewedNotSold,
  };
}

/** One-time backfill from legacy event log into durable counters (no new events). */
async function bootstrapTrafficFromLegacyEvents() {
  requireDatabaseUrl();
  await ensureTrafficRow();
  const traffic = await prisma.analyticsTraffic.findUnique({ where: { id: 1 } });
  if (!traffic || traffic.pageViews > 0) return;

  const pageViews = await prisma.analyticsEvent.findMany({
    where: { type: "page_view" },
    orderBy: { createdAt: "asc" },
  });
  if (pageViews.length === 0) return;

  const visitorIds = new Set<string>();
  const sessionIds = new Set<string>();
  const locVisitors = new Map<string, Set<string>>();
  const locViews = new Map<string, { city: string; country: string; views: number }>();

  for (const e of pageViews) {
    const vid = e.visitorId || `legacy_${e.sessionId}`;
    visitorIds.add(vid);
    sessionIds.add(e.sessionId);
    const city = e.city?.trim() || "Bilinmiyor";
    const country = e.country?.trim() || "Bilinmiyor";
    const lid = locationId(city, country);
    if (!locVisitors.has(lid)) locVisitors.set(lid, new Set());
    locVisitors.get(lid)!.add(vid);
    const lv = locViews.get(lid) ?? { city, country, views: 0 };
    lv.views += 1;
    locViews.set(lid, lv);

    await prisma.analyticsVisitor.upsert({
      where: { id: vid },
      create: {
        id: vid,
        country,
        city,
        pageViews: 1,
        sessions: 1,
      },
      update: { pageViews: { increment: 1 }, lastSeenAt: new Date() },
    });
    await prisma.analyticsSession.upsert({
      where: { id: e.sessionId },
      create: {
        id: e.sessionId,
        visitorId: vid,
        pageViews: 1,
        country,
        city,
      },
      update: { pageViews: { increment: 1 } },
    });
  }

  const ends = await prisma.analyticsEvent.findMany({
    where: { type: "session_end", durationSec: { gte: 2 } },
  });
  let totalDur = 0;
  let completed = 0;
  const ended = new Set<string>();
  for (const e of ends) {
    if (ended.has(e.sessionId)) continue;
    ended.add(e.sessionId);
    const dur = Math.min(e.durationSec ?? 0, 7200);
    totalDur += dur;
    completed += 1;
    await prisma.analyticsSession.updateMany({
      where: { id: e.sessionId, endedAt: null },
      data: { endedAt: e.createdAt, durationSec: dur },
    });
  }

  for (const [lid, meta] of locViews) {
    const uniques = locVisitors.get(lid)?.size ?? 0;
    await prisma.analyticsLocation.upsert({
      where: { id: lid },
      create: {
        id: lid,
        city: meta.city,
        country: meta.country,
        pageViews: meta.views,
        uniqueVisitors: uniques,
      },
      update: {
        pageViews: meta.views,
        uniqueVisitors: uniques,
      },
    });
    for (const vid of locVisitors.get(lid) ?? []) {
      await prisma.analyticsLocationVisitor.upsert({
        where: {
          visitorId_locationId: { visitorId: vid, locationId: lid },
        },
        create: { visitorId: vid, locationId: lid },
        update: {},
      });
    }
  }

  await prisma.analyticsTraffic.update({
    where: { id: 1 },
    data: {
      pageViews: pageViews.length,
      sessions: sessionIds.size,
      uniqueVisitors: visitorIds.size,
      totalSessionDurationSec: totalDur,
      completedSessions: completed,
    },
  });
}

export async function getAdminAnalytics(orders: Order[], products: Product[]) {
  await bootstrapTrafficFromLegacyEvents();

  const events = await getEvents();
  const sessionStats = await getTrafficStats();
  const locations = await getLocationStats();
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
  const live = await buildLiveInsights(orders, products);

  return {
    allTime,
    salesChart,
    topSellers: buildTopSellers(orders, products),
    topFavorites: buildTopFavorites(events, products),
    sessionStats,
    locations,
    live,
    summary: {
      chartRevenueTotal: salesChart.reduce((s, d) => s + d.revenue, 0),
      chartOrdersTotal: salesChart.reduce((s, d) => s + d.orders, 0),
    },
  };
}
