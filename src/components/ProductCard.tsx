"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/types";
import { getProductName, getProductDesc } from "@/lib/products";
import { isUploadedProductImage } from "@/lib/image-utils";
import { getProductAges, getProductImages } from "@/lib/types";
import { useCartStore } from "@/store/cart";
import { useCartToastStore } from "@/store/cart-toast";
import { FavoriteButton } from "./FavoriteButton";
import { ProductPrice } from "./ProductPrice";
import { ProductRatingBadge } from "./ProductRatingBadge";

export function ProductCard({
  product,
  priority = false,
  rating,
}: {
  product: Product;
  priority?: boolean;
  rating?: { average: number; count: number } | null;
}) {
  const t = useTranslations("products");
  const locale = useLocale();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useCartToastStore((s) => s.show);
  const images = getProductImages(product);
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const name = getProductName(product, locale);
  const desc = getProductDesc(product, locale);
  const href = `/${locale}/products/${product.slug}`;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || images.length <= 1) return;

    const onScroll = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      const index = Math.round(el.scrollLeft / width);
      setActive(Math.min(Math.max(index, 0), images.length - 1));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [images.length]);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      productId: product.id,
      slug: product.slug,
      name,
      price: product.price,
      image: images[0] || product.image,
    });
    showToast(name);
  };

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(61,184,168,0.35)]">
      <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-cream-dark">
        <FavoriteButton product={product} variant="overlay" />
        <div
          ref={scrollerRef}
          className="flex h-full snap-x snap-mandatory overflow-x-auto scrollbar-none"
          style={{ WebkitOverflowScrolling: "touch" }}
          aria-label={name}
        >
          {images.map((src, index) => (
            <Link
              key={`${src}-${index}`}
              href={href}
              className="relative h-full w-full shrink-0 snap-center"
              tabIndex={index === active ? 0 : -1}
              draggable={false}
            >
              <Image
                src={src}
                alt={index === 0 ? name : `${name} ${index + 1}`}
                fill
                unoptimized={isUploadedProductImage(src)}
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={priority && index === 0}
                draggable={false}
              />
            </Link>
          ))}
        </div>
        {images.length > 1 && (
          <div className="pointer-events-none absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1">
            {images.map((_, index) => (
              <span
                key={index}
                className={`h-1 rounded-full transition-all ${
                  index === active ? "w-3 bg-white" : "w-1 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Link href={href} className="block min-w-0 px-3.5 pt-3.5 sm:px-4 sm:pt-4">
          <h3 className="line-clamp-2 min-h-[2.5rem] font-serif text-sm font-semibold leading-snug text-slate-800 sm:min-h-[2.75rem] sm:text-base">
            {name}
          </h3>
          <p className="mt-0.5 line-clamp-1 min-h-4 text-xs text-slate-400">
            {getProductAges(product).join(" · ") || "\u00a0"}
          </p>
          {rating && rating.count > 0 ? (
            <div className="mt-1">
              <ProductRatingBadge summary={rating} compact />
            </div>
          ) : null}
          <div className="mt-1.5 flex h-3 gap-1">
            {product.colors?.slice(0, 5).map((c) => (
              <span
                key={c.id}
                className="h-3 w-3 rounded-full border border-black/10"
                style={{ backgroundColor: c.hex }}
                title={locale === "tr" ? c.labelTr : c.labelEn}
              />
            ))}
          </div>
          <p className="mt-1 hidden line-clamp-2 min-h-[2.25rem] text-xs leading-relaxed text-slate-400 sm:block">
            {desc || "\u00a0"}
          </p>
        </Link>
        <div className="mt-auto min-w-0 px-3.5 pb-3.5 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
          <ProductPrice product={product} compact />
          <button
            onClick={handleAdd}
            className="btn-primary mt-3 w-full text-xs sm:text-sm"
            disabled={!product.inStock}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">{t("addToCart")}</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </div>
    </article>
  );
}
