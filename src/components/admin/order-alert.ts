"use client";

const SOUND_SRC = "/sounds/cash.mp3";
const SW_URL = "/admin-sw.js?v=20260820";
/** VAPID public key is not a secret — kept as fallback so Android can subscribe
 * even if GET /api/admin/push is blocked (Cloudflare/401). Must match the server private key. */
const FALLBACK_VAPID_PUBLIC_KEY =
  "BHhxNhDMpw93WfFd74FkZksWjQbNraLQ2XRQy4pLfqzSNV5AJX3s1gJn_fxbKf25-fySy187da9wWlbi1wUo7RY";

let sharedAudio: HTMLAudioElement | null = null;
let keepaliveAudio: HTMLAudioElement | null = null;
let unlocked = false;
let lastPlayAt = 0;
let cachedVapidKey = "";
let swRegisterPromise: Promise<ServiceWorkerRegistration> | null = null;

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

export function isAndroidDevice() {
  if (typeof window === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isInAppBrowser() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /FBAN|FBAV|Instagram|Line\/|Twitter|WhatsApp|wv\)|; wv/i.test(ua);
}

/** iPhone/iPad Safari needs Home Screen install for Web Push / Notification API. */
export function iosNeedsHomeScreenForNotifications() {
  return isIOSDevice() && !isStandalonePwa() && !("Notification" in window);
}

export type NotificationSupport =
  | { ok: true }
  | {
      ok: false;
      code: "insecure" | "ios-home-screen" | "in-app" | "unsupported";
    };

export function getNotificationSupport(): NotificationSupport {
  if (typeof window === "undefined") {
    return { ok: false, code: "unsupported" };
  }
  if (!window.isSecureContext) {
    return { ok: false, code: "insecure" };
  }
  if (isInAppBrowser()) {
    return { ok: false, code: "in-app" };
  }
  if (!("Notification" in window)) {
    if (isIOSDevice()) {
      return { ok: false, code: "ios-home-screen" };
    }
    return { ok: false, code: "unsupported" };
  }
  return { ok: true };
}

function deniedPermissionMessage() {
  if (isIOSDevice()) {
    return "Bildirim izni kapalı. Ayarlar → Safari (veya Ana Ekran uygulaması) → Bildirimler’i açıp sayfayı yenileyin.";
  }
  if (isAndroidDevice()) {
    return "Bildirim izni kapalı. Chrome’da adres çubuğundaki kilit → İzinler → Bildirimler → İzin ver. Ayrıca telefon Ayarları → Uygulamalar → Chrome → Bildirimler açık olsun. Sonra sayfayı yenileyin.";
  }
  return "Bildirim izni kapalı. Tarayıcıda site ayarlarından bildirimlere izin verip sayfayı yenileyin.";
}

function supportErrorMessage(
  code: "insecure" | "ios-home-screen" | "in-app" | "unsupported"
) {
  if (code === "insecure") {
    return "Bildirimler yalnızca güvenli (HTTPS) adreste çalışır.";
  }
  if (code === "in-app") {
    return "Instagram/Facebook içindeki tarayıcı bildirim açamaz. Chrome veya Samsung Internet ile https://www.cimcimkids.com/admin açın.";
  }
  if (code === "ios-home-screen") {
    return "iPhone/iPad Safari: Paylaş (□↑) → Ana Ekrana Ekle → uygulamayı ana ekrandan aç → tekrar “Bildirimleri aç”a bas. Safari sekmesinde bildirim API’si kapalıdır.";
  }
  if (isSafariBrowser()) {
    return "Bu Safari sürümü bildirimleri desteklemiyor. macOS’ta güncel Safari deneyin; iPhone’da Ana Ekrana Ekle gerekir.";
  }
  if (isAndroidDevice()) {
    return "Bu tarayıcı bildirimleri desteklemiyor. Android’de Chrome ile https://www.cimcimkids.com/admin açın.";
  }
  return "Bu tarayıcı sistem bildirimlerini desteklemiyor. Android’de Chrome, iPhone’da Safari + Ana Ekrana Ekle deneyin.";
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

function subscribeErrorMessage(err: unknown) {
  const raw =
    err instanceof Error
      ? `${err.name}: ${err.message}`
      : typeof err === "string"
        ? err
        : "Bilinmeyen hata";
  const text = raw.toLowerCase();
  if (text.includes("push service error") || text.includes("registration failed")) {
    return "Chrome push servisi yanıt vermedi. Google Play Hizmetleri’ni güncelleyip Wi-Fi/mobil veriyi açın, sonra tekrar deneyin.";
  }
  if (text.includes("aborted") || text.includes("not allowed")) {
    return "Tarayıcı aboneliği reddetti. Site bildirim izninin “İzin ver” olduğundan emin olup sayfayı tam yenileyin.";
  }
  return `Push kaydı başarısız: ${raw}`;
}

async function readApiError(res: Response): Promise<string> {
  const text = await res.text();
  if (text.includes("Just a moment") || /cf-mitigated|challenge-platform/i.test(text)) {
    return "Cloudflare isteği kesti. https://www.cimcimkids.com/admin adresini Chrome’da tam yenileyip tekrar deneyin.";
  }
  try {
    const json = JSON.parse(text) as { error?: string };
    if (json.error) return json.error;
  } catch {
    // not JSON
  }
  if (res.status === 401) {
    return "Oturum düşmüş. Çıkış yapıp /admin/login ile tekrar giriş yapın, sonra “Bildirimleri aç”a basın.";
  }
  if (res.status === 503) {
    return "Sunucuda push anahtarı yok. Daha sonra tekrar deneyin.";
  }
  return `Sunucu kaydı başarısız (HTTP ${res.status}).`;
}

function vapidPublicKeySync() {
  if (cachedVapidKey) return cachedVapidKey;
  cachedVapidKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || FALLBACK_VAPID_PUBLIC_KEY;
  return cachedVapidKey;
}

async function loadVapidPublicKey(): Promise<string> {
  const fallback = vapidPublicKeySync();
  try {
    const keyRes = await fetch("/api/admin/push", { credentials: "include" });
    if (keyRes.ok) {
      const json = (await keyRes.json()) as { publicKey?: string };
      if (json.publicKey?.trim()) {
        cachedVapidKey = json.publicKey.trim();
        return cachedVapidKey;
      }
    }
  } catch {
    // bundled public key is enough to subscribe
  }
  return fallback;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker yok");
  }
  if (!swRegisterPromise) {
    swRegisterPromise = navigator.serviceWorker.register(SW_URL, {
      scope: "/",
      updateViaCache: "none",
    });
  }
  const reg = await swRegisterPromise;
  if (reg.waiting) {
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
  }
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => {
      const onChange = () => {
        navigator.serviceWorker.removeEventListener("controllerchange", onChange);
        resolve();
      };
      navigator.serviceWorker.addEventListener("controllerchange", onChange);
      window.setTimeout(resolve, 2500);
    });
  }
  return navigator.serviceWorker.ready;
}

export type SubscribeResult = { ok: true } | { ok: false; message: string };

async function subscribePush(): Promise<SubscribeResult> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return {
      ok: false,
      message: isAndroidDevice()
        ? "Bu tarayıcı Web Push desteklemiyor. Android Chrome ile https://www.cimcimkids.com/admin açın."
        : "Bu tarayıcı arka plan push desteklemiyor.",
    };
  }

  let reg: ServiceWorkerRegistration;
  try {
    reg = await ensureServiceWorker();
  } catch (err) {
    return { ok: false, message: subscribeErrorMessage(err) };
  }

  const publicKey = vapidPublicKeySync();
  const applicationServerKey = urlBase64ToUint8Array(publicKey);

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    } catch (firstErr) {
      // Stale subscription with a different VAPID key — permission is already
      // granted at this point, so a second subscribe still works on Android.
      try {
        const stale = await reg.pushManager.getSubscription();
        if (stale) await stale.unsubscribe();
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } catch {
        return { ok: false, message: subscribeErrorMessage(firstErr) };
      }
    }
  }

  const res = await fetch("/api/admin/push", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  if (!res.ok) {
    return { ok: false, message: await readApiError(res) };
  }

  return { ok: true };
}

/** Register SW + prefetch VAPID so the tap handler has less work. */
export function prefetchAdminPush() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  void ensureServiceWorker().catch((err) => {
    console.error("[admin-push] sw", err);
  });
  void loadVapidPublicKey().catch(() => {});
}

/** Quiet re-subscribe when permission already granted (page load). */
export async function registerAdminPush(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }
  try {
    const result = await subscribePush();
    return result.ok;
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
 * Must be called synchronously from a click/tap. Chrome Android shows the
 * permission dialog from PushManager.subscribe(userVisibleOnly) more reliably
 * than from Notification.requestPermission() after an await.
 */
export function startSubscribeFromGesture(): Promise<SubscribeResult> {
  vapidPublicKeySync();
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator && !swRegisterPromise) {
    swRegisterPromise = navigator.serviceWorker.register(SW_URL, {
      scope: "/",
      updateViaCache: "none",
    });
  }
  return subscribePush();
}

/**
 * Call from a button onClick only. Requests permission and starts push
 * subscribe in the same tap — do not await permission before subscribe.
 */
export async function enableAdminAlertsFromUserGesture(
  permissionPromise?: Promise<NotificationPermission>,
  subscribePromise?: Promise<SubscribeResult>
): Promise<EnableAlertsResult> {
  const support = getNotificationSupport();
  if (!support.ok) {
    unlockAdminAlertAudio();
    return {
      ok: false,
      message: supportErrorMessage(support.code),
    };
  }

  const pending = permissionPromise ?? requestNotificationPermissionNow();
  const subscribeStarted = subscribePromise ?? startSubscribeFromGesture();
  unlockAdminAlertAudio();

  const [permission, result] = await Promise.all([
    pending,
    subscribeStarted.catch((err): SubscribeResult => ({
      ok: false,
      message: subscribeErrorMessage(err),
    })),
  ]);

  if (result.ok) {
    return {
      ok: true,
      message:
        "Bildirimler kaydedildi. Yeni siparişte kilit ekranı bildirimi gelecek.",
    };
  }

  if (permission === "denied") {
    return {
      ok: false,
      message: deniedPermissionMessage(),
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
      message:
        result.message ||
        "Chrome izin penceresi açılmadı. Adres çubuğundaki kilit → İzinler → Bildirimler → İzin ver, sonra tekrar dokunun.",
    };
  }

  if (isIOSDevice() && !isStandalonePwa()) {
    return {
      ok: false,
      message: `${result.message} iPhone’da arka plan için: Paylaş → Ana Ekrana Ekle.`,
    };
  }
  return { ok: false, message: result.message };
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
