"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useFavoritesStore } from "@/store/favorites";
import { useCartStore } from "@/store/cart";
import { useCartToastStore } from "@/store/cart-toast";
import { formatPrice } from "@/lib/products";
import type { Product } from "@/lib/types";
import { getProductAges } from "@/lib/types";
import { commitProductToCart } from "@/components/AddToCartButton";
import { AddToCartSizeSheet } from "@/components/AddToCartSizeSheet";

function FavoritesAddButton({
  itemId,
  fallback,
}: {
  itemId: string;
  fallback: {
    slug: string;
    name: string;
    price: number;
    image: string;
  };
}) {
  const tProducts = useTranslations("products");
  const locale = useLocale();
  const [product, setProduct] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const addFallback = () => {
    useCartStore.getState().addItem({
      productId: itemId,
      slug: fallback.slug,
      name: fallback.name,
      price: fallback.price,
      image: fallback.image,
    });
    useCartToastStore.getState().show(fallback.name);
  };

  const handleClick = async () => {
    if (loading) return;
    if (product) {
      if (getProductAges(product).length > 0) {
        setOpen(true);
        return;
      }
      commitProductToCart(
        product,
        fallback.name,
        locale,
        null,
        product.colors?.[0] ?? null
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const list = (await res.json()) as Product[];
      const found = Array.isArray(list)
        ? list.find((row) => row.id === itemId)
        : undefined;
      if (!found) {
        addFallback();
        return;
      }
      setProduct(found);
      if (getProductAges(found).length > 0) {
        setOpen(true);
        return;
      }
      commitProductToCart(
        found,
        fallback.name,
        locale,
        null,
        found.colors?.[0] ?? null
      );
    } catch {
      addFallback();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="btn-primary text-sm"
        disabled={loading}
      >
        <ShoppingBag className="h-4 w-4" />
        {tProducts("addToCart")}
      </button>
      {product ? (
        <AddToCartSizeSheet
          product={product}
          open={open}
          onClose={() => setOpen(false)}
          onPick={(age, color) => {
            commitProductToCart(product, fallback.name, locale, age, color);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

export default function FavoritesPage() {
  const t = useTranslations("favorites");
  const tItem = useTranslations("productItems");
  const locale = useLocale();
  const { items, remove } = useFavoritesStore();
  const base = `/${locale}`;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Heart className="mx-auto mb-4 h-12 w-12 text-bamboo/40" />
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="mt-4 text-slate-500">{t("empty")}</p>
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
              className="flex gap-4 rounded-3xl border border-bamboo/10 bg-white p-4 shadow-sm"
            >
              <Link
                href={`${base}/products/${item.slug}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-cream-dark"
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
                    className="font-medium text-slate-800 hover:text-bamboo"
                  >
                    {name}
                  </Link>
                  <p className="font-semibold text-bamboo">
                    {formatPrice(Math.round(item.price), locale)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => remove(item.id)}
                    className="flex items-center gap-1 rounded-full border border-bamboo/20 px-3 py-2 text-sm text-slate-500 transition hover:border-red-300 hover:text-red-500"
                    aria-label={t("remove")}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("remove")}</span>
                  </button>
                  <FavoritesAddButton
                    itemId={item.id}
                    fallback={{
                      slug: item.slug,
                      name,
                      price: item.price,
                      image: item.image,
                    }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
