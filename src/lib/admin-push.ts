import "server-only";
import webpush from "web-push";
import { prisma, hasDatabaseUrl, requireDatabaseUrl } from "./prisma";

function vapidConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || "";
}

function configureWebPush() {
  if (!vapidConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || "mailto:info@cimcimkids.com",
    process.env.VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim()
  );
  return true;
}

function pushStatusCode(err: unknown) {
  if (err && typeof err === "object" && "statusCode" in err) {
    return Number((err as { statusCode: number }).statusCode);
  }
  return 0;
}

export async function saveAdminPushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userEmail: string;
}) {
  requireDatabaseUrl();
  const endpoint = input.endpoint.trim();
  const p256dh = input.p256dh.trim();
  const auth = input.auth.trim();
  const userEmail = input.userEmail.trim().toLowerCase();
  if (!endpoint || !p256dh || !auth || !userEmail) {
    throw new Error("Geçersiz abonelik");
  }

  return prisma.adminPushSubscription.upsert({
    where: { endpoint },
    create: {
      id: `aps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      endpoint,
      p256dh,
      auth,
      userEmail,
    },
    update: {
      p256dh,
      auth,
      userEmail,
    },
  });
}

export async function deleteAdminPushSubscription(endpoint: string) {
  if (!hasDatabaseUrl()) return;
  requireDatabaseUrl();
  try {
    await prisma.adminPushSubscription.delete({ where: { endpoint } });
  } catch {
    // ignore missing
  }
}

export async function sendAdminTestPush(endpoint: string) {
  if (!configureWebPush() || !hasDatabaseUrl()) {
    throw new Error("Push yapılandırılmamış");
  }
  requireDatabaseUrl();
  const trimmed = endpoint.trim();
  const sub = await prisma.adminPushSubscription.findUnique({
    where: { endpoint: trimmed },
  });
  if (!sub) {
    throw new Error("Abonelik bulunamadı");
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify({
        title: "CimcimKids test",
        body: "Sunucu bildirimi çalışıyor. Yeni siparişte böyle gelecek.",
        url: "/admin/orders",
        orderNumber: "test",
      }),
      { urgency: "high", TTL: 60 }
    );
  } catch (err: unknown) {
    const statusCode = pushStatusCode(err);
    if (statusCode === 404 || statusCode === 410) {
      await prisma.adminPushSubscription
        .delete({ where: { id: sub.id } })
        .catch(() => null);
      throw new Error("Eski abonelik geçersiz. Bildirimleri tekrar açın.");
    }
    const body =
      err && typeof err === "object" && "body" in err
        ? String((err as { body?: unknown }).body || "")
        : "";
    throw new Error(
      body
        ? `Test bildirimi gönderilemedi (${statusCode}): ${body.slice(0, 180)}`
        : `Test bildirimi gönderilemedi (${statusCode || "hata"})`
    );
  }
}

export async function sendAdminOrderPush(order: {
  orderNumber: string;
  customerName: string;
  total: number;
}) {
  if (!configureWebPush() || !hasDatabaseUrl()) return;

  requireDatabaseUrl();
  const subs = await prisma.adminPushSubscription.findMany();
  if (subs.length === 0) return;

  const payload = JSON.stringify({
    title: "Yeni sipariş",
    body: `${order.orderNumber} · ${order.customerName}`,
    url: "/admin/orders",
    orderNumber: order.orderNumber,
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          { urgency: "high", TTL: 60 * 60 }
        );
      } catch (err: unknown) {
        const statusCode = pushStatusCode(err);
        if (statusCode === 404 || statusCode === 410) {
          await prisma.adminPushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => null);
        } else {
          console.error("[push] send failed:", err);
        }
      }
    })
  );
}
