"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Category } from "@/lib/types";

type Props = {
  categories: Category[];
  activeCategory?: string;
};

export function CategoryFilterBar({
  categories,
  activeCategory = "all",
}: Props) {
  const t = useTranslations("products");
  const locale = useLocale();

  const buttons = [
    { key: "all", label: t("all"), href: `/${locale}/products` },
    ...categories.map((c) => ({
      key: c.slug,
      label: locale === "tr" ? c.nameTr : c.nameEn,
      href: `/${locale}/kategori/${c.slug}`,
    })),
  ];

  return (
    <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mb-8 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
      {buttons.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition ${
            activeCategory === c.key
              ? "bg-bamboo text-white"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {c.label}
        </Link>
      ))}
    </div>
  );
}
