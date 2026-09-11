import "server-only";
import { randomUUID } from "crypto";
import type { Order } from "@/lib/db";
import { getBienConfig } from "@/lib/invoice-config";
import { SITE_ORIGIN } from "@/lib/seo";
import { buyerTaxNumberForProviders } from "@/lib/tax-id";
import { EFaturaError, type EFaturaSendResult } from "./errors";
import { buildUblInvoiceXml } from "./ubl";
import type { InvoiceTotals } from "@/lib/invoice-tax";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripInvoiceDeclaration(xml: string): string {
  return xml.replace(/^<\?xml[^?]*\?>\s*/i, "").trim();
}

function attr(xml: string, name: string): string | undefined {
  return xml.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

function inner(xml: string, tag: string): string | undefined {
  return xml.match(
    new RegExp(`<(?:[\\w.-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?${tag}>`, "i")
  )?.[1];
}

function isSucceeded(xml: string): boolean {
  const value = attr(xml, "IsSucceded") ?? attr(xml, "IsSucceeded");
  return value?.toLowerCase() === "true";
}

function resultMessage(xml: string): string {
  return decodeXml(attr(xml, "Message") || inner(xml, "faultstring") || inner(xml, "Text") || "").trim();
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function isoUtc(date = new Date(), extraMs = 0): string {
  return new Date(date.getTime() + extraMs).toISOString().replace(/\.\d+Z$/, "Z");
}

function soapEnvelope(username: string, password: string, body: string): string {
  const created = isoUtc();
  const expires = isoUtc(new Date(), 5 * 60 * 1000);
  const tokenId = `uuid-${randomUUID()}`;
  return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <o:Security s:mustUnderstand="1"
      xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
      xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      <u:Timestamp u:Id="_0">
        <u:Created>${created}</u:Created>
        <u:Expires>${expires}</u:Expires>
      </u:Timestamp>
      <o:UsernameToken u:Id="${tokenId}">
        <o:Username>${xmlEscape(username)}</o:Username>
        <o:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${xmlEscape(password)}</o:Password>
      </o:UsernameToken>
    </o:Security>
  </s:Header>
  <s:Body>
    ${body}
  </s:Body>
</s:Envelope>`;
}

async function bienSoap(action: string, body: string): Promise<string> {
  const cfg = getBienConfig();
  if (!cfg.username || !cfg.password) {
    throw new EFaturaError("BIEN_USERNAME / BIEN_PASSWORD tanımlı değil.", 500);
  }
  const envelope = soapEnvelope(cfg.username, cfg.password, body);
  const res = await fetch(cfg.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"http://tempuri.org/IIntegration/${action}"`,
    },
    body: envelope,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok || /<\w*:?Fault[\s>]/i.test(text)) {
    const msg =
      resultMessage(text) ||
      text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400) ||
      `Bien HTTP ${res.status}`;
    throw new EFaturaError(msg, res.status || 502, text.slice(0, 2000));
  }
  return text;
}

export async function bienIsEInvoiceUser(vknTckn: string): Promise<boolean> {
  const xml = await bienSoap(
    "IsEInvoiceUser",
    `<IsEInvoiceUser xmlns="http://tempuri.org/">
      <vknTckn>${xmlEscape(vknTckn)}</vknTckn>
      <alias></alias>
    </IsEInvoiceUser>`
  );
  const result = xml.match(/<(?:[\w.-]+:)?IsEInvoiceUserResult\b[^>]*>/i)?.[0] ?? xml;
  if (!isSucceeded(result) && attr(result, "IsSucceded")) {
    throw new EFaturaError(resultMessage(result) || "Bien mükellef sorgusu başarısız.", 502, xml.slice(0, 2000));
  }
  return (attr(result, "Value") ?? inner(xml, "IsEInvoiceUserResult") ?? "").toLowerCase() === "true";
}

function internetPayment(order: Order): { type: string; mediator?: string } {
  const gift = (order.giftCardAmount ?? 0) > 0;
  if (gift && order.total <= 0) return { type: "DIGER" };
  if (order.paymentMethod === "card") {
    return { type: "KREDIKARTI/BANKAKARTI", mediator: "iyzico" };
  }
  return { type: "EFT/HAVALE" };
}

export async function bienSendInvoice(
  order: Order,
  documentType: "e_archive" | "e_invoice",
  totals: InvoiceTotals,
  invoiceUuid: string
): Promise<EFaturaSendResult> {
  const cfg = getBienConfig();
  const series =
    documentType === "e_invoice" ? cfg.invoiceSeries : cfg.archiveSeries;
  const ubl = stripInvoiceDeclaration(
    buildUblInvoiceXml({
      order,
      documentType,
      uuid: invoiceUuid,
      invoiceId: series,
      totals,
      profileId: cfg.invoiceProfile,
    })
  );
  const pay = internetPayment(order);
  const now = new Date();
  const paymentDate = now.toISOString();
  const scenario = documentType === "e_invoice" ? "eInvoice" : "eArchive";
  const taxId = buyerTaxNumberForProviders(order.taxId);
  const buyerName =
    order.invoiceKind === "corporate"
      ? order.companyTitle || order.customerName
      : order.customerName;
  const eArchive =
    documentType === "e_archive"
      ? `<EArchiveInvoiceInfo DeliveryType="Electronic">
          <InternetSalesInfo>
            <WebAddress>${xmlEscape(SITE_ORIGIN)}</WebAddress>
            ${pay.mediator ? `<PaymentMidierName>${xmlEscape(pay.mediator)}</PaymentMidierName>` : ""}
            <PaymentType>${xmlEscape(pay.type)}</PaymentType>
            <PaymentDate>${paymentDate}</PaymentDate>
          </InternetSalesInfo>
        </EArchiveInvoiceInfo>`
      : "";

  const xml = await bienSoap(
    "SendInvoice",
    `<SendInvoice xmlns="http://tempuri.org/">
      <invoices>
        <InvoiceInfo LocalDocumentId="${xmlEscape(order.orderNumber)}">
          ${ubl}
          <TargetCustomer VknTckn="${xmlEscape(taxId)}" Title="${xmlEscape(buyerName)}" />
          ${eArchive}
          <Scenario>${scenario}</Scenario>
          <CreateDateUtc>${isoUtc(now)}</CreateDateUtc>
        </InvoiceInfo>
      </invoices>
    </SendInvoice>`
  );

  const resultTag = xml.match(/<(?:[\w.-]+:)?SendInvoiceResult\b[\s\S]*?<\/(?:[\w.-]+:)?SendInvoiceResult>/i)?.[0] ?? xml;
  if (!isSucceeded(resultTag)) {
    throw new EFaturaError(
      resultMessage(resultTag) || "Bien fatura gönderimi başarısız.",
      502,
      xml.slice(0, 2000)
    );
  }
  const valueTag =
    resultTag.match(/<(?:[\w.-]+:)?Value\b[^>]*\/?>/i)?.[0] ?? resultTag;
  const uuid = attr(valueTag, "Id") || invoiceUuid;
  const invoiceNumber = attr(valueTag, "Number") || null;
  return { uuid, invoiceNumber };
}

export async function bienDownloadInvoicePdf(invoiceId: string): Promise<Buffer> {
  const xml = await bienSoap(
    "GetOutboxInvoicePdf",
    `<GetOutboxInvoicePdf xmlns="http://tempuri.org/">
      <invoiceId>${xmlEscape(invoiceId)}</invoiceId>
    </GetOutboxInvoicePdf>`
  );
  const resultTag =
    xml.match(/<(?:[\w.-]+:)?GetOutboxInvoicePdfResult\b[\s\S]*?<\/(?:[\w.-]+:)?GetOutboxInvoicePdfResult>/i)?.[0] ??
    xml;
  if (attr(resultTag, "IsSucceded") && !isSucceeded(resultTag)) {
    throw new EFaturaError(
      resultMessage(resultTag) || "Bien PDF alınamadı.",
      502,
      xml.slice(0, 2000)
    );
  }
  const data = (inner(resultTag, "Data") || "").replace(/\s+/g, "");
  if (!data) {
    throw new EFaturaError("Bien PDF içeriği boş döndü.", 502, xml.slice(0, 2000));
  }
  return Buffer.from(data, "base64");
}
