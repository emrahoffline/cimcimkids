import { getClientIp } from "./rate-limit";

const UNKNOWN = "Bilinmiyor";

const COUNTRY_NAMES: Record<string, string> = {
  TR: "Türkiye",
  DE: "Almanya",
  NL: "Hollanda",
  GB: "Birleşik Krallık",
  US: "ABD",
  FR: "Fransa",
  AT: "Avusturya",
  BE: "Belçika",
  CH: "İsviçre",
  AZ: "Azerbaycan",
  CY: "Kıbrıs",
  IQ: "Irak",
  SA: "Suudi Arabistan",
  AE: "BAE",
  RU: "Rusya",
  SE: "İsveç",
  NO: "Norveç",
  DK: "Danimarka",
  IT: "İtalya",
  ES: "İspanya",
};

type Geo = { country: string; city: string };

declare global {
  var __cimcimGeoCache: Map<string, Geo & { exp: number }> | undefined;
}

function cache() {
  if (!globalThis.__cimcimGeoCache) {
    globalThis.__cimcimGeoCache = new Map();
  }
  return globalThis.__cimcimGeoCache;
}

function decodeHeader(value: string | null): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value.replace(/\+/g, " ")).trim();
  } catch {
    return value.trim();
  }
}

function normalizeCountry(raw: string): string {
  const value = raw.trim();
  if (!value || value === UNKNOWN) return UNKNOWN;
  if (value.length === 2) {
    return COUNTRY_NAMES[value.toUpperCase()] || value.toUpperCase();
  }
  if (value.toLowerCase() === "turkey") return "Türkiye";
  return value;
}

function isMissingCity(city: string) {
  return !city || city === UNKNOWN;
}

function isLocalIp(ip: string) {
  return (
    !ip ||
    ip === "unknown" ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.")
  );
}

async function lookupIp(ip: string): Promise<Geo | null> {
  const store = cache();
  const hit = store.get(ip);
  if (hit && hit.exp > Date.now()) {
    return { country: hit.country, city: hit.city };
  }
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city,regionName&lang=tr`,
      { signal: AbortSignal.timeout(2500) }
    );
    const data = (await res.json()) as {
      status?: string;
      country?: string;
      city?: string;
      regionName?: string;
    };
    if (data.status !== "success") return null;
    const geo: Geo = {
      country: normalizeCountry(data.country || UNKNOWN),
      city: (data.city || data.regionName || UNKNOWN).trim() || UNKNOWN,
    };
    if (store.size > 2500) {
      const oldest = store.keys().next().value;
      if (oldest) store.delete(oldest);
    }
    store.set(ip, { ...geo, exp: Date.now() + 6 * 60 * 60 * 1000 });
    return geo;
  } catch {
    return null;
  }
}

export async function resolveVisitorGeo(request: Request): Promise<Geo> {
  const headerCountry = decodeHeader(
    request.headers.get("cf-ipcountry") ||
      request.headers.get("x-vercel-ip-country")
  );
  const headerCity = decodeHeader(
    request.headers.get("cf-ipcity") ||
      request.headers.get("x-vercel-ip-city")
  );
  const headerRegion = decodeHeader(
    request.headers.get("cf-region") ||
      request.headers.get("x-vercel-ip-country-region")
  );

  let country = headerCountry ? normalizeCountry(headerCountry) : "";
  let city = headerCity || headerRegion;
  const ip = getClientIp(request);

  if (isLocalIp(ip)) {
    return {
      country: country || "Türkiye",
      city: city || "Yerel Ağ",
    };
  }

  if (isMissingCity(city) || !country || country === UNKNOWN) {
    const looked = await lookupIp(ip);
    if (looked) {
      if (isMissingCity(city)) city = looked.city;
      if (!country || country === UNKNOWN) country = looked.country;
    }
  }

  return {
    country: country || UNKNOWN,
    city: city || UNKNOWN,
  };
}
