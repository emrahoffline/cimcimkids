import "server-only";
import { getCategories } from "./db";
import type { Category } from "./types";

export async function getAllCategories(): Promise<Category[]> {
  return getCategories();
}

export function getCategoryLabel(
  categories: Category[],
  slug: string,
  locale: string
): string {
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return slug;
  return locale === "tr" ? cat.nameTr : cat.nameEn?.trim() || cat.nameTr;
}
