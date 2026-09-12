"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { classifyTrafficSource } from "@/lib/analytics-traffic";

const TRAFFIC_KEY = "ab_traffic";

function getVisitorId() {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("ab_vid");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("ab_vid", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function getSessionId() {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("ab_sid");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("ab_sid", id);
    sessionStorage.setItem("ab_sstart", String(Date.now()));
    sessionStorage.removeItem("ab_sended");
  } else if (!sessionStorage.getItem("ab_sstart")) {
    sessionStorage.setItem("ab_sstart", String(Date.now()));
  }
  return id;
}

function getLandingTraffic() {
  if (typeof window === "undefined") {
    return { source: "direct" as const, referrer: "" };
  }
  try {
    const stored = sessionStorage.getItem(TRAFFIC_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as {
        source?: string;
        referrer?: string;
      };
      if (parsed.source) {
        return {
          source: parsed.source,
          referrer: parsed.referrer || "",
        };
      }
    }
  } catch {
    /* ignore */
  }
  const referrer = document.referrer || "";
  const source = classifyTrafficSource(window.location.search, referrer);
  const payload = { source, referrer: referrer.slice(0, 300) };
  try {
    sessionStorage.setItem(TRAFFIC_KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
  return payload;
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

function endSessionOnce() {
  if (sessionStorage.getItem("ab_sended") === "1") return;
  const sessionId = sessionStorage.getItem("ab_sid");
  if (!sessionId) return;

  const start = Number(sessionStorage.getItem("ab_sstart") || Date.now());
  const durationSec = Math.round((Date.now() - start) / 1000);
  if (durationSec < 2) return;

  sessionStorage.setItem("ab_sended", "1");
  sendEvent({
    type: "session_end",
    sessionId,
    visitorId: getVisitorId(),
    durationSec: Math.min(durationSec, 7200),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Page views on navigation
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const sessionId = getSessionId();
    const visitorId = getVisitorId();

    const traffic = getLandingTraffic();
    sendEvent({
      type: "page_view",
      sessionId,
      visitorId,
      path: pathname,
      source: traffic.source,
      referrer: traffic.referrer,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }, [pathname]);

  // True session end: tab close / leave (not SPA route change)
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Short tab switches shouldn't kill the session immediately
        hideTimer.current = setTimeout(() => {
          endSessionOnce();
        }, 30_000);
      } else {
        if (hideTimer.current) {
          clearTimeout(hideTimer.current);
          hideTimer.current = null;
        }
        // Returning after a completed session → new session
        if (sessionStorage.getItem("ab_sended") === "1") {
          sessionStorage.removeItem("ab_sid");
          sessionStorage.removeItem("ab_sstart");
          sessionStorage.removeItem("ab_sended");
          sessionStorage.removeItem(TRAFFIC_KEY);
          getSessionId();
        }
      }
    };

    const onPageHide = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      endSessionOnce();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [pathname]);

  return null;
}
