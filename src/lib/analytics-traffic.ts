export const TRAFFIC_SOURCES = [
  "google_shopping",
  "google_organic",
  "google_paid",
  "instagram",
  "direct",
  "referral",
] as const;

export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

const SOURCE_SET = new Set<string>(TRAFFIC_SOURCES);

export function isTrafficSource(value: unknown): value is TrafficSource {
  return typeof value === "string" && SOURCE_SET.has(value);
}

export function classifyTrafficSource(
  search: string,
  referrer: string
): TrafficSource {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  if (params.get("srsltid")) return "google_shopping";
  if (params.get("gclid") || params.get("gbraid") || params.get("wbraid")) {
    return "google_paid";
  }

  const utmSource = (params.get("utm_source") || "").toLowerCase();
  const utmMedium = (params.get("utm_medium") || "").toLowerCase();
  const utmCampaign = (params.get("utm_campaign") || "").toLowerCase();
  if (
    utmMedium.includes("shop") ||
    utmCampaign.includes("shopping") ||
    utmSource.includes("shopping")
  ) {
    return "google_shopping";
  }
  if (utmSource.includes("google")) {
    if (utmMedium === "cpc" || utmMedium === "ppc" || utmMedium === "paid") {
      return "google_paid";
    }
    return "google_organic";
  }
  if (utmSource.includes("instagram") || utmSource === "ig") return "instagram";

  let host = "";
  try {
    if (referrer) host = new URL(referrer).hostname.toLowerCase();
  } catch {
    host = "";
  }
  if (
    host === "google.com" ||
    host.endsWith(".google.com") ||
    host.includes("google.")
  ) {
    if (host.includes("shopping") || referrer.toLowerCase().includes("shopping")) {
      return "google_shopping";
    }
    return "google_organic";
  }
  if (host.includes("instagram.")) return "instagram";
  if (!host || host.endsWith("cimcimkids.com")) return "direct";
  return "referral";
}

export function productSlugFromPath(path: string): string | null {
  const match = path.match(/^\/(tr|en)\/products\/([^/?#]+)$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[2]);
  } catch {
    return match[2];
  }
}

export function describeStorePath(
  path: string,
  productNameBySlug?: Map<string, string>
): string {
  const raw = (path || "/").split("?")[0];
  const rest = raw.replace(/^\/(tr|en)(?=\/|$)/, "") || "/";
  if (rest === "/") return "Ana sayfa";
  if (rest === "/products") return "Ürün listesi";
  if (rest.startsWith("/products/")) {
    const slug = rest.slice("/products/".length);
    return productNameBySlug?.get(slug) || slug;
  }
  if (rest === "/gift-cards") return "Hediye kartı";
  if (rest === "/cart") return "Sepet";
  if (rest === "/checkout") return "Ödeme";
  if (rest === "/about") return "Hakkımızda";
  if (rest === "/contact") return "İletişim";
  if (rest === "/favorites") return "Favoriler";
  if (rest === "/tracking") return "Kargo takip";
  if (rest.startsWith("/kategori/")) return "Kategori";
  if (rest === "/faq") return "SSS";
  return rest;
}

export function trafficSourceLabel(source: string): string {
  switch (source) {
    case "google_shopping":
      return "Google Alışveriş";
    case "google_organic":
      return "Google arama";
    case "google_paid":
      return "Google reklam";
    case "instagram":
      return "Instagram";
    case "referral":
      return "Başka site";
    default:
      return "Direkt / diğer";
  }
}
