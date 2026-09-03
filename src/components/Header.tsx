"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { ShoppingBag, User, Heart } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";
import { BrandName } from "./BrandName";

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const items = useCartStore((s) => s.items);
  const favCount = useFavoritesStore((s) => s.items.length);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const base = `/${locale}`;

  return (
    <header className="sticky top-0 z-40 border-b border-olive/10 bg-cream/85 backdrop-blur-xl safe-top">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <Link href={base} className="flex min-w-0 shrink items-center">
          <BrandName className="truncate font-serif text-lg font-extrabold tracking-tight sm:text-xl" />
        </Link>

        {/* Desktop actions */}
        <div className="hidden items-center gap-1 md:flex md:gap-2">
          <nav className="mr-3 flex items-center gap-1">
            {(
              [
                { href: "", key: "home" },
                { href: "/about", key: "about" },
                { href: "/products", key: "products" },
                { href: "/contact", key: "contact" },
              ] as const
            ).map(({ href, key }) => (
              <Link
                key={key}
                href={`${base}${href}`}
                className="rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-bamboo/10 hover:text-bamboo"
              >
                {t(key)}
              </Link>
            ))}
          </nav>
          <LanguageSwitcher />
          <Link
            href={`${base}/account`}
            className="rounded-full p-2 text-slate-600 transition hover:bg-bamboo/10 hover:text-bamboo"
            aria-label={t("account")}
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            href={`${base}/favorites`}
            className="relative rounded-full p-2 text-slate-600 transition hover:bg-bamboo/10 hover:text-bamboo"
            aria-label={t("favorites")}
          >
            <Heart className="h-5 w-5" />
            {favCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-bamboo text-[10px] font-bold text-white">
                {favCount}
              </span>
            )}
          </Link>
          <Link
            href={`${base}/cart`}
            className="relative rounded-full p-2 text-slate-600 transition hover:bg-bamboo/10 hover:text-bamboo"
            aria-label={t("cart")}
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-bamboo text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
        </div>

        {/* Mobile: language only */}
        <div className="flex items-center md:hidden">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
