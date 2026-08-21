import "server-only";
import type {
  Customer as DbCustomer,
  Order as DbOrder,
  OrderItem as DbOrderItem,
  Product as DbProduct,
  Category as DbCategory,
  Subscriber as DbSubscriber,
  OrderStatus,
  UserRole,
  SubscriberSource,
} from "@prisma/client";
import type { Product, Category } from "./types";
import { slugify } from "./product-utils";
import { UNISEX_CATEGORY, isUnisexCategoryName } from "./categories";
import { syncAllTimeTotals } from "./analytics-db";
import { prisma, requireDatabaseUrl, hasDatabaseUrl, isNextBuild } from "./prisma";

export type Customer = {
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

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
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

export type NewsletterSubscriber = {
  id: string;
  email: string;
  locale: string;
  createdAt: string;
  source?: "newsletter" | "checkout";
};

function mapProduct(p: DbProduct): Product {
  return {
    id: p.id,
    slug: p.slug,
    image: p.image,
    price: p.price,
    category: p.category,
    translationKey: p.translationKey ?? undefined,
    nameTr: p.nameTr,
    nameEn: p.nameEn,
    descTr: p.descTr,
    descEn: p.descEn,
    inStock: p.inStock,
  };
}

function mapCategory(c: DbCategory): Category {
  return { slug: c.slug, nameTr: c.nameTr, nameEn: c.nameEn };
}

function mapCustomer(c: DbCustomer): Customer {
  return {
    id: c.id,
    email: c.email,
    name: c.name,
    image: c.image,
    role: c.role,
    passwordHash: c.passwordHash ?? undefined,
    createdAt: c.createdAt.toISOString(),
    lastLoginAt: c.lastLoginAt.toISOString(),
    orderCount: c.orderCount,
    totalSpent: c.totalSpent,
  };
}

function mapOrder(
  o: DbOrder & { items: DbOrderItem[] }
): Order {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerEmail: o.customerEmail,
    customerName: o.customerName,
    customerPhone: o.customerPhone ?? undefined,
    items: o.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image: i.image,
    })),
    total: o.total,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    shippingAddress: o.shippingAddress ?? undefined,
    adminSeen: o.adminSeen,
  };
}

function mapSubscriber(s: DbSubscriber): NewsletterSubscriber {
  return {
    id: s.id,
    email: s.email,
    locale: s.locale,
    createdAt: s.createdAt.toISOString(),
    source: s.source,
  };
}

const DEFAULT_CATEGORIES: Category[] = [
  { slug: "girls", nameTr: "Kız", nameEn: "Girls" },
  { slug: "boys", nameTr: "Erkek", nameEn: "Boys" },
  { slug: UNISEX_CATEGORY.slug, nameTr: UNISEX_CATEGORY.nameTr, nameEn: UNISEX_CATEGORY.nameEn },
  { slug: "baby", nameTr: "Bebek", nameEn: "Baby" },
];

export async function getProducts(): Promise<Product[]> {
  if (!hasDatabaseUrl()) {
    if (isNextBuild()) return [];
    requireDatabaseUrl();
  }
  const rows = await prisma.product.findMany({ orderBy: { id: "asc" } });
  return rows.map(mapProduct);
}

export async function saveProducts(products: Product[]): Promise<void> {
  requireDatabaseUrl();
  const ids = products.map((p) => p.id);

  await prisma.$transaction(async (tx) => {
    await tx.product.deleteMany({
      where: ids.length ? { id: { notIn: ids } } : undefined,
    });

    for (const p of products) {
      await tx.product.upsert({
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
          inStock: p.inStock,
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
          inStock: p.inStock,
        },
      });
    }
  });
}

export async function ensureUnisexCategory(): Promise<Category> {
  requireDatabaseUrl();
  const existing = await prisma.category.findUnique({
    where: { slug: UNISEX_CATEGORY.slug },
  });
  if (existing) return mapCategory(existing);
  const created = await prisma.category.create({
    data: {
      slug: UNISEX_CATEGORY.slug,
      nameTr: UNISEX_CATEGORY.nameTr,
      nameEn: UNISEX_CATEGORY.nameEn,
    },
  });
  return mapCategory(created);
}

export async function getCategories(): Promise<Category[]> {
  if (!hasDatabaseUrl()) {
    if (isNextBuild()) return DEFAULT_CATEGORIES;
    requireDatabaseUrl();
  }
  const rows = await prisma.category.findMany({ orderBy: { slug: "asc" } });
  if (rows.length === 0) return DEFAULT_CATEGORIES;
  const mapped = rows.map(mapCategory);
  if (!mapped.some((c) => c.slug === UNISEX_CATEGORY.slug)) {
    mapped.push(await ensureUnisexCategory());
  }
  return mapped.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function saveCategories(categories: Category[]): Promise<void> {
  requireDatabaseUrl();
  const slugs = categories.map((c) => c.slug);

  await prisma.$transaction(async (tx) => {
    await tx.category.deleteMany({
      where: slugs.length ? { slug: { notIn: slugs } } : undefined,
    });
    for (const c of categories) {
      await tx.category.upsert({
        where: { slug: c.slug },
        create: c,
        update: { nameTr: c.nameTr, nameEn: c.nameEn },
      });
    }
  });
}

export async function createCategory(data: {
  nameTr: string;
  nameEn: string;
  slug?: string;
}): Promise<Category> {
  requireDatabaseUrl();
  if (
    isUnisexCategoryName(data.nameTr, data.slug) ||
    isUnisexCategoryName(data.nameEn || "", data.slug)
  ) {
    return ensureUnisexCategory();
  }

  const baseSlug = slugify(data.nameTr || data.nameEn);
  let slug = data.slug?.trim() || baseSlug;
  let n = 1;
  while (await prisma.category.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${n++}`;
  }

  const category = await prisma.category.create({
    data: {
      slug,
      nameTr: data.nameTr.trim(),
      nameEn: data.nameEn.trim() || data.nameTr.trim(),
    },
  });
  await ensureUnisexCategory();
  return mapCategory(category);
}

export async function getCustomers(): Promise<Customer[]> {
  requireDatabaseUrl();
  const rows = await prisma.customer.findMany({
    orderBy: { lastLoginAt: "desc" },
  });
  return rows.map(mapCustomer);
}

export async function saveCustomers(customers: Customer[]): Promise<void> {
  requireDatabaseUrl();
  await prisma.$transaction(async (tx) => {
    for (const c of customers) {
      await tx.customer.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          email: c.email,
          name: c.name,
          image: c.image,
          role: c.role as UserRole,
          passwordHash: c.passwordHash ?? null,
          createdAt: new Date(c.createdAt),
          lastLoginAt: new Date(c.lastLoginAt),
          orderCount: c.orderCount,
          totalSpent: c.totalSpent,
        },
        update: {
          email: c.email,
          name: c.name,
          image: c.image,
          role: c.role as UserRole,
          passwordHash: c.passwordHash ?? null,
          lastLoginAt: new Date(c.lastLoginAt),
          orderCount: c.orderCount,
          totalSpent: c.totalSpent,
        },
      });
    }
  });
}

export async function getOrders(): Promise<Order[]> {
  requireDatabaseUrl();
  const rows = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapOrder);
}

export async function saveOrders(orders: Order[]): Promise<void> {
  requireDatabaseUrl();
  await prisma.$transaction(async (tx) => {
    for (const o of orders) {
      await tx.order.update({
        where: { id: o.id },
        data: {
          status: o.status as OrderStatus,
          adminSeen: o.adminSeen ?? false,
          customerName: o.customerName,
          customerPhone: o.customerPhone ?? null,
          shippingAddress: o.shippingAddress ?? null,
          total: o.total,
        },
      });
    }
  });
}

export function isOrderUnread(order: Order): boolean {
  return order.adminSeen === false;
}

export async function getUnreadOrders(): Promise<Order[]> {
  requireDatabaseUrl();
  const rows = await prisma.order.findMany({
    where: { adminSeen: false },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapOrder);
}

export async function markOrdersSeen(orderIds?: string[]): Promise<number> {
  requireDatabaseUrl();
  const result = await prisma.order.updateMany({
    where: {
      adminSeen: false,
      ...(orderIds ? { id: { in: orderIds } } : {}),
    },
    data: { adminSeen: true },
  });
  return result.count;
}

export async function upsertCustomer(data: {
  email: string;
  name?: string | null;
  image?: string | null;
  role: "admin" | "customer";
  passwordHash?: string;
}): Promise<Customer> {
  requireDatabaseUrl();
  const email = data.email.toLowerCase();
  const existing = await prisma.customer.findUnique({ where: { email } });

  if (existing) {
    const updated = await prisma.customer.update({
      where: { email },
      data: {
        name: data.name ?? existing.name,
        image: data.image ?? existing.image,
        lastLoginAt: new Date(),
        ...(data.passwordHash ? { passwordHash: data.passwordHash } : {}),
        role: data.role as UserRole,
      },
    });
    return mapCustomer(updated);
  }

  const created = await prisma.customer.create({
    data: {
      id: `cust_${Date.now()}`,
      email,
      name: data.name ?? null,
      image: data.image ?? null,
      role: data.role as UserRole,
      passwordHash: data.passwordHash ?? null,
    },
  });
  return mapCustomer(created);
}

export async function getCustomerByEmail(
  email: string
): Promise<Customer | null> {
  requireDatabaseUrl();
  const row = await prisma.customer.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  return row ? mapCustomer(row) : null;
}

export async function registerCustomer(data: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<{ customer: Customer; created: boolean; error?: string }> {
  const email = data.email.trim().toLowerCase();
  const existing = await getCustomerByEmail(email);

  if (existing?.passwordHash) {
    return { customer: existing, created: false, error: "alreadyExists" };
  }
  if (existing) {
    return { customer: existing, created: false, error: "oauthAccount" };
  }

  const customer = await upsertCustomer({
    email,
    name: data.name.trim(),
    role: "customer",
    passwordHash: data.passwordHash,
  });
  return { customer, created: true };
}

export async function createOrder(
  order: Omit<Order, "id" | "createdAt">
): Promise<Order> {
  requireDatabaseUrl();
  const id = `ord_${Date.now()}`;

  const created = await prisma.$transaction(async (tx) => {
    if (order.status === "confirmed") {
      await tx.customer.updateMany({
        where: { email: order.customerEmail.toLowerCase() },
        data: {
          orderCount: { increment: 1 },
          totalSpent: { increment: order.total },
        },
      });
    }

    return tx.order.create({
      data: {
        id,
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        customerPhone: order.customerPhone ?? null,
        total: order.total,
        status: order.status as OrderStatus,
        shippingAddress: order.shippingAddress ?? null,
        adminSeen: false,
        items: {
          create: order.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
        },
      },
      include: { items: true },
    });
  });

  const mapped = mapOrder(created);
  const allOrders = await getOrders();
  await syncAllTimeTotals(allOrders).catch((err) =>
    console.error("[analytics] Tüm zamanlar toplamı kaydedilemedi:", err)
  );
  return mapped;
}

export async function getNewsletterSubscribers(): Promise<
  NewsletterSubscriber[]
> {
  requireDatabaseUrl();
  const rows = await prisma.subscriber.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapSubscriber);
}

export async function saveNewsletterSubscribers(
  subscribers: NewsletterSubscriber[]
): Promise<void> {
  requireDatabaseUrl();
  const ids = subscribers.map((s) => s.id);
  await prisma.$transaction(async (tx) => {
    await tx.subscriber.deleteMany({
      where: ids.length ? { id: { notIn: ids } } : undefined,
    });
    for (const s of subscribers) {
      await tx.subscriber.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          email: s.email,
          locale: s.locale,
          source: (s.source ?? "newsletter") as SubscriberSource,
          createdAt: new Date(s.createdAt),
        },
        update: {
          email: s.email,
          locale: s.locale,
          source: (s.source ?? "newsletter") as SubscriberSource,
        },
      });
    }
  });
}

export async function addNewsletterSubscriber(data: {
  email: string;
  locale?: string;
  source?: "newsletter" | "checkout";
}): Promise<{ subscriber: NewsletterSubscriber; created: boolean }> {
  requireDatabaseUrl();
  const email = data.email.trim().toLowerCase();
  const existing = await prisma.subscriber.findUnique({ where: { email } });
  if (existing) {
    return { subscriber: mapSubscriber(existing), created: false };
  }

  const created = await prisma.subscriber.create({
    data: {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email,
      locale: data.locale === "en" ? "en" : "tr",
      source: (data.source ?? "newsletter") as SubscriberSource,
    },
  });
  return { subscriber: mapSubscriber(created), created: true };
}

export async function removeNewsletterSubscriber(id: string): Promise<boolean> {
  requireDatabaseUrl();
  try {
    await prisma.subscriber.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
