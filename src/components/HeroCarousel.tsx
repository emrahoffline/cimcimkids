"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isUploadedProductImage } from "@/lib/image-utils";

export type HeroCarouselSlide = {
  id: string;
  imageUrl: string;
  alt: string;
};

const AUTO_MS = 5500;

type Props = {
  slides: HeroCarouselSlide[];
};

export function HeroCarousel({ slides }: Props) {
  const list =
    slides.length > 0
      ? slides
      : [
          {
            id: "fallback",
            imageUrl: "/images/hero1.png",
            alt: "CimcimKids",
          },
        ];

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((index: number, smooth = true) => {
    const el = scrollerRef.current;
    const next = ((index % list.length) + list.length) % list.length;
    setActive(next);
    if (!el) return;
    el.scrollTo({
      left: next * el.clientWidth,
      behavior: smooth ? "smooth" : "auto",
    });
  }, [list.length]);

  const pauseAuto = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 10000);
  }, []);

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

  useEffect(() => {
    if (list.length <= 1 || paused) return;
    const id = setInterval(() => {
      goTo(active + 1);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [active, goTo, list.length, paused]);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  useEffect(() => {
    const onResize = () => goTo(active, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, goTo]);

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none"
        style={{ WebkitOverflowScrolling: "touch" }}
        aria-roledescription="carousel"
        aria-label="Ana sayfa görselleri"
      >
        {list.map((slide, index) => (
          <div
            key={slide.id}
            className="relative w-full shrink-0 snap-center"
            aria-hidden={index !== active}
          >
            <Image
              src={slide.imageUrl}
              alt={slide.alt}
              width={1536}
              height={1024}
              priority={index === 0}
              unoptimized={isUploadedProductImage(slide.imageUrl)}
              className="h-auto w-full object-cover object-center"
              sizes="100vw"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {list.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => {
              pauseAuto();
              goTo(active - 1);
            }}
            className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white sm:left-4 sm:h-11 sm:w-11"
            aria-label="Önceki görsel"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              pauseAuto();
              goTo(active + 1);
            }}
            className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white sm:right-4 sm:h-11 sm:w-11"
            aria-label="Sonraki görsel"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-2 sm:bottom-4">
            {list.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => {
                  pauseAuto();
                  goTo(index);
                }}
                className={`h-2 rounded-full transition-all ${
                  index === active
                    ? "w-6 bg-white shadow"
                    : "w-2 bg-white/55 hover:bg-white/80"
                }`}
                aria-label={`Görsel ${index + 1}`}
                aria-current={index === active}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
