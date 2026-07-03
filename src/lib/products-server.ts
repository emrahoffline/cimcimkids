import "server-only";
import { getProducts } from "./db";
import type { Product } from "./types";

export async function getAllProducts(): Promise<Product[]> {
  return getProducts();
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
