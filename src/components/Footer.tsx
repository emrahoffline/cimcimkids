"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Instagram, ShoppingBag, Facebook } from "lucide-react";
import { BrandName } from "./BrandName";
import { STORE_CONFIG } from "@/lib/store-config";
import { PaymentLogos } from "./PaymentLogos";

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tHome = useTranslations("home");
  const locale = useLocale();
  const base = `/${locale}`;

  return (
    <footer className="mt-auto border-t border-bamboo/15 bg-gradient-to-br from-[#fff3eb] via-[#ffe8dc] to-[#ffd9c8] pb-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom,0px))] text-slate-700 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <div className="mb-4">
              <BrandName className="font-serif text-lg font-extrabold tracking-tight" />
              <p className="mt-1 text-xs text-slate-500">{t("tagline")}</p>
              <div className="mt-3 flex flex-col gap-2">
                <a
                  href={STORE_CONFIG.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-olive"
                  aria-label={t("followInstagram")}
                >
                  <Instagram className="h-4 w-4" />
                  {STORE_CONFIG.instagramHandle}
                </a>
                <a
                  href={STORE_CONFIG.trendyolUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-olive"
                  aria-label={t("visitTrendyol")}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {t("trendyol")}
                </a>
                <a
                  href={STORE_CONFIG.hepsiburadaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-olive"
                  aria-label={t("visitHepsiburada")}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {t("hepsiburada")}
                </a>
                <a
                  href={STORE_CONFIG.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-olive"
                  aria-label={t("visitFacebook")}
                >
                  <Facebook className="h-4 w-4" />
                  {t("facebook")}
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t("shop")}
            </h4>
            <ul className="space-y-1 text-sm text-slate-600">
              <li>
                <Link href={base} className="block py-2 hover:text-olive">
                  {tNav("home")}
                </Link>
              </li>
              <li>
                <Link href={`${base}/products`} className="block py-2 hover:text-olive">
                  {tNav("products")}
                </Link>
              </li>
              <li>
                <Link
                  href={`${base}/kategori/girls`}
                  className="block py-2 hover:text-olive"
                >
                  {t("categoryGirls")}
                </Link>
              </li>
              <li>
                <Link
                  href={`${base}/kategori/boys`}
                  className="block py-2 hover:text-olive"
                >
                  {t("categoryBoys")}
                </Link>
              </li>
              <li>
                <Link
                  href={`${base}/kategori/baby`}
                  className="block py-2 hover:text-olive"
                >
                  {t("categoryBaby")}
                </Link>
              </li>
              <li>
                <Link href={`${base}/about`} className="block py-2 hover:text-olive">
                  {tHome("learnMore")}
                </Link>
              </li>
              <li>
                <Link href={`${base}/gift-cards`} className="block py-2 hover:text-olive">
                  {tNav("giftCards")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t("support")}
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link href={`${base}/contact`} className="block py-2 hover:text-olive">
                  {tNav("contact")}
                </Link>
              </li>
              <li>
                <Link href={`${base}/faq`} className="block py-2 hover:text-olive">
                  {tNav("faq")}
                </Link>
              </li>
              <li>
                <Link href={`${base}/tracking`} className="block py-2 hover:text-olive">
                  {tNav("tracking")}
                </Link>
              </li>
              <li>
                <Link href={`${base}/returns`} className="block py-2 hover:text-olive">
                  {t("returns")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t("legal")}
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link href={`${base}/privacy`} className="block py-2 hover:text-olive">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href={`${base}/distance-sales`}
                  className="block py-2 hover:text-olive"
                >
                  {t("distanceSales")}
                </Link>
              </li>
              <li>
                <Link href={`${base}/kvkk`} className="block py-2 hover:text-olive">
                  {t("kvkk")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-bamboo/20 pt-6">
          <div className="mb-4 flex justify-center">
            <PaymentLogos compact />
          </div>
          <p className="text-center text-xs text-slate-400">
            © {new Date().getFullYear()} CimcimKids. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
