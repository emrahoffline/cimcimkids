import type { Product } from "./types";
import { getProductImages, isOnSale } from "./types";
import { getProductName } from "./product-utils";
import {
  getMerchantSearchSpecs,
  getSearchableProductDesc,
  MERCHANT_SPEC_LABELS,
  needsInseamSize,
  specValue,
} from "./product-specs";
import { absoluteUrl, SITE_NAME, SITE_ORIGIN } from "./seo";
import {
  GOOGLE_MERCHANT_REGION,
  merchantProductUrl,
} from "./google-merchant-regions";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tag(name: string, value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === "") return "";
  return `      <${name}>${xmlEscape(String(value))}</${name}>\n`;
}

function money(amount: number): string {
  return `${Number(amount).toFixed(2)} TRY`;
}

function googleProductCategory(product: Product): string {
  const text = `${product.nameTr} ${product.nameEn} ${product.category}`.toLowerCase();
  if (/elbise|dress/.test(text)) return "2271";
  if (/eşofman|esofman|tracksuit/.test(text)) return "5322";
  if (
    /takım|takim|kombin|outfit|set/.test(text) ||
    product.category === "outfits"
  ) {
    return "212";
  }
  if (needsInseamSize(product) || /pantolon|pants|jean/.test(text)) return "204";
  if (product.category === "baby" || /bebek|baby/.test(text)) return "537";
  return "1604";
}

function gender(product: Product): string {
  const text = `${product.nameTr} ${product.nameEn} ${product.category}`.toLowerCase();
  if (/kız|kiz|girl|elbise|dress/.test(text) || product.category === "girls") {
    return "female";
  }
  if (/erkek|boy/.test(text) || product.category === "boys") return "male";
  return "unisex";
}

function ageGroup(product: Product): string {
  if (product.category === "baby") return "infant";
  const ages = `${(product.ages ?? []).join(" ")} ${product.ageRange ?? ""}`;
  if (/\b(0-3|3-6|6-9|9-12|12-18|18-24)\s*ay\b/i.test(ages) && !/ya[sş]/i.test(ages)) {
    return "infant";
  }
  return "kids";
}

function itemXml(product: Product): string {
  const locale = "tr";
  const name = getProductName(product, locale);
  const description = getSearchableProductDesc(product, locale);
  const images = getProductImages(product).map((src) => absoluteUrl(src));
  const specs = getMerchantSearchSpecs(product, locale);
  const color = specValue(
    specs,
    MERCHANT_SPEC_LABELS.color.tr,
    MERCHANT_SPEC_LABELS.color.en
  );
  const size = specValue(
    specs,
    MERCHANT_SPEC_LABELS.size.tr,
    MERCHANT_SPEC_LABELS.size.en
  );
  const material = specValue(
    specs,
    MERCHANT_SPEC_LABELS.material.tr,
    MERCHANT_SPEC_LABELS.material.en
  );
  const pattern = specValue(
    specs,
    MERCHANT_SPEC_LABELS.pattern.tr,
    MERCHANT_SPEC_LABELS.pattern.en
  );
  const extraImages = images.slice(1, 11);

  let xml = "    <item>\n";
  xml += tag("g:id", product.code || product.id);
  xml += tag("g:title", name);
  xml += tag("g:description", description);
  xml += tag("g:link", merchantProductUrl(locale, product.slug));
  xml += tag("g:image_link", images[0] || absoluteUrl("/images/hero1.png"));
  for (const src of extraImages) {
    xml += tag("g:additional_image_link", src);
  }
  xml += tag("g:availability", product.inStock ? "in_stock" : "out_of_stock");
  if (isOnSale(product) && product.compareAtPrice) {
    xml += tag("g:price", money(product.compareAtPrice));
    xml += tag("g:sale_price", money(product.price));
  } else {
    xml += tag("g:price", money(product.price));
  }
  xml += tag("g:condition", "new");
  xml += tag("g:brand", SITE_NAME);
  xml += tag("g:identifier_exists", "no");
  xml += tag("g:mpn", product.code || product.id);
  xml += tag("g:item_group_id", product.id);
  xml += tag("g:google_product_category", googleProductCategory(product));
  xml += tag("g:product_type", "Çocuk giyim");
  xml += tag("g:adult", "no");
  xml += tag("g:age_group", ageGroup(product));
  xml += tag("g:gender", gender(product));
  xml += tag("g:color", color);
  xml += tag("g:size", size);
  xml += tag("g:material", material);
  xml += tag("g:pattern", pattern);
  xml += "    </item>\n";
  return xml;
}

function regionalItemXml(product: Product, regionId: string): string {
  let xml = "    <item>\n";
  xml += tag("g:id", product.code || product.id);
  xml += tag("g:region_id", regionId);
  xml += tag("g:availability", product.inStock ? "in_stock" : "out_of_stock");
  if (isOnSale(product) && product.compareAtPrice) {
    xml += tag("g:price", money(product.compareAtPrice));
    xml += tag("g:sale_price", money(product.price));
  } else {
    xml += tag("g:price", money(product.price));
  }
  xml += "    </item>\n";
  return xml;
}

function rssFeed(title: string, description: string, items: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
    `  <channel>\n` +
    `    <title>${xmlEscape(title)}</title>\n` +
    `    <link>${xmlEscape(SITE_ORIGIN)}</link>\n` +
    `    <description>${xmlEscape(description)}</description>\n` +
    items +
    `  </channel>\n` +
    `</rss>\n`
  );
}

export function buildGoogleMerchantFeed(products: Product[]): string {
  return rssFeed(
    SITE_NAME,
    "Cimcim Kids çocuk giyim ürünleri",
    products.map(itemXml).join("")
  );
}

export function buildGoogleMerchantRegionalFeed(products: Product[]): string {
  const regionId = GOOGLE_MERCHANT_REGION.id;
  return rssFeed(
    `${SITE_NAME} ${GOOGLE_MERCHANT_REGION.name}`,
    "Cimcim Kids bölgesel stok ve fiyat",
    products.map((product) => regionalItemXml(product, regionId)).join("")
  );
}
