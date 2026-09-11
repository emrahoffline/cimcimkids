import "server-only";
import { randomUUID } from "crypto";
import type { Order } from "@/lib/db";
import { buyerTaxNumberForProviders, UNIDENTIFIED_PERSON_TAX_ID } from "@/lib/tax-id";
import {
  getEFaturaProvider,
  getInvoiceSeller,
  getNilveraConfig,
} from "@/lib/invoice-config";
import { buildInvoiceTotals, invoiceItemsForOrder } from "@/lib/invoice-tax";
import { SITE_ORIGIN } from "@/lib/seo";
import { STORE_CONFIG } from "@/lib/store-config";
import { bienIsEInvoiceUser, bienSendInvoice } from "./bien";
import { EFaturaError, type EFaturaSendResult } from "./errors";
import {
  checkEInvoiceTaxpayer,
  sendArchiveInvoice,
  sendEInvoice,
} from "./nilvera";

function partyIdentifications(mersis?: string) {
  if (!mersis) return undefined;
  return [{ SchemeID: "MERSISNO", Value: mersis }];
}

export async function resolveDocumentType(
  taxId?: string | null
): Promise<"e_archive" | "e_invoice"> {
  const id = (taxId ?? "").replace(/\D/g, "");
  if (!id || id === UNIDENTIFIED_PERSON_TAX_ID || id.length === 11) {
    return "e_archive";
  }
  try {
    const provider = getEFaturaProvider();
    if (provider === "bien") {
      return (await bienIsEInvoiceUser(id)) ? "e_invoice" : "e_archive";
    }
    const list = await checkEInvoiceTaxpayer(id);
    return list.length > 0 ? "e_invoice" : "e_archive";
  } catch (err) {
    console.error("[efatura] mükellef sorgusu başarısız, e-arşiv denenecek:", err);
    return "e_archive";
  }
}

function paymentMethod(order: Order): {
  method: string;
  name: string;
} {
  const gift = (order.giftCardAmount ?? 0) > 0;
  const remainder = order.total > 0;
  if (gift && !remainder) return { method: "DIGER", name: "Hediye Kartı" };
  if (order.paymentMethod === "card") {
    return { method: "KREDIKARTI/BANKAKARTI", name: "Kredi Kartı" };
  }
  return { method: "EFT/HAVALE", name: "Havale/EFT" };
}

export function buildNilveraPayload(
  order: Order,
  documentType: "e_archive" | "e_invoice",
  invoiceUuid?: string
) {
  const seller = getInvoiceSeller();
  const cfg = getNilveraConfig();
  const totals = buildInvoiceTotals(invoiceItemsForOrder(order));
  const uuid = invoiceUuid || randomUUID();
  const now = new Date().toISOString();
  const taxId = buyerTaxNumberForProviders(order.taxId);
  const buyerName =
    order.invoiceKind === "corporate"
      ? order.companyTitle || order.customerName
      : order.customerName;
  const city = order.invoiceCity || "";
  const district = order.invoiceDistrict || "";
  const address = (order.shippingAddress ?? "")
    .replace(new RegExp(`,\\s*${district}\\s*,\\s*${city}\\s*$`, "i"), "")
    .replace(new RegExp(`,\\s*${city}\\s*$`, "i"), "")
    .trim() || order.shippingAddress || "";

  const pay = paymentMethod(order);
  const invoiceLines = totals.lines.map((line, idx) => ({
    Index: String(idx + 1),
    SellerCode: line.productId.slice(0, 40),
    Name: line.name.slice(0, 200),
    Quantity: line.quantity,
    UnitType: "C62",
    Price: line.unitNet,
    AllowanceTotal: 0,
    KDVPercent: line.kdvRate,
    KDVTotal: line.kdvAmount,
    Taxes: [
      {
        TaxCode: "0015",
        Percent: line.kdvRate,
        Total: line.kdvAmount,
      },
    ],
  }));

  const notes = [
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
  if (order.total > 0) {
    notes.push(`Havale/EFT: ${order.total} TL — ${STORE_CONFIG.bankName}`);
  }

  const companyInfo = seller.taxNumber
    ? {
        TaxNumber: seller.taxNumber,
        Name: seller.title,
        TaxOffice: seller.taxOffice || undefined,
        Address: seller.address || undefined,
        District: seller.district || undefined,
        City: seller.city || undefined,
        Country: seller.country,
        PostalCode: seller.postalCode || undefined,
        Phone: seller.phone || undefined,
        Mail: seller.email || undefined,
        WebSite: seller.website || undefined,
        PartyIdentifications: partyIdentifications(seller.mersis),
      }
    : undefined;

  const customerInfo = {
    TaxNumber: taxId,
    Name: buyerName,
    TaxOffice: order.taxOffice || undefined,
    Address: address || undefined,
    District: district || undefined,
    City: city || undefined,
    Country: "Türkiye",
    Phone: order.customerPhone || undefined,
    Mail: order.customerEmail,
  };

  const invoiceInfoBase = {
    UUID: uuid,
    InvoiceType: "SATIS",
    InvoiceSerieOrNumber:
      documentType === "e_invoice" ? cfg.invoiceSeries : cfg.archiveSeries,
    IssueDate: now,
    CurrencyCode: "TRY",
    OrderReference: { Value: order.orderNumber, IssueDate: now },
    PaymentMeansInfo: {
      Code: order.paymentMethod === "card" ? "48" : "42",
      PayeeFinancialAccountID: STORE_CONFIG.iban,
      Note: pay.name,
    },
    LineExtensionAmount: totals.net,
    GeneralKDV10Total: totals.vatByRate[10] ?? 0,
    GeneralKDV20Total: totals.vatByRate[20] ?? 0,
    GeneralAllowanceTotal: 0,
    PayableAmount: totals.gross,
    KdvTotal: totals.vat,
  };

  if (documentType === "e_invoice") {
    return {
      uuid,
      totals,
      payload: {
        EInvoice: {
          InvoiceInfo: {
            ...invoiceInfoBase,
            InvoiceProfile: cfg.invoiceProfile,
          },
          ...(companyInfo ? { CompanyInfo: companyInfo } : {}),
          CustomerInfo: customerInfo,
          InvoiceLines: invoiceLines,
          Notes: notes,
        },
      },
    };
  }

  return {
    uuid,
    totals,
    payload: {
      ArchiveInvoice: {
        InvoiceInfo: {
          ...invoiceInfoBase,
          SalesPlatform: "INTERNET",
          SendType: "ELEKTRONIK",
          InternetInfo: {
            WebSite: seller.website || SITE_ORIGIN,
            PaymentMethod: pay.method,
            PaymentMethodName: pay.name,
            PaymentDate: now,
          },
        },
        ...(companyInfo ? { CompanyInfo: companyInfo } : {}),
        CustomerInfo: customerInfo,
        InvoiceLines: invoiceLines,
        Notes: notes,
      },
    },
  };
}

export async function sendInvoiceToGib(
  order: Order,
  documentType: "e_archive" | "e_invoice",
  invoiceUuid?: string
): Promise<{
  result: EFaturaSendResult;
  totals: ReturnType<typeof buildInvoiceTotals>;
  uuid: string;
}> {
  const seller = getInvoiceSeller();
  if (!seller.taxNumber) {
    throw new EFaturaError(
      "COMPANY_VKN veya COMPANY_TCKN tanımlı değil. Fatura kesmek için satıcı vergi kimliği gerekir.",
      400
    );
  }

  const provider = getEFaturaProvider();
  const uuid = invoiceUuid || randomUUID();
  const totals = buildInvoiceTotals(invoiceItemsForOrder(order));

  if (provider === "bien") {
    const result = await bienSendInvoice(order, documentType, totals, uuid);
    return { result, totals, uuid: result.uuid || uuid };
  }

  const built = buildNilveraPayload(order, documentType, uuid);
  const result =
    documentType === "e_invoice"
      ? await sendEInvoice(built.payload)
      : await sendArchiveInvoice(built.payload);
  return { result, totals: built.totals, uuid: result.uuid || built.uuid };
}
