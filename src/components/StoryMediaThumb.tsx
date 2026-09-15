"use client";

import { useEffect, useState } from "react";
import { isStoryVideo } from "@/lib/stories";

type Props = {
  src: string;
  className?: string;
  alt?: string;
};

function frameFromVideo(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.preload = "auto";
    video.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(video);
    let settled = false;

    const finish = (data: string | null) => {
      if (settled) return;
      settled = true;
      video.removeAttribute("src");
      video.load();
      video.remove();
      resolve(data);
    };

    const capture = () => {
      if (!video.videoWidth) {
        finish(null);
        return;
      }
      const canvas = document.createElement("canvas");
      const size = 160;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        finish(null);
        return;
      }
      const scale = Math.max(
        size / video.videoWidth,
        size / video.videoHeight
      );
      const w = video.videoWidth * scale;
      const h = video.videoHeight * scale;
      ctx.drawImage(video, (size - w) / 2, (size - h) / 2, w, h);
      try {
        finish(canvas.toDataURL("image/jpeg", 0.74));
      } catch {
        finish(null);
      }
    };

    video.addEventListener("seeked", capture, { once: true });
    video.addEventListener(
      "loadeddata",
      () => {
        const t = Number.isFinite(video.duration)
          ? Math.min(0.25, Math.max(0.05, video.duration * 0.05))
          : 0.1;
        try {
          video.currentTime = t;
        } catch {
          capture();
        }
      },
      { once: true }
    );
    video.addEventListener("error", () => finish(null), { once: true });
    window.setTimeout(() => finish(null), 4000);
    video.src = url;
    video.load();
  });
}

export function StoryMediaThumb({ src, className, alt = "" }: Props) {
  const video = isStoryVideo(src);
  const [frame, setFrame] = useState<string | null>(null);

  useEffect(() => {
    if (!video) {
      setFrame(null);
      return;
    }
    let alive = true;
    setFrame(null);
    frameFromVideo(src).then((data) => {
      if (alive) setFrame(data);
    });
    return () => {
      alive = false;
    };
  }, [src, video]);

  if (!video) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />;
  }

  if (frame) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={frame} alt={alt} className={className} />;
  }

  return (
    <video
      src={`${src}${src.includes("#") ? "" : "#t=0.1"}`}
      className={className}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={(event) => {
        const el = event.currentTarget;
        if (el.currentTime < 0.05) el.currentTime = 0.1;
      }}
    />
  );
}
