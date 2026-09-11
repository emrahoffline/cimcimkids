"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  useCartStore,
  cartGiftApplied,
  cartPayable,
  cartMerchandiseTotal,
  cartPhysicalTotal,
  cartShippingFee,
  cartDiscountApplied,
} from "@/store/cart";
import { formatPrice } from "@/lib/products";
import {
  STORE_CONFIG,
  formatIban,
  amountUntilFreeShipping,
  isFreeShipping,
} from "@/lib/store-config";
import { isValidVkn, type InvoiceBuyerKind } from "@/lib/tax-id";
import { PaymentLogos } from "@/components/PaymentLogos";
import { DiscountCodeField } from "@/components/DiscountCodeField";
import {
  TURKEY_CITY_NAMES,
  TURKEY_COUNTRY,
  districtsOf,
} from "@/lib/turkey-locations";
import {
  rememberShopperEmail,
  readRememberedShopperEmail,
} from "@/lib/shopper";
import { GoogleSurveyOptIn } from "@/components/GoogleCustomerReviews";
import {
  estimatedDeliveryDate,
  readGcrOptIn,
  saveGcrOptIn,
} from "@/lib/google-customer-reviews";
import {
  readGaPurchase,
  saveGaPurchase,
  trackGaPurchase,
} from "@/lib/google-analytics";

type PayMethod = "card" | "bank_transfer";

function FloatField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="checkout-float block">
      <span className="checkout-float-label">{label}</span>
      {children}
    </label>
  );
}

function nationalPhoneDigits(value: string): string {
  let d = value.replace(/\D/g, "");
  if (d.startsWith("90") && d.length >= 11) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

function storedPhone(digits: string): string {
  if (digits.length === 10) return `0${digits}`;
  return digits;
}

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const locale = useLocale();
  const {
    items,
    clearCart,
    giftCardCode,
    giftCardBalance,
    discountCode,
    discountKind,
    discountValue,
    discountMinSubtotal,
  } = useCartStore();
  const [done, setDone] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [paidTotal, setPaidTotal] = useState(0);
  const [paidByCard, setPaidByCard] = useState(false);
  const [gcrOptIn, setGcrOptIn] = useState<{
    orderId: string;
    email: string;
    estimatedDeliveryDate: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("card");
  const [cardEnabled, setCardEnabled] = useState(true);
  const [checkoutFormHtml, setCheckoutFormHtml] = useState("");
  const merchandise = cartMerchandiseTotal(items);
  const physical = cartPhysicalTotal(items);
  const shippingFee = cartShippingFee(items);
  const discountApplied = cartDiscountApplied(
    items,
    discountKind,
    discountValue,
    discountMinSubtotal
  );
  const giftApplied = cartGiftApplied(
    items,
    giftCardBalance,
    discountApplied
  );
  const payable = cartPayable(items, giftCardBalance, discountApplied);
  const freeShip = isFreeShipping(physical);
  const remaining = amountUntilFreeShipping(physical);
  const base = `/${locale}`;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    district: "",
    city: "",
    invoiceKind: "individual" as InvoiceBuyerKind,
    taxId: "",
    companyTitle: "",
    taxOffice: "",
    addressTitle: "",
    postalCode: "",
    kvkkConsent: false,
    marketingConsent: false,
  });

  useEffect(() => {
    fetch("/api/payments/iyzico/status")
      .then((r) => r.json())
      .then((data) => {
        const enabled = Boolean(data.enabled);
        setCardEnabled(enabled);
        if (!enabled) setPayMethod("bank_transfer");
      })
      .catch(() => {
        setCardEnabled(false);
        setPayMethod("bank_transfer");
      });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const order = params.get("order") ?? "";
    if (payment === "success" && order) {
      setOrderNumber(order);
      setPaidByCard(true);
      setDone(true);
      clearCart();
    } else if (payment === "fail") {
      setError(t("cardPaymentFailed"));
    }
  }, [clearCart, t]);

  useEffect(() => {
    if (!done || !orderNumber) return;
    const paidForGoogle = paidByCard || paidTotal <= 0;
    if (!paidForGoogle) return;
    const stored = readGcrOptIn(orderNumber);
    const email = stored?.email || readRememberedShopperEmail();
    if (email) {
      setGcrOptIn({
        orderId: orderNumber,
        email,
        estimatedDeliveryDate:
          stored?.estimatedDeliveryDate || estimatedDeliveryDate(),
      });
    }
    const purchase = readGaPurchase(orderNumber);
    trackGaPurchase({
      orderId: orderNumber,
      value: purchase?.value ?? paidTotal,
      items: purchase?.items ?? [],
    });
  }, [done, orderNumber, paidByCard, paidTotal]);

  useEffect(() => {
    if (!checkoutFormHtml || typeof document === "undefined") return;
    document.open();
    document.write(checkoutFormHtml);
    document.close();
  }, [checkoutFormHtml]);

  if (items.length === 0 && !done && !checkoutFormHtml) {
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
    if (form.invoiceKind === "corporate") {
      if (!form.companyTitle.trim()) {
        setError(t("companyTitleRequired"));
        return;
      }
      if (!isValidVkn(form.taxId)) {
        setError(t("vknInvalid"));
        return;
      }
      if (!form.taxOffice.trim()) {
        setError(t("taxOfficeRequired"));
        return;
      }
    }
    if (!form.city || !districtsOf(form.city).includes(form.district)) {
      setError(form.city ? t("districtRequired") : t("cityRequired"));
      return;
    }
    const phone = storedPhone(nationalPhoneDigits(form.phone));
    if (nationalPhoneDigits(form.phone).length !== 10) {
      setError(t("phoneInvalid"));
      return;
    }

    setLoading(true);
    setError("");

    const orderItems = items.map((i) => ({
      productId: i.productId || i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image: i.image,
      colorLabel: i.colorLabel,
      ageLabel: i.ageLabel,
    }));

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone,
        address: [
          form.addressTitle.trim(),
          form.address.trim(),
          form.postalCode.trim() ? `PK ${form.postalCode.trim()}` : "",
        ]
          .filter(Boolean)
          .join(", "),
        district: form.district,
        city: form.city,
        invoiceKind: form.invoiceKind,
        taxId: form.taxId,
        companyTitle: form.companyTitle,
        taxOffice: form.taxOffice,
        kvkkConsent: true,
        marketingConsent: form.marketingConsent,
        locale,
        items: orderItems,
        giftCardCode: giftCardCode || undefined,
        discountCode: discountCode || undefined,
        paymentMethod: payable > 0 ? payMethod : "bank_transfer",
        visitorId:
          typeof window !== "undefined"
            ? localStorage.getItem("ab_vid") || undefined
            : undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("error"));
      setLoading(false);
      return;
    }

    const order = await res.json();
    if (order.orderNumber && form.email) {
      saveGcrOptIn({ orderId: String(order.orderNumber), email: form.email });
    }
    if (order.orderNumber) {
      saveGaPurchase({
        orderId: String(order.orderNumber),
        value: typeof order.total === "number" ? order.total : payable,
        items: orderItems.map((item) => ({
          item_id: String(item.productId),
          item_name: String(item.name),
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
        })),
      });
    }
    if (payMethod === "card" && (order.total ?? payable) > 0) {
      if (typeof order.paymentPageUrl === "string" && order.paymentPageUrl) {
        clearCart();
        window.location.href = order.paymentPageUrl;
        return;
      }
      if (typeof order.checkoutFormContent === "string" && order.checkoutFormContent) {
        let html = order.checkoutFormContent as string;
        if (!html.trim().startsWith("<")) {
          try {
            html = atob(html);
          } catch {
            /* keep original */
          }
        }
        clearCart();
        setCheckoutFormHtml(html);
        setLoading(false);
        return;
      }
      setError(t("cardPaymentFailed"));
      setLoading(false);
      return;
    }

    setOrderNumber(order.orderNumber);
    setPaidTotal(typeof order.total === "number" ? order.total : payable);
    setPaidByCard(false);
    clearCart();
    setDone(true);
    setLoading(false);
  };

  if (checkoutFormHtml) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="mb-4 text-olive/70">{t("redirectingToCard")}</p>
        <PaymentLogos className="justify-center" />
      </div>
    );
  }

  if (done) {
    const noTransfer = paidTotal <= 0;
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        {gcrOptIn ? (
          <GoogleSurveyOptIn
            orderId={gcrOptIn.orderId}
            email={gcrOptIn.email}
            estimatedDeliveryDate={gcrOptIn.estimatedDeliveryDate}
          />
        ) : null}
        <div className="card space-y-4 text-center">
          <p className="text-xl font-semibold text-olive">{t("success")}</p>
          {orderNumber && (
            <p className="text-sm text-olive/60">
              {t("orderNumber")}: <strong>{orderNumber}</strong>
            </p>
          )}
          <p className="text-sm text-olive/70">
            {noTransfer
              ? t("successGiftCardPaid")
              : paidByCard
                ? t("successCardPaid")
                : t("successNote")}
          </p>

          {!noTransfer && !paidByCard && (
            <div className="rounded-lg bg-bamboo/10 p-4 text-left text-sm">
              <p className="mb-2 font-semibold text-olive">{t("paymentInfo")}</p>
              <p className="mb-2 font-medium text-bamboo">
                {t("amountDue")}: {formatPrice(paidTotal, locale)}
              </p>
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
          )}

          <Link href={base} className="btn-primary mt-2 inline-flex w-full">
            {tCart("continueShopping")}
          </Link>
          {orderNumber && (
            <Link
              href={`${base}/tracking`}
              className="btn-secondary inline-flex w-full"
            >
              {t("trackOrder")}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-36 sm:py-12 sm:pb-12 lg:pb-12">
      <h1 className="page-title mb-6 sm:mb-8">{t("title")}</h1>
      <p className="mb-6 rounded-lg bg-bamboo/10 p-3 text-sm text-olive/70">
        {payable <= 0
          ? t("giftCardCoversAll")
          : payMethod === "card"
            ? t("cardPaymentInfo")
            : t("bankTransferInfo")}
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <form id="checkout-form" onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="checkout-panel space-y-6 pt-6">
            <section className="space-y-4">
              <FloatField label={t("emailPlaceholder")}>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  className="checkout-field"
                  value={form.email}
                  onChange={(e) => {
                    const email = e.target.value;
                    setForm({ ...form, email });
                    rememberShopperEmail(email);
                  }}
                />
              </FloatField>
              <div className="checkout-float">
                <span className="checkout-float-label left-16">
                  {t("phonePlaceholder")}
                </span>
                <div className="flex rounded-xl border border-bamboo/25 bg-white focus-within:border-olive focus-within:ring-2 focus-within:ring-olive/20">
                  <span className="flex shrink-0 items-center gap-1.5 border-r border-bamboo/20 px-3 text-base leading-none">
                    <span aria-hidden>🇹🇷</span>
                  </span>
                  <span className="flex shrink-0 items-center pl-3 text-[15px] font-medium text-slate-500">
                    {t("phonePrefix")}
                  </span>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    className="min-h-[48px] w-full border-0 bg-transparent px-2 text-[15px] text-slate-700 outline-none"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phone: nationalPhoneDigits(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-semibold text-slate-800">
                {t("deliveryAddress")}
              </h2>
              <FloatField label={t("addressTitlePlaceholder")}>
                <input
                  required
                  autoComplete="off"
                  className="checkout-field"
                  value={form.addressTitle}
                  onChange={(e) =>
                    setForm({ ...form, addressTitle: e.target.value })
                  }
                />
              </FloatField>
              <FloatField label={t("namePlaceholder")}>
                <input
                  required
                  autoComplete="name"
                  className="checkout-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </FloatField>
              <div className="grid grid-cols-3 gap-2">
                <select
                  required
                  className="checkout-select"
                  value={TURKEY_COUNTRY}
                  disabled
                  aria-label={t("countryPlaceholder")}
                >
                  <option>{TURKEY_COUNTRY}</option>
                </select>
                <select
                  required
                  className="checkout-select"
                  value={form.city}
                  autoComplete="address-level1"
                  onChange={(e) =>
                    setForm({ ...form, city: e.target.value, district: "" })
                  }
                >
                  <option value="">{t("cityPlaceholder")}</option>
                  {TURKEY_CITY_NAMES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <select
                  required
                  className="checkout-select"
                  value={form.district}
                  disabled={!form.city}
                  autoComplete="address-level2"
                  onChange={(e) =>
                    setForm({ ...form, district: e.target.value })
                  }
                >
                  <option value="">{t("districtPlaceholder")}</option>
                  {districtsOf(form.city).map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
              <FloatField label={t("addressPlaceholder")}>
                <textarea
                  required
                  autoComplete="street-address"
                  rows={3}
                  className="checkout-field min-h-[88px] resize-y py-3"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </FloatField>
              <FloatField label={t("postalCodePlaceholder")}>
                <input
                  inputMode="numeric"
                  autoComplete="postal-code"
                  className="checkout-field"
                  value={form.postalCode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      postalCode: e.target.value.replace(/\D/g, "").slice(0, 5),
                    })
                  }
                />
              </FloatField>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-semibold text-slate-800">
                {t("invoiceType")}
              </h2>
              <div className="flex flex-wrap gap-6">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="invoiceKind"
                    className="h-4 w-4 accent-olive"
                    checked={form.invoiceKind === "individual"}
                    onChange={() =>
                      setForm({
                        ...form,
                        invoiceKind: "individual",
                        companyTitle: "",
                        taxOffice: "",
                        taxId: "",
                      })
                    }
                  />
                  {t("individual")}
                </label>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="invoiceKind"
                    className="h-4 w-4 accent-olive"
                    checked={form.invoiceKind === "corporate"}
                    onChange={() =>
                      setForm({ ...form, invoiceKind: "corporate" })
                    }
                  />
                  {t("corporate")}
                </label>
              </div>
              <p className="text-sm text-olive/70">{t("invoiceHint")}</p>
              {form.invoiceKind === "corporate" && (
                <>
                  <FloatField label={t("companyTitlePlaceholder")}>
                    <input
                      required
                      className="checkout-field"
                      value={form.companyTitle}
                      onChange={(e) =>
                        setForm({ ...form, companyTitle: e.target.value })
                      }
                    />
                  </FloatField>
                  <FloatField label={t("taxOfficePlaceholder")}>
                    <input
                      required
                      className="checkout-field"
                      value={form.taxOffice}
                      onChange={(e) =>
                        setForm({ ...form, taxOffice: e.target.value })
                      }
                    />
                  </FloatField>
                  <FloatField label={t("vknPlaceholder")}>
                    <input
                      required
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={10}
                      className="checkout-field"
                      value={form.taxId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          taxId: e.target.value.replace(/\D/g, ""),
                        })
                      }
                    />
                  </FloatField>
                </>
              )}
            </section>

            <section className="space-y-4 border-t border-bamboo/10 pt-5">
              <DiscountCodeField locale={locale} />
            </section>

            {payable > 0 && (
              <section className="space-y-4 border-t border-bamboo/10 pt-5">
                <h2 className="text-base font-semibold text-slate-800">
                  {t("paymentInfo")}
                </h2>
                <div className="flex flex-wrap gap-6">
                  {cardEnabled && (
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="radio"
                        name="payMethod"
                        className="h-4 w-4 accent-olive"
                        checked={payMethod === "card"}
                        onChange={() => setPayMethod("card")}
                      />
                      {t("payWithCard")}
                    </label>
                  )}
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="radio"
                      name="payMethod"
                      className="h-4 w-4 accent-olive"
                      checked={payMethod === "bank_transfer"}
                      onChange={() => setPayMethod("bank_transfer")}
                    />
                    {t("payWithTransfer")}
                  </label>
                </div>
                {payMethod === "card" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-olive/70">{t("cardPaymentInfo")}</p>
                    <PaymentLogos />
                    <p className="text-xs text-olive/50">{t("cardSecureNote")}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-olive/70">{t("bankTransferInfo")}</p>
                    <div className="rounded-xl bg-bamboo/10 p-3 text-sm">
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
                  </>
                )}
              </section>
            )}

            <div className="space-y-3 border-t border-bamboo/10 pt-5">
              <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm text-olive/80">
                <input
                  type="checkbox"
                  required
                  checked={form.kvkkConsent}
                  onChange={(e) =>
                    setForm({ ...form, kvkkConsent: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded accent-olive"
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
              <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm text-olive/80">
                <input
                  type="checkbox"
                  checked={form.marketingConsent}
                  onChange={(e) =>
                    setForm({ ...form, marketingConsent: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded accent-olive"
                />
                <span>{t("marketingConsent")}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="checkout-panel hidden h-fit space-y-2 lg:block">
          <p className="mb-2 font-semibold">{tCart("total")}</p>
          <div className="flex justify-between text-sm text-slate-600">
            <span>{tCart("subtotal")}</span>
            <span>{formatPrice(merchandise, locale)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>{tCart("shipping")}</span>
            <span className={freeShip ? "font-medium text-olive" : "font-medium text-slate-800"}>
              {physical <= 0
                ? "—"
                : freeShip
                  ? tCart("freeShipping")
                  : formatPrice(shippingFee, locale)}
            </span>
          </div>
          {discountApplied > 0 && (
            <div className="flex justify-between text-sm text-olive">
              <span>
                {tCart("discountLine")}
                {discountCode ? ` (${discountCode})` : ""}
              </span>
              <span>−{formatPrice(discountApplied, locale)}</span>
            </div>
          )}
          {giftApplied > 0 && (
            <div className="flex justify-between text-sm text-olive">
              <span>
                {tCart("giftCardDiscount")}
                {giftCardCode ? ` (${giftCardCode})` : ""}
              </span>
              <span>−{formatPrice(giftApplied, locale)}</span>
            </div>
          )}
          <p className="text-2xl font-semibold text-bamboo">
            {formatPrice(payable, locale)}
          </p>
          <p className="mb-2 text-xs text-olive/70">
            {physical <= 0
              ? null
              : freeShip
                ? tCart("freeShippingNote")
                : tCart("freeShippingRemaining", {
                    amount: formatPrice(remaining, locale),
                  })}
          </p>
          <p className="mb-6 text-sm text-olive/60">{t("orderHint")}</p>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "..." : payMethod === "card" && payable > 0 ? t("payWithCard") : t("placeOrder")}
          </button>
        </div>
      </form>

      <div className="mobile-sticky-bar lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-olive/60">{tCart("total")}</p>
            <p className="text-xl font-semibold text-bamboo">
              {formatPrice(payable, locale)}
            </p>
            {shippingFee > 0 && (
              <p className="text-[10px] text-olive/70">
                {tCart("shipping")}: {formatPrice(shippingFee, locale)}
              </p>
            )}
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={loading}
            className="btn-primary shrink-0 px-6"
          >
            {loading ? "..." : payMethod === "card" && payable > 0 ? t("payWithCard") : t("placeOrder")}
          </button>
        </div>
      </div>
    </div>
  );
}
