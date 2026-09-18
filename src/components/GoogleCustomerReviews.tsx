"use client";

import { useEffect } from "react";
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

function applyWidgetFrame(data: { action?: string; height?: number; width?: number }) {
  const wrap = document.getElementById("google-merchantwidget-iframe-wrapper");
  if (!wrap || !data?.action) return;
  if (data.action === "resize" && data.height && data.width) {
    wrap.hidden = false;
    wrap.style.height = `${data.height}px`;
    wrap.style.width = `${data.width}px`;
    return;
  }
  if (data.action === "close") {
    wrap.hidden = true;
  }
}

function listenForWidgetResize() {
  const allowed = new Set([
    "https://www.google.com",
    "https://google.com",
    "https://www.google.com.tr",
    "https://google.com.tr",
  ]);
  const onMessage = (event: MessageEvent) => {
    if (!allowed.has(event.origin)) return;
    const payload = event.data;
    if (payload === "merchantverse" || (payload && payload.n === "merchantverse")) {
      const port = event.ports?.[0];
      if (!port) return;
      port.onmessage = (e) => applyWidgetFrame(e.data);
      return;
    }
    if (payload && typeof payload === "object") {
      applyWidgetFrame(payload);
    }
  };
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}

export function GoogleRatingBadge() {
  useEffect(() => {
    if (!GOOGLE_MERCHANT_ID) return;
    let cancelled = false;
    let tries = 0;
    const stopListening = listenForWidgetResize();

    const start = () => {
      if (cancelled) return;
      const widget = googleStoreWidget();
      if (!widget?.start) {
        if (tries < 20) {
          tries += 1;
          window.setTimeout(start, 250);
        }
        return;
      }
      try {
        widget.start({
          merchant_id: GOOGLE_MERCHANT_ID,
          position: "LEFT_BOTTOM",
          region: "TR",
          sideMargin: 16,
          bottomMargin: 24,
          mobileSideMargin: 16,
          mobileBottomMargin: 96,
        });
      } catch {
        /* already rendered */
      }
    };

    loadMerchantWidget(start);
    return () => {
      cancelled = true;
      stopListening();
    };
  }, []);

  return null;
}
