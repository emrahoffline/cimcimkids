"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split("/");
    if (routing.locales.includes(segments[1] as "tr" | "en")) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    router.push(segments.join("/") || `/${newLocale}`);
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-bamboo/20 bg-white/80 p-0.5 text-xs font-medium">
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`rounded-full px-2.5 py-1 uppercase transition ${
            locale === l
              ? "bg-bamboo text-white"
              : "text-slate-500 hover:text-bamboo"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
