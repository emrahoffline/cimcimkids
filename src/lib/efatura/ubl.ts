import type { Order } from "@/lib/db";
import { getInvoiceSeller } from "@/lib/invoice-config";
import { moneyRound, type InvoiceTotals } from "@/lib/invoice-tax";
import { SITE_ORIGIN } from "@/lib/seo";
import { STORE_CONFIG } from "@/lib/store-config";
import { buyerTaxNumberForProviders } from "@/lib/tax-id";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function money(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function splitPersonName(full: string): { first: string; family: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Alıcı", family: "Müşteri" };
  if (parts.length === 1) return { first: parts[0], family: parts[0] };
  return { first: parts[0], family: parts.slice(1).join(" ") };
}

function schemeForTaxId(taxId: string): "VKN" | "TCKN" {
  return taxId.length === 11 ? "TCKN" : "VKN";
}

function istanbulStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}:${get("second")}`,
  };
}

const ONES = [
  "",
  "Bir",
  "İki",
  "Üç",
  "Dört",
  "Beş",
  "Altı",
  "Yedi",
  "Sekiz",
  "Dokuz",
];
const TENS = [
  "",
  "On",
  "Yirmi",
  "Otuz",
  "Kırk",
  "Elli",
  "Altmış",
  "Yetmiş",
  "Seksen",
  "Doksan",
];

function threeDigitsToWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;
  const parts: string[] = [];
  if (hundreds === 1) parts.push("Yüz");
  else if (hundreds > 1) parts.push(`${ONES[hundreds]}Yüz`);
  if (tens) parts.push(TENS[tens]);
  if (ones) parts.push(ONES[ones]);
  return parts.join("");
}

export function amountToWordsTr(amount: number): string {
  const safe = Math.max(0, Math.round(amount * 100) / 100);
  const lira = Math.floor(safe);
  const kurus = Math.round((safe - lira) * 100);
  const groups = [
    { value: Math.floor(lira / 1_000_000), suffix: "Milyon" },
    { value: Math.floor((lira % 1_000_000) / 1000), suffix: "Bin" },
    { value: lira % 1000, suffix: "" },
  ];
  const words: string[] = [];
  for (const group of groups) {
    if (!group.value) continue;
    const chunk = threeDigitsToWords(group.value);
    if (group.suffix === "Bin" && group.value === 1) words.push("Bin");
    else words.push(`${chunk}${group.suffix}`);
  }
  const liraText = words.join("") || "Sıfır";
  const kurusText = kurus ? `${threeDigitsToWords(kurus)}Kuruş` : "SıfırKuruş";
  return `Yalnız #${liraText} Türk Lirası ${kurusText}#`;
}

function partyXml(opts: {
  taxId: string;
  name: string;
  taxOffice?: string;
  street?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  mersis?: string;
}): string {
  const scheme = schemeForTaxId(opts.taxId);
  const person = scheme === "TCKN" ? splitPersonName(opts.name) : null;
  const identifications = [
    `<cac:PartyIdentification><cbc:ID schemeID="${scheme}">${xmlEscape(opts.taxId)}</cbc:ID></cac:PartyIdentification>`,
  ];
  if (opts.mersis) {
    identifications.push(
      `<cac:PartyIdentification><cbc:ID schemeID="MERSISNO">${xmlEscape(opts.mersis)}</cbc:ID></cac:PartyIdentification>`
    );
  }
  const nameXml =
    scheme === "VKN"
      ? `<cac:PartyName><cbc:Name>${xmlEscape(opts.name)}</cbc:Name></cac:PartyName>`
      : "";
  const personXml = person
    ? `<cac:Person><cbc:FirstName>${xmlEscape(person.first)}</cbc:FirstName><cbc:FamilyName>${xmlEscape(person.family)}</cbc:FamilyName></cac:Person>`
    : "";
  const contactBits = [
    opts.phone
      ? `<cbc:Telephone>${xmlEscape(opts.phone)}</cbc:Telephone>`
      : "",
    opts.email
      ? `<cbc:ElectronicMail>${xmlEscape(opts.email)}</cbc:ElectronicMail>`
      : "",
  ].join("");
  return `
    <cac:Party>
      ${opts.website ? `<cbc:WebsiteURI>${xmlEscape(opts.website)}</cbc:WebsiteURI>` : ""}
      ${identifications.join("")}
      ${nameXml}
      <cac:PostalAddress>
        <cbc:StreetName>${xmlEscape(opts.street || opts.city || "Türkiye")}</cbc:StreetName>
        <cbc:CitySubdivisionName>${xmlEscape(opts.district || opts.city || "Merkez")}</cbc:CitySubdivisionName>
        <cbc:CityName>${xmlEscape(opts.city || "Türkiye")}</cbc:CityName>
        ${opts.postalCode ? `<cbc:PostalZone>${xmlEscape(opts.postalCode)}</cbc:PostalZone>` : ""}
        <cac:Country><cbc:Name>${xmlEscape(opts.country || "Türkiye")}</cbc:Name></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cac:TaxScheme><cbc:Name>${xmlEscape(opts.taxOffice || "Vergi Dairesi")}</cbc:Name></cac:TaxScheme>
      </cac:PartyTaxScheme>
      ${contactBits ? `<cac:Contact>${contactBits}</cac:Contact>` : ""}
      ${personXml}
    </cac:Party>`;
}

export function buildUblInvoiceXml(opts: {
  order: Order;
  documentType: "e_archive" | "e_invoice";
  uuid: string;
  invoiceId: string;
  totals: InvoiceTotals;
  profileId: string;
}): string {
  const { order, documentType, uuid, invoiceId, totals, profileId } = opts;
  const seller = getInvoiceSeller();
  const stamp = istanbulStamp();
  const buyerTaxId = buyerTaxNumberForProviders(order.taxId);
  const buyerName =
    order.invoiceKind === "corporate"
      ? order.companyTitle || order.customerName
      : order.customerName;
  const city = order.invoiceCity || "";
  const district = order.invoiceDistrict || "";
  const address =
    (order.shippingAddress ?? "")
      .replace(new RegExp(`,\\s*${district}\\s*,\\s*${city}\\s*$`, "i"), "")
      .replace(new RegExp(`,\\s*${city}\\s*$`, "i"), "")
      .trim() ||
    order.shippingAddress ||
    "";
  const paymentCode = order.paymentMethod === "card" ? "48" : "42";
  const notes = [
    amountToWordsTr(totals.gross),
    `Sipariş no: ${order.orderNumber}`,
    `${SITE_ORIGIN.replace(/^https?:\/\//, "")} internet satışı`,
  ];
  if ((order.discountAmount ?? 0) > 0) {
    notes.push(
      `İndirim kodu: ${order.discountAmount} TL${order.discountCode ? ` (${order.discountCode})` : ""}`
    );
  }
  if ((order.giftCardAmount ?? 0) > 0) {
    notes.push(
      `Hediye kartı: ${order.giftCardAmount} TL${order.giftCardCode ? ` (${order.giftCardCode})` : ""}`
    );
  }

  const taxSubtotals = Object.entries(totals.vatByRate)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([rate, vat]) => {
      const percent = Number(rate);
      const taxable = moneyRoundForRate(totals, percent);
      return `
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="TRY">${money(taxable)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="TRY">${money(vat)}</cbc:TaxAmount>
          <cbc:Percent>${percent}</cbc:Percent>
          <cac:TaxCategory>
            <cac:TaxScheme>
              <cbc:Name>KDV</cbc:Name>
              <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>`;
    })
    .join("");

  const lines = totals.lines
    .map(
      (line, idx) => `
    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="C62">${line.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="TRY">${money(line.lineNet)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="TRY">${money(line.kdvAmount)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="TRY">${money(line.lineNet)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="TRY">${money(line.kdvAmount)}</cbc:TaxAmount>
          <cbc:Percent>${line.kdvRate}</cbc:Percent>
          <cac:TaxCategory>
            <cac:TaxScheme>
              <cbc:Name>KDV</cbc:Name>
              <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${xmlEscape(line.name.slice(0, 200))}</cbc:Name>
        <cac:SellersItemIdentification>
          <cbc:ID>${xmlEscape(line.productId.slice(0, 40))}</cbc:ID>
        </cac:SellersItemIdentification>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="TRY">${money(line.unitNet, 4)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`
    )
    .join("");

  const profile =
    documentType === "e_archive" ? "EARSIVFATURA" : profileId || "TEMELFATURA";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${xmlEscape(profile)}</cbc:ProfileID>
  <cbc:ID>${xmlEscape(invoiceId)}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${xmlEscape(uuid)}</cbc:UUID>
  <cbc:IssueDate>${stamp.date}</cbc:IssueDate>
  <cbc:IssueTime>${stamp.time}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
  ${notes.map((n) => `<cbc:Note>${xmlEscape(n)}</cbc:Note>`).join("")}
  <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${totals.lines.length}</cbc:LineCountNumeric>
  <cac:OrderReference>
    <cbc:ID>${xmlEscape(order.orderNumber)}</cbc:ID>
    <cbc:IssueDate>${stamp.date}</cbc:IssueDate>
  </cac:OrderReference>
  <cac:AccountingSupplierParty>
    ${partyXml({
      taxId: seller.taxNumber,
      name: seller.title,
      taxOffice: seller.taxOffice,
      street: seller.address,
      district: seller.district,
      city: seller.city,
      postalCode: seller.postalCode,
      country: seller.country,
      phone: seller.phone,
      email: seller.email,
      website: seller.website,
      mersis: seller.mersis,
    })}
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    ${partyXml({
      taxId: buyerTaxId,
      name: buyerName,
      taxOffice: order.taxOffice,
      street: address,
      district: district,
      city: city,
      country: "Türkiye",
      phone: order.customerPhone,
      email: order.customerEmail,
    })}
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${paymentCode}</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${xmlEscape(STORE_CONFIG.iban)}</cbc:ID>
      <cbc:CurrencyCode>TRY</cbc:CurrencyCode>
      <cac:FinancialInstitutionBranch>
        <cbc:Name>${xmlEscape(STORE_CONFIG.bankName)}</cbc:Name>
      </cac:FinancialInstitutionBranch>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="TRY">${money(totals.vat)}</cbc:TaxAmount>
    ${taxSubtotals}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="TRY">${money(totals.net)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="TRY">${money(totals.net)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="TRY">${money(totals.gross)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="TRY">0.00</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="TRY">${money(totals.gross)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lines}
</Invoice>`;
}

function moneyRoundForRate(totals: InvoiceTotals, rate: number): number {
  return moneyRound(
    totals.lines
      .filter((line) => line.kdvRate === rate)
      .reduce((sum, line) => sum + line.lineNet, 0)
  );
}
