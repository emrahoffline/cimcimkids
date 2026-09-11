"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isGaConfigured, trackGaPageView } from "@/lib/google-analytics";

export function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isGaConfigured()) return;
    if (pathname.startsWith("/admin")) return;
    trackGaPageView(pathname);
  }, [pathname]);

  return null;
}
