"use client";

import { useEffect, useRef } from "react";
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

export function GoogleRatingBadge() {
  const hostRef = useRef<HTMLDivElement>(null);

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
          language: "tr",
          enabledDevices: "MOBILE,TABLET,DESKTOP",
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

    const host = hostRef.current;
    if (host && !desktop) {
      loadPlatform(() => {
        if (cancelled || !window.gapi?.load || !host) return;
        window.gapi.load("ratingbadge", () => {
          if (cancelled || !host) return;
          window.gapi?.ratingbadge?.render(host, {
            merchant_id: GOOGLE_MERCHANT_ID,
            position: "INLINE",
          });
        });
      });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      id="gcr-badge"
      ref={hostRef}
      className="flex min-h-[52px] justify-center md:hidden"
    />
  );
}
