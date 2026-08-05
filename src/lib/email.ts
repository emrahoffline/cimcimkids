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
      <p style="color:#888">Durum: Ödeme bekleniyor (Havale/EFT)</p>
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
      "",
      ...order.items.map(
        (i) => `${i.name} x${i.quantity} = ${i.price * i.quantity} TL`
      ),
      "",
      `Toplam: ${order.total} TL`,
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
