/* Admin order alerts — push + notification click */
/* eslint-disable no-undef */

const SOUND_URL = "/sounds/cash.mp3";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Yeni sipariş",
    body: "CimcimKids admin — yeni sipariş alındı",
    url: "/admin/orders",
    orderNumber: "",
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // ignore bad payload
  }

  const title = data.title || "Yeni sipariş";
  const options = {
    body: data.body || "Yeni sipariş alındı",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.orderNumber ? `order-${data.orderNumber}` : "order-alert",
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: { url: data.url || "/admin/orders" },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.postMessage({
          type: "ORDER_ALERT",
          orderNumber: data.orderNumber || "",
          body: options.body,
        });
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin/orders";

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(url);
            } catch {
              // ignore
            }
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data && data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (!data || data.type !== "SHOW_ORDER_NOTIFICATION") return;

  event.waitUntil(
    self.registration.showNotification(data.title || "Yeni sipariş", {
      body: data.body || "Yeni sipariş alındı",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.orderNumber ? `order-${data.orderNumber}` : "order-alert",
      renotify: true,
      requireInteraction: true,
      silent: false,
      data: { url: data.url || "/admin/orders" },
    })
  );
});

void SOUND_URL;
