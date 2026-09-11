import type { Metadata } from "next";
import type { Category, Product } from "./types";
import { getProductName } from "./product-utils";
import { getProductSpecs, getSearchableProductDesc } from "./product-specs";
import { getProductImages } from "./types";
import { STORE_CONFIG } from "./store-config";

/** Production canonical origin — never use localhost in SEO output. */
export const SITE_ORIGIN = "https://www.cimcimkids.com";
export const SITE_NAME = "Cimcim Kids";
export const SITE_EMAIL = "info@cimcimkids.com";
export const DEFAULT_OG_IMAGE = "/images/hero1.png";

export type AppLocale = "tr" | "en";

export function isAppLocale(value: string): value is AppLocale {
  return value === "tr" || value === "en";
}

export function localePath(locale: string, path = ""): string {
  const normalized = path
    ? path.startsWith("/")
      ? path
      : `/${path}`
    : "";
  const joined = `/${locale}${normalized}`.replace(/\/{2,}/g, "/");
  if (joined.length > 1 && joined.endsWith("/")) {
    return joined.slice(0, -1);
  }
  return joined;
}

export function canonicalUrl(locale: string, path = ""): string {
  const url = new URL(localePath(locale, path), `${SITE_ORIGIN}/`);
  url.hash = "";
  url.search = "";
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

export function absoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return `${SITE_ORIGIN}${DEFAULT_OG_IMAGE}`;
  if (pathOrUrl.startsWith("https://") || pathOrUrl.startsWith("http://")) {
    try {
      const parsed = new URL(pathOrUrl);
      if (parsed.hostname.endsWith("cimcimkids.com")) return parsed.toString();
    } catch {
      // fall through
    }
    return `${SITE_ORIGIN}${DEFAULT_OG_IMAGE}`;
  }
  return `${SITE_ORIGIN}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function clipMeta(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const sliced = clean.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export function languageAlternates(locale: string, path = "") {
  return {
    canonical: canonicalUrl(locale, path),
    languages: {
      tr: canonicalUrl("tr", path),
      en: canonicalUrl("en", path),
      "x-default": canonicalUrl("tr", path),
    },
  };
}

type BuildMetadataInput = {
  locale: string;
  path?: string;
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article";
  index?: boolean;
  follow?: boolean;
  absoluteTitle?: boolean;
};

export function buildMetadata({
  locale,
  path = "",
  title,
  description,
  image,
  type = "website",
  index = true,
  follow = true,
  absoluteTitle = false,
}: BuildMetadataInput): Metadata {
  const url = canonicalUrl(locale, path);
  const ogImage = absoluteUrl(image || DEFAULT_OG_IMAGE);
  const desc = clipMeta(description);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    applicationName: SITE_NAME,
    robots: {
      index,
      follow,
      googleBot: { index, follow },
    },
    alternates: languageAlternates(locale, path),
    openGraph: {
      type,
      locale: locale === "en" ? "en_US" : "tr_TR",
      alternateLocale: locale === "en" ? ["tr_TR"] : ["en_US"],
      url,
      siteName: SITE_NAME,
      title,
      description: desc,
      images: [{ url: ogImage, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage],
    },
  };
}

export function noIndexMetadata(
  locale: string,
  path: string,
  title: string,
  description: string
): Metadata {
  return buildMetadata({
    locale,
    path,
    title,
    description,
    index: false,
    follow: false,
    absoluteTitle: true,
  });
}

export type CategorySeo = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  body: string;
};

const CATEGORY_COPY: Record<
  string,
  {
    titleTr: string;
    titleEn: string;
    h1Tr: string;
    h1En: string;
    descTr: string;
    descEn: string;
    bodyTr: string;
    bodyEn: string;
  }
> = {
  girls: {
    titleTr: "Kız Çocuk Giyim | Cimcim Kids",
    titleEn: "Girls Clothing | Cimcim Kids",
    h1Tr: "Kız Çocuk Giyim",
    h1En: "Girls Clothing",
    descTr:
      "Cimcim Kids kız çocuk giyim: günlük kullanım için rahat elbiseler, jileler ve takımlar. Türkiye’ye kargo.",
    descEn:
      "Cimcim Kids girls clothing: comfortable dresses, pinafores and sets for everyday wear. Shipping across Turkey.",
    bodyTr:
      "Kız çocuk koleksiyonumuz oyun ve günlük kullanım için seçilmiş rahat kesimler içerir. Ürünleri yaş aralığına göre inceleyebilir, stokta olan parçaları hemen sipariş edebilirsiniz.",
    bodyEn:
      "Our girls collection focuses on comfortable cuts for play and everyday wear. Browse by age and order pieces that are currently in stock.",
  },
  boys: {
    titleTr: "Erkek Çocuk Giyim | Cimcim Kids",
    titleEn: "Boys Clothing | Cimcim Kids",
    h1Tr: "Erkek Çocuk Giyim",
    h1En: "Boys Clothing",
    descTr:
      "Cimcim Kids erkek çocuk giyim: hareket rahatlığı sunan günlük parçalar ve takımlar. Türkiye’ye kargo.",
    descEn:
      "Cimcim Kids boys clothing: everyday pieces and sets made for easy movement. Shipping across Turkey.",
    bodyTr:
      "Erkek çocuk giyim seçkimiz, gün boyu konforu öne çıkarır. Stoktaki ürünleri inceleyerek size uygun beden ve modeli seçebilirsiniz.",
    bodyEn:
      "Our boyswear edit puts all-day comfort first. Check current stock and choose the style that fits.",
  },
  baby: {
    titleTr: "Bebek Giyim | Cimcim Kids",
    titleEn: "Baby Clothing | Cimcim Kids",
    h1Tr: "Bebek Giyim",
    h1En: "Baby Clothing",
    descTr:
      "Cimcim Kids bebek giyim: hassas ciltler için seçilmiş yumuşak ve rahat parçalar. Türkiye’ye kargo.",
    descEn:
      "Cimcim Kids baby clothing: soft, comfortable pieces chosen with sensitive skin in mind. Shipping across Turkey.",
    bodyTr:
      "Bebek koleksiyonumuz yumuşak dokunuşlu, günlük bakımı kolay parçalardan oluşur. Yaş ve stok bilgisi her ürün kartında yer alır.",
    bodyEn:
      "Our baby collection is made of soft, easy-care pieces. Age and stock details are shown on every product card.",
  },
};

export function getCategorySeo(
  category: Category,
  locale: string
): CategorySeo {
  const copy = CATEGORY_COPY[category.slug];
  const name = locale === "en" ? category.nameEn : category.nameTr;
  if (!copy) {
    const title =
      locale === "en"
        ? `${name} | Cimcim Kids`
        : `${name} | Cimcim Kids`;
    const description =
      locale === "en"
        ? `Shop the ${name} collection at Cimcim Kids. Comfortable kids and baby clothing with shipping across Turkey.`
        : `Cimcim Kids ${name} koleksiyonu. Rahat çocuk ve bebek giyim, Türkiye’ye kargo.`;
    const body =
      locale === "en"
        ? `Browse ${name} pieces currently available in the Cimcim Kids store.`
        : `Cimcim Kids mağazasında yer alan ${name} ürünlerini inceleyebilirsiniz.`;
    return { slug: category.slug, title, h1: name, description, body };
  }
  return {
    slug: category.slug,
    title: locale === "en" ? copy.titleEn : copy.titleTr,
    h1: locale === "en" ? copy.h1En : copy.h1Tr,
    description: locale === "en" ? copy.descEn : copy.descTr,
    body: locale === "en" ? copy.bodyEn : copy.bodyTr,
  };
}

export function productMetaDescription(product: Product, locale: string): string {
  const name = getProductName(product, locale);
  const desc = getSearchableProductDesc(product, locale).replace(/\s+/g, " ").trim();
  if (desc.length >= 70) return clipMeta(desc);
  if (desc) return clipMeta(`${name}: ${desc}`);
  return clipMeta(
    locale === "en"
      ? `${name} from Cimcim Kids. Kids and baby clothing, shipping across Turkey.`
      : `${name} — Cimcim Kids çocuk ve bebek giyim.`
  );
}

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: canonicalUrl("tr"),
    logo: absoluteUrl("/icon-512.png"),
    email: SITE_EMAIL,
    telephone: `+${STORE_CONFIG.whatsappPhone}`,
    sameAs: [
      STORE_CONFIG.instagramUrl,
      STORE_CONFIG.trendyolUrl,
      STORE_CONFIG.hepsiburadaUrl,
      STORE_CONFIG.facebookUrl,
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: canonicalUrl("tr"),
    inLanguage: ["tr-TR", "en"],
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
  };
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function productJsonLd(input: {
  product: Product;
  locale: string;
  categoryLabel: string;
  rating?: { average: number; count: number };
}) {
  const { product, locale, categoryLabel, rating } = input;
  const name = getProductName(product, locale);
  const description = getSearchableProductDesc(product, locale).trim();
  const images = getProductImages(product).map((src) => absoluteUrl(src));
  const url = canonicalUrl(locale, `/products/${product.slug}`);
  const specs = getProductSpecs(product, locale);
  const color = specs.find((s) => s.label === "Renk" || s.label === "Color")?.value;
  const material = specs.find((s) => s.label === "Malzeme" || s.label === "Material")?.value;
  const size = specs.find(
    (s) => s.label === "Beden / yaş" || s.label === "Size / age"
  )?.value;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: images.length ? images : [absoluteUrl(DEFAULT_OG_IMAGE)],
    sku: product.code,
    color: color || undefined,
    material: material || undefined,
    size: size || undefined,
    additionalProperty: specs.map((spec) => ({
      "@type": "PropertyValue",
      name: spec.label,
      value: spec.value,
    })),
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    category: categoryLabel || undefined,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "TRY",
      price: Number(product.price).toFixed(2),
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    aggregateRating:
      rating && rating.count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: rating.average.toFixed(1),
            reviewCount: rating.count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export const PUBLIC_STATIC_PATHS = [
  "/about",
  "/contact",
  "/faq",
  "/gift-cards",
  "/returns",
  "/privacy",
  "/distance-sales",
  "/kvkk",
  "/products",
] as const;
