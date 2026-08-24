"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Volume2, VolumeX, X } from "lucide-react";
import type { Story } from "@/lib/types";

type Props = {
  stories: Story[];
  startIndex: number;
  onClose: () => void;
  onViewed: (id: string) => void;
  closeLabel: string;
};

export function StoryViewer({
  stories,
  startIndex,
  onClose,
  onViewed,
  closeLabel,
}: Props) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const holding = useRef(false);
  const pausedRef = useRef(false);
  const progressRef = useRef(0);
  const story = stories[index];

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= stories.length) {
        onClose();
        return;
      }
      progressRef.current = 0;
      pausedRef.current = false;
      setProgress(0);
      setPaused(false);
      setIndex(next);
    },
    [onClose, stories.length]
  );

  useEffect(() => {
    if (story) onViewed(story.id);
  }, [onViewed, story]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goTo(index + 1);
      if (event.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [goTo, index, onClose]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!story || paused) return;
    if (story.mediaKind === "video") return;

    const durationMs = Math.max(story.durationSec, 3) * 1000;
    const started = performance.now() - progressRef.current * durationMs;
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(1, (now - started) / durationMs);
      progressRef.current = next;
      setProgress(next);
      if (next >= 1) {
        goTo(index + 1);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [goTo, index, paused, story]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || story?.mediaKind !== "video") return;
    if (paused) video.pause();
    else video.play().catch(() => undefined);
  }, [paused, story]);

  if (!story) return null;

  const endHold = (event: React.PointerEvent<HTMLDivElement>) => {
    const wasPaused = pausedRef.current;
    holding.current = false;
    setPaused(false);
    if (wasPaused) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (x < rect.width * 0.3) goTo(index - 1);
    else goTo(index + 1);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95">
      <div className="relative flex h-full w-full max-w-md flex-col sm:h-[min(92vh,820px)] sm:overflow-hidden sm:rounded-3xl">
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {stories.map((item, i) => (
            <div
              key={item.id}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <div
                className="h-full bg-white"
                style={{
                  width:
                    i < index ? "100%" : i === index ? `${progress * 100}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 top-5 z-20 flex items-center justify-between px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <p className="truncate pl-1 text-sm font-semibold text-white drop-shadow">
            {story.title || "CimcimKids"}
          </p>
          <div className="flex items-center gap-1">
            {story.mediaKind === "video" ? (
              <button
                type="button"
                onClick={() => setMuted((value) => !value)}
                className="rounded-full p-2 text-white/90 hover:bg-white/10"
                aria-label={muted ? "Sesi aç" : "Sesi kapat"}
              >
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-white/90 hover:bg-white/10"
              aria-label={closeLabel}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          className="relative flex-1 touch-none"
          onPointerDown={() => {
            holding.current = true;
            window.setTimeout(() => {
              if (holding.current) {
                pausedRef.current = true;
                setPaused(true);
              }
            }, 180);
          }}
          onPointerUp={endHold}
          onPointerCancel={() => {
            holding.current = false;
            setPaused(false);
          }}
        >
          {story.mediaKind === "video" ? (
            <video
              key={story.id}
              ref={videoRef}
              src={story.mediaUrl}
              autoPlay
              playsInline
              muted={muted}
              className="h-full w-full bg-black object-contain"
              onTimeUpdate={(event) => {
                const el = event.currentTarget;
                if (!el.duration) return;
                setProgress(el.currentTime / el.duration);
              }}
              onEnded={() => goTo(index + 1)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={story.mediaUrl}
              alt={story.title || "Hikaye"}
              className="h-full w-full bg-black object-contain"
              draggable={false}
            />
          )}

          {paused ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-black/40 p-3 text-white">
                <Pause className="h-8 w-8" />
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
