"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { GOOGLE_MERCHANT_ID } from "@/lib/google-customer-reviews";

type Gapi = {
  load: (lib: string, cb: () => void) => void;
  surveyoptin?: {
    render: (cfg: {
      merchant_id: number;
      order_id: string;
      email: string;
      delivery_country: string;
      estimated_delivery_date: string;
      opt_in_style?: string;
    }) => void;
  };
  ratingbadge?: {
    render: (
      el: HTMLElement,
      cfg: { merchant_id: number; position: string }
    ) => void;
  };
};

type MerchantWidget = {
  start: (cfg: {
    merchant_id?: number;
    position?: string;
    region?: string;
    language?: string;
    enabledDevices?: string;
    sideMargin?: number;
    bottomMargin?: number;
    mobileSideMargin?: number;
    mobileBottomMargin?: number;
  }) => void;
};

declare global {
  interface Window {
    gapi?: Gapi;
    ___gcfg?: { lang?: string };
    merchantWidget?: MerchantWidget;
    merchantwidget?: MerchantWidget;
  }
}

function googleStoreWidget(): MerchantWidget | undefined {
  if (typeof window === "undefined") return undefined;
  return window.merchantwidget ?? window.merchantWidget;
}

const PLATFORM_SRC = "https://apis.google.com/js/platform.js";

function loadPlatform(onReady: () => void) {
  if (typeof window === "undefined") return;
  window.___gcfg = { ...(window.___gcfg ?? {}), lang: "tr" };
  if (window.gapi?.load) {
    onReady();
    return;
  }
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src^="${PLATFORM_SRC}"]`
  );
  if (existing) {
    existing.addEventListener("load", onReady, { once: true });
    return;
  }
  const script = document.createElement("script");
  script.src = PLATFORM_SRC;
  script.async = true;
  script.defer = true;
  script.onload = onReady;
  document.head.appendChild(script);
}

export function GoogleSurveyOptIn({
  orderId,
  email,
  estimatedDeliveryDate,
}: {
  orderId: string;
  email: string;
  estimatedDeliveryDate: string;
}) {
  useEffect(() => {
    if (!GOOGLE_MERCHANT_ID || !orderId || !email || !estimatedDeliveryDate) {
      return;
    }
    let cancelled = false;
    loadPlatform(() => {
      if (cancelled || !window.gapi?.load) return;
      window.gapi.load("surveyoptin", () => {
        if (cancelled) return;
        window.gapi?.surveyoptin?.render({
          merchant_id: GOOGLE_MERCHANT_ID,
          order_id: orderId,
          email,
          delivery_country: "TR",
          estimated_delivery_date: estimatedDeliveryDate,
          opt_in_style: "CENTER_DIALOG",
        });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [orderId, email, estimatedDeliveryDate]);

  return null;
}

const WIDGET_SRC = "https://www.gstatic.com/shopping/merchant/merchantwidget.js";

function loadMerchantWidget(onReady: () => void) {
  if (typeof window === "undefined") return;
  if (googleStoreWidget()?.start) {
    onReady();
    return;
  }
  const existing = document.getElementById(
    "merchantWidgetScript"
  ) as HTMLScriptElement | null;
  if (existing) {
    existing.addEventListener("load", onReady, { once: true });
    return;
  }
  const script = document.createElement("script");
  script.id = "merchantWidgetScript";
  script.src = WIDGET_SRC;
  script.defer = true;
  script.onload = onReady;
  document.head.appendChild(script);
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function GoogleRatingBadge() {
  const t = useTranslations("footer");
  const locale = useLocale();

  useEffect(() => {
    if (!GOOGLE_MERCHANT_ID) return;
    let cancelled = false;
    let tries = 0;
    const desktop = window.matchMedia("(min-width: 768px)").matches;

    const startFloating = () => {
      if (cancelled) return;
      const widget = googleStoreWidget();
      if (!widget?.start) {
        if (tries < 20) {
          tries += 1;
          window.setTimeout(startFloating, 250);
        }
        return;
      }
      try {
        widget.start({
          merchant_id: GOOGLE_MERCHANT_ID,
          position: desktop ? "LEFT_BOTTOM" : "RIGHT_BOTTOM",
          sideMargin: 16,
          bottomMargin: 24,
          mobileSideMargin: 16,
          mobileBottomMargin: 96,
        });
      } catch {
        /* already rendered */
      }
    };

    loadMerchantWidget(startFloating);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <a
      id="gcr-badge"
      href={`https://www.google.com/storepages?q=cimcimkids.com&c=${locale === "en" ? "US" : "TR"}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:hidden"
    >
      <GoogleMark />
      <span className="min-w-0 text-left">
        <span className="block text-sm font-semibold text-slate-800">
          {t("googleReviews")}
        </span>
        <span className="block text-xs text-slate-500">
          {t("googleReviewsHint")}
        </span>
      </span>
    </a>
  );
}
