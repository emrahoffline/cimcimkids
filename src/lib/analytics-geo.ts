export async function resolveVisitorGeo(request: Request) {
  const headerCountry =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry");

  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  if (headerCountry) {
    return {
      country: headerCountry,
      city: request.headers.get("x-vercel-ip-city") || "Bilinmiyor",
    };
  }

  if (!forwarded || forwarded === "127.0.0.1" || forwarded.startsWith("192.168.")) {
    return { country: "TR", city: "Yerel Ağ" };
  }

  try {
    const res = await fetch(
      `http://ip-api.com/json/${forwarded}?fields=status,country,city,regionName`,
      { signal: AbortSignal.timeout(2500) }
    );
    const data = (await res.json()) as {
      status?: string;
      country?: string;
      city?: string;
      regionName?: string;
    };
    if (data.status === "success") {
      return {
        country: data.country || "Bilinmiyor",
        city: data.city || data.regionName || "Bilinmiyor",
      };
    }
  } catch {
    /* fallback below */
  }

  return { country: "Bilinmiyor", city: "Bilinmiyor" };
}
