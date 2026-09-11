/** True for admin-uploaded product images under /products/uploads. */
export function isUploadedProductImage(src: string): boolean {
  return src.startsWith("/products/uploads/");
}
