/** Paths Google should not index (cart, checkout, account, admin, APIs). */
const NOINDEX_EXACT = new Set([
  "/admin",
  "/auth",
  "/auth/error",
]);

const NOINDEX_PREFIXES = [
  "/admin/",
  "/auth/",
  "/api/",
  "/tr/cart",
  "/en/cart",
  "/tr/checkout",
  "/en/checkout",
  "/tr/favorites",
  "/en/favorites",
  "/tr/account",
  "/en/account",
  "/tr/tracking",
  "/en/tracking",
];

export function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isNoIndexPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (NOINDEX_EXACT.has(path)) return true;
  return NOINDEX_PREFIXES.some(
    (prefix) => path === prefix.replace(/\/$/, "") || path.startsWith(prefix)
  );
}
