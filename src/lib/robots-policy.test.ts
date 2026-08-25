import assert from "node:assert/strict";
import { isNoIndexPath, normalizePathname } from "./robots-policy";
import { canonicalUrl, SITE_ORIGIN } from "./seo";

assert.equal(SITE_ORIGIN, "https://www.cimcimkids.com");
assert.equal(canonicalUrl("tr"), "https://www.cimcimkids.com/tr");
assert.equal(
  canonicalUrl("en", "/products"),
  "https://www.cimcimkids.com/en/products"
);
assert.equal(
  canonicalUrl("tr", "/products/foo/"),
  "https://www.cimcimkids.com/tr/products/foo"
);

assert.equal(normalizePathname("/tr/cart/"), "/tr/cart");
assert.equal(isNoIndexPath("/tr/cart"), true);
assert.equal(isNoIndexPath("/tr/cart/"), true);
assert.equal(isNoIndexPath("/en/checkout"), true);
assert.equal(isNoIndexPath("/admin/products"), true);
assert.equal(isNoIndexPath("/tr"), false);
assert.equal(isNoIndexPath("/tr/products"), false);
assert.equal(isNoIndexPath("/tr/kategori/girls"), false);

console.log("seo robots-policy tests passed");
