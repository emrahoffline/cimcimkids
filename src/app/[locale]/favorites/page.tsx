"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useFavoritesStore } from "@/store/favorites";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/products";

export default function FavoritesPage() {
  const t = useTranslations("favorites");
  const tProducts = useTranslations("products");
  const tItem = useTranslations("productItems");
  const locale = useLocale();
  const { items, remove } = useFavoritesStore();
  const addItem = useCartStore((s) => s.addItem);
  const base = `/${locale}`;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Heart className="mx-auto mb-4 h-12 w-12 text-olive/30" />
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="mt-4 text-olive/60">{t("empty")}</p>
        <Link href={`${base}/products`} className="btn-primary mt-8 inline-flex">
          {t("browse")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="page-title">{t("title")}</h1>
      <p className="page-subtitle mb-8">{t("subtitle")}</p>
      <ul className="space-y-4">
        {items.map((item) => {
          const name = tItem(`${item.translationKey}.name`);
          return (
            <li
              key={item.id}
              className="flex gap-4 rounded-xl border border-olive/10 bg-white p-4"
            >
              <Link
                href={`${base}/products/${item.slug}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg"
              >
                <Image
                  src={item.image}
                  alt={name}
                  fill
                  className="object-cover"
                />
              </Link>
              <div className="flex flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <Link
                    href={`${base}/products/${item.slug}`}
                    className="font-medium text-olive hover:underline"
                  >
                    {name}
                  </Link>
                  <p className="text-bamboo">
                    {formatPrice(item.price, locale)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => remove(item.id)}
                    className="flex items-center gap-1 rounded-lg border border-olive/20 px-3 py-2 text-sm text-olive/70 transition hover:border-red-300 hover:text-red-600"
                    aria-label={t("remove")}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("remove")}</span>
                  </button>
                  <button
                    onClick={() =>
                      addItem({
                        id: item.id,
                        slug: item.slug,
                        name,
                        price: item.price,
                        image: item.image,
                      })
                    }
                    className="btn-primary text-sm"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {tProducts("addToCart")}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
