import type { Metadata } from "next";
import type { Product } from "./types";
import { getProductDesc, getProductName } from "./product-utils";

/** Production canonical origin — apex (www redirects here). */
export const SITE_ORIGIN = "https://cimcimkids.com";
export const SITE_NAME = "Cimcim Kids";
export const SITE_EMAIL = "info@cimcimkids.com";
export const DEFAULT_OG_IMAGE = "/products/product-1.png";

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

export function productMetaDescription(product: Product, locale: string): string {
  const name = getProductName(product, locale);
  const desc = getProductDesc(product, locale).replace(/\s+/g, " ").trim();
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
    logo: absoluteUrl("/favicon-96.png"),
    email: SITE_EMAIL,
    telephone: "+905337007318",
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

export function productJsonLd(input: {
  product: Product;
  locale: string;
  categoryLabel: string;
}) {
  const { product, locale, categoryLabel } = input;
  const name = getProductName(product, locale);
  const description =
    getProductDesc(product, locale).trim() ||
    productMetaDescription(product, locale);
  const url = canonicalUrl(locale, `/products/${product.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: [absoluteUrl(product.image)],
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
  "/returns",
  "/privacy",
  "/distance-sales",
  "/kvkk",
  "/products",
] as const;
