"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Product } from "@/lib/types";
import { useFavoritesStore } from "@/store/favorites";

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Props = {
  product: Product;
  variant?: "icon" | "overlay";
  className?: string;
};

export function FavoriteButton({
  product,
  variant = "icon",
  className,
}: Props) {
  const t = useTranslations("favorites");
  const items = useFavoritesStore((s) => s.items);
  const toggle = useFavoritesStore((s) => s.toggle);
  const active = items.some((i) => i.id === product.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle({
      id: product.id,
      slug: product.slug,
      image: product.image,
      price: product.price,
      translationKey: product.translationKey ?? product.id,
    });
  };

  if (variant === "overlay") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={active ? t("remove") : t("add")}
        className={cn(
          "absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-110",
          className
        )}
      >
        <Heart
          className={cn(
            "h-4 w-4 transition",
            active && "fill-red-500 text-red-500",
            !active && "text-olive/70"
          )}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? t("remove") : t("add")}
      aria-pressed={active}
      className={cn(
        "rounded-full p-2 transition hover:bg-olive/10",
        className
      )}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition",
          active && "fill-red-500 text-red-500",
          !active && "text-olive"
        )}
      />
    </button>
  );
}
