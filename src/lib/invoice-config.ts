import "server-only";
import { SITE_EMAIL, SITE_ORIGIN } from "./seo";
import { STORE_CONFIG } from "./store-config";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

function envNumber(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export type InvoiceSeller = {
  title: string;
  taxNumber: string;
  taxOffice: string;
  address: string;
  district: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  mersis: string;
};

export function getInvoiceSeller(): InvoiceSeller {
  const phone = env("COMPANY_PHONE") || STORE_CONFIG.whatsappPhone;
  return {
    title: env("COMPANY_TITLE") || STORE_CONFIG.accountHolder,
    taxNumber: env("COMPANY_VKN") || env("COMPANY_TCKN"),
    taxOffice: env("COMPANY_TAX_OFFICE", "Didim"),
    address: env(
      "COMPANY_ADDRESS",
      "Akbük Mah. 5932 Cad. Rüyamkent No: 7/4"
    ),
    district: env("COMPANY_DISTRICT", "Didim"),
    city: env("COMPANY_CITY", "Aydın"),
    postalCode: env("COMPANY_POSTAL_CODE"),
    country: env("COMPANY_COUNTRY", "Türkiye"),
    phone,
    email: env("COMPANY_EMAIL", SITE_EMAIL),
    website: env("COMPANY_WEBSITE", SITE_ORIGIN),
    mersis: env("COMPANY_MERSIS"),
  };
}

export function getInvoiceSeries() {
  return {
    archiveSeries: env("EFATURA_ARCHIVE_SERIES", "CKA"),
    invoiceSeries: env("EFATURA_INVOICE_SERIES", "CKF"),
    invoiceProfile: env("EFATURA_PROFILE", "TEMELFATURA"),
  };
}

export function getNilveraConfig() {
  const apiKey = env("NILVERA_API_KEY");
  const test = env("NILVERA_TEST", "false") === "true";
  return {
    apiKey,
    baseUrl: env(
      "NILVERA_BASE_URL",
      test ? "https://apitest.nilvera.com" : "https://api.nilvera.com"
    ).replace(/\/$/, ""),
    ...getInvoiceSeries(),
  };
}

export function getBienConfig() {
  const test = env("BIEN_TEST", "false") === "true";
  return {
    username: env("BIEN_USERNAME"),
    password: env("BIEN_PASSWORD"),
    endpoint: env(
      "BIEN_ENDPOINT",
      test
        ? "https://connect-test.bienteknoloji.com.tr/Services/Integration"
        : "https://connect.bienteknoloji.com.tr/Services/Integration"
    ).replace(/\/$/, ""),
    ...getInvoiceSeries(),
  };
}

export type EFaturaProvider = "bien" | "nilvera";

export function getEFaturaProvider(): EFaturaProvider | null {
  const forced = env("EFATURA_PROVIDER").toLowerCase();
  const bien = getBienConfig();
  const hasBien = Boolean(bien.username && bien.password);
  const hasNilvera = Boolean(getNilveraConfig().apiKey);
  if (forced === "bien") return hasBien ? "bien" : null;
  if (forced === "nilvera") return hasNilvera ? "nilvera" : null;
  if (hasBien) return "bien";
  if (hasNilvera) return "nilvera";
  return null;
}

export function isEFaturaConfigured(): boolean {
  return getEFaturaProvider() !== null;
}

export function shouldAutoIssueInvoice(): boolean {
  if (!isEFaturaConfigured()) return false;
  const raw = env("EFATURA_AUTO_ISSUE", "true");
  return raw !== "false" && raw !== "0";
}

export function getDefaultKdvRate(): number {
  return envNumber("DEFAULT_KDV_RATE", 10);
}

export function getGiftCardKdvRate(): number {
  return envNumber("GIFT_CARD_KDV_RATE", 20);
}
