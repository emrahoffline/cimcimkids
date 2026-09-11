"use client";

import { useState } from "react";
import type { StoryGroup } from "@/lib/stories";
import { isStoryVideo } from "@/lib/stories";
import { StoryViewer } from "./StoryViewer";

export function StoriesRail({ groups }: { groups: StoryGroup[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (groups.length === 0) return null;

  const openGroup = groups.find((g) => g.id === openId) ? openId : null;

  return (
    <>
      <div className="border-b border-olive/10 bg-white/70">
        <div className="mx-auto flex max-w-7xl gap-4 overflow-x-auto px-4 py-3 scrollbar-none sm:px-6 lg:px-8">
          {groups.map((group) => {
            const cover = group.items[0];
            if (!cover) return null;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setOpenId(group.id)}
                className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"
              >
                <span className="rounded-full bg-gradient-to-br from-bamboo to-olive p-[2px]">
                  <span className="block overflow-hidden rounded-full bg-white p-[2px]">
                    {isStoryVideo(cover.mediaUrl) ? (
                      <video
                        src={cover.mediaUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-14 w-14 rounded-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover.mediaUrl}
                        alt=""
                        className="h-14 w-14 rounded-full object-cover"
                      />
                    )}
                  </span>
                </span>
                <span className="w-full truncate text-center text-[11px] font-medium text-slate-600">
                  {group.title || "Hikaye"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {openGroup && (
        <StoryViewer
          groups={groups}
          startGroupId={openGroup}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
