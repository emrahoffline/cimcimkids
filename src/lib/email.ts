import "server-only";
import nodemailer from "nodemailer";
import type { Order } from "./db";
import { formatIban, STORE_CONFIG } from "./store-config";

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) {
    console.warn("[email] SMTP eksik — mail gönderilmedi.", {
      host: Boolean(host),
      user: Boolean(user),
      pass: Boolean(pass),
    });
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
      <p><strong>Adres:</strong><br>${escapeHtml(order.shippingAddress ?? "—").replaceAll("\n", "<br>")}</p>
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
      <p style="font-size:18px"><strong>Toplam: ${order.total} TL</strong></p>
      <p style="color:#888">Ödeme: ${
        order.paymentMethod === "card"
          ? order.paidAt
            ? `Kredi/banka kartı (ödendi${
                order.paymentLastFour ? ` · **** ${escapeHtml(order.paymentLastFour)}` : ""
              })`
            : "Kredi/banka kartı (bekleniyor)"
          : "Havale/EFT (ödeme bekleniyor)"
      }</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="font-size:12px;color:#888">IBAN: ${formatIban(STORE_CONFIG.iban)}</p>
    </div>
  `;
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
    subject: `${order.paidAt ? "Ödendi" : "Yeni Sipariş"}: ${order.orderNumber} — ${order.customerName}`.replaceAll(
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
      "",
      ...order.items.map(
        (i) => `${i.name} x${i.quantity} = ${i.price * i.quantity} TL`
      ),
      "",
      `Toplam: ${order.total} TL`,
      `Ödeme: ${
        order.paymentMethod === "card"
          ? order.paidAt
            ? "Kart (ödendi)"
            : "Kart (bekleniyor)"
          : "Havale/EFT"
      }`,
    ].join("\n"),
  });

  return true;
}

function formatTry(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(amount);
}

function paymentLabel(order: Order) {
  if (order.paymentMethod === "card") return "Kredi / banka kartı";
  if (order.total <= 0) return "Hediye kartı";
  return "Havale / EFT";
}

function itemsTableHtml(order: Order) {
  return order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(item.name)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${escapeHtml(formatTry(item.price * item.quantity))}</td>
        </tr>`
    )
    .join("");
}

export async function sendCustomerPaymentConfirmationEmail(order: Order) {
  const transporter = getTransporter();
  const to = order.customerEmail?.trim();
  if (!transporter || !to) {
    console.warn(
      "[email] SMTP yok veya müşteri e-postası boş — sipariş maili gönderilmedi.",
      { orderNumber: order.orderNumber, hasTo: Boolean(to) }
    );
    return false;
  }

  const from = process.env.SMTP_FROM ?? `CimcimKids <${process.env.SMTP_USER}>`;
  const origin = (
    process.env.NEXTAUTH_URL?.trim() || "https://www.cimcimkids.com"
  ).replace(/\/$/, "");

  const subject =
    `Siparişiniz alındı — ${order.orderNumber}`.replaceAll(/[\r\n]+/g, " ");

  await transporter.sendMail({
    from,
    to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#334155">
        <h2 style="color:#ff8a65;margin-bottom:8px">CimcimKids</h2>
        <p>Merhaba ${escapeHtml(order.customerName)},</p>
        <p>Siparişiniz alındı. Satın aldığınız ürünler:</p>
        <p>
          <strong>Sipariş no:</strong> ${escapeHtml(order.orderNumber)}<br/>
          <strong>Ödeme:</strong> ${escapeHtml(paymentLabel(order))}<br/>
          <strong>Tutar:</strong> ${escapeHtml(formatTry(order.total))}
        </p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#fff3eb">
              <th style="padding:8px;text-align:left">Ürün</th>
              <th style="padding:8px;text-align:center">Adet</th>
              <th style="padding:8px;text-align:right">Tutar</th>
            </tr>
          </thead>
          <tbody>${itemsTableHtml(order)}</tbody>
        </table>
        <p><strong>Teslimat adresi:</strong><br/>${escapeHtml(order.shippingAddress ?? "—").replaceAll("\n", "<br>")}</p>
        <p>
          Sipariş takibi:
          <a href="${origin}/tr/tracking" style="color:#3db8a8">${origin}/tr/tracking</a>
        </p>
        <p style="margin-top:24px">Sevgilerle,<br/><strong>CimcimKids</strong></p>
      </div>
    `,
    text: [
      `Merhaba ${order.customerName},`,
      "",
      "Siparişiniz alındı. Satın aldığınız ürünler:",
      `Sipariş no: ${order.orderNumber}`,
      `Ödeme: ${paymentLabel(order)}`,
      `Tutar: ${formatTry(order.total)}`,
      "",
      ...order.items.map(
        (i) => `${i.name} x${i.quantity} = ${formatTry(i.price * i.quantity)}`
      ),
      "",
      `Teslimat adresi: ${order.shippingAddress ?? "—"}`,
      `Takip: ${origin}/tr/tracking`,
      "",
      "Sevgilerle, CimcimKids",
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
