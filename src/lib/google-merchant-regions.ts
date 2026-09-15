import { canonicalUrl } from "./seo";

/**
 * Google Merchant Center regional availability/pricing.
 * Region ID: 2–100 chars, lowercase alphanumeric + underscore only (no hyphen).
 * Turkey supports province-based RAAP regions, not shipping-by-province.
 */
export const GOOGLE_MERCHANT_REGION = {
  id: "tr_metro",
  name: "İstanbul Ankara İzmir Antalya",
  country: "TR",
  provinces: ["İstanbul", "Ankara", "İzmir", "Antalya"],
} as const;

export const GOOGLE_MERCHANT_REGION_FEED_PATH =
  "/google-merchant-regions.xml";

export function isMerchantRegionId(
  value: string | string[] | undefined
): boolean {
  const id = Array.isArray(value) ? value[0] : value;
  return id === GOOGLE_MERCHANT_REGION.id;
}

export function merchantProductUrl(
  locale: string,
  slug: string,
  regionId?: string
): string {
  const url = new URL(canonicalUrl(locale, `/products/${slug}`));
  if (regionId) url.searchParams.set("region_id", regionId);
  return url.toString();
}
