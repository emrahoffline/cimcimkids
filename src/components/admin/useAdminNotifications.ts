"use client";

import { useCallback, useEffect, useState } from "react";

export type AdminNotificationOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  total: number;
  status: string;
  createdAt: string;
  itemCount: number;
};

type NotificationData = {
  count: number;
  orders: AdminNotificationOrder[];
};

export function useAdminNotifications(pollMs = 12000) {
  const [data, setData] = useState<NotificationData>({ count: 0, orders: [] });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllSeen = useCallback(async () => {
    await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh, pollMs]);

  return { ...data, loading, refresh, markAllSeen };
}
