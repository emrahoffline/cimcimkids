"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";
import {
  isValidShopperEmail,
  readRememberedShopperEmail,
  rememberShopperEmail,
} from "@/lib/shopper";

function visitorId() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("ab_vid") ?? "";
  } catch {
    return "";
  }
}

function payloadEmail(sessionEmail?: string | null) {
  const fromSession = sessionEmail?.trim().toLowerCase() ?? "";
  if (isValidShopperEmail(fromSession)) return fromSession;
  return readRememberedShopperEmail();
}

export function ShopperSync() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const cartItems = useCartStore((s) => s.items);
  const favoriteItems = useFavoritesStore((s) => s.items);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBody = useRef("");
  const [, rerender] = useState(0);

  useEffect(() => {
    const onEmail = () => {
      rerender((n) => n + 1);
    };
    window.addEventListener("cimcim-shopper-email", onEmail);
    return () => window.removeEventListener("cimcim-shopper-email", onEmail);
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const email = payloadEmail(session?.user?.email);
    if (session?.user?.email && email) rememberShopperEmail(email);
    if (!email) return;

    const body = JSON.stringify({
      email,
      visitorId: visitorId() || undefined,
      cart: cartItems.map((i) => ({
        id: i.id,
        productId: i.productId || i.id,
        slug: i.slug,
        name: i.name,
        image: i.image,
        price: i.price,
        quantity: i.quantity,
        colorLabel: i.colorLabel,
        ageLabel: i.ageLabel,
      })),
      favorites: favoriteItems.map((i) => ({
        id: i.id,
        slug: i.slug,
        image: i.image,
        price: i.price,
        translationKey: i.translationKey,
      })),
    });
    if (body === lastBody.current) return;
    lastBody.current = body;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const send = () => {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            "/api/shopper",
            new Blob([body], { type: "application/json" })
          );
          return;
        }
        fetch("/api/shopper", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => undefined);
      };
      send();
    }, 700);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pathname, session?.user?.email, cartItems, favoriteItems]);

  return null;
}
