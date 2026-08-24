"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Story } from "@/lib/types";
import { StoryViewer } from "./StoryViewer";
import { StoryThumb } from "./StoryThumb";

const SEEN_KEY = "cimcim-stories-seen-v1";

function readSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

type Props = {
  stories: Story[];
};

export function StoriesRail({ stories }: Props) {
  const t = useTranslations("home");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSeen(readSeen());
  }, []);

  const markSeen = useCallback((id: string) => {
    setSeen((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      window.localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const countedAt = useRef(new Map<string, number>());

  const recordView = useCallback((id: string) => {
    const now = Date.now();
    const last = countedAt.current.get(id) ?? 0;
    if (now - last < 2000) return;
    countedAt.current.set(id, now);
    void fetch(`/api/stories/${encodeURIComponent(id)}/view`, {
      method: "POST",
    }).catch(() => undefined);
  }, []);

  const handleViewed = useCallback(
    (id: string) => {
      markSeen(id);
      recordView(id);
    },
    [markSeen, recordView]
  );

  const closeViewer = useCallback(() => {
    setOpenIndex(null);
    const stop = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("click", stop, true);
    window.setTimeout(() => {
      document.removeEventListener("click", stop, true);
    }, 400);
  }, []);

  const items = useMemo(
    () => stories.filter((story) => story.active && story.mediaUrl),
    [stories]
  );

  if (items.length === 0) return null;

  return (
    <>
      <section className="border-b border-olive/10 bg-white/70" aria-label={t("stories")}>
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 py-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-start gap-4">
            {items.map((story, index) => {
              const viewed = seen.has(story.id);
              return (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => setOpenIndex(index)}
                  className="flex w-[76px] shrink-0 flex-col items-center gap-1.5"
                  aria-label={story.title || t("stories")}
                >
                  <span
                    className={`rounded-full p-[2.5px] ${
                      viewed
                        ? "bg-slate-300"
                        : "bg-[conic-gradient(from_180deg,#ff8a65,#3db8a8,#6ec1e4,#ff8a65)]"
                    }`}
                  >
                    <span className="block rounded-full bg-white p-[2px]">
                      <StoryThumb story={story} className="h-16 w-16" />
                    </span>
                  </span>
                  <span className="w-full truncate text-center text-[11px] font-medium text-slate-600">
                    {story.title || t("stories")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {openIndex !== null ? (
        <StoryViewer
          key={openIndex}
          stories={items}
          startIndex={openIndex}
          onClose={closeViewer}
          onViewed={handleViewed}
          closeLabel={t("storiesClose")}
        />
      ) : null}
    </>
  );
}
