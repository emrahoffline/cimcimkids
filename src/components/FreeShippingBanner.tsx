"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Announcement } from "@/lib/types";

export function FreeShippingBanner() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const fallback = t("freeShipping");
  const [texts, setTexts] = useState<string[] | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [durationSec, setDurationSec] = useState(30);
  const [repeat, setRepeat] = useState(4);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/announcements", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Announcement[]) => {
        if (cancelled || !Array.isArray(data)) return;
        const next = data
          .map((a) => {
            const en = a.textEn?.trim();
            return locale === "en" && en ? en : a.textTr.trim();
          })
          .filter(Boolean);
        setTexts(next);
      })
      .catch(() => {
        if (!cancelled) setTexts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const items = useMemo(() => {
    if (texts && texts.length > 0) return texts;
    return [fallback];
  }, [texts, fallback]);

  const contentKey = items.join("\u0001");

  // Ensure one half of the track is at least as wide as the viewport
  useEffect(() => {
    const probe = measureRef.current;
    if (!probe) return;

    const update = () => {
      const unit = probe.scrollWidth;
      const vw = window.innerWidth || 800;
      if (unit <= 0) return;
      setRepeat(Math.max(2, Math.ceil((vw + 80) / unit)));
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [contentKey]);

  const cycle = useMemo(() => {
    const unit = items.map((text, i) => ({ text, id: `${i}-${text}` }));
    return Array.from({ length: repeat }, () => unit).flat();
  }, [items, repeat]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const measure = () => {
      const half = el.scrollWidth / 2;
      if (half <= 0) return;
      setDurationSec(Math.max(18, Math.min(90, half / 45)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [contentKey, repeat]);

  const ariaLabel = items.join(" · ");

  return (
    <div
      className="free-shipping-banner relative z-50 overflow-hidden border-b border-white/15 bg-bamboo text-white"
      role="region"
      aria-label={ariaLabel}
    >
      {/* Hidden probe: width of one announcement sequence */}
      <div
        ref={measureRef}
        className="pointer-events-none invisible absolute left-0 top-0 flex whitespace-nowrap text-sm font-semibold tracking-wide sm:text-[15px]"
        aria-hidden
      >
        {items.map((text, i) => (
          <span key={i} className="mx-6 inline-flex items-center gap-3 sm:mx-8">
            <span>•</span>
            <span>{text}</span>
          </span>
        ))}
      </div>

      <div
        key={`${contentKey}-${repeat}`}
        ref={trackRef}
        className="free-shipping-marquee flex w-max items-center whitespace-nowrap py-2 text-sm font-semibold tracking-wide sm:text-[15px]"
        style={{ animationDuration: `${durationSec}s` }}
      >
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="flex shrink-0 items-center"
            aria-hidden={copy === 1}
          >
            {cycle.map(({ text, id }, i) => (
              <span
                key={`${copy}-${id}-${i}`}
                className="mx-6 inline-flex items-center gap-3 sm:mx-8"
              >
                <span className="text-white/70">•</span>
                <span>{text}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
