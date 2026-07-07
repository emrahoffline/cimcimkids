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

export function useAdminNotifications(pollMs = 20000) {
  const [data, setData] = useState<NotificationData>({ count: 0, orders: [] });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
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
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { ...data, loading, refresh, markAllSeen };
}
