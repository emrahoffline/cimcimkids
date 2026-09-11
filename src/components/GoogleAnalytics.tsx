"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isGaConfigured, trackGaPageView } from "@/lib/google-analytics";

export function GoogleAnalytics() {
  const pathname = usePathname();
  const skipFirst = useRef(true);

  useEffect(() => {
    if (!isGaConfigured()) return;
    if (pathname.startsWith("/admin")) return;
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    trackGaPageView(pathname);
  }, [pathname]);

  return null;
}
