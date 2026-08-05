"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/products";
import { useAdminNotifications } from "./useAdminNotifications";

export function AdminNotifications() {
  const { count, orders, markAllSeen, refresh } = useAdminNotifications();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const prevCount = useRef(count);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      prevCount.current = count;
      return;
    }
    if (count > prevCount.current) {
      const latest = orders[0];
      setToast(
        latest
          ? `Yeni sipariş: ${latest.orderNumber}`
          : "Yeni sipariş alındı"
      );
      const id = setTimeout(() => setToast(null), 5000);
      prevCount.current = count;
      return () => clearTimeout(id);
    }
    prevCount.current = count;
  }, [count, orders]);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) refresh();
  };

  const handleMarkAll = async () => {
    await markAllSeen();
    setOpen(false);
  };

  return (
    <>
      {toast && (
        <div className="fixed left-3 right-3 top-[4.5rem] z-50 flex items-center gap-2 rounded-lg border border-bamboo/30 bg-white px-4 py-3 text-sm shadow-lg sm:left-auto sm:right-6 sm:max-w-sm">
          <ShoppingBag className="h-4 w-4 shrink-0 text-bamboo" />
          <span>{toast}</span>
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={handleOpen}
          className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100"
          aria-label="Sipariş bildirimleri"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>

        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40"
              aria-label="Kapat"
              onClick={() => setOpen(false)}
            />
            <div className="fixed inset-x-3 top-[3.75rem] z-50 max-h-[min(24rem,70vh)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900">Sipariş Bildirimleri</p>
                {count > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAll}
                    className="shrink-0 text-xs text-olive hover:underline"
                  >
                    Tümünü okundu işaretle
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {orders.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-gray-400">
                    Yeni sipariş bildirimi yok
                  </p>
                ) : (
                  orders.map((order) => (
                    <Link
                      key={order.id}
                      href="/admin/orders"
                      onClick={() => setOpen(false)}
                      className="block border-b border-gray-50 px-4 py-3 transition hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {order.orderNumber}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {order.itemCount} ürün ·{" "}
                            {new Date(order.createdAt).toLocaleString("tr-TR")}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-bamboo">
                          {formatPrice(order.total, "tr")}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <div className="border-t border-gray-100 px-4 py-3">
                <Link
                  href="/admin/orders"
                  onClick={() => setOpen(false)}
                  className="block text-center text-sm text-olive hover:underline"
                >
                  Tüm siparişleri gör →
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
