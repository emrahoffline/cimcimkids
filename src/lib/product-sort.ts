import type { Product } from "./types";

export const PRODUCT_SORTS = [
  { id: "manual", label: "Vitrin sırası" },
  { id: "newest", label: "En yeni" },
  { id: "oldest", label: "En eski" },
  { id: "name-asc", label: "İsim (A-Z)" },
  { id: "name-desc", label: "İsim (Z-A)" },
  { id: "price-asc", label: "Fiyat (artan)" },
  { id: "price-desc", label: "Fiyat (azalan)" },
  { id: "stock-desc", label: "Stok (çoktan aza)" },
  { id: "stock-asc", label: "Stok (azdan çoğa)" },
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number]["id"];

export function isProductSort(value: string): value is ProductSort {
  return PRODUCT_SORTS.some((option) => option.id === value);
}

/** Best-effort add date: prod_{timestamp} id, else stored createdAt. */
export function productAddedAt(product: Pick<Product, "id" | "createdAt">) {
  const match = /^prod_(\d+)/.exec(product.id);
  if (match) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > 1e11) return n;
  }
  if (product.createdAt) {
    const t = Date.parse(product.createdAt);
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

export function sortProducts(
  products: Product[],
  sort: ProductSort = "manual"
): Product[] {
  const list = [...products];
  const name = (p: Product) => p.nameTr || p.nameEn || "";
  list.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return productAddedAt(a) - productAddedAt(b) || a.id.localeCompare(b.id);
      case "name-asc":
        return name(a).localeCompare(name(b), "tr") || a.id.localeCompare(b.id);
      case "name-desc":
        return name(b).localeCompare(name(a), "tr") || a.id.localeCompare(b.id);
      case "price-asc":
        return a.price - b.price || name(a).localeCompare(name(b), "tr");
      case "price-desc":
        return b.price - a.price || name(a).localeCompare(name(b), "tr");
      case "stock-asc":
        return (a.stockQuantity ?? 0) - (b.stockQuantity ?? 0);
      case "stock-desc":
        return (b.stockQuantity ?? 0) - (a.stockQuantity ?? 0);
      case "newest":
        return productAddedAt(b) - productAddedAt(a) || b.id.localeCompare(a.id);
      case "manual":
      default:
        return (
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          productAddedAt(b) - productAddedAt(a) ||
          a.id.localeCompare(b.id)
        );
    }
  });
  return list;
}

export function arrayMove<T>(items: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function withProductOrder(products: Product[]): Product[] {
  return products.map((product, index) => ({ ...product, sortOrder: index }));
}
