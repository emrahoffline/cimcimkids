import type { Category, Product } from "./types";

export function productAges(product: Product): string[] {
  if (product.ages?.length) return product.ages;
  return product.ageRange ? [product.ageRange] : [];
}

export function uniqueProductAges(products: Product[]): string[] {
  const seen = new Set<string>();
  for (const product of products) {
    for (const age of productAges(product)) {
      if (age) seen.add(age);
    }
  }
  return [...seen].sort((a, b) => ageSortKey(a) - ageSortKey(b));
}

function ageSortKey(age: string): number {
  const match = age.match(/(\d+)/);
  const n = match ? Number(match[1]) : 0;
  return /ay/i.test(age) ? n / 100 : n;
}

function normalizeSearch(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("İ", "i")
    .trim();
}

export function categorySearchText(
  product: Product,
  categories: Category[]
): string {
  const category = categories.find((c) => c.slug === product.category);
  return [product.category, category?.nameTr, category?.nameEn]
    .filter(Boolean)
    .join(" ");
}

export function productMatchesQuery(
  product: Product,
  query: string,
  extraText = ""
): boolean {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = [
    product.nameTr,
    product.nameEn,
    product.descTr,
    product.descEn,
    product.slug,
    product.category,
    ...productAges(product),
    extraText,
  ]
    .filter(Boolean)
    .map((value) => normalizeSearch(value))
    .join(" ");
  return tokens.every((token) => haystack.includes(token));
}

export type ProductSort = "newest" | "price-asc" | "price-desc";
export type PriceBand = "all" | "0-500" | "500-1000" | "1000+";

export const GENDER_CATEGORY_SLUGS = new Set([
  "girls",
  "boys",
  "baby",
  "unisex",
  "kiz",
  "kız",
  "erkek",
  "bebek",
]);

export function matchesPriceBand(price: number, band: PriceBand): boolean {
  if (band === "all") return true;
  if (band === "0-500") return price < 500;
  if (band === "500-1000") return price >= 500 && price < 1000;
  return price >= 1000;
}

function productTimestamp(product: Product): number {
  const raw = product.createdAt || product.updatedAt || "";
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return parsed;
  const digits = String(product.id).replace(/\D/g, "");
  const fromId = Number(digits.slice(-13));
  return Number.isFinite(fromId) ? fromId : 0;
}

export function sortProducts(
  products: Product[],
  sort: ProductSort
): Product[] {
  const copy = [...products];
  if (sort === "price-asc") {
    copy.sort((a, b) => a.price - b.price);
  } else if (sort === "price-desc") {
    copy.sort((a, b) => b.price - a.price);
  } else {
    copy.sort((a, b) => {
      const delta = productTimestamp(b) - productTimestamp(a);
      if (delta !== 0) return delta;
      return String(b.id).localeCompare(String(a.id), undefined, {
        numeric: true,
      });
    });
  }
  return copy;
}

export function filterProducts(
  products: Product[],
  opts: {
    query: string;
    category: string;
    age: string;
    price?: PriceBand;
    categories?: Category[];
  }
): Product[] {
  return products.filter((product) => {
    const extra = opts.categories
      ? categorySearchText(product, opts.categories)
      : "";
    if (!productMatchesQuery(product, opts.query, extra)) return false;
    if (opts.category !== "all" && product.category !== opts.category) {
      return false;
    }
    if (opts.age !== "all" && !productAges(product).includes(opts.age)) {
      return false;
    }
    if (opts.price && !matchesPriceBand(product.price, opts.price)) {
      return false;
    }
    return true;
  });
}
