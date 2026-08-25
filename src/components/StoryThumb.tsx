import type { Story } from "@/lib/types";

type Props = {
  story: Pick<Story, "mediaUrl" | "mediaKind" | "title">;
  className?: string;
};

export function StoryThumb({ story, className = "h-16 w-16" }: Props) {
  const src =
    story.mediaKind === "video" ? `${story.mediaUrl}#t=0.1` : story.mediaUrl;

  return (
    <span
      className={`relative block overflow-hidden rounded-full bg-slate-200 ${className}`}
    >
      {story.mediaKind === "video" ? (
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          className="pointer-events-none h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={story.title || ""}
          className="pointer-events-none h-full w-full object-cover"
        />
      )}
    </span>
  );
}
