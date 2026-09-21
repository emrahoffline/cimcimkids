"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { ShoppingBag, Heart } from "lucide-react";
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
    <header className="border-b border-olive/10 bg-white md:shadow-[0_1px_0_rgba(45,55,72,0.04)]">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3 sm:px-6 md:gap-8 md:py-4 lg:gap-12 lg:px-6">
        <Link href={base} className="flex shrink-0 items-center">
          <BrandName className="font-serif text-lg font-extrabold tracking-tight sm:text-xl" />
        </Link>

        <nav className="hidden items-center md:flex md:gap-1 lg:gap-2">
          {(
            [
              { href: "", key: "home" },
              { href: "/gift-cards", key: "giftCards" },
              { href: "/products", key: "products" },
              { href: "/about", key: "about" },
              { href: "/contact", key: "contact" },
            ] as const
          ).map(({ href, key }) => (
            <Link
              key={key}
              href={`${base}${href}`}
              className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-bamboo/10 hover:text-bamboo lg:px-3.5"
            >
              {t(key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-1 md:flex">
          <LanguageSwitcher />
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

        <div className="ml-auto flex items-center md:hidden">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
