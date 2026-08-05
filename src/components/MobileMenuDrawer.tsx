"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { X, User, HelpCircle, Truck, FileText } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { BrandName } from "./BrandName";

const mainLinks = [
  { href: "", key: "home" },
  { href: "/about", key: "about" },
  { href: "/products", key: "products" },
  { href: "/contact", key: "contact" },
] as const;

const extraLinks = [
  { href: "/faq", key: "faq", icon: HelpCircle },
  { href: "/tracking", key: "tracking", icon: Truck },
  { href: "/returns", key: "returns", icon: FileText, labelKey: "returns" as const },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MobileMenuDrawer({ open, onClose }: Props) {
  const t = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const locale = useLocale();
  const base = `/${locale}`;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close menu"
      />
      <aside className="mobile-drawer absolute bottom-0 left-0 right-0 flex max-h-[85vh] flex-col rounded-t-3xl bg-gradient-to-b from-white to-[#fff3eb] shadow-2xl">
        <div className="flex items-center justify-between border-b border-bamboo/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <BrandName className="font-serif text-lg font-extrabold tracking-tight" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-bamboo/10 hover:text-bamboo"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <nav className="space-y-1">
            {mainLinks.map(({ href, key }) => (
              <Link
                key={key}
                href={`${base}${href}`}
                onClick={onClose}
                className="mobile-menu-link block rounded-2xl px-4 py-3.5 text-base font-medium text-slate-700 active:bg-bamboo/10 active:text-bamboo"
              >
                {t(key)}
              </Link>
            ))}
          </nav>

          <div className="my-4 border-t border-bamboo/10 pt-4">
            <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {tFooter("support")}
            </p>
            {extraLinks.map((link) => {
              const { href, key, icon: Icon } = link;
              const label =
                "labelKey" in link ? tFooter(link.labelKey) : t(key);
              return (
                <Link
                  key={key}
                  href={`${base}${href}`}
                  onClick={onClose}
                  className="mobile-menu-link flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base text-slate-600 active:bg-bamboo/10 active:text-bamboo"
                >
                  <Icon className="h-5 w-5 text-bamboo" />
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="my-4 border-t border-bamboo/10 pt-4">
            <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {tFooter("legal")}
            </p>
            <Link
              href={`${base}/privacy`}
              onClick={onClose}
              className="mobile-menu-link block rounded-2xl px-4 py-3 text-sm text-slate-500"
            >
              {tFooter("privacy")}
            </Link>
            <Link
              href={`${base}/kvkk`}
              onClick={onClose}
              className="mobile-menu-link block rounded-2xl px-4 py-3 text-sm text-slate-500"
            >
              {tFooter("kvkk")}
            </Link>
          </div>

          <Link
            href={`${base}/account`}
            onClick={onClose}
            className="btn-primary mt-4 flex w-full gap-2"
          >
            <User className="h-5 w-5" />
            {t("account")}
          </Link>
        </div>

        <div className="border-t border-bamboo/10 px-5 py-4">
          <p className="mb-2 text-center text-xs text-slate-400">{t("language")}</p>
          <div className="flex justify-center">
            <LanguageSwitcher />
          </div>
        </div>
      </aside>
    </div>
  );
}
