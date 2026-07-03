import type { OrderItem } from "./db";
import { STORE_CONFIG } from "./store-config";

type OrderMessageInput = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: string;
  items: OrderItem[];
  total: number;
};

export function buildOrderWhatsAppMessage(order: OrderMessageInput) {
  const lines = [
    "Merhaba, yeni sipariş vermek istiyorum.",
    "",
    `Sipariş No: ${order.orderNumber}`,
    `Ad Soyad: ${order.customerName}`,
    `Telefon: ${order.customerPhone}`,
    `E-posta: ${order.customerEmail}`,
    `Adres: ${order.shippingAddress}`,
    "",
    "Ürünler:",
    ...order.items.map(
      (item) =>
        `• ${item.name} x${item.quantity} — ${item.price * item.quantity} TL`
    ),
    "",
    `Toplam: ${order.total} TL`,
    "Ödeme: Havale/EFT",
  ];

  return lines.join("\n");
}

export function buildWhatsAppUrl(message: string) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encoded}`;
}
