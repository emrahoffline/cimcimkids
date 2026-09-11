import { writeFileSync } from "fs";
import type { Product } from "../src/lib/types";
import { parseProductColors } from "../src/lib/product-variants";
import { normalizeProductAges } from "../src/lib/product-ages";
import { getSearchableProductDesc } from "../src/lib/product-specs";

type Row = {
  id: string;
  slug: string;
  nameTr: string;
  nameEn: string;
  descTr: string;
  descEn: string;
  category: string;
  ages?: string[] | null;
  ageRange?: string | null;
  colors?: unknown;
  code: string;
  image: string;
  images?: string[] | null;
  price: number;
  compareAtPrice?: number | null;
  stockQuantity?: number;
  inStock?: boolean;
};

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function toProduct(row: Row): Product {
  return {
    id: row.id,
    code: row.code,
    slug: row.slug,
    image: row.image || "",
    images: Array.isArray(row.images) ? row.images : [],
    colors: parseProductColors(row.colors),
    price: Number(row.price) || 0,
    compareAtPrice: row.compareAtPrice,
    category: row.category,
    ageRange: row.ageRange ?? undefined,
    ages: normalizeProductAges(row.ages, row.ageRange),
    nameTr: row.nameTr,
    nameEn: row.nameEn,
    descTr: row.descTr || "",
    descEn: row.descEn || "",
    stockQuantity: row.stockQuantity ?? 0,
    inStock: row.inStock ?? true,
  };
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: npx tsx scripts/build-description-sql.ts products.json");
  process.exit(1);
}

const rows = JSON.parse(
  require("fs").readFileSync(inputPath, "utf8")
) as Row[];

const statements = rows.map((row) => {
  const product = toProduct(row);
  const descTr = getSearchableProductDesc(product, "tr");
  const descEn = getSearchableProductDesc(product, "en");
  return `UPDATE "Product" SET "descTr" = ${sqlString(descTr)}, "descEn" = ${sqlString(descEn)}, "updatedAt" = NOW() WHERE id = ${sqlString(row.id)};`;
});

const sql = `BEGIN;\n${statements.join("\n")}\nCOMMIT;\n`;
const out = inputPath.replace(/\.json$/i, ".sql");
writeFileSync(out, sql);
console.log(`Wrote ${statements.length} updates to ${out}`);
