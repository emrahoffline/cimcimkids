import assert from "node:assert/strict";
import {
  filterProducts,
  productMatchesQuery,
  uniqueProductAges,
} from "./product-filter";
import type { Category, Product } from "./types";

const categories: Category[] = [
  { slug: "girls", nameTr: "Kız", nameEn: "Girls" },
  { slug: "boys", nameTr: "Erkek", nameEn: "Boys" },
];

function product(partial: Partial<Product> & Pick<Product, "id">): Product {
  return {
    slug: partial.id,
    image: "/products/product-1.png",
    price: 100,
    category: "girls",
    nameTr: "Sarı Elbise",
    nameEn: "Yellow Dress",
    descTr: "Günlük kullanım",
    descEn: "Everyday wear",
    inStock: true,
    ...partial,
  };
}

const products: Product[] = [
  product({ id: "1", nameTr: "Sarı Jile", nameEn: "Yellow Pinafore", ages: ["3-4", "4-5"] }),
  product({
    id: "2",
    category: "boys",
    nameTr: "Mavi Sweatshirt",
    nameEn: "Blue Sweatshirt",
    ages: ["5-6"],
  }),
  product({ id: "3", nameTr: "Pembe Elbise", nameEn: "Pink Dress" }),
];

assert.equal(productMatchesQuery(products[0], "jile"), true);
assert.equal(productMatchesQuery(products[0], "JİLE"), true);
assert.equal(productMatchesQuery(products[0], "sarı jile"), true);
assert.equal(productMatchesQuery(products[0], "mavi"), false);
assert.equal(productMatchesQuery(products[1], "kız", "kız girls"), true);

assert.deepEqual(uniqueProductAges(products), ["3-4", "4-5", "5-6"]);

assert.equal(
  filterProducts(products, {
    query: "kız",
    category: "all",
    age: "all",
    categories,
  }).map((p) => p.id).join(","),
  "1,3"
);

assert.equal(
  filterProducts(products, {
    query: "",
    category: "boys",
    age: "all",
    categories,
  }).map((p) => p.id).join(","),
  "2"
);

assert.equal(
  filterProducts(products, {
    query: "",
    category: "all",
    age: "4-5",
    categories,
  }).map((p) => p.id).join(","),
  "1"
);

assert.equal(
  filterProducts(products, {
    query: "",
    category: "all",
    age: "all",
    price: "0-500",
    categories,
  }).length,
  3
);

console.log("product-filter tests passed");
