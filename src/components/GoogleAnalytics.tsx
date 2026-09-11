"use client";

import Script from "next/script";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  GA_MEASUREMENT_ID,
  isGaConfigured,
  trackGaPageView,
} from "@/lib/google-analytics";

export function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isGaConfigured()) return;
    if (pathname.startsWith("/admin")) return;
    trackGaPageView(pathname);
  }, [pathname]);

  if (!isGaConfigured()) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            send_page_view: false,
            anonymize_ip: true
          });
        `}
      </Script>
    </>
  );
}
