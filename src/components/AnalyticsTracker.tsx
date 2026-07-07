"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getSessionId() {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("ab_sid");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("ab_sid", id);
  }
  return id;
}

function sendEvent(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/analytics",
      new Blob([body], { type: "application/json" })
    );
    return;
  }
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    startedAt.current = Date.now();
    const sessionId = getSessionId();

    sendEvent({
      type: "page_view",
      sessionId,
      path: pathname,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    return () => {
      const durationSec = Math.round((Date.now() - startedAt.current) / 1000);
      if (durationSec < 2) return;
      sendEvent({
        type: "session_end",
        sessionId,
        path: pathname,
        durationSec,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    };
  }, [pathname]);

  return null;
}
