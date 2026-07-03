"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const base = `/${locale}`;

  return (
    <footer className="mt-auto border-t border-olive/20 bg-olive pb-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom,0px))] text-cream md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <div className="mb-4 flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="AryaBamboo"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <p className="font-serif text-lg font-semibold">
                  Arya<span className="text-bamboo-light">Bamboo</span>
                </p>
                <p className="text-xs text-cream/70">{t("tagline")}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-bamboo-light">
              {t("shop")}
            </h4>
            <ul className="space-y-1 text-sm text-cream/80">
              <li>
                <Link href={base} className="block py-2 hover:text-white">
                  {tNav("home")}
                </Link>
              </li>
              <li>
                <Link href={`${base}/products`} className="block py-2 hover:text-white">
                  {tNav("products")}
                </Link>
              </li>
              <li>
                <Link href={`${base}/about`} className="block py-2 hover:text-white">
                  {tNav("about")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-bamboo-light">
              {t("support")}
            </h4>
            <ul className="space-y-2 text-sm text-cream/80">
              <li>
                <Link href={`${base}/contact`} className="block py-2 hover:text-white">
                  {tNav("contact")}
                </Link>
              </li>
              <li>
                <Link href={`${base}/faq`} className="block py-2 hover:text-white">
                  {tNav("faq")}
                </Link>
              </li>
              <li>
                <Link href={`${base}/tracking`} className="block py-2 hover:text-white">
                  {tNav("tracking")}
                </Link>
              </li>
              <li>
                <Link href={`${base}/returns`} className="block py-2 hover:text-white">
                  {t("returns")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-bamboo-light">
              {t("legal")}
            </h4>
            <ul className="space-y-2 text-sm text-cream/80">
              <li>
                <Link href={`${base}/privacy`} className="block py-2 hover:text-white">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href={`${base}/distance-sales`}
                  className="block py-2 hover:text-white"
                >
                  {t("distanceSales")}
                </Link>
              </li>
              <li>
                <Link href={`${base}/kvkk`} className="block py-2 hover:text-white">
                  {t("kvkk")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-cream/20 pt-6 text-center text-xs text-cream/60">
          © {new Date().getFullYear()} AryaBamboo. {t("rights")}
        </div>
      </div>
    </footer>
  );
}
