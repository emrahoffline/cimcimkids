"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { MessageCircle } from "lucide-react";
import { useCartStore, cartTotal } from "@/store/cart";
import { formatPrice } from "@/lib/products";
import { STORE_CONFIG, formatIban } from "@/lib/store-config";
import { buildOrderWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const locale = useLocale();
  const { data: session } = useSession();
  const { items, clearCart } = useCartStore();
  const [done, setDone] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const total = cartTotal(items);
  const base = `/${locale}`;

  const [form, setForm] = useState({
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
    phone: "",
    address: "",
    city: "",
    kvkkConsent: false,
  });

  if (items.length === 0 && !done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-olive/60">{tCart("empty")}</p>
        <Link href={`${base}/products`} className="btn-primary mt-6 inline-flex">
          {tCart("continueShopping")}
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.kvkkConsent) {
      setError(t("kvkkRequired"));
      return;
    }

    setLoading(true);
    setError("");

    const shippingAddress = `${form.address}, ${form.city}`;
    const orderItems = items.map((i) => ({
      productId: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image: i.image,
    }));

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: shippingAddress,
        kvkkConsent: true,
        items: orderItems,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("error"));
      setLoading(false);
      return;
    }

    const order = await res.json();
    const message = buildOrderWhatsAppMessage({
      orderNumber: order.orderNumber,
      customerName: form.name,
      customerPhone: form.phone,
      customerEmail: form.email,
      shippingAddress,
      items: orderItems,
      total: order.total,
    });
    const url = buildWhatsAppUrl(message);

    setOrderNumber(order.orderNumber);
    setWhatsappUrl(url);
    clearCart();
    setDone(true);
    setLoading(false);

    window.open(url, "_blank");
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <div className="card space-y-4 text-center">
          <p className="text-xl font-semibold text-olive">{t("success")}</p>
          {orderNumber && (
            <p className="text-sm text-olive/60">
              {t("orderNumber")}: <strong>{orderNumber}</strong>
            </p>
          )}
          <p className="text-sm text-olive/70">{t("successNote")}</p>

          <div className="rounded-lg bg-bamboo/10 p-4 text-left text-sm">
            <p className="mb-2 font-semibold text-olive">{t("paymentInfo")}</p>
            <p className="text-olive/80">
              <span className="font-medium">{t("iban")}:</span>{" "}
              {formatIban(STORE_CONFIG.iban)}
            </p>
            <p className="text-olive/80">
              <span className="font-medium">{t("accountHolder")}:</span>{" "}
              {STORE_CONFIG.accountHolder}
            </p>
            <p className="text-olive/80">
              <span className="font-medium">{t("bankName")}:</span>{" "}
              {STORE_CONFIG.bankName}
            </p>
            <p className="mt-2 text-olive/60">{t("paymentNote")}</p>
          </div>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex w-full items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da851]"
            >
              <MessageCircle className="h-5 w-5" />
              {t("whatsappButton")}
            </a>
          )}

          <Link href={base} className="btn-primary mt-2 inline-flex w-full">
            {tCart("continueShopping")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-36 sm:py-12 sm:pb-12 lg:pb-12">
      <h1 className="page-title mb-6 sm:mb-8">{t("title")}</h1>
      <p className="mb-6 rounded-lg bg-bamboo/10 p-3 text-sm text-olive/70">
        {t("paymentNote")}
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <form id="checkout-form" onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="card space-y-4">
            <h2 className="font-semibold">{t("shippingInfo")}</h2>
            <input
              required
              placeholder={t("namePlaceholder")}
              autoComplete="name"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              required
              type="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              className="input-field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t("phonePlaceholder")}
              className="input-field"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <input
              required
              autoComplete="street-address"
              placeholder={t("addressPlaceholder")}
              className="input-field"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <input
              required
              autoComplete="address-level2"
              placeholder={t("cityPlaceholder")}
              className="input-field"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">{t("paymentInfo")}</h2>
            <p className="text-sm text-olive/70">{t("bankTransferInfo")}</p>
            <div className="rounded-lg bg-bamboo/10 p-3 text-sm">
              <p>
                <span className="font-medium">{t("iban")}:</span>{" "}
                {formatIban(STORE_CONFIG.iban)}
              </p>
              <p>
                <span className="font-medium">{t("accountHolder")}:</span>{" "}
                {STORE_CONFIG.accountHolder}
              </p>
              <p>
                <span className="font-medium">{t("bankName")}:</span>{" "}
                {STORE_CONFIG.bankName}
              </p>
            </div>
          </div>

          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm text-olive/80">
            <input
              type="checkbox"
              required
              checked={form.kvkkConsent}
              onChange={(e) =>
                setForm({ ...form, kvkkConsent: e.target.checked })
              }
              className="checkbox-field mt-0.5"
            />
            <span>
              {t("kvkkConsent")}{" "}
              <Link
                href={`${base}/kvkk`}
                target="_blank"
                className="text-bamboo underline"
              >
                {t("kvkkLink")}
              </Link>
            </span>
          </label>
        </div>

        <div className="card hidden h-fit lg:block">
          <p className="mb-4 font-semibold">{tCart("total")}</p>
          <p className="mb-2 text-2xl font-semibold text-bamboo">
            {formatPrice(total, locale)}
          </p>
          <p className="mb-6 text-sm text-olive/60">{t("whatsappHint")}</p>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "..." : t("placeOrder")}
          </button>
        </div>
      </form>

      <div className="mobile-sticky-bar lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-olive/60">{tCart("total")}</p>
            <p className="text-xl font-semibold text-bamboo">
              {formatPrice(total, locale)}
            </p>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={loading}
            className="btn-primary shrink-0 px-6"
          >
            {loading ? "..." : t("placeOrder")}
          </button>
        </div>
      </div>
    </div>
  );
}
