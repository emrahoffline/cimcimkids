/**
 * JSON dosyalarındaki veriyi PostgreSQL'e aktarır.
 *
 * Kullanım:
 *   1. .env.local içine DATABASE_URL ekleyin
 *   2. npx prisma migrate dev --name init
 *   3. npm run db:migrate-json
 *
 * Idempotent: aynı id'ler upsert edilir.
 */
import { promises as fs } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const DATA_DIR = path.join(process.cwd(), "data");
const prisma = new PrismaClient();

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, filename), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`  ⚠ ${filename} yok veya okunamadı, atlanıyor`);
    return fallback;
  }
}

type JsonProduct = {
  id: string;
  slug: string;
  image: string;
  price: number;
  category: string;
  translationKey?: string;
  nameTr: string;
  nameEn: string;
  descTr: string;
  descEn: string;
  inStock: boolean;
};

type JsonCategory = { slug: string; nameTr: string; nameEn: string };

type JsonCustomer = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "admin" | "customer";
  passwordHash?: string;
  createdAt: string;
  lastLoginAt: string;
  orderCount: number;
  totalSpent: number;
};

type JsonOrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

type JsonOrder = {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  items: JsonOrderItem[];
  total: number;
  status:
    | "pending_payment"
    | "pending"
    | "confirmed"
    | "preparing"
    | "shipped"
    | "delivered"
    | "cancelled";
  createdAt: string;
  shippingAddress?: string;
  adminSeen?: boolean;
};

type JsonSubscriber = {
  id: string;
  email: string;
  locale: string;
  createdAt: string;
  source?: "newsletter" | "checkout";
};

type JsonAnalytics = {
  events?: Array<{
    id: string;
    type:
      | "page_view"
      | "session_end"
      | "favorite_add"
      | "favorite_remove";
    sessionId: string;
    path?: string;
    productId?: string;
    productName?: string;
    durationSec?: number;
    country?: string;
    city?: string;
    timezone?: string;
    createdAt: string;
  }>;
  allTime?: {
    revenue: number;
    orders: number;
    itemsSold: number;
    updatedAt: string;
  };
};

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL eksik. .env.local dosyasına ekleyin.");
  }

  console.log("→ Kategoriler...");
  const categories = await readJson<JsonCategory[]>("categories.json", []);
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: { nameTr: c.nameTr, nameEn: c.nameEn },
    });
  }
  console.log(`  ✓ ${categories.length} kategori`);

  console.log("→ Ürünler...");
  const products = await readJson<JsonProduct[]>("products.json", []);
  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        slug: p.slug,
        image: p.image,
        price: p.price,
        category: p.category,
        translationKey: p.translationKey ?? null,
        nameTr: p.nameTr,
        nameEn: p.nameEn,
        descTr: p.descTr,
        descEn: p.descEn,
        inStock: p.inStock ?? true,
      },
      update: {
        slug: p.slug,
        image: p.image,
        price: p.price,
        category: p.category,
        translationKey: p.translationKey ?? null,
        nameTr: p.nameTr,
        nameEn: p.nameEn,
        descTr: p.descTr,
        descEn: p.descEn,
        inStock: p.inStock ?? true,
      },
    });
  }
  console.log(`  ✓ ${products.length} ürün`);

  console.log("→ Müşteriler...");
  const customers = await readJson<JsonCustomer[]>("customers.json", []);
  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        email: c.email.toLowerCase(),
        name: c.name,
        image: c.image,
        role: c.role,
        passwordHash: c.passwordHash ?? null,
        createdAt: new Date(c.createdAt),
        lastLoginAt: new Date(c.lastLoginAt),
        orderCount: c.orderCount ?? 0,
        totalSpent: c.totalSpent ?? 0,
      },
      update: {
        email: c.email.toLowerCase(),
        name: c.name,
        image: c.image,
        role: c.role,
        passwordHash: c.passwordHash ?? null,
        lastLoginAt: new Date(c.lastLoginAt),
        orderCount: c.orderCount ?? 0,
        totalSpent: c.totalSpent ?? 0,
      },
    });
  }
  console.log(`  ✓ ${customers.length} müşteri`);

  console.log("→ Siparişler...");
  const orders = await readJson<JsonOrder[]>("orders.json", []);
  for (const o of orders) {
    await prisma.order.upsert({
      where: { id: o.id },
      create: {
        id: o.id,
        orderNumber: o.orderNumber,
        customerEmail: o.customerEmail,
        customerName: o.customerName,
        customerPhone: o.customerPhone ?? null,
        total: o.total,
        status: o.status,
        shippingAddress: o.shippingAddress ?? null,
        adminSeen: o.adminSeen ?? true,
        createdAt: new Date(o.createdAt),
        items: {
          create: o.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
        },
      },
      update: {
        orderNumber: o.orderNumber,
        customerEmail: o.customerEmail,
        customerName: o.customerName,
        customerPhone: o.customerPhone ?? null,
        total: o.total,
        status: o.status,
        shippingAddress: o.shippingAddress ?? null,
        adminSeen: o.adminSeen ?? true,
        items: {
          deleteMany: {},
          create: o.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
        },
      },
    });
  }
  console.log(`  ✓ ${orders.length} sipariş`);

  console.log("→ Aboneler...");
  const subscribers = await readJson<JsonSubscriber[]>("subscribers.json", []);
  for (const s of subscribers) {
    await prisma.subscriber.upsert({
      where: { email: s.email.toLowerCase() },
      create: {
        id: s.id,
        email: s.email.toLowerCase(),
        locale: s.locale === "en" ? "en" : "tr",
        source: s.source ?? "newsletter",
        createdAt: new Date(s.createdAt),
      },
      update: {
        locale: s.locale === "en" ? "en" : "tr",
        source: s.source ?? "newsletter",
      },
    });
  }
  console.log(`  ✓ ${subscribers.length} abone`);

  console.log("→ Analytics...");
  const analytics = await readJson<JsonAnalytics>("analytics.json", {
    events: [],
  });
  const events = analytics.events ?? [];
  for (const e of events) {
    await prisma.analyticsEvent.upsert({
      where: { id: e.id },
      create: {
        id: e.id,
        type: e.type,
        sessionId: e.sessionId,
        path: e.path ?? null,
        productId: e.productId ?? null,
        productName: e.productName ?? null,
        durationSec: e.durationSec ?? null,
        country: e.country ?? null,
        city: e.city ?? null,
        timezone: e.timezone ?? null,
        createdAt: new Date(e.createdAt),
      },
      update: {},
    });
  }

  if (analytics.allTime) {
    await prisma.analyticsAllTime.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        revenue: analytics.allTime.revenue,
        orders: analytics.allTime.orders,
        itemsSold: analytics.allTime.itemsSold,
      },
      update: {
        revenue: analytics.allTime.revenue,
        orders: analytics.allTime.orders,
        itemsSold: analytics.allTime.itemsSold,
      },
    });
  } else {
    const valid = orders.filter((o) => o.status !== "cancelled");
    await prisma.analyticsAllTime.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        revenue: valid.reduce((s, o) => s + o.total, 0),
        orders: valid.length,
        itemsSold: valid.reduce(
          (s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0),
          0
        ),
      },
      update: {
        revenue: valid.reduce((s, o) => s + o.total, 0),
        orders: valid.length,
        itemsSold: valid.reduce(
          (s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0),
          0
        ),
      },
    });
  }
  console.log(`  ✓ ${events.length} event + all-time totals`);

  console.log("\nTamamlandı. JSON verisi PostgreSQL'e aktarıldı.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
