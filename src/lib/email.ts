import "server-only";
import nodemailer from "nodemailer";
import type { Order } from "./db";
import { formatIban, STORE_CONFIG } from "./store-config";
import { isGiftWrapProductId } from "./gift-wrap";
import { SITE_ORIGIN } from "./seo";

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function buildOrderEmailHtml(order: Order) {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(item.name)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${item.price * item.quantity} TL</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#4a6741">Yeni Sipariş — ${escapeHtml(order.orderNumber)}</h2>
      <p><strong>Müşteri:</strong> ${escapeHtml(order.customerName)}</p>
      <p><strong>Telefon:</strong> ${escapeHtml(order.customerPhone ?? "—")}</p>
      <p><strong>E-posta:</strong> ${escapeHtml(order.customerEmail)}</p>
      <p><strong>Adres:</strong> ${escapeHtml(order.shippingAddress ?? "—")}</p>
      ${
        order.items.some((i) => isGiftWrapProductId(i.productId))
          ? `<p><strong>Hediye paketi:</strong> Evet${
              order.giftNote
                ? `<br/><strong>Hediye notu:</strong> ${escapeHtml(order.giftNote)}`
                : ""
            }</p>`
          : ""
      }
      <p><strong>Fatura:</strong> ${
        order.invoiceKind === "corporate"
          ? `Kurumsal — ${escapeHtml(order.companyTitle ?? order.customerName)} / VKN ${escapeHtml(order.taxId ?? "—")} / ${escapeHtml(order.taxOffice ?? "—")}`
          : "Bireysel"
      }</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f5f5f0">
            <th style="padding:8px;text-align:left">Ürün</th>
            <th style="padding:8px;text-align:center">Adet</th>
            <th style="padding:8px;text-align:right">Tutar</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      ${orderMoneyBreakdownHtml(order)}
      <p style="font-size:18px"><strong>Ödenecek: ${order.total} TL</strong></p>
      <p style="color:#888">Durum: ${
        order.total <= 0
          ? "Hediye kartı ile ödendi"
          : order.paymentMethod === "card"
            ? order.status === "confirmed"
              ? `Kart ile ödendi${order.lastFourDigits ? ` (**** ${escapeHtml(order.lastFourDigits)})` : ""}`
              : "Kart ödemesi bekleniyor (iyzico)"
            : "Ödeme bekleniyor (Havale/EFT)"
      }</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="font-size:12px;color:#888">IBAN: ${formatIban(STORE_CONFIG.iban)}</p>
    </div>
  `;
}

function orderMoneyBreakdownHtml(order: Order) {
  const discount = order.discountAmount ?? 0;
  const gift = order.giftCardAmount ?? 0;
  if (discount <= 0 && gift <= 0) return "";
  const subtotal = order.subtotal ?? order.total + gift + discount;
  const lines = [`Ara toplam: ${formatTry(subtotal)}`];
  if (discount > 0) {
    lines.push(
      `İndirim${order.discountCode ? ` (${escapeHtml(order.discountCode)})` : ""}: −${formatTry(discount)}`
    );
  }
  if (gift > 0) {
    lines.push(
      `Hediye kartı${order.giftCardCode ? ` (${escapeHtml(order.giftCardCode)})` : ""}: −${formatTry(gift)}`
    );
  }
  return `<p>${lines.join("<br/>")}</p>`;
}

function orderMoneyBreakdownText(order: Order) {
  const discount = order.discountAmount ?? 0;
  const gift = order.giftCardAmount ?? 0;
  const lines: string[] = [];
  if (discount > 0) {
    lines.push(`İndirim: −${discount} TL (${order.discountCode ?? ""})`);
  }
  if (gift > 0) {
    lines.push(`Hediye kartı: −${gift} TL (${order.giftCardCode ?? ""})`);
  }
  return lines;
}

function formatTry(amount: number) {
  const n = Math.round(amount * 100) / 100;
  return `₺${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

function firstName(fullName: string) {
  const part = fullName.trim().split(/\s+/)[0];
  return part || fullName;
}

function paymentMethodLabel(order: Order) {
  if (order.total <= 0) return "Hediye kartı";
  if (order.paymentMethod === "card") return "Kredi / banka kartı";
  return "Havale/EFT";
}

function orderItemsTableHtml(order: Order) {
  return order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(item.name)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatTry(item.price * item.quantity)}</td>
        </tr>`
    )
    .join("");
}

export async function sendCustomerOrderReceivedEmail(
  order: Order,
  extra?: {
    invoice?: {
      uuid: string;
      invoiceNumber?: string;
      documentType: "e_archive" | "e_invoice";
      grossAmount: number;
    };
  }
) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      "[email] SMTP yapılandırılmamış — müşteri sipariş e-postası gönderilmedi."
    );
    return false;
  }

  const from = process.env.SMTP_FROM ?? `CimcimKids <${process.env.SMTP_USER}>`;
  const trackingUrl = `${SITE_ORIGIN}/tr/tracking`;
  const paid = order.status !== "pending_payment" && order.status !== "cancelled";
  const amountLabel = paid ? "Ödenen tutar" : "Ödenecek tutar";
  const invoice = extra?.invoice;
  const kind =
    invoice?.documentType === "e_invoice" ? "e-Fatura" : "e-Arşiv Fatura";

  let pdf: Buffer | null = null;
  if (invoice?.uuid) {
    try {
      const { downloadInvoicePdf } = await import("./efatura/provider");
      pdf = await downloadInvoicePdf(invoice.uuid, invoice.documentType);
    } catch (err) {
      console.error("[email] müşteri faturası PDF alınamadı:", err);
    }
  }

  const invoiceNumber = invoice?.invoiceNumber || order.orderNumber;
  const bankBlock =
    !paid && order.paymentMethod !== "card"
      ? `<p><strong>Banka:</strong> ${escapeHtml(STORE_CONFIG.bankName)}<br/>
           <strong>Hesap sahibi:</strong> ${escapeHtml(STORE_CONFIG.accountHolder)}<br/>
           <strong>IBAN:</strong> ${escapeHtml(formatIban(STORE_CONFIG.iban))}</p>`
      : "";

  await transporter.sendMail({
    from,
    to: order.customerEmail,
    subject: `Siparişiniz alındı — ${order.orderNumber}`.replaceAll(/[\r\n]+/g, " "),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#334155">
        <h2 style="color:#ff8a65;margin-bottom:8px">CimcimKids</h2>
        <p>Merhaba ${escapeHtml(firstName(order.customerName))},</p>
        <p>Siparişiniz alındı. Satın aldığınız ürünler:</p>
        <p>
          <strong>Sipariş no:</strong> ${escapeHtml(order.orderNumber)}<br/>
          <strong>Ödeme yöntemi:</strong> ${escapeHtml(paymentMethodLabel(order))}<br/>
          <strong>${amountLabel}:</strong> ${formatTry(order.total)}
        </p>
        ${orderMoneyBreakdownHtml(order)}
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#f5f5f0">
              <th style="padding:8px;text-align:left">Ürün</th>
              <th style="padding:8px;text-align:center">Adet</th>
              <th style="padding:8px;text-align:right">Tutar</th>
            </tr>
          </thead>
          <tbody>${orderItemsTableHtml(order)}</tbody>
        </table>
        <p><strong>Teslimat adresi:</strong><br/>${escapeHtml(order.shippingAddress ?? "—")}</p>
        ${
          order.items.some((i) => isGiftWrapProductId(i.productId)) && order.giftNote
            ? `<p><strong>Hediye notu:</strong> ${escapeHtml(order.giftNote)}</p>`
            : ""
        }
        ${bankBlock}
        ${
          invoice
            ? `<p><strong>Fatura:</strong> ${escapeHtml(kind)}${
                invoice.invoiceNumber ? ` — ${escapeHtml(invoice.invoiceNumber)}` : ""
              }${
                pdf
                  ? "<br/>Fatura PDF dosyası bu e-postanın ekinde."
                  : "<br/>Fatura kaydınız GİB sistemine iletildi."
              }</p>`
            : ""
        }
        <p>Siparişinizi takip etmek için:<br/>
          <a href="${escapeHtml(trackingUrl)}">${escapeHtml(trackingUrl)}</a>
        </p>
        <p style="margin-top:24px">Sevgilerle,<br/><strong>CimcimKids</strong></p>
      </div>
    `,
    text: [
      `Merhaba ${firstName(order.customerName)},`,
      "Siparişiniz alındı. Satın aldığınız ürünler:",
      `Sipariş no: ${order.orderNumber}`,
      `Ödeme yöntemi: ${paymentMethodLabel(order)}`,
      `${amountLabel}: ${formatTry(order.total)}`,
      "",
      ...order.items.map(
        (i) => `${i.name} x${i.quantity} = ${formatTry(i.price * i.quantity)}`
      ),
      "",
      `Teslimat adresi: ${order.shippingAddress ?? "—"}`,
      invoice
        ? `Fatura: ${kind}${invoice.invoiceNumber ? ` — ${invoice.invoiceNumber}` : ""}`
        : "",
      `Takip: ${trackingUrl}`,
      "",
      "Sevgilerle,",
      "CimcimKids",
    ]
      .filter(Boolean)
      .join("\n"),
    attachments: pdf
      ? [
          {
            filename: `${invoiceNumber}.pdf`,
            content: pdf,
            contentType: "application/pdf",
          },
        ]
      : undefined,
  });

  return true;
}

export async function sendOrderNotificationEmail(order: Order) {
  const transporter = getTransporter();
  const to =
    process.env.ORDER_NOTIFICATION_EMAIL ?? "info@cimcimkids.com";

  if (!transporter || !to) {
    console.warn(
      "[email] SMTP yapılandırılmamış — sipariş e-postası gönderilmedi."
    );
    return false;
  }

  const from = process.env.SMTP_FROM ?? `CimcimKids <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to,
    subject: `Yeni Sipariş: ${order.orderNumber} — ${order.customerName}`.replaceAll(
      /[\r\n]+/g,
      " "
    ),
    html: buildOrderEmailHtml(order),
    text: [
      `Yeni sipariş: ${order.orderNumber}`,
      `Müşteri: ${order.customerName}`,
      `Telefon: ${order.customerPhone ?? "—"}`,
      `E-posta: ${order.customerEmail}`,
      `Adres: ${order.shippingAddress ?? "—"}`,
      order.items.some((i) => isGiftWrapProductId(i.productId))
        ? `Hediye paketi: Evet${order.giftNote ? `\nHediye notu: ${order.giftNote}` : ""}`
        : "",
      order.invoiceKind === "corporate"
        ? `Fatura: Kurumsal ${order.companyTitle ?? ""} VKN ${order.taxId ?? ""} ${order.taxOffice ?? ""}`
        : "Fatura: Bireysel",
      "",
      ...order.items.map(
        (i) => `${i.name} x${i.quantity} = ${i.price * i.quantity} TL`
      ),
      "",
      ...orderMoneyBreakdownText(order),
      `Ödenecek: ${order.total} TL`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return true;
}

export async function sendGiftCardCodesEmail(data: {
  to: string;
  customerName: string;
  orderNumber: string;
  cards: { code: string; balance: number }[];
}) {
  const transporter = getTransporter();
  if (!transporter || !data.cards.length) return false;

  const from = process.env.SMTP_FROM ?? `CimcimKids <${process.env.SMTP_USER}>`;
  const codesHtml = data.cards
    .map(
      (c) =>
        `<li><strong>${escapeHtml(c.code)}</strong> — ${c.balance} TL</li>`
    )
    .join("");

  await transporter.sendMail({
    from,
    to: data.to,
    subject: `Hediye kartı kodunuz — ${data.orderNumber}`.replaceAll(
      /[\r\n]+/g,
      " "
    ),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#4a6741">Hediye Kartınız Hazır</h2>
        <p>Merhaba ${escapeHtml(data.customerName)},</p>
        <p>${escapeHtml(data.orderNumber)} numaralı siparişinizdeki hediye kartı ödemesi onaylandı.</p>
        <ul>${codesHtml}</ul>
        <p>Kodu sepetinizde «Hediye kartı kullan» alanına yazarak alışverişinizde kullanabilirsiniz.</p>
      </div>
    `,
    text: [
      `Merhaba ${data.customerName},`,
      `Sipariş ${data.orderNumber} hediye kartı kodları:`,
      ...data.cards.map((c) => `${c.code} — ${c.balance} TL`),
    ].join("\n"),
  });

  return true;
}

export async function sendNewsletterWelcomeEmail(
  email: string,
  locale: string = "tr"
) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      "[email] SMTP yapılandırılmamış — abonelik onay e-postası gönderilmedi."
    );
    return false;
  }

  const from = process.env.SMTP_FROM ?? `CimcimKids <${process.env.SMTP_USER}>`;
  const isEn = locale === "en";
  const subject = isEn
    ? "You're on the CimcimKids list!"
    : "CimcimKids e-posta listesine katıldınız!";
  const greeting = isEn ? "Hi," : "Merhaba,";
  const body = isEn
    ? "Thanks for subscribing. We'll let you know about new collections and exclusive offers."
    : "Abone olduğunuz için teşekkürler. Yeni koleksiyonlar ve özel indirimler hakkında sizi bilgilendireceğiz.";
  const bye = isEn ? "See you soon," : "Sevgilerle,";

  await transporter.sendMail({
    from,
    to: email,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#334155">
        <h2 style="color:#ff8a65;margin-bottom:8px">CimcimKids</h2>
        <p>${greeting}</p>
        <p>${body}</p>
        <p style="margin-top:24px">${bye}<br/><strong>CimcimKids</strong></p>
      </div>
    `,
    text: `${greeting}\n\n${body}\n\n${bye}\nCimcimKids`,
  });

  return true;
}

export async function sendInvoiceEmail(data: {
  order: Order;
  invoice: {
    uuid: string;
    invoiceNumber?: string;
    documentType: "e_archive" | "e_invoice";
    grossAmount: number;
  };
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] SMTP yapılandırılmamış — fatura e-postası gönderilmedi.");
    return false;
  }

  const from = process.env.SMTP_FROM ?? `CimcimKids <${process.env.SMTP_USER}>`;
  const kind =
    data.invoice.documentType === "e_invoice" ? "e-Fatura" : "e-Arşiv Fatura";
  const number = data.invoice.invoiceNumber || data.order.orderNumber;

  let pdf: Buffer | null = null;
  try {
    const { downloadInvoicePdf } = await import("./efatura/provider");
    pdf = await downloadInvoicePdf(data.invoice.uuid, data.invoice.documentType);
  } catch (err) {
    console.error("[email] fatura PDF alınamadı:", err);
  }

  await transporter.sendMail({
    from,
    to: data.order.customerEmail,
    subject: `${kind} — ${number}`.replaceAll(/[\r\n]+/g, " "),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#334155">
        <h2 style="color:#4a6741">Faturanız hazır</h2>
        <p>Merhaba ${escapeHtml(data.order.customerName)},</p>
        <p>${escapeHtml(data.order.orderNumber)} numaralı siparişiniz için ${kind} kesildi.</p>
        <p><strong>Fatura no:</strong> ${escapeHtml(number)}<br/>
           <strong>Tutar:</strong> ${data.invoice.grossAmount} TL</p>
        ${
          pdf
            ? "<p>Fatura PDF dosyası bu e-postanın ekinde.</p>"
            : "<p>Fatura kaydınız GİB sistemine iletildi.</p>"
        }
        <p style="margin-top:24px">Sevgilerle,<br/><strong>CimcimKids</strong></p>
      </div>
    `,
    text: [
      `Merhaba ${data.order.customerName},`,
      `${data.order.orderNumber} siparişi için ${kind} kesildi.`,
      `Fatura no: ${number}`,
      `Tutar: ${data.invoice.grossAmount} TL`,
    ].join("\n"),
    attachments: pdf
      ? [
          {
            filename: `${number}.pdf`,
            content: pdf,
            contentType: "application/pdf",
          },
        ]
      : undefined,
  });

  return true;
}
