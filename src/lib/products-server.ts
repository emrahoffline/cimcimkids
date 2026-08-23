import "server-only";
import { getOrders, getProducts } from "./db";
import { getProductPopularity } from "./analytics-db";
import type { Product } from "./types";

export async function getAllProducts(): Promise<Product[]> {
  const products = await getProducts();
  try {
    const orders = await getOrders();
    const popularity = await getProductPopularity(orders);
    return products.map((product) => ({
      ...product,
      soldCount: popularity.sold.get(product.id) ?? 0,
      favoriteCount: popularity.favorites.get(product.id) ?? 0,
    }));
  } catch {
    return products;
  }
}

export async function getProductBySlug(
  slug: string
): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((p) => p.slug === slug);
}

export async function getProductById(
  id: string
): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((p) => p.id === id);
}
