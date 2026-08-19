import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/db";
import {
  PUBLIC_STATIC_PATHS,
  SITE_ORIGIN,
  canonicalUrl,
  languageAlternates,
} from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = routing.locales;
  const entries: MetadataRoute.Sitemap = [];

  const add = (
    path: string,
    extras?: Pick<
      MetadataRoute.Sitemap[number],
      "lastModified" | "changeFrequency" | "priority"
    >
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
    const products = await getProducts();
    for (const product of products) {
      add(`/products/${product.slug}`, {
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // Build/runtime without DB: still emit static URLs.
  }

  return entries.filter((entry) => entry.url.startsWith(SITE_ORIGIN));
}
