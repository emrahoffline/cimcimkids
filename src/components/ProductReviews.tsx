"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ImagePlus, X } from "lucide-react";
import { StarRating } from "./StarRating";
import { ProductRatingBadge } from "./ProductRatingBadge";
import { readRememberedShopperEmail } from "@/lib/shopper";
import {
  REVIEW_COMMENT_MAX,
  REVIEW_IMAGE_MAX,
  REVIEW_IMAGE_MAX_BYTES,
} from "@/lib/reviews";
import type { PublicReview, ReviewSummary } from "@/lib/reviews";
import { isUploadedProductImage } from "@/lib/image-utils";

type Props = {
  productId: string;
  initialSummary: ReviewSummary;
  initialReviews: PublicReview[];
};

type PendingPhoto = { file: File; url: string };

const PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function ReviewPhotos({
  images,
  alt,
  onOpen,
}: {
  images: string[];
  alt: string;
  onOpen: (src: string) => void;
}) {
  if (!images.length) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {images.map((src) => (
        <li key={src}>
          <button
            type="button"
            onClick={() => onOpen(src)}
            aria-label={alt}
            className="relative block h-20 w-20 overflow-hidden rounded-xl border border-bamboo/15 bg-cream-dark"
          >
            <Image
              src={src}
              alt={alt}
              fill
              unoptimized={isUploadedProductImage(src)}
              className="object-cover"
              sizes="80px"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

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
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const photosRef = useRef<PendingPhoto[]>([]);
  const [lightbox, setLightbox] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  photosRef.current = photos;

  useEffect(() => {
    setEmail(readRememberedShopperEmail());
  }, []);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
    };
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", {
        dateStyle: "medium",
      }),
    [locale]
  );

  const clearPhotos = () => {
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    setPhotos([]);
  };

  const addPhotos = (list: FileList | null) => {
    if (!list?.length) return;
    setError("");
    const next = [...photos];
    for (const file of Array.from(list)) {
      if (next.length >= REVIEW_IMAGE_MAX) {
        setError(t("tooManyPhotos"));
        break;
      }
      if (file.type && !PHOTO_TYPES.has(file.type)) {
        setError(t("photoInvalid"));
        continue;
      }
      if (file.size > REVIEW_IMAGE_MAX_BYTES) {
        setError(t("photoTooLarge"));
        continue;
      }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setPhotos(next);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return copy;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (rating < 1) {
      setError(t("ratingRequired"));
      return;
    }
    setLoading(true);
    const form = new FormData();
    form.set("productId", productId);
    form.set("rating", String(rating));
    form.set("email", email);
    form.set("orderNumber", orderNumber);
    form.set("comment", comment);
    for (const photo of photos) {
      form.append("photos", photo.file);
    }
    const res = await fetch("/api/reviews", {
      method: "POST",
      body: form,
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
    clearPhotos();
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
              <ReviewPhotos
                images={review.images ?? []}
                alt={t("photoAlt", { name: review.displayName })}
                onOpen={setLightbox}
              />
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
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">{t("photos")}</p>
              <p className="mb-2 text-xs text-slate-400">{t("photosHint")}</p>
              {photos.length > 0 ? (
                <ul className="mb-2 flex flex-wrap gap-2">
                  {photos.map((photo, index) => (
                    <li key={photo.url} className="relative h-20 w-20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt=""
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-white"
                        aria-label={t("removePhoto")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {photos.length < REVIEW_IMAGE_MAX ? (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-bamboo/20 bg-cream px-3 py-2 text-sm text-slate-700">
                  <ImagePlus className="h-4 w-4" />
                  {t("addPhotos")}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      addPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : null}
            </div>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "..." : t("submit")}
            </button>
          </form>
        )}
      </div>

      {lightbox ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox("")}
          aria-label={t("closePhoto")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      ) : null}
    </section>
  );
}
