"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { StoryGroup, StoryItem } from "@/lib/stories";
import { isStoryVideo } from "@/lib/stories";

type Props = {
  groups: StoryGroup[];
  startGroupId: string;
  onClose: () => void;
};

export function StoryViewer({ groups, startGroupId, onClose }: Props) {
  const startIndex = Math.max(
    0,
    groups.findIndex((g) => g.id === startGroupId)
  );
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [itemIndex, setItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewed = useRef(new Set<string>());

  const group = groups[groupIndex];
  const item: StoryItem | undefined = group?.items[itemIndex];

  const markViewed = useCallback((story: StoryItem) => {
    if (viewed.current.has(story.id)) return;
    viewed.current.add(story.id);
    fetch("/api/stories/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: story.id }),
    }).catch(() => undefined);
  }, []);

  const goNext = useCallback(() => {
    if (!group) return;
    if (itemIndex < group.items.length - 1) {
      setItemIndex((i) => i + 1);
      setProgress(0);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex((g) => g + 1);
      setItemIndex(0);
      setProgress(0);
      return;
    }
    onClose();
  }, [group, groupIndex, groups.length, itemIndex, onClose]);

  const goPrev = useCallback(() => {
    if (itemIndex > 0) {
      setItemIndex((i) => i - 1);
      setProgress(0);
      return;
    }
    if (groupIndex > 0) {
      const prev = groups[groupIndex - 1];
      setGroupIndex((g) => g - 1);
      setItemIndex(Math.max(0, (prev?.items.length ?? 1) - 1));
      setProgress(0);
    }
  }, [groupIndex, groups, itemIndex]);

  useEffect(() => {
    if (!item) return;
    markViewed(item);
    setProgress(0);
  }, [item, markViewed]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (paused) el.pause();
    else el.play().catch(() => undefined);
  }, [paused, item?.id]);

  useEffect(() => {
    if (!item || paused || isStoryVideo(item.mediaUrl)) return;
    const durationMs = item.durationSec * 1000;
    const started = Date.now();
    const tick = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / durationMs);
      setProgress(p);
      if (p >= 1) {
        window.clearInterval(tick);
        goNext();
      }
    }, 50);
    return () => window.clearInterval(tick);
  }, [goNext, item, paused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [goNext, goPrev, onClose]);

  if (!group || !item) return null;

  const video = isStoryVideo(item.mediaUrl);

  return (
    <div className="fixed inset-0 z-[80] bg-black">
      <div className="absolute inset-x-0 top-0 z-10 space-y-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex gap-1">
          {group.items.map((slide, i) => (
            <div
              key={slide.id}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <div
                className="h-full bg-white"
                style={{
                  width:
                    i < itemIndex
                      ? "100%"
                      : i === itemIndex
                        ? `${Math.round(progress * 100)}%`
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-white">
          <p className="truncate text-sm font-medium">{group.title}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="absolute inset-0"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerCancel={() => setPaused(false)}
      >
        {video ? (
          <video
            ref={videoRef}
            key={item.id}
            src={item.mediaUrl}
            className="h-full w-full object-contain"
            autoPlay
            playsInline
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              if (el.duration) setProgress(el.currentTime / el.duration);
            }}
            onEnded={goNext}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.mediaUrl}
            alt={item.title}
            className="h-full w-full object-contain"
          />
        )}
      </div>

      <button
        type="button"
        className="absolute inset-y-0 left-0 z-10 w-1/3"
        aria-label="Önceki"
        onClick={goPrev}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 z-10 w-1/3"
        aria-label="Sonraki"
        onClick={goNext}
      />

      {item.linkUrl ? (
        <a
          href={item.linkUrl}
          className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow"
        >
          İncele
        </a>
      ) : null}
    </div>
  );
}
