import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/db";
import {
  PUBLIC_STATIC_PATHS,
  SITE_ORIGIN,
  canonicalUrl,
  languageAlternates,
} from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = routing.locales;
  const entries: MetadataRoute.Sitemap = [];

  const add = (
    path: string,
    extras?: Pick<MetadataRoute.Sitemap[number], "lastModified" | "changeFrequency" | "priority">
  ) => {
    for (const locale of locales) {
      entries.push({
        url: canonicalUrl(locale, path),
        alternates: {
          languages: languageAlternates(locale, path).languages,
        },
        ...extras,
      });
    }
  };

  add("", { changeFrequency: "daily", priority: 1 });
  for (const path of PUBLIC_STATIC_PATHS) {
    add(path, {
      changeFrequency: path === "/products" ? "daily" : "monthly",
      priority: path === "/products" ? 0.9 : 0.6,
    });
  }

  try {
    const [categories, products] = await Promise.all([
      getCategories(),
      getProducts(),
    ]);

    for (const category of categories) {
      add(`/kategori/${category.slug}`, {
        changeFrequency: "daily",
        priority: 0.85,
      });
    }

    for (const product of products) {
      add(`/products/${product.slug}`, {
        lastModified: product.updatedAt
          ? new Date(product.updatedAt)
          : undefined,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // Build/runtime without DB: still emit static URLs.
  }

  // Guarantee origin is production www even if a helper is misused
  return entries.filter((entry) => entry.url.startsWith(SITE_ORIGIN));
}
