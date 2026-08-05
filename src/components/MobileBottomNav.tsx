"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Home, Grid3X3, Heart, ShoppingBag, Menu } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";

type Props = {
  onMenuOpen: () => void;
};

export function MobileBottomNav({ onMenuOpen }: Props) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const base = `/${locale}`;
  const cartCount = useCartStore((s) =>
    s.items.reduce((n, i) => n + i.quantity, 0)
  );
  const favCount = useFavoritesStore((s) => s.items.length);

  const links = [
    { href: base, key: "home", icon: Home, label: t("home") },
    {
      href: `${base}/products`,
      key: "products",
      icon: Grid3X3,
      label: t("products"),
    },
    {
      href: `${base}/favorites`,
      key: "favorites",
      icon: Heart,
      label: t("favorites"),
      badge: favCount,
    },
    {
      href: `${base}/cart`,
      key: "cart",
      icon: ShoppingBag,
      label: t("cart"),
      badge: cartCount,
    },
  ] as const;

  const isActive = (href: string) => {
    if (href === base) return pathname === base || pathname === `${base}/`;
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t border-bamboo/15 bg-gradient-to-t from-[#fff3eb] to-white/95 backdrop-blur-xl md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {links.map((link) => {
          const { href, key, icon: Icon, label } = link;
          const badge = "badge" in link ? link.badge : 0;
          const active = isActive(href);
          return (
            <Link
              key={key}
              href={href}
              className={`mobile-nav-item flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition ${
                active ? "text-bamboo" : "text-slate-400"
              }`}
            >
              <span
                className={`relative flex h-9 w-9 items-center justify-center rounded-2xl transition ${
                  active ? "bg-bamboo/15" : ""
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""} ${
                    key === "favorites" && active
                      ? "fill-bamboo text-bamboo"
                      : ""
                  }`}
                />
                {badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bamboo px-1 text-[10px] font-bold text-white shadow-sm">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              <span className="max-w-[4.5rem] truncate text-[10px] font-semibold leading-tight">
                {label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMenuOpen}
          className="mobile-nav-item flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-slate-400 transition active:text-bamboo"
          aria-label={t("menu")}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl">
            <Menu className="h-5 w-5" />
          </span>
          <span className="text-[10px] font-semibold">{t("menu")}</span>
        </button>
      </div>
    </nav>
  );
}
