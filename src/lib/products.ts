export type { Product, Category, ProductColor } from "./types";
export { getProductImages, getProductAges, getColorLabel } from "./types";
export {
  getProductName,
  getProductDesc,
  formatPrice,
  slugify,
} from "./product-utils";
export { getSearchableProductDesc, getStorefrontProductDesc, getProductSpecs } from "./product-specs";
