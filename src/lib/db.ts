import "server-only";
import type {
  Customer as DbCustomer,
  Order as DbOrder,
  OrderItem as DbOrderItem,
  Invoice as DbInvoice,
  Product as DbProduct,
  Category as DbCategory,
  Subscriber as DbSubscriber,
  Announcement as DbAnnouncement,
  HeroSlide as DbHeroSlide,
  Story as DbStory,
  OrderStatus,
  PaymentMethod,
  UserRole,
  SubscriberSource,
} from "@prisma/client";
import { randomBytes } from "crypto";
import type { Product, Category, Announcement, HeroSlide, StoryItem } from "./types";
import {
  giftCardAppliedAmount,
  isGiftCardProductId,
  normalizeGiftCardCode,
  parseGiftCardAmount,
  payableTotal,
} from "./gift-cards";
import { generateGiftCardCode } from "./gift-cards-db";
import { redeemDiscountCodeInTx } from "./discount-codes-db";
import { isShippingProductId } from "./shipping";

export type { Announcement, HeroSlide, StoryItem };
import { slugify } from "./product-utils";
import { syncAllTimeTotals } from "./analytics-db";
import { prisma, requireDatabaseUrl, hasDatabaseUrl, isNextBuild } from "./prisma";
import { normalizeProductImages, parseProductColors } from "./product-variants";
import { normalizeProductAges } from "./product-ages";
import { parseStatusHistory } from "./order-status";
import { clampStoryDuration, groupStories } from "./stories";

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

export type OrderInvoiceSummary = {
  id: string;
  uuid: string;
  invoiceNumber?: string;
  documentType: "e_archive" | "e_invoice";
  status: "pending" | "sending" | "sent" | "failed" | "cancelled";
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  errorMessage?: string;
  issuedAt?: string;
  emailedAt?: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  /** Cart subtotal before gift-card redeem */
  subtotal?: number;
  giftCardAmount?: number;
  giftCardCode?: string;
  discountAmount?: number;
  discountCode?: string;
  /** Amount to pay by card or bank transfer */
  total: number;
  paymentMethod?: "bank_transfer" | "card";
  iyzicoPaymentId?: string;
  lastFourDigits?: string;
  cardType?: string;
  paymentToken?: string;
  status:
    | "pending_payment"
    | "pending"
    | "confirmed"
    | "preparing"
    | "shipped"
    | "delivered"
    | "cancelled";
  statusHistory?: { status: Order["status"]; at: string }[];
  createdAt: string;
  updatedAt?: string;
  shippingAddress?: string;
  adminSeen?: boolean;
  invoiceKind?: "individual" | "corporate";
  taxId?: string;
  taxOffice?: string;
  companyTitle?: string;
  invoiceDistrict?: string;
  invoiceCity?: string;
  giftNote?: string;
  cargoCarrier?: string;
  cargoCarrierId?: number;
  cargoPostNumber?: string;
  cargoTrackingUrl?: string;
  cargoBarcodeUrl?: string;
  cargoDesi?: number;
  cargoCost?: number;
  invoice?: OrderInvoiceSummary;
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  locale: string;
  createdAt: string;
  source?: "newsletter" | "checkout";
};

function mapProduct(p: DbProduct): Product {
  const images = normalizeProductImages(p.images, p.image);
  const ages = normalizeProductAges(p.ages, p.ageRange);
  return {
    id: p.id,
    code: p.code,
    slug: p.slug,
    image: images[0] || p.image,
    images,
    colors: parseProductColors(p.colors),
    price: p.price,
    category: p.category,
    ageRange: ages[0] ?? p.ageRange ?? undefined,
    ages,
    translationKey: p.translationKey ?? undefined,
    nameTr: p.nameTr,
    nameEn: p.nameEn,
    descTr: p.descTr,
    descEn: p.descEn,
    stockQuantity: p.stockQuantity ?? 0,
    inStock: (p.stockQuantity ?? 0) > 0,
    compareAtPrice: p.compareAtPrice ?? null,
    updatedAt: p.updatedAt.toISOString(),
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

function mapInvoiceSummary(row: DbInvoice): OrderInvoiceSummary {
  return {
    id: row.id,
    uuid: row.uuid,
    invoiceNumber: row.invoiceNumber ?? undefined,
    documentType: row.documentType,
    status: row.status,
    netAmount: row.netAmount,
    vatAmount: row.vatAmount,
    grossAmount: row.grossAmount,
    errorMessage: row.errorMessage ?? undefined,
    issuedAt: row.issuedAt?.toISOString(),
    emailedAt: row.emailedAt?.toISOString(),
  };
}

function mapOrder(
  o: DbOrder & { items: DbOrderItem[]; invoices?: DbInvoice[] }
): Order {
  let history = parseStatusHistory(o.statusHistory);
  if (history.length === 0) {
    history = [{ status: o.status, at: o.createdAt.toISOString() }];
  }
  const invoice = o.invoices?.[0];
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
    subtotal: o.subtotal ?? undefined,
    giftCardAmount: o.giftCardAmount ?? undefined,
    giftCardCode: o.giftCardCode ?? undefined,
    discountAmount: o.discountAmount ?? undefined,
    discountCode: o.discountCode ?? undefined,
    total: o.total,
    paymentMethod: o.paymentMethod,
    iyzicoPaymentId: o.iyzicoPaymentId ?? undefined,
    lastFourDigits: o.lastFourDigits ?? undefined,
    cardType: o.cardType ?? undefined,
    paymentToken: o.paymentToken ?? undefined,
    status: o.status,
    statusHistory: history,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    shippingAddress: o.shippingAddress ?? undefined,
    adminSeen: o.adminSeen,
    invoiceKind: o.invoiceKind,
    taxId: o.taxId ?? undefined,
    taxOffice: o.taxOffice ?? undefined,
    companyTitle: o.companyTitle ?? undefined,
    invoiceDistrict: o.invoiceDistrict ?? undefined,
    invoiceCity: o.invoiceCity ?? undefined,
    giftNote: o.giftNote ?? undefined,
    cargoCarrier: o.cargoCarrier ?? undefined,
    cargoCarrierId: o.cargoCarrierId ?? undefined,
    cargoPostNumber: o.cargoPostNumber ?? undefined,
    cargoTrackingUrl: o.cargoTrackingUrl ?? undefined,
    cargoBarcodeUrl: o.cargoBarcodeUrl ?? undefined,
    cargoDesi: o.cargoDesi ?? undefined,
    cargoCost: o.cargoCost ?? undefined,
    invoice: invoice ? mapInvoiceSummary(invoice) : undefined,
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

function mapAnnouncement(a: DbAnnouncement): Announcement {
  return {
    id: a.id,
    textTr: a.textTr,
    textEn: a.textEn,
    active: a.active,
    sortOrder: a.sortOrder,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

function mapHeroSlide(s: DbHeroSlide): HeroSlide {
  return {
    id: s.id,
    imageUrl: s.imageUrl,
    altTr: s.altTr,
    altEn: s.altEn,
    active: s.active,
    sortOrder: s.sortOrder,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

const DEFAULT_CATEGORIES: Category[] = [
  { slug: "girls", nameTr: "Kız", nameEn: "Girls" },
  { slug: "boys", nameTr: "Erkek", nameEn: "Boys" },
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
      const images = normalizeProductImages(p.images, p.image);
      const ages = normalizeProductAges(p.ages, p.ageRange);
      const colors = p.colors ?? [];
      await tx.product.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          code: p.code,
          slug: p.slug,
          image: images[0] || p.image,
          images,
          colors: colors as object[],
          price: p.price,
          category: p.category,
          ageRange: ages[0] ?? null,
          ages,
          translationKey: p.translationKey ?? null,
          nameTr: p.nameTr,
          nameEn: p.nameEn,
          descTr: p.descTr,
          descEn: p.descEn,
          stockQuantity: Math.max(0, Math.floor(p.stockQuantity ?? 0)),
          inStock: (p.stockQuantity ?? 0) > 0,
          compareAtPrice:
            typeof p.compareAtPrice === "number" &&
            Number.isFinite(p.compareAtPrice)
              ? p.compareAtPrice
              : null,
        },
        update: {
          code: p.code,
          slug: p.slug,
          image: images[0] || p.image,
          images,
          colors: colors as object[],
          price: p.price,
          category: p.category,
          ageRange: ages[0] ?? null,
          ages,
          translationKey: p.translationKey ?? null,
          nameTr: p.nameTr,
          nameEn: p.nameEn,
          descTr: p.descTr,
          descEn: p.descEn,
          stockQuantity: Math.max(0, Math.floor(p.stockQuantity ?? 0)),
          inStock: (p.stockQuantity ?? 0) > 0,
          compareAtPrice:
            typeof p.compareAtPrice === "number" &&
            Number.isFinite(p.compareAtPrice)
              ? p.compareAtPrice
              : null,
        },
      });
    }
  });
}

export async function getCategories(): Promise<Category[]> {
  if (!hasDatabaseUrl()) {
    if (isNextBuild()) return DEFAULT_CATEGORIES;
    requireDatabaseUrl();
  }
  const rows = await prisma.category.findMany({ orderBy: { slug: "asc" } });
  if (rows.length === 0) return DEFAULT_CATEGORIES;
  return rows.map(mapCategory);
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
    include: { items: true, invoices: true },
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
          statusHistory: o.statusHistory ?? undefined,
          adminSeen: o.adminSeen ?? false,
          customerName: o.customerName,
          customerPhone: o.customerPhone ?? null,
          shippingAddress: o.shippingAddress ?? null,
          total: o.total,
          subtotal: o.subtotal ?? null,
          giftCardAmount: o.giftCardAmount ?? null,
          giftCardCode: o.giftCardCode ?? null,
          discountAmount: o.discountAmount ?? null,
          discountCode: o.discountCode ?? null,
          paymentMethod: (o.paymentMethod ?? "bank_transfer") as PaymentMethod,
          iyzicoPaymentId: o.iyzicoPaymentId ?? null,
          lastFourDigits: o.lastFourDigits ?? null,
          cardType: o.cardType ?? null,
          paymentToken: o.paymentToken ?? null,
          cargoCarrier: o.cargoCarrier ?? null,
          cargoCarrierId: o.cargoCarrierId ?? null,
          cargoPostNumber: o.cargoPostNumber ?? null,
          cargoTrackingUrl: o.cargoTrackingUrl ?? null,
          cargoBarcodeUrl: o.cargoBarcodeUrl ?? null,
          cargoDesi: o.cargoDesi ?? null,
          cargoCost: o.cargoCost ?? null,
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
    include: { items: true, invoices: true },
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
  order: Omit<Order, "id" | "createdAt"> & {
    /** Redeem code applied at checkout (validated + debited in this transaction) */
    redeemGiftCardCode?: string;
    redeemDiscountCode?: string;
  }
): Promise<Order> {
  requireDatabaseUrl();
  const id = `ord_${Date.now()}_${randomBytes(3).toString("hex")}`;
  const subtotal =
    order.subtotal ??
    order.items.reduce((s, i) => s + i.price * i.quantity, 0);

  const created = await prisma.$transaction(async (tx) => {
    let giftCardAmount = 0;
    let giftCardCode: string | null = null;
    let discountAmount = 0;
    let discountCode: string | null = null;

    const eligibleSubtotal = order.items
      .filter(
        (i) =>
          !isGiftCardProductId(i.productId) && !isShippingProductId(i.productId)
      )
      .reduce((sum, i) => sum + i.price * i.quantity, 0);

    if (order.redeemDiscountCode) {
      const redeemed = await redeemDiscountCodeInTx(
        tx,
        order.redeemDiscountCode,
        eligibleSubtotal,
        id
      );
      discountAmount = redeemed.amount;
      discountCode = redeemed.code;
    }

    const afterDiscount = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    const redeemCode = order.redeemGiftCardCode
      ? normalizeGiftCardCode(order.redeemGiftCardCode)
      : "";

    if (redeemCode) {
      const cards = await tx.$queryRaw<
        Array<{
          id: string;
          code: string;
          remainingBalance: number;
          status: string;
        }>
      >`
        SELECT id, code, "remainingBalance", status::text
        FROM "GiftCard"
        WHERE code = ${redeemCode}
        FOR UPDATE
      `;
      const card = cards[0];
      if (!card || card.status !== "active" || card.remainingBalance <= 0) {
        throw new Error("INVALID_GIFT_CARD");
      }
      giftCardAmount = giftCardAppliedAmount(afterDiscount, card.remainingBalance);
      if (giftCardAmount <= 0) {
        throw new Error("INVALID_GIFT_CARD");
      }
      const nextBalance = Math.round((card.remainingBalance - giftCardAmount) * 100) / 100;
      await tx.giftCard.update({
        where: { id: card.id },
        data: {
          remainingBalance: nextBalance,
          status: nextBalance <= 0 ? "exhausted" : "active",
        },
      });
      await tx.giftCardRedemption.create({
        data: {
          giftCardId: card.id,
          orderId: id,
          amount: giftCardAmount,
        },
      });
      giftCardCode = card.code;
    }

    const total =
      order.total != null && !order.redeemDiscountCode && !order.redeemGiftCardCode
        ? order.total
        : payableTotal(afterDiscount, giftCardAmount);

    if (order.status === "confirmed") {
      await tx.customer.updateMany({
        where: { email: order.customerEmail.toLowerCase() },
        data: {
          orderCount: { increment: 1 },
          totalSpent: { increment: total },
        },
      });
    }

    const createdOrder = await tx.order.create({
      data: {
        id,
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        customerPhone: order.customerPhone ?? null,
        subtotal,
        giftCardAmount: giftCardAmount > 0 ? giftCardAmount : null,
        giftCardCode,
        discountAmount: discountAmount > 0 ? discountAmount : null,
        discountCode,
        total,
        paymentMethod: (order.paymentMethod ?? "bank_transfer") as PaymentMethod,
        iyzicoPaymentId: order.iyzicoPaymentId ?? null,
        lastFourDigits: order.lastFourDigits ?? null,
        cardType: order.cardType ?? null,
        paymentToken: order.paymentToken ?? null,
        status: order.status as OrderStatus,
        statusHistory: order.statusHistory ?? [
          { status: order.status, at: new Date().toISOString() },
        ],
        shippingAddress: order.shippingAddress ?? null,
        invoiceKind: order.invoiceKind ?? "individual",
        taxId: order.taxId ?? null,
        taxOffice: order.taxOffice ?? null,
        companyTitle: order.companyTitle ?? null,
        invoiceDistrict: order.invoiceDistrict ?? null,
        invoiceCity: order.invoiceCity ?? null,
        giftNote: order.giftNote?.trim() ? order.giftNote.trim() : null,
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

    // Issue pending gift cards for purchased denominations
    for (const item of order.items) {
      if (!isGiftCardProductId(item.productId)) continue;
      const amount = parseGiftCardAmount(item.productId);
      if (amount == null || amount !== item.price) {
        throw new Error("INVALID_GIFT_CARD_ITEM");
      }
      for (let q = 0; q < item.quantity; q++) {
        let code = generateGiftCardCode();
        for (let attempt = 0; attempt < 5; attempt++) {
          const exists = await tx.giftCard.findUnique({ where: { code } });
          if (!exists) break;
          code = generateGiftCardCode();
        }
        await tx.giftCard.create({
          data: {
            id: `gc_${Date.now()}_${q}_${Math.random().toString(36).slice(2, 8)}`,
            code,
            initialBalance: amount,
            remainingBalance: amount,
            status: "pending_payment",
            purchasedOrderId: id,
            recipientEmail: order.customerEmail.toLowerCase(),
            recipientName: order.customerName,
            createdByAdmin: false,
          },
        });
      }
    }

    return createdOrder;
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

export async function getAnnouncements(): Promise<Announcement[]> {
  if (!hasDatabaseUrl()) {
    if (isNextBuild()) return [];
    requireDatabaseUrl();
  }
  const rows = await prisma.announcement.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapAnnouncement);
}

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  if (!hasDatabaseUrl()) {
    if (isNextBuild()) return [];
    requireDatabaseUrl();
  }
  const rows = await prisma.announcement.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapAnnouncement);
}

export async function createAnnouncement(data: {
  textTr: string;
  textEn?: string;
  active?: boolean;
}): Promise<Announcement> {
  requireDatabaseUrl();
  const textTr = data.textTr.trim();
  if (!textTr) {
    throw new Error("Duyuru metni gerekli");
  }

  const max = await prisma.announcement.aggregate({
    _max: { sortOrder: true },
  });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  const created = await prisma.announcement.create({
    data: {
      id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      textTr,
      textEn: (data.textEn ?? "").trim(),
      active: data.active !== false,
      sortOrder,
    },
  });
  return mapAnnouncement(created);
}

export async function updateAnnouncement(
  id: string,
  data: Partial<{
    textTr: string;
    textEn: string;
    active: boolean;
    sortOrder: number;
  }>
): Promise<Announcement | null> {
  requireDatabaseUrl();
  try {
    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(data.textTr !== undefined ? { textTr: data.textTr.trim() } : {}),
        ...(data.textEn !== undefined ? { textEn: data.textEn.trim() } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
    return mapAnnouncement(updated);
  } catch {
    return null;
  }
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  requireDatabaseUrl();
  try {
    await prisma.announcement.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  if (!hasDatabaseUrl()) {
    if (isNextBuild()) return [];
    requireDatabaseUrl();
  }
  const rows = await prisma.heroSlide.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapHeroSlide);
}

export async function getActiveHeroSlides(): Promise<HeroSlide[]> {
  if (!hasDatabaseUrl()) {
    if (isNextBuild()) return [];
    requireDatabaseUrl();
  }
  const rows = await prisma.heroSlide.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapHeroSlide);
}

export async function createHeroSlide(data: {
  imageUrl: string;
  altTr?: string;
  altEn?: string;
  active?: boolean;
}): Promise<HeroSlide> {
  requireDatabaseUrl();
  const imageUrl = data.imageUrl.trim();
  if (!imageUrl) {
    throw new Error("Görsel gerekli");
  }

  const max = await prisma.heroSlide.aggregate({
    _max: { sortOrder: true },
  });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  const created = await prisma.heroSlide.create({
    data: {
      id: `hero_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      imageUrl,
      altTr: (data.altTr ?? "").trim(),
      altEn: (data.altEn ?? "").trim(),
      active: data.active !== false,
      sortOrder,
    },
  });
  return mapHeroSlide(created);
}

export async function updateHeroSlide(
  id: string,
  data: Partial<{
    imageUrl: string;
    altTr: string;
    altEn: string;
    active: boolean;
    sortOrder: number;
  }>
): Promise<HeroSlide | null> {
  requireDatabaseUrl();
  try {
    const updated = await prisma.heroSlide.update({
      where: { id },
      data: {
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl.trim() } : {}),
        ...(data.altTr !== undefined ? { altTr: data.altTr.trim() } : {}),
        ...(data.altEn !== undefined ? { altEn: data.altEn.trim() } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
    return mapHeroSlide(updated);
  } catch {
    return null;
  }
}

export async function deleteHeroSlide(id: string): Promise<boolean> {
  requireDatabaseUrl();
  try {
    await prisma.heroSlide.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

function mapStory(s: DbStory): StoryItem {
  return {
    id: s.id,
    title: s.title,
    mediaUrl: s.mediaUrl,
    durationSec: s.durationSec,
    sortOrder: s.sortOrder,
    active: s.active,
    viewCount: s.viewCount,
    groupId: s.groupId,
    linkUrl: s.linkUrl,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export async function getStories(): Promise<StoryItem[]> {
  if (!hasDatabaseUrl()) {
    if (isNextBuild()) return [];
    requireDatabaseUrl();
  }
  const rows = await prisma.story.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapStory);
}

export async function getActiveStoryGroups() {
  if (!hasDatabaseUrl()) {
    if (isNextBuild()) return [];
    requireDatabaseUrl();
  }
  const rows = await prisma.story.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return groupStories(rows.map(mapStory));
}

export async function createStories(data: {
  title: string;
  mediaUrls: string[];
  durationSec?: number;
  linkUrl?: string;
  groupId?: string;
  active?: boolean;
}): Promise<StoryItem[]> {
  requireDatabaseUrl();
  const mediaUrls = data.mediaUrls
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (mediaUrls.length === 0) {
    throw new Error("Görsel veya video gerekli");
  }

  const title = data.title.trim().slice(0, 80);
  const linkUrl = (data.linkUrl ?? "").trim().slice(0, 500);
  const durationSec = clampStoryDuration(data.durationSec);
  const groupId =
    (data.groupId ?? "").trim() ||
    `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const max = await prisma.story.aggregate({ _max: { sortOrder: true } });
  let sortOrder = (max._max.sortOrder ?? -1) + 1;

  const created: StoryItem[] = [];
  for (const mediaUrl of mediaUrls) {
    const row = await prisma.story.create({
      data: {
        id: `story_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title,
        mediaUrl,
        durationSec,
        linkUrl,
        groupId,
        active: data.active !== false,
        sortOrder,
      },
    });
    created.push(mapStory(row));
    sortOrder += 1;
  }
  return created;
}

export async function updateStory(
  id: string,
  data: Partial<{
    title: string;
    mediaUrl: string;
    durationSec: number;
    linkUrl: string;
    active: boolean;
    sortOrder: number;
    groupId: string;
  }>,
  options?: { applyTitleToGroup?: boolean; applyLinkToGroup?: boolean }
): Promise<StoryItem | null> {
  requireDatabaseUrl();
  try {
    const title =
      data.title !== undefined ? data.title.trim().slice(0, 80) : undefined;
    const linkUrl =
      data.linkUrl !== undefined ? data.linkUrl.trim().slice(0, 500) : undefined;
    const updated = await prisma.story.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(data.mediaUrl !== undefined ? { mediaUrl: data.mediaUrl.trim() } : {}),
        ...(data.durationSec !== undefined
          ? { durationSec: clampStoryDuration(data.durationSec) }
          : {}),
        ...(linkUrl !== undefined ? { linkUrl } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.groupId !== undefined ? { groupId: data.groupId.trim() } : {}),
      },
    });
    if (updated.groupId) {
      const groupData: { title?: string; linkUrl?: string } = {};
      if (options?.applyTitleToGroup && title !== undefined) groupData.title = title;
      if (options?.applyLinkToGroup && linkUrl !== undefined) groupData.linkUrl = linkUrl;
      if (Object.keys(groupData).length > 0) {
        await prisma.story.updateMany({
          where: { groupId: updated.groupId, id: { not: id } },
          data: groupData,
        });
      }
    }
    return mapStory(updated);
  } catch {
    return null;
  }
}

export async function incrementStoryView(id: string): Promise<void> {
  requireDatabaseUrl();
  try {
    await prisma.story.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  } catch {
    // ignore missing rows
  }
}

export async function deleteStory(id: string): Promise<boolean> {
  requireDatabaseUrl();
  try {
    await prisma.story.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function deleteStoryGroup(groupId: string): Promise<number> {
  requireDatabaseUrl();
  const result = await prisma.story.deleteMany({ where: { groupId } });
  return result.count;
}
