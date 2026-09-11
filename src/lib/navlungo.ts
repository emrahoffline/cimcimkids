import "server-only";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export class NavlungoError extends Error {
  status: number;
  body: string;
  constructor(message: string, status = 502, body = "") {
    super(message);
    this.name = "NavlungoError";
    this.status = status;
    this.body = body;
  }
}

export function getNavlungoConfig() {
  const test = env("NAVLUNGO_TEST", "false") === "true";
  return {
    username: env("NAVLUNGO_USERNAME"),
    password: env("NAVLUNGO_PASSWORD"),
    senderAddressId: Number(env("NAVLUNGO_SENDER_ADDRESS_ID") || 0) || null,
    baseUrl: env(
      "NAVLUNGO_BASE_URL",
      test
        ? "https://domestic-api-qa.navlungo.com/v2.1"
        : "https://domestic-api.navlungo.com/v2.1"
    ).replace(/\/$/, ""),
  };
}

export function isNavlungoConfigured(): boolean {
  const cfg = getNavlungoConfig();
  return Boolean(cfg.username && cfg.password);
}

export type NavlungoCarrier = {
  id: number;
  name: string;
  shortName?: string;
  trackingUrl?: string;
  sameDay: boolean;
  standard: boolean;
};

export type NavlungoSender = {
  id: number;
  name: string;
  city?: string;
  district?: string;
  address?: string;
  main?: boolean;
};

export type NavlungoShipment = {
  postNumber: string;
  trackingUrl?: string;
  barcodeUrl?: string;
  carrierId?: number;
  carrierName?: string;
  cost?: number;
};

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asPositiveMoney(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(",", "."));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

function pickNavlungoCost(row: Record<string, unknown> | null): number | undefined {
  if (!row) return undefined;
  return (
    asPositiveMoney(row.calculated_price) ??
    asPositiveMoney(row.post_price) ??
    asPositiveMoney(row.shipping_price)
  );
}

export function extractNavlungoCost(json: unknown): number | undefined {
  const row = asRecord(json);
  const first = Array.isArray(json)
    ? asRecord(json[0])
    : Array.isArray(row?.data)
      ? asRecord((row.data as unknown[])[0])
      : asRecord(row?.data) || row;
  const outerPost = asRecord(first?.post) || first;
  const innerPost = asRecord(outerPost?.post) || outerPost;
  return (
    pickNavlungoCost(innerPost) ||
    pickNavlungoCost(outerPost) ||
    pickNavlungoCost(first) ||
    pickNavlungoCost(row)
  );
}

function errorMessage(json: unknown, fallback: string): string {
  const row = asRecord(json);
  if (!row) return fallback;
  if (typeof row.error === "string") return row.error;
  if (typeof row.message === "string" && row.message !== "Doğrulama Hatası") {
    return row.message;
  }
  if (row.error && typeof row.error === "object") {
    const first = Object.values(row.error as Record<string, unknown>)[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    if (typeof first === "string") return first;
  }
  return fallback;
}

async function navlungoFetch(
  path: string,
  init: RequestInit = {},
  authed = true,
  retried = false
): Promise<{ status: number; json: unknown; text: string }> {
  const cfg = getNavlungoConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-localization": "tr",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (authed) {
    headers.Authorization = `Bearer ${await getAccessToken()}`;
  }
  const method = (init.method || "GET").toUpperCase();
  const body = typeof init.body === "string" ? init.body : undefined;
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}${path}`, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : body,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(25_000),
    });
  } catch (err) {
    const timedOut =
      (err instanceof Error && err.name === "TimeoutError") ||
      (err instanceof Error && err.name === "AbortError");
    throw new NavlungoError(
      timedOut ? "Navlungo yanıt vermedi (zaman aşımı)." : "Navlungo bağlantısı kurulamadı.",
      504
    );
  }
  const status = res.status;
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (status === 401 && authed && !retried) {
    tokenCache = null;
    return navlungoFetch(path, init, authed, true);
  }
  if (status < 200 || status >= 300) {
    throw new NavlungoError(
      errorMessage(json, `Navlungo HTTP ${status}`),
      status,
      text.slice(0, 2000)
    );
  }
  const row = asRecord(json);
  if (row && row.status === false) {
    throw new NavlungoError(errorMessage(json, "Navlungo isteği başarısız."), status || 502, text.slice(0, 2000));
  }
  return { status, json, text };
}

async function getAccessToken(): Promise<string> {
  const cfg = getNavlungoConfig();
  if (!cfg.username || !cfg.password) {
    throw new NavlungoError("NAVLUNGO_USERNAME / NAVLUNGO_PASSWORD tanımlı değil.", 500);
  }
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }
  const { json } = await navlungoFetch(
    "/auth/api",
    {
      method: "POST",
      body: JSON.stringify({ username: cfg.username, password: cfg.password }),
    },
    false
  );
  const row = asRecord(json);
  const nested = asRecord(row?.data) || row;
  const token =
    (typeof nested?.access_token === "string" && nested.access_token) ||
    (typeof nested?.token === "string" && nested.token) ||
    (typeof row?.access_token === "string" && row.access_token) ||
    "";
  if (!token) {
    throw new NavlungoError("Navlungo token dönmedi.", 502, JSON.stringify(json));
  }
  const expiresRaw = nested?.expires_in ?? row?.expires_in;
  let expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  if (typeof expiresRaw === "string" && expiresRaw.includes("-")) {
    const parsed = Date.parse(expiresRaw.replace(" ", "T"));
    if (Number.isFinite(parsed)) expiresAt = parsed;
  } else {
    const seconds = Number(expiresRaw);
    if (Number.isFinite(seconds) && seconds > 0) {
      expiresAt = Date.now() + seconds * 1000;
    }
  }
  tokenCache = { token, expiresAt };
  return token;
}

export function formatNavlungoPhone(raw?: string | null): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("90") && local.length >= 12) local = local.slice(2);
  if (local.startsWith("0") && local.length === 11) local = local.slice(1);
  if (local.length !== 10) return raw?.trim() || "";
  return `+90 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
}

export async function listNavlungoCarriers(): Promise<NavlungoCarrier[]> {
  const { json } = await navlungoFetch("/carrier/my-carriers?limit=50", {
    method: "GET",
  });
  const row = asRecord(json);
  const list = Array.isArray(json)
    ? json
    : Array.isArray(row?.data)
      ? row.data
      : [];
  const carriers: NavlungoCarrier[] = [];
  for (const item of list) {
    const c = asRecord(item);
    if (!c) continue;
    const id = Number(c.id);
    if (!Number.isFinite(id)) continue;
    const types = Array.isArray(c.post_type) ? c.post_type.map(Number) : [];
    const carrier: NavlungoCarrier = {
      id,
      name: String(c.carrier_name || c.name || `Kargo #${id}`),
      sameDay: types.includes(1),
      standard: types.includes(2) || types.length === 0,
    };
    if (typeof c.short_name === "string") carrier.shortName = c.short_name;
    if (typeof c.tracking_url === "string") carrier.trackingUrl = c.tracking_url;
    carriers.push(carrier);
  }
  return carriers;
}

export async function listNavlungoSenders(): Promise<NavlungoSender[]> {
  const { json } = await navlungoFetch("/address-book/getAll?limit=20&page=1", {
    method: "GET",
  });
  const row = asRecord(json);
  const list = Array.isArray(row?.data) ? row.data : [];
  const senders: NavlungoSender[] = [];
  for (const item of list) {
    const a = asRecord(item);
    if (!a) continue;
    if (a.address_type && a.address_type !== "sender") continue;
    const id = Number(a.id);
    if (!Number.isFinite(id)) continue;
    const sender: NavlungoSender = {
      id,
      name: String(a.location_name || a.address_name || `Adres #${id}`),
      main: a.is_main_warehouse === 1 || a.is_main_warehouse === true,
    };
    if (typeof a.address_city === "string") sender.city = a.address_city;
    if (typeof a.address_district === "string") sender.district = a.address_district;
    if (typeof a.address_line === "string") sender.address = a.address_line;
    senders.push(sender);
  }
  return senders;
}

export async function resolveSenderAddressId(): Promise<number> {
  const cfg = getNavlungoConfig();
  if (cfg.senderAddressId) return cfg.senderAddressId;
  const senders = await listNavlungoSenders();
  const main = senders.find((s) => s.main) ?? senders[0];
  if (!main) {
    throw new NavlungoError(
      "Navlungo adres defterinde gönderici (depo) adresi yok. Panelde Adres Defteri’ne ekleyin.",
      400
    );
  }
  return main.id;
}

export async function createNavlungoShipment(input: {
  referenceId: string;
  carrierId: number;
  postType?: 1 | 2;
  recipient: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    district: string;
  };
  desi: number;
  packageCount?: number;
  note?: string;
}): Promise<NavlungoShipment> {
  const senderAddressId = await resolveSenderAddressId();
  const phone = formatNavlungoPhone(input.recipient.phone);
  if (!phone) {
    throw new NavlungoError("Alıcı telefonu kargo için gerekli.", 400);
  }
  const { json } = await navlungoFetch("/post/create", {
    method: "POST",
    body: JSON.stringify({
      platform: "cimcimkids",
      posts: [
        {
          reference_id: input.referenceId,
          carrier_id: input.carrierId,
          post_type: input.postType ?? 2,
          cod_payment_type: "",
          sender: { addressId: senderAddressId },
          recipient: {
            name: input.recipient.name,
            phone,
            email: input.recipient.email || "",
            address: input.recipient.address,
            country: "tr",
            city: input.recipient.city,
            district: input.recipient.district,
            post_code: "",
          },
          post: {
            desi: input.desi,
            package_count: input.packageCount ?? 1,
            price: "",
            note: input.note || "",
          },
          barcode_format: "pdf-A6",
        },
      ],
    }),
  });

  const row = asRecord(json);
  const first = Array.isArray(json)
    ? asRecord(json[0])
    : Array.isArray(row?.data)
      ? asRecord((row.data as unknown[])[0])
      : asRecord(row?.data) || row;
  if (!first) {
    throw new NavlungoError("Navlungo gönderi numarası dönmedi.", 502, JSON.stringify(json));
  }
  const post = asRecord(first.post) || first;
  const postNumber = String(
    first.post_number || first.postNumber || post.post_number || ""
  );
  if (!postNumber) {
    throw new NavlungoError("Navlungo gönderi numarası dönmedi.", 502, JSON.stringify(json));
  }
  const carrierId = Number(post.carrier_id) || input.carrierId;
  let trackingUrl =
    (typeof first.tracking_url === "string" && first.tracking_url) ||
    `https://domestic-track.navlungo.com/check/${postNumber}`;
  let carrierName =
    typeof post.carrier_name === "string" ? post.carrier_name : undefined;
  if (!carrierName || trackingUrl.includes("domestic-track.navlungo.com")) {
    try {
      const carriers = await listNavlungoCarriers();
      const picked = carriers.find((c) => c.id === carrierId);
      if (picked) {
        carrierName = carrierName || picked.name;
        if (picked.trackingUrl?.includes("%s")) {
          trackingUrl = picked.trackingUrl.replace("%s", postNumber);
        }
      }
    } catch {
      /* tracking template is optional */
    }
  }
  const cost =
    extractNavlungoCost(json) ??
    extractNavlungoCost(first) ??
    (await getNavlungoShipmentCost(postNumber).catch(() => undefined));
  return {
    postNumber,
    trackingUrl,
    barcodeUrl:
      (typeof first.barcode_url === "string" && first.barcode_url) || undefined,
    carrierId,
    carrierName,
    cost,
  };
}

export async function getNavlungoShipmentCost(postNumber: string): Promise<number | undefined> {
  const { json } = await navlungoFetch(`/post/check/${encodeURIComponent(postNumber)}`);
  return extractNavlungoCost(json);
}

async function fetchBarcodePdfOnce(postNumber: string): Promise<Buffer> {
  const { json } = await navlungoFetch("/barcode/getBarcode", {
    method: "POST",
    body: JSON.stringify({ post_number: postNumber, barcode_type: "pdf" }),
  });
  const row = asRecord(json);
  const data = asRecord(row?.data) || row;
  const b64 =
    (typeof data?.barcode_pdf === "string" && data.barcode_pdf) ||
    (typeof data?.barcode === "string" && data.barcode) ||
    "";
  if (!b64) {
    throw new NavlungoError("Navlungo barkod PDF’i boş döndü.", 502, JSON.stringify(json));
  }
  return Buffer.from(b64.replace(/^data:application\/pdf;base64,/, ""), "base64");
}

export async function getNavlungoBarcodePdf(postNumber: string): Promise<Buffer> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
    try {
      return await fetchBarcodePdfOnce(postNumber);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new NavlungoError("Navlungo barkod PDF’i alınamadı.", 502);
}

export async function cancelNavlungoShipment(postNumber: string): Promise<void> {
  const { json } = await navlungoFetch("/post/cancel", {
    method: "POST",
    body: JSON.stringify({ post_number: postNumber }),
  });
  const row = asRecord(json);
  if (row && row.status === false) {
    throw new NavlungoError(errorMessage(json, "Kargo iptal edilemedi."), 400);
  }
}
