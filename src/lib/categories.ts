export const UNISEX_CATEGORY = {
  slug: "unisex",
  nameTr: "Unisex",
  nameEn: "Unisex",
} as const;

const GENDER_CATEGORY_SLUGS = new Set(["girls", "boys"]);

export function isUnisexCategoryName(name: string, slug?: string) {
  if (slug?.trim().toLowerCase() === UNISEX_CATEGORY.slug) return true;
  const n = name.trim().toLowerCase();
  return n === "unisex" || n === "ünisex";
}

/** Unisex products also appear on girls and boys listings. */
export function productMatchesCategory(
  productCategory: string,
  filterSlug: string
) {
  if (productCategory === filterSlug) return true;
  return (
    productCategory === UNISEX_CATEGORY.slug &&
    GENDER_CATEGORY_SLUGS.has(filterSlug)
  );
}
