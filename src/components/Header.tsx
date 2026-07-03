"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { ShoppingBag, User, Heart } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const items = useCartStore((s) => s.items);
  const favCount = useFavoritesStore((s) => s.items.length);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const base = `/${locale}`;

  return (
    <header className="sticky top-0 z-40 border-b border-olive/10 bg-cream/95 backdrop-blur-md safe-top">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        <Link href={base} className="flex min-w-0 shrink items-center gap-2">
          <Image
            src="/logo.png"
            alt="AryaBamboo"
            width={48}
            height={48}
            className="h-9 w-9 rounded-full object-cover sm:h-12 sm:w-12"
          />
          <span className="truncate font-serif text-base font-semibold text-olive sm:text-lg">
            Arya<span className="text-bamboo">Bamboo</span>
          </span>
        </Link>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex md:gap-3">
          <nav className="mr-4 flex items-center gap-6">
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
                className="text-sm font-medium text-olive/80 transition hover:text-olive"
              >
                {t(key)}
              </Link>
            ))}
          </nav>
          <LanguageSwitcher />
          <Link
            href={`${base}/account`}
            className="rounded-full p-2 text-olive transition hover:bg-olive/10"
            aria-label={t("account")}
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            href={`${base}/favorites`}
            className="relative rounded-full p-2 text-olive transition hover:bg-olive/10"
            aria-label={t("favorites")}
          >
            <Heart className="h-5 w-5" />
            {favCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {favCount}
              </span>
            )}
          </Link>
          <Link
            href={`${base}/cart`}
            className="relative rounded-full p-2 text-olive transition hover:bg-olive/10"
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
