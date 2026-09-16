"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Product, ProductColor } from "@/lib/types";
import { getColorLabel, getProductAges } from "@/lib/types";
import { stockForAge } from "@/lib/product-stock";

type Props = {
  product: Product;
  open: boolean;
  onClose: () => void;
  onPick: (ageLabel: string, color: ProductColor | null) => void;
};

export function AddToCartSizeSheet({ product, open, onClose, onPick }: Props) {
  const t = useTranslations("products");
  const locale = useLocale();
  const ages = getProductAges(product);
  const colors = product.colors ?? [];
  const [color, setColor] = useState<ProductColor | null>(colors[0] ?? null);
  const [notifyAge, setNotifyAge] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [notifyState, setNotifyState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  useEffect(() => {
    if (!open) return;
    setColor(product.colors?.[0] ?? null);
    setNotifyAge(null);
    setNotifyState("idle");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, product.id]);

  if (!open || ages.length === 0 || typeof document === "undefined") return null;

  const subscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!notifyAge || !email.trim()) return;
    setNotifyState("loading");
    const response = await fetch("/api/stock-notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        ageLabel: notifyAge,
        email,
        locale,
      }),
    }).catch(() => null);
    setNotifyState(response?.ok ? "success" : "error");
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-cart-size-title"
        className="relative z-10 max-h-[calc(100dvh-0.75rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="add-to-cart-size-title"
              className="text-lg font-semibold text-slate-800"
            >
              {t("selectSize")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{t("selectSizeHint")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {colors.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              {t("color")}
              {color ? (
                <span className="ml-2 font-normal text-slate-500">
                  {getColorLabel(color, locale)}
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2">
              {colors.map((item) => {
                const active = color?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setColor(item)}
                    title={getColorLabel(item, locale)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                      active
                        ? "border-bamboo ring-2 ring-bamboo/30"
                        : "border-slate-200 hover:border-slate-400"
                    }`}
                    aria-label={getColorLabel(item, locale)}
                    aria-pressed={active}
                  >
                    <span
                      className="h-7 w-7 rounded-full border border-black/10"
                      style={{ backgroundColor: item.hex }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {ages.map((age) => {
              const stock = stockForAge(product, age);
              const soldOut = stock <= 0;
              return (
                <button
                  key={age}
                  type="button"
                  onClick={() => {
                    if (soldOut) {
                      setNotifyAge(age);
                      setNotifyState("idle");
                      return;
                    }
                    onPick(age, color);
                  }}
                  aria-disabled={soldOut}
                  className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                    soldOut
                      ? notifyAge === age
                        ? "border-red-300 bg-red-50 text-slate-400 ring-2 ring-red-100"
                        : "border-red-100 bg-red-50 text-slate-400 hover:border-red-300"
                      : "border-slate-200 bg-white text-slate-700 hover:border-bamboo hover:bg-bamboo hover:text-white"
                  }`}
                >
                  <span className={soldOut ? "line-through decoration-red-400" : ""}>
                    {age}
                  </span>
                  {soldOut ? (
                    <span className="ml-1.5 text-xs font-semibold text-red-500 no-underline">
                      {t("outOfStock")}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {notifyAge && (
          <form
            onSubmit={subscribe}
            className="mt-4 rounded-2xl border border-bamboo/15 bg-bamboo/5 p-3"
          >
            <p className="text-sm font-semibold text-slate-700">
              {t("notifyTitle", { size: notifyAge })}
            </p>
            <p className="mt-1 text-xs text-slate-500">{t("notifyHint")}</p>
            {notifyState === "success" ? (
              <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                {t("notifySuccess")}
              </p>
            ) : (
              <>
                <div className="mt-3 flex gap-2">
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("notifyEmail")}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-bamboo"
                  />
                  <button
                    type="submit"
                    disabled={notifyState === "loading"}
                    className="rounded-xl bg-bamboo px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {notifyState === "loading"
                      ? t("notifySending")
                      : t("notifyButton")}
                  </button>
                </div>
                {notifyState === "error" && (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {t("notifyError")}
                  </p>
                )}
              </>
            )}
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
