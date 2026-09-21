"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isMetaPixelConfigured, trackMetaPageView } from "@/lib/meta-pixel";

export function MetaPixelTracker() {
  const pathname = usePathname();
  const skipFirst = useRef(true);

  useEffect(() => {
    if (!isMetaPixelConfigured()) return;
    if (pathname.startsWith("/admin")) return;
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    trackMetaPageView();
  }, [pathname]);

  return null;
}
