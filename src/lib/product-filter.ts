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

export function filterProducts(
  products: Product[],
  opts: {
    query: string;
    category: string;
    age: string;
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
    return true;
  });
}
