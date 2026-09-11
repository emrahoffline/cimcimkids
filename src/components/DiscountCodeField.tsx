"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  useCartStore,
  cartDiscountEligible,
  cartDiscountApplied,
} from "@/store/cart";
import { formatPrice } from "@/lib/products";
import type { DiscountKind } from "@/lib/discount-codes";

export function DiscountCodeField({ locale }: { locale: string }) {
  const t = useTranslations("cart");
  const {
    items,
    discountCode,
    discountKind,
    discountValue,
    discountMinSubtotal,
    setDiscountCode,
    clearDiscountCode,
  } = useCartStore();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const eligible = cartDiscountEligible(items);
  const applied = cartDiscountApplied(
    items,
    discountKind,
    discountValue,
    discountMinSubtotal
  );

  const apply = async () => {
    setError("");
    if (!input.trim()) {
      setError(t("discountRequired"));
      return;
    }
    setLoading(true);
    const res = await fetch("/api/discount-codes/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: input, subtotal: eligible }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || t("discountInvalid"));
      return;
    }
    setDiscountCode({
      code: String((data as { code: string }).code),
      kind: (data as { kind: DiscountKind }).kind,
      value: Number((data as { value: number }).value),
      minSubtotal: Number((data as { minSubtotal?: number }).minSubtotal) || 0,
    });
    setInput("");
  };

  return (
    <div className="space-y-2 border-t border-bamboo/10 pt-3">
      <p className="text-sm font-medium text-slate-700">{t("discountTitle")}</p>
      {discountCode ? (
        <div className="rounded-xl bg-olive/10 px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-semibold text-olive">{discountCode}</span>
            <button
              type="button"
              onClick={clearDiscountCode}
              className="text-xs text-slate-500 underline"
            >
              {t("discountRemove")}
            </button>
          </div>
          {applied > 0 ? (
            <p className="mt-1 text-xs text-slate-600">
              {t("discountApplied", { amount: formatPrice(applied, locale) })}
            </p>
          ) : (
            <p className="mt-1 text-xs text-amber-700">{t("discountMinNotMet")}</p>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder={t("discountPlaceholder")}
            className="input-field flex-1 text-sm"
          />
          <button
            type="button"
            onClick={apply}
            disabled={loading}
            className="btn-secondary shrink-0 px-3 text-sm"
          >
            {loading ? "..." : t("discountApply")}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
