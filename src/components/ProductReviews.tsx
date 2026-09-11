"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { StarRating } from "./StarRating";
import { ProductRatingBadge } from "./ProductRatingBadge";
import { readRememberedShopperEmail } from "@/lib/shopper";
import { REVIEW_COMMENT_MAX } from "@/lib/reviews";
import type { PublicReview, ReviewSummary } from "@/lib/reviews";

type Props = {
  productId: string;
  initialSummary: ReviewSummary;
  initialReviews: PublicReview[];
};

export function ProductReviews({
  productId,
  initialSummary,
  initialReviews,
}: Props) {
  const t = useTranslations("reviews");
  const locale = useLocale();
  const [summary, setSummary] = useState(initialSummary);
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState(0);
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setEmail(readRememberedShopperEmail());
  }, []);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", {
        dateStyle: "medium",
      }),
    [locale]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (rating < 1) {
      setError(t("ratingRequired"));
      return;
    }
    setLoading(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        rating,
        email,
        orderNumber,
        comment,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(
        typeof (data as { error?: string }).error === "string"
          ? (data as { error: string }).error
          : t("error")
      );
      return;
    }
    const next = (data as { review?: PublicReview; summary?: ReviewSummary }).review;
    const nextSummary = (data as { summary?: ReviewSummary }).summary;
    if (next) setReviews((prev) => [next, ...prev]);
    if (nextSummary) setSummary(nextSummary);
    setDone(true);
    setComment("");
    setRating(0);
  };

  return (
    <section id="yorumlar" className="mt-12 border-t border-bamboo/10 pt-10 sm:mt-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 sm:text-2xl">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{t("verifiedHint")}</p>
        </div>
        <ProductRatingBadge summary={summary} />
      </div>

      {reviews.length === 0 ? (
        <p className="mb-8 text-sm text-slate-500">{t("empty")}</p>
      ) : (
        <ul className="mb-10 space-y-4">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-2xl border border-bamboo/10 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-800">{review.displayName}</p>
                <time className="text-xs text-slate-400" dateTime={review.createdAt}>
                  {dateFmt.format(new Date(review.createdAt))}
                </time>
              </div>
              <div className="mt-1">
                <StarRating value={review.rating} size="sm" />
              </div>
              {review.comment ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {review.comment}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-3xl border border-bamboo/10 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-slate-800">{t("formTitle")}</h3>
        {done ? (
          <p className="mt-3 text-sm text-olive">{t("thanks")}</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">{t("yourRating")}</p>
              <StarRating
                value={rating}
                interactive
                onChange={setRating}
                label={t("yourRating")}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  {t("email")}
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field w-full text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  {t("orderNumber")}
                </span>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                  className="input-field w-full text-sm"
                  placeholder={t("orderNumberPlaceholder")}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                {t("comment")}
              </span>
              <textarea
                rows={4}
                maxLength={REVIEW_COMMENT_MAX}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("commentPlaceholder")}
                className="input-field min-h-[96px] w-full resize-y py-2 text-sm"
              />
            </label>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "..." : t("submit")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
