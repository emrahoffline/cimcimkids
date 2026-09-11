export type ProductColor = {
  id: string;
  labelTr: string;
  labelEn: string;
  hex: string;
};

export type Category = {
  slug: string;
  nameTr: string;
  nameEn: string;
};

export type Announcement = {
  id: string;
  textTr: string;
  textEn: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type HeroSlide = {
  id: string;
  imageUrl: string;
  altTr: string;
  altEn: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type { StoryItem, StoryGroup } from "./stories";

export type Product = {
  id: string;
  code: string;
  slug: string;
  image: string;
  images: string[];
  colors: ProductColor[];
  price: number;
  /** Original price when discounted; null/undefined = no discount */
  compareAtPrice?: number | null;
  category: string;
  /** @deprecated use ages — kept as display helper / first age */
  ageRange?: string;
  ages: string[];
  translationKey?: string;
  nameTr: string;
  nameEn: string;
  descTr: string;
  descEn: string;
  /** Available units; storefront uses inStock (= stockQuantity > 0) */
  stockQuantity: number;
  inStock: boolean;
  updatedAt?: string;
};

export function getProductImages(product: Product): string[] {
  if (product.images?.length) return product.images;
  return product.image ? [product.image] : [];
}

export function getProductAges(product: Product): string[] {
  if (product.ages?.length) return product.ages;
  return product.ageRange ? [product.ageRange] : [];
}

export function getColorLabel(color: ProductColor, locale: string): string {
  return locale === "tr" ? color.labelTr : color.labelEn;
}

export function isOnSale(product: Product): boolean {
  const original = product.compareAtPrice;
  return (
    typeof original === "number" &&
    Number.isFinite(original) &&
    original > product.price
  );
}

export function getDiscountPercent(product: Product): number | null {
  if (!isOnSale(product) || !product.compareAtPrice) return null;
  return Math.round(
    ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
  );
}

export function getDiscountAmount(product: Product): number | null {
  if (!isOnSale(product) || !product.compareAtPrice) return null;
  return Math.round((product.compareAtPrice - product.price) * 100) / 100;
}
