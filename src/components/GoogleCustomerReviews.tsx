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

declare global {
  interface Window {
    gapi?: Gapi;
  }
}

const PLATFORM_SRC = "https://apis.google.com/js/platform.js";

function loadPlatform(onReady: () => void) {
  if (typeof window === "undefined") return;
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

export function GoogleRatingBadge() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_MERCHANT_ID) return;
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
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
    return () => {
      cancelled = true;
    };
  }, []);

  return <div ref={hostRef} className="min-h-[52px]" />;
}
