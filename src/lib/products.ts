export type { Product, Category, ProductColor } from "./types";
export { getProductImages, getProductAges, getColorLabel } from "./types";
export {
  getProductName,
  getProductDesc,
  formatPrice,
  roundLira,
  slugify,
} from "./product-utils";
export {
  getSearchableProductDesc,
  getStorefrontProductDesc,
  getProductSpecs,
  getMerchantSearchSpecs,
} from "./product-specs";
