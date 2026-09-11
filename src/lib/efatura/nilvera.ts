import "server-only";
import { getNilveraConfig } from "@/lib/invoice-config";
import { EFaturaError, type EFaturaSendResult } from "./errors";

export type NilveraTaxpayer = {
  taxNumber?: string | null;
  title?: string | null;
  name?: string | null;
  type?: string | null;
  documentType?: string | null;
};

export type { EFaturaSendResult as NilveraSendResult };

export class NilveraError extends EFaturaError {
  constructor(message: string, status: number, body: string) {
    super(message, status, body);
    this.name = "NilveraError";
  }
}

function authHeaders(): HeadersInit {
  const { apiKey } = getNilveraConfig();
  if (!apiKey) {
    throw new NilveraError("NILVERA_API_KEY tanımlı değil.", 500, "");
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function nilveraFetch(
  path: string,
  init: RequestInit = {},
  expect: "json" | "bytes" = "json"
): Promise<{ status: number; json: unknown; bytes: ArrayBuffer; text: string }> {
  const { baseUrl } = getNilveraConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const bytes = await res.arrayBuffer();
  const text = new TextDecoder().decode(bytes);
  let json: unknown = null;
  if (expect === "json" && text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    const msg =
      (json && typeof json === "object" && "Message" in json
        ? String((json as { Message?: unknown }).Message)
        : text.slice(0, 400)) || `Nilvera HTTP ${res.status}`;
    throw new NilveraError(msg, res.status, text.slice(0, 2000));
  }
  return { status: res.status, json, bytes, text };
}

export async function checkEInvoiceTaxpayer(
  taxNumber: string
): Promise<NilveraTaxpayer[]> {
  const { json } = await nilveraFetch(
    `/general/GlobalCompany/Check/TaxNumber/${encodeURIComponent(taxNumber)}?globalUserType=Invoice`
  );
  return Array.isArray(json) ? (json as NilveraTaxpayer[]) : [];
}

export async function sendArchiveInvoice(payload: unknown): Promise<EFaturaSendResult> {
  const { json } = await nilveraFetch("/earchive/Send/Model", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return parseSendResult(json);
}

export async function sendEInvoice(payload: unknown): Promise<EFaturaSendResult> {
  const { json } = await nilveraFetch("/einvoice/Send/Model", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return parseSendResult(json);
}

export async function downloadInvoicePdf(
  uuid: string,
  documentType: "e_archive" | "e_invoice"
): Promise<Buffer> {
  const path =
    documentType === "e_invoice"
      ? `/einvoice/Sale/${uuid}/pdf`
      : `/earchive/Invoices/${uuid}/pdf`;
  const { bytes } = await nilveraFetch(path, { method: "GET" }, "bytes");
  return Buffer.from(bytes);
}

function parseSendResult(json: unknown): EFaturaSendResult {
  const row = (json ?? {}) as {
    UUID?: string;
    Uuid?: string;
    InvoiceNumber?: string | null;
  };
  const uuid = row.UUID || row.Uuid;
  if (!uuid) {
    throw new NilveraError("Nilvera UUID dönmedi.", 502, JSON.stringify(json));
  }
  return { uuid, invoiceNumber: row.InvoiceNumber ?? null };
}
