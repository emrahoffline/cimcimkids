import type { Product } from "./types";
import { getProductAges, getColorLabel } from "./types";
import { getProductDesc, getProductName } from "./product-utils";

export type ProductSpec = { label: string; value: string };

type LocaleText = { tr: string; en: string };

const ORIGIN: LocaleText = { tr: "Türkiye", en: "Turkey" };
const CARE: LocaleText = {
  tr: "30°C hassas yıkama",
  en: "Machine wash at 30°C, gentle cycle",
};

function loc(locale: string, text: LocaleText) {
  return locale === "en" ? text.en : text.tr;
}

function haystack(product: Product) {
  return `${product.nameTr} ${product.nameEn} ${product.descTr} ${product.descEn}`.toLowerCase();
}

function nameHaystack(product: Product) {
  return `${product.nameTr} ${product.nameEn}`.toLowerCase();
}

function fromName(
  product: Product,
  pairs: [RegExp, LocaleText][]
): LocaleText | null {
  const text = nameHaystack(product);
  for (const [re, value] of pairs) {
    if (re.test(text)) return value;
  }
  return null;
}

const COLOR_FROM_NAME: [RegExp, LocaleText][] = [
  [/pembe|pink/, { tr: "Pembe", en: "Pink" }],
  [/lacivert|navy/, { tr: "Lacivert", en: "Navy" }],
  [/krem|cream/, { tr: "Krem", en: "Cream" }],
  [/siyah|black/, { tr: "Siyah", en: "Black" }],
  [/bej|beige/, { tr: "Bej", en: "Beige" }],
  [/kahverengi|brown|teddy/, { tr: "Kahverengi", en: "Brown" }],
  [/yeşil|green/, { tr: "Yeşil", en: "Green" }],
  [/mor|purple/, { tr: "Mor", en: "Purple" }],
  [/kırmızı|red/, { tr: "Kırmızı", en: "Red" }],
  [/beyaz|white/, { tr: "Beyaz", en: "White" }],
  [/mavi|blue/, { tr: "Mavi", en: "Blue" }],
];

const PATTERN_FROM_NAME: [RegExp, LocaleText][] = [
  [/puantiy/, { tr: "Puantiye", en: "Polka dot" }],
  [/damal|check|kareli|pötikare|potikare|gingham/, { tr: "Damalı", en: "Check" }],
  [/leopar|leopard/, { tr: "Leopar", en: "Leopard print" }],
  [/zebra/, { tr: "Zebra baskı", en: "Zebra print" }],
  [/papatya|çiçek|cicek|floral|fruits/, { tr: "Çiçekli / nakışlı", en: "Floral / embroidered" }],
  [/çizgili|cizgili|stripe/, { tr: "Çizgili", en: "Striped" }],
  [/fiyonk|kurdele|bow|ribbon/, { tr: "Fiyonk / kurdele nakış", en: "Bow / ribbon embroidery" }],
  [/hello kitty|lego|mcqueen|minecraft/, { tr: "Karakter baskısı", en: "Character print" }],
  [/geyik|deer/, { tr: "Geyik baskı", en: "Deer print" }],
  [/bear/, { tr: "Ayı baskı", en: "Bear print" }],
];

function inferMaterial(product: Product): LocaleText {
  const text = haystack(product);
  if (/bubble/.test(text)) {
    return { tr: "Likralı bubble kumaş", en: "Stretch bubble fabric" };
  }
  if (/jean|denim/.test(text)) {
    return { tr: "Pamuklu denim", en: "Cotton denim" };
  }
  if (/viskon|viscose/.test(text)) {
    return { tr: "Viskon", en: "Viscose" };
  }
  if (/tül|tulle/.test(text)) {
    return { tr: "Tül ve dokuma kumaş", en: "Tulle and woven fabric" };
  }
  if (/triko|hırka|hirka/.test(text)) {
    return { tr: "Triko ve pamuk", en: "Knit and cotton" };
  }
  if (/sweat|eşofman|esofman|track/.test(text)) {
    return { tr: "%100 pamuklu şardonlu kumaş", en: "100% cotton fleece" };
  }
  if (/tişört|tisort|t-shirt|tshirt/.test(text)) {
    return { tr: "%100 pamuk", en: "100% cotton" };
  }
  if (/ceket|jacket/.test(text)) {
    return { tr: "Pamuklu dokuma", en: "Cotton twill" };
  }
  if (/elbise|dress/.test(text)) {
    return { tr: "Hafif dokuma kumaş", en: "Lightweight woven fabric" };
  }
  if (/%\s*100\s*(pamuk|cotton)/i.test(text) || /pamuklu/.test(text)) {
    return { tr: "%100 pamuk", en: "100% cotton" };
  }
  return { tr: "Pamuklu kumaş", en: "Cotton fabric" };
}

function inferFit(product: Product): LocaleText | null {
  const text = nameHaystack(product);
  if (/wide\s*leg|bol paça|bol paca/.test(text)) {
    return { tr: "Wide leg / bol paça", en: "Wide leg" };
  }
  if (/balloon/.test(text)) {
    return { tr: "Balloon kalıp", en: "Balloon fit" };
  }
  if (/garson|oversize/.test(text)) {
    return { tr: "Oversize / garson kalıp", en: "Oversized fit" };
  }
  if (/eşofman|esofman/.test(text)) {
    return { tr: "Rahat eşofman kalıbı", en: "Relaxed tracksuit fit" };
  }
  return null;
}

function inferKind(product: Product): LocaleText {
  const text = nameHaystack(product);
  if (/takım|takim|kombin|outfit|set|eşofman|esofman|track/.test(text) || product.category === "outfits") {
    if (/eşofman|esofman|track/.test(text)) {
      return { tr: "eşofman takımı", en: "tracksuit" };
    }
    return { tr: "çocuk takım", en: "kids outfit" };
  }
  if (/elbise|dress/.test(text)) {
    return { tr: "kız çocuk elbise", en: "girls dress" };
  }
  if (/sweatshirt/.test(text)) {
    return { tr: "çocuk sweatshirt", en: "kids sweatshirt" };
  }
  if (/tişört|tisort|t-shirt|tshirt/.test(text)) {
    return { tr: "çocuk tişört", en: "kids t-shirt" };
  }
  if (/ceket|jacket/.test(text)) {
    return { tr: "çocuk ceket", en: "kids jacket" };
  }
  if (/pantolon|pants|jeans|jean/.test(text)) {
    return { tr: "çocuk pantolon", en: "kids pants" };
  }
  return { tr: "çocuk giyim", en: "kids clothing" };
}

export function getProductColorNames(product: Product, locale: string): string[] {
  const fromColors = (product.colors ?? [])
    .map((c) => getColorLabel(c, locale).trim())
    .filter(Boolean);
  if (fromColors.length) return [...new Set(fromColors)];
  const text = `${nameHaystack(product)} ${product.slug.replace(/-/g, " ")}`;
  for (const [re, value] of COLOR_FROM_NAME) {
    if (re.test(text)) return [loc(locale, value)];
  }
  return [];
}

export function getProductSpecs(product: Product, locale: string): ProductSpec[] {
  const en = locale === "en";
  const colors = getProductColorNames(product, locale);
  const ages = getProductAges(product);
  const pattern = fromName(product, PATTERN_FROM_NAME);
  const material = inferMaterial(product);
  const fit = inferFit(product);
  const specs: ProductSpec[] = [];

  if (colors.length) {
    specs.push({ label: en ? "Color" : "Renk", value: colors.join(", ") });
  }
  if (ages.length) {
    specs.push({
      label: en ? "Size / age" : "Beden / yaş",
      value: ages.join(", "),
    });
  }
  if (
    /pantolon|pants/i.test(nameHaystack(product)) &&
    !/kombin|takım|takim|outfit|set/i.test(nameHaystack(product))
  ) {
    specs.push({
      label: en ? "Inseam" : "İç dikiş boyu",
      value: en
        ? "Varies by selected age size"
        : "Seçilen yaş bedenine göre değişir",
    });
  }
  if (pattern) {
    specs.push({ label: en ? "Pattern" : "Desen", value: loc(locale, pattern) });
  }
  specs.push({ label: en ? "Material" : "Malzeme", value: loc(locale, material) });
  if (fit) {
    specs.push({ label: en ? "Fit" : "Kalıp", value: loc(locale, fit) });
  }
  specs.push({ label: en ? "Origin" : "Üretim yeri", value: loc(locale, ORIGIN) });
  specs.push({ label: en ? "Care" : "Bakım", value: loc(locale, CARE) });
  return specs;
}

export function isWeakProductDesc(text: string): boolean {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 48) return true;
  const folded = compact.toLowerCase();
  if (/^(eng|2|oversize|pantolon|30°|30 °|%100 pamuk|%100 cotton|%100 pamuklu)$/i.test(compact)) {
    return true;
  }
  const careOnly =
    /üretim yeri|bakım talimatı|yıkama|30°/.test(folded) &&
    compact.length < 120 &&
    !/renk|beden|malzeme|desen|kumaş|pamuk|denim|bubble/.test(folded);
  return careOnly;
}

function defaultIntro(product: Product, locale: string): string {
  const name = getProductName(product, locale);
  const kind = loc(locale, inferKind(product));
  const colors = getProductColorNames(product, locale);
  const material = loc(locale, inferMaterial(product));
  const pattern = fromName(product, PATTERN_FROM_NAME);
  const fit = inferFit(product);
  const ages = getProductAges(product);

  if (locale === "en") {
    const bits = [
      `${name} is a ${kind} made from ${material}.`,
      colors.length ? `It comes in ${colors.join(", ")}.` : "",
      pattern ? `Pattern: ${loc(locale, pattern)}.` : "",
      fit ? `Fit: ${loc(locale, fit)}.` : "",
      ages.length ? `Sizes / ages: ${ages.join(", ")}.` : "",
      "Made in Turkey. Machine wash at 30°C on a gentle cycle.",
    ];
    return bits.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  const bits = [
    `${name}, ${material} ${kind}.`,
    colors.length ? `${colors.join(", ")} renk.` : "",
    pattern ? `${loc(locale, pattern)} desenli.` : "",
    fit ? `${loc(locale, fit)}.` : "",
    ages.length ? `${ages.join(", ")} bedenlerinde.` : "",
    "Üretim yeri Türkiye. 30°C hassas yıkama önerilir.",
  ];
  return bits.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function specsParagraph(product: Product, locale: string): string {
  return getProductSpecs(product, locale)
    .map((s) => `${s.label}: ${s.value}.`)
    .join(" ");
}

function alreadyHasSpecs(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("malzeme:") ||
    t.includes("material:") ||
    (t.includes("renk:") && t.includes("beden")) ||
    (t.includes("color:") && t.includes("size"))
  );
}

/** Visible product-page copy (structured specs are listed separately). */
export function getStorefrontProductDesc(product: Product, locale: string): string {
  const existing = getProductDesc(product, locale).replace(/\s+/g, " ").trim();
  if (isWeakProductDesc(existing) || alreadyHasSpecs(existing)) {
    return defaultIntro(product, locale);
  }
  return existing;
}

/** Description Google Shopping can search: color, size, pattern, material labeled. */
export function getSearchableProductDesc(product: Product, locale: string): string {
  const intro = getStorefrontProductDesc(product, locale);
  if (alreadyHasSpecs(intro)) return intro;
  return `${intro} ${specsParagraph(product, locale)}`.replace(/\s+/g, " ").trim();
}
