import { promises as fs } from "fs";
import path from "path";
import type { Product, Category } from "./types";
import { slugify } from "./product-utils";

const DATA_DIR = path.join(process.cwd(), "data");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    path.join(DATA_DIR, file),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

export type Customer = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "admin" | "customer";
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
};

export async function getProducts(): Promise<Product[]> {
  return readJson<Product[]>("products.json", []);
}

export async function saveProducts(products: Product[]): Promise<void> {
  await writeJson("products.json", products);
}

const DEFAULT_CATEGORIES: Category[] = [
  { slug: "decor", nameTr: "Dekorasyon", nameEn: "Decor" },
  { slug: "kitchen", nameTr: "Mutfak", nameEn: "Kitchen" },
  { slug: "storage", nameTr: "Depolama", nameEn: "Storage" },
];

export async function getCategories(): Promise<Category[]> {
  const cats = await readJson<Category[]>("categories.json", DEFAULT_CATEGORIES);
  if (cats.length === 0) return DEFAULT_CATEGORIES;
  return cats;
}

export async function saveCategories(categories: Category[]): Promise<void> {
  await writeJson("categories.json", categories);
}

export async function createCategory(data: {
  nameTr: string;
  nameEn: string;
  slug?: string;
}): Promise<Category> {
  const categories = await getCategories();
  const baseSlug = slugify(data.nameTr || data.nameEn);
  let slug = data.slug?.trim() || baseSlug;
  let n = 1;
  while (categories.some((c) => c.slug === slug)) {
    slug = `${baseSlug}-${n++}`;
  }

  const category: Category = {
    slug,
    nameTr: data.nameTr.trim(),
    nameEn: data.nameEn.trim() || data.nameTr.trim(),
  };

  categories.push(category);
  await saveCategories(categories);
  return category;
}

export async function getCustomers(): Promise<Customer[]> {
  return readJson<Customer[]>("customers.json", []);
}

export async function saveCustomers(customers: Customer[]): Promise<void> {
  await writeJson("customers.json", customers);
}

export async function getOrders(): Promise<Order[]> {
  return readJson<Order[]>("orders.json", []);
}

export async function saveOrders(orders: Order[]): Promise<void> {
  await writeJson("orders.json", orders);
}

export async function upsertCustomer(data: {
  email: string;
  name?: string | null;
  image?: string | null;
  role: "admin" | "customer";
}): Promise<Customer> {
  const customers = await getCustomers();
  const email = data.email.toLowerCase();
  const existing = customers.find((c) => c.email === email);
  const now = new Date().toISOString();

  if (existing) {
    existing.name = data.name ?? existing.name;
    existing.image = data.image ?? existing.image;
    existing.lastLoginAt = now;
    await saveCustomers(customers);
    return existing;
  }

  const customer: Customer = {
    id: `cust_${Date.now()}`,
    email,
    name: data.name ?? null,
    image: data.image ?? null,
    role: data.role,
    createdAt: now,
    lastLoginAt: now,
    orderCount: 0,
    totalSpent: 0,
  };
  customers.push(customer);
  await saveCustomers(customers);
  return customer;
}

export async function createOrder(order: Omit<Order, "id" | "createdAt">): Promise<Order> {
  const orders = await getOrders();
  const full: Order = {
    ...order,
    id: `ord_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  orders.unshift(full);

  if (order.status === "confirmed") {
    const customers = await getCustomers();
    const customer = customers.find(
      (c) => c.email === order.customerEmail.toLowerCase()
    );
    if (customer) {
      customer.orderCount += 1;
      customer.totalSpent += order.total;
      await saveCustomers(customers);
    }
  }

  await saveOrders(orders);
  return full;
}
