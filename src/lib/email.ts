import "server-only";
import nodemailer from "nodemailer";
import type { Order } from "./db";
import { formatIban, STORE_CONFIG } from "./store-config";

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
          <td style="padding:8px;border-bottom:1px solid #eee">${item.name}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${item.price * item.quantity} TL</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#4a6741">Yeni Sipariş — ${order.orderNumber}</h2>
      <p><strong>Müşteri:</strong> ${order.customerName}</p>
      <p><strong>Telefon:</strong> ${order.customerPhone ?? "—"}</p>
      <p><strong>E-posta:</strong> ${order.customerEmail}</p>
      <p><strong>Adres:</strong> ${order.shippingAddress ?? "—"}</p>
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
    process.env.ORDER_NOTIFICATION_EMAIL ?? "info@aryabamboo.com";

  if (!transporter || !to) {
    console.warn(
      "[email] SMTP yapılandırılmamış — sipariş e-postası gönderilmedi."
    );
    return false;
  }

  const from = process.env.SMTP_FROM ?? `AryaBamboo <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to,
    subject: `Yeni Sipariş: ${order.orderNumber} — ${order.customerName}`,
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
