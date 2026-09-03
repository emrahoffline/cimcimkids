import {
  isValidDistrict,
  isValidProvince,
} from "@/lib/turkey-locations";

export type InvoiceType = "individual" | "corporate";

export type ShippingAddressFields = {
  title: string;
  address: string;
  city: string;
  district: string;
  postalCode?: string;
  invoiceType: InvoiceType;
  companyName?: string;
  taxOffice?: string;
  taxNumber?: string;
};

export type AddressFieldError =
  | "title"
  | "address"
  | "city"
  | "district"
  | "postalCode"
  | "company"
  | "taxOffice"
  | "taxNumber";

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

export function parseInvoiceType(value: unknown): InvoiceType {
  return value === "corporate" ? "corporate" : "individual";
}

export function parseShippingAddress(
  raw: Record<string, unknown>
): { ok: true; value: ShippingAddressFields } | { ok: false; error: AddressFieldError } {
  const title = clean(raw.addressTitle ?? raw.title, 80);
  if (title.length < 2) return { ok: false, error: "title" };

  const address = clean(raw.address, 500);
  if (address.length < 8) return { ok: false, error: "address" };

  const city = clean(raw.city, 80);
  if (!isValidProvince(city)) return { ok: false, error: "city" };

  const district = clean(raw.district, 80);
  if (!isValidDistrict(city, district)) return { ok: false, error: "district" };

  const postalRaw = clean(raw.postalCode, 10);
  const postalDigits = digits(postalRaw);
  if (postalRaw && postalDigits.length !== 5) {
    return { ok: false, error: "postalCode" };
  }

  const invoiceType = parseInvoiceType(raw.invoiceType);
  const companyName = clean(raw.companyName, 200);
  const taxOffice = clean(raw.taxOffice, 80);
  const taxNumber = digits(clean(raw.taxNumber, 20));

  if (invoiceType === "corporate") {
    if (companyName.length < 2) return { ok: false, error: "company" };
    if (taxOffice.length < 2) return { ok: false, error: "taxOffice" };
    if (taxNumber.length !== 10) return { ok: false, error: "taxNumber" };
  }

  return {
    ok: true,
    value: {
      title,
      address,
      city,
      district,
      postalCode: postalDigits || undefined,
      invoiceType,
      companyName: invoiceType === "corporate" ? companyName : undefined,
      taxOffice: invoiceType === "corporate" ? taxOffice : undefined,
      taxNumber: invoiceType === "corporate" ? taxNumber : undefined,
    },
  };
}

export function formatShippingAddress(fields: ShippingAddressFields): string {
  const lines = [
    fields.title,
    fields.address,
    `${fields.district} / ${fields.city} / Türkiye`,
  ];
  if (fields.postalCode) lines.push(`PK: ${fields.postalCode}`);
  if (fields.invoiceType === "corporate") {
    lines.push("Fatura: Kurumsal");
    if (fields.companyName) lines.push(`Ünvan: ${fields.companyName}`);
    if (fields.taxOffice) lines.push(`Vergi Dairesi: ${fields.taxOffice}`);
    if (fields.taxNumber) lines.push(`VKN: ${fields.taxNumber}`);
  } else {
    lines.push("Fatura: Bireysel");
  }
  return lines.join("\n");
}

/** Street line sent to iyzico (no invoice metadata). */
export function iyzicoStreetAddress(fields: ShippingAddressFields): string {
  return `${fields.address}, ${fields.district}`.slice(0, 350);
}
