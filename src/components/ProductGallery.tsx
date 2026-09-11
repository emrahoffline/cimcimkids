"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isUploadedProductImage } from "@/lib/image-utils";

type Props = {
  images: string[];
  alt: string;
};

export function ProductGallery({ images, alt }: Props) {
  const list = images.length > 0 ? images : [];
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || list.length <= 1) return;

    const onScroll = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      const index = Math.round(el.scrollLeft / width);
      setActive(Math.min(Math.max(index, 0), list.length - 1));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [list.length]);

  const goTo = (index: number) => {
    const el = scrollerRef.current;
    const next = Math.min(Math.max(index, 0), list.length - 1);
    setActive(next);
    if (!el) return;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  if (list.length === 0) {
    return (
      <div className="aspect-square rounded-3xl bg-cream-dark" aria-hidden />
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex aspect-square snap-x snap-mandatory overflow-x-auto rounded-3xl bg-cream-dark scrollbar-none"
          style={{ WebkitOverflowScrolling: "touch" }}
          aria-label={alt}
        >
          {list.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="relative aspect-square w-full shrink-0 snap-center"
            >
              <Image
                src={src}
                alt={`${alt} ${index + 1}`}
                fill
                unoptimized={isUploadedProductImage(src)}
                className="object-cover"
                priority={index === 0}
                sizes="(max-width: 1024px) 100vw, 50vw"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-olive shadow-sm transition hover:bg-white disabled:pointer-events-none disabled:opacity-0"
              aria-label="Önceki fotoğraf"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={active === list.length - 1}
              className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-olive shadow-sm transition hover:bg-white disabled:pointer-events-none disabled:opacity-0"
              aria-label="Sonraki fotoğraf"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {list.map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === active
                      ? "w-4 bg-white"
                      : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((src, index) => (
            <button
              key={`${src}-thumb-${index}`}
              type="button"
              onClick={() => goTo(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                index === active
                  ? "border-bamboo"
                  : "border-transparent opacity-80 hover:opacity-100"
              }`}
              aria-label={`${alt} ${index + 1}`}
              aria-current={index === active}
            >
              <Image
                src={src}
                alt=""
                fill
                unoptimized={isUploadedProductImage(src)}
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
