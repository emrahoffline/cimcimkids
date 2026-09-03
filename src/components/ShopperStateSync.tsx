"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";

export function ShopperStateSync() {
  const { data: session, status } = useSession();
  const cartItems = useCartStore((s) => s.items);
  const favoriteItems = useFavoritesStore((s) => s.items);
  const lastSent = useRef("");

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;

    const payload = JSON.stringify({
      cart: cartItems,
      favorites: favoriteItems,
    });
    if (payload === lastSent.current) return;

    const id = window.setTimeout(() => {
      lastSent.current = payload;
      fetch("/api/shopper/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).catch(() => undefined);
    }, 800);

    return () => window.clearTimeout(id);
  }, [status, session?.user?.email, cartItems, favoriteItems]);

  return null;
}
