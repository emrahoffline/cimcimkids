"use client";

const SOUND_SRC = "/sounds/cash.mp3";
const SW_URL = "/admin-sw.js";

let sharedAudio: HTMLAudioElement | null = null;
let keepaliveAudio: HTMLAudioElement | null = null;
let unlocked = false;
let swRegistered = false;
let lastPlayAt = 0;

function getSharedAudio() {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio(SOUND_SRC);
    sharedAudio.preload = "auto";
    sharedAudio.volume = 0.85;
  }
  return sharedAudio;
}

/** Near-silent loop so Chrome keeps the admin tab "audible" (less background throttle). */
function startKeepalive() {
  if (typeof window === "undefined" || keepaliveAudio) return;
  try {
    const silent =
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
    keepaliveAudio = new Audio(silent);
    keepaliveAudio.loop = true;
    keepaliveAudio.volume = 0.001;
    void keepaliveAudio.play().catch(() => {
      keepaliveAudio = null;
    });
  } catch {
    keepaliveAudio = null;
  }
}

export function unlockAdminAlertAudio() {
  if (typeof window === "undefined") return;
  unlocked = true;
  const audio = getSharedAudio();
  if (audio) {
    audio.volume = 0;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0.85;
      })
      .catch(() => {});
  }
  startKeepalive();
}

export function playOrderAlertSound() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastPlayAt < 2500) return;
  lastPlayAt = now;
  try {
    const audio = getSharedAudio();
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0.85;
    void audio.play().catch(() => {
      const fresh = new Audio(SOUND_SRC);
      fresh.volume = 0.85;
      void fresh.play().catch(() => {});
    });
  } catch {
    // ignore
  }
}

export function isIOSDevice() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOS;
}

export function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches;
  const legacy = Boolean(
    (navigator as Navigator & { standalone?: boolean }).standalone
  );
  return Boolean(mq || legacy);
}

export function isSafariBrowser() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  // Chrome/Android/CriOS/Firefox iOS also include "Safari" in UA — exclude them.
  return (
    /Safari/i.test(ua) &&
    !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\//i.test(ua)
  );
}

/** iPhone/iPad Safari needs Home Screen install for Web Push / Notification API. */
export function iosNeedsHomeScreenForNotifications() {
  return isIOSDevice() && !isStandalonePwa() && !("Notification" in window);
}

export type NotificationSupport =
  | { ok: true }
  | { ok: false; code: "insecure" | "ios-home-screen" | "unsupported" };

export function getNotificationSupport(): NotificationSupport {
  if (typeof window === "undefined") {
    return { ok: false, code: "unsupported" };
  }
  if (!window.isSecureContext) {
    return { ok: false, code: "insecure" };
  }
  if (!("Notification" in window)) {
    if (isIOSDevice()) {
      return { ok: false, code: "ios-home-screen" };
    }
    return { ok: false, code: "unsupported" };
  }
  return { ok: true };
}

function supportErrorMessage(
  code: "insecure" | "ios-home-screen" | "unsupported"
) {
  if (code === "insecure") {
    return "Bildirimler yalnızca güvenli (HTTPS) adreste çalışır.";
  }
  if (code === "ios-home-screen") {
    return "iPhone/iPad Safari: Paylaş (□↑) → Ana Ekrana Ekle → uygulamayı ana ekrandan aç → tekrar “Bildirimleri aç”a bas. Safari sekmesinde bildirim API’si kapalıdır.";
  }
  if (isSafariBrowser()) {
    return "Bu Safari sürümü bildirimleri desteklemiyor. macOS’ta güncel Safari deneyin; iPhone’da Ana Ekrana Ekle gerekir.";
  }
  return "Bu tarayıcı sistem bildirimlerini desteklemiyor. iPhone’da Safari + Ana Ekrana Ekle, Android’de Chrome deneyin.";
}

/**
 * Must run directly inside a click/tap handler — before any await —
 * otherwise mobile browsers suppress the permission dialog.
 */
export function requestNotificationPermissionNow(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return Promise.resolve("denied");
  }
  if (Notification.permission === "granted") {
    return Promise.resolve("granted");
  }
  if (Notification.permission === "denied") {
    return Promise.resolve("denied");
  }

  try {
    const maybePromise = Notification.requestPermission();
    if (
      maybePromise &&
      typeof (maybePromise as Promise<NotificationPermission>).then ===
        "function"
    ) {
      return maybePromise as Promise<NotificationPermission>;
    }
    return new Promise((resolve) => {
      // Legacy callback form (older Safari)
      (
        Notification.requestPermission as (
          cb: (p: NotificationPermission) => void
        ) => void
      )((perm) => resolve(perm));
    });
  } catch {
    return Promise.resolve(Notification.permission);
  }
}

export function showOrderSystemNotification(opts: {
  title: string;
  body: string;
  orderNumber?: string;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SHOW_ORDER_NOTIFICATION",
      title: opts.title,
      body: opts.body,
      orderNumber: opts.orderNumber || "",
      url: "/admin/orders",
    });
    return;
  }

  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      icon: "/icon-192.png",
      tag: opts.orderNumber ? `order-${opts.orderNumber}` : "order-alert",
      requireInteraction: true,
      silent: false,
    } as NotificationOptions);
    n.onclick = () => {
      window.focus();
      window.location.href = "/admin/orders";
      n.close();
    };
  } catch {
    // ignore
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function subscribePush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  if (!swRegistered) {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    swRegistered = true;
  }
  const reg = await navigator.serviceWorker.ready;

  const keyRes = await fetch("/api/admin/push");
  if (!keyRes.ok) return false;
  const { publicKey } = (await keyRes.json()) as { publicKey?: string };
  if (!publicKey) return false;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const res = await fetch("/api/admin/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  return res.ok;
}

/** Quiet re-subscribe when permission already granted (page load). */
export async function registerAdminPush(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }
  try {
    return await subscribePush();
  } catch (err) {
    console.error("[admin-push]", err);
    return false;
  }
}

export type EnableAlertsResult = {
  ok: boolean;
  message: string;
};

/**
 * Call from a button onClick only. Requests permission first (sync gesture),
 * then registers push.
 */
export async function enableAdminAlertsFromUserGesture(): Promise<EnableAlertsResult> {
  const support = getNotificationSupport();
  if (!support.ok) {
    unlockAdminAlertAudio();
    return {
      ok: false,
      message: supportErrorMessage(support.code),
    };
  }

  // Permission FIRST — before any other await — so the mobile dialog appears.
  const permissionPromise = requestNotificationPermissionNow();
  unlockAdminAlertAudio();
  const permission = await permissionPromise;

  if (permission === "denied") {
    return {
      ok: false,
      message: isIOSDevice()
        ? "Bildirim izni kapalı. Ayarlar → Safari (veya ana ekran uygulaması) → Bildirimler’i açıp sayfayı yenileyin."
        : "Bildirim izni kapalı. Safari/sistem ayarlarından site bildirimlerini açıp sayfayı yenileyin.",
    };
  }

  if (permission !== "granted") {
    if (isIOSDevice() && !isStandalonePwa()) {
      return {
        ok: false,
        message:
          "iPhone’da: Safari Paylaş → Ana Ekrana Ekle, uygulamayı ana ekrandan açıp tekrar “Bildirimleri aç”a basın.",
      };
    }
    return {
      ok: false,
      message: "Bildirim izni verilmedi. Tekrar “Bildirimleri aç”a dokunun.",
    };
  }

  try {
    const pushOk = await subscribePush();
    if (isIOSDevice() && !isStandalonePwa() && !pushOk) {
      return {
        ok: true,
        message:
          "İzin verildi. iPhone’da arka plan için: Paylaş → Ana Ekrana Ekle ile ekleyin.",
      };
    }
    return {
      ok: true,
      message: pushOk
        ? "Bildirimler açıldı. Arka planda sipariş sesi gelecek."
        : "İzin verildi. Ses bildirimleri bu sekmede çalışır.",
    };
  } catch (err) {
    console.error("[admin-push]", err);
    return {
      ok: true,
      message: "İzin verildi. Ses bildirimleri bu sekmede çalışır.",
    };
  }
}

export function listenForServiceWorkerAlerts(onAlert: () => void) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return () => {};
  }
  const handler = (event: MessageEvent) => {
    if (event.data?.type === "ORDER_ALERT") {
      onAlert();
    }
  };
  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}

export function isAdminAlertUnlocked() {
  return unlocked;
}
