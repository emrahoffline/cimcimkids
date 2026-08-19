"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { routing } from "@/i18n/routing";

function hrefForLocale(pathname: string, newLocale: string) {
  const segments = pathname.split("/");
  if (routing.locales.includes(segments[1] as "tr" | "en")) {
    segments[1] = newLocale;
  } else {
    segments.splice(1, 0, newLocale);
  }
  return segments.join("/") || `/${newLocale}`;
}

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 rounded-full border border-bamboo/20 bg-white/80 p-0.5 text-xs font-medium">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={hrefForLocale(pathname, l)}
          hrefLang={l}
          aria-current={locale === l ? "page" : undefined}
          className={`rounded-full px-2.5 py-1 uppercase transition ${
            locale === l
              ? "bg-bamboo text-white"
              : "text-slate-500 hover:text-bamboo"
          }`}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
