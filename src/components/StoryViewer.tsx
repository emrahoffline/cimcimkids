"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Pause, Volume2, VolumeX, X } from "lucide-react";
import type { Story } from "@/lib/types";

type Props = {
  stories: Story[];
  startIndex: number;
  onClose: () => void;
  onViewed: (id: string) => void;
  closeLabel: string;
  linkLabel: string;
};

const HOLD_MS = 800;

export function StoryViewer({
  stories,
  startIndex,
  onClose,
  onViewed,
  closeLabel,
  linkLabel,
}: Props) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const downAt = useRef(0);
  const holdTimer = useRef<number>(0);
  const pausedRef = useRef(false);
  const progressRef = useRef(0);
  const story = stories[index];

  const indexRef = useRef(startIndex);
  const advancing = useRef(false);
  const timerFrameRef = useRef<number>(0);
  const tapsReady = useRef(false);

  useEffect(() => {
    tapsReady.current = false;
    const timer = window.setTimeout(() => {
      tapsReady.current = true;
    }, 400);
    return () => window.clearTimeout(timer);
  }, []);

  const goBy = useCallback(
    (delta: number) => {
      if (advancing.current) return;
      // Set flag IMMEDIATELY to block concurrent calls
      advancing.current = true;
      // Cancel any running auto-advance timer
      if (timerFrameRef.current) {
        cancelAnimationFrame(timerFrameRef.current);
        timerFrameRef.current = 0;
      }
      const next = indexRef.current + delta;
      if (next < 0) {
        // Reset flag if we're not actually navigating
        advancing.current = false;
        return;
      }
      window.setTimeout(() => {
        advancing.current = false;
      }, 450);
      if (next >= stories.length) {
        onClose();
        return;
      }
      indexRef.current = next;
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
      if (event.key === "ArrowRight") goBy(1);
      if (event.key === "ArrowLeft") goBy(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [goBy, onClose]);

  useEffect(() => {
    if (!story || paused) return;
    if (story.mediaKind === "video") return;

    const durationMs = Math.max(story.durationSec, 3) * 1000;
    const started = performance.now() - progressRef.current * durationMs;
    const tick = (now: number) => {
      const next = Math.min(1, (now - started) / durationMs);
      progressRef.current = next;
      setProgress(next);
      if (next >= 1) {
        goBy(1);
        return;
      }
      timerFrameRef.current = requestAnimationFrame(tick);
    };
    timerFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (timerFrameRef.current) {
        cancelAnimationFrame(timerFrameRef.current);
        timerFrameRef.current = 0;
      }
    };
  }, [goBy, paused, story]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || story?.mediaKind !== "video") return;
    if (paused) video.pause();
    else video.play().catch(() => undefined);
  }, [paused, story]);

  if (!story) return null;

  const startHold = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== undefined && event.button !== 0) return;
    downAt.current = performance.now();
    event.currentTarget.setPointerCapture(event.pointerId);
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      pausedRef.current = true;
      setPaused(true);
    }, HOLD_MS);
  };

  const endHold = (event: React.PointerEvent<HTMLButtonElement>) => {
    window.clearTimeout(holdTimer.current);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPaused(false);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={story.title || "Hikaye"}
    >
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
            <span className="ml-2 text-xs font-normal text-white/70">
              {index + 1}/{stories.length}
            </span>
          </p>
          <div className="flex items-center gap-1">
            {story.mediaKind === "video" ? (
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setMuted((value) => !value)}
                className="rounded-full p-2 text-white/90 hover:bg-white/10"
                aria-label={muted ? "Sesi aç" : "Sesi kapat"}
              >
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            ) : null}
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onClose}
              className="rounded-full p-2 text-white/90 hover:bg-white/10"
              aria-label={closeLabel}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative flex-1 touch-none">
          {story.mediaKind === "video" ? (
            <video
              key={story.id}
              ref={videoRef}
              src={story.mediaUrl}
              autoPlay
              playsInline
              muted={muted}
              className="pointer-events-none h-full w-full bg-black object-contain"
              onTimeUpdate={(event) => {
                const el = event.currentTarget;
                if (!el.duration) return;
                setProgress(el.currentTime / el.duration);
              }}
              onEnded={() => goBy(1)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={story.mediaUrl}
              alt={story.title || "Hikaye"}
              className="pointer-events-none h-full w-full bg-black object-contain"
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

          <button
            type="button"
            className={`absolute left-0 top-16 z-10 w-[32%] ${
              story.linkUrl ? "bottom-24" : "bottom-0"
            }`}
            aria-label="Önceki hikaye"
            onPointerDown={startHold}
            onPointerUp={(event) => {
              endHold(event);
              if (!tapsReady.current) return;
              if (pausedRef.current) {
                pausedRef.current = false;
                return;
              }
              if (performance.now() - downAt.current > HOLD_MS) return;
              goBy(-1);
            }}
            onPointerCancel={() => {
              window.clearTimeout(holdTimer.current);
              pausedRef.current = false;
              setPaused(false);
            }}
          />
          <button
            type="button"
            className={`absolute right-0 top-16 z-10 w-[68%] ${
              story.linkUrl ? "bottom-24" : "bottom-0"
            }`}
            aria-label="Sonraki hikaye"
            onPointerDown={startHold}
            onPointerUp={(event) => {
              endHold(event);
              if (!tapsReady.current) return;
              if (pausedRef.current) {
                pausedRef.current = false;
                return;
              }
              if (performance.now() - downAt.current > HOLD_MS) return;
              goBy(1);
            }}
            onPointerCancel={() => {
              window.clearTimeout(holdTimer.current);
              pausedRef.current = false;
              setPaused(false);
            }}
          />

          {story.linkUrl ? (
            <a
              href={story.linkUrl}
              target={story.linkUrl.startsWith("/") ? undefined : "_blank"}
              rel={story.linkUrl.startsWith("/") ? undefined : "noopener noreferrer"}
              className="absolute inset-x-8 bottom-6 z-30 flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
              {linkLabel}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
