import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createStories, getStories } from "@/lib/db";
import {
  clampStoryDuration,
  isSafeStoryMedia,
  normalizeStoryLink,
} from "@/lib/media";

const MAX_STORIES_PER_REQUEST = 20;

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const stories = await getStories();
  return NextResponse.json(stories);
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json();
  const rawItems = Array.isArray(body.stories)
    ? body.stories
    : body.mediaUrl
      ? [body]
      : [];

  if (rawItems.length === 0) {
    return NextResponse.json(
      { error: "En az bir hikaye görseli veya videosu yükleyin" },
      { status: 400 }
    );
  }
  if (rawItems.length > MAX_STORIES_PER_REQUEST) {
    return NextResponse.json(
      { error: `Tek seferde en fazla ${MAX_STORIES_PER_REQUEST} hikaye eklenebilir` },
      { status: 400 }
    );
  }

  const items: Array<{
    title: string;
    mediaUrl: string;
    durationSec: number;
    active: boolean;
    linkUrl: string;
  }> = [];

  for (const raw of rawItems) {
    if (!isSafeStoryMedia(raw.mediaUrl)) {
      return NextResponse.json(
        { error: "Geçerli bir hikaye görseli veya videosu yükleyin" },
        { status: 400 }
      );
    }
    items.push({
      title: String(raw.title || "").trim().slice(0, 60),
      mediaUrl: raw.mediaUrl,
      durationSec: clampStoryDuration(raw.durationSec ?? body.durationSec),
      linkUrl: normalizeStoryLink(raw.linkUrl),
      active: raw.active !== false && body.active !== false,
    });
  }

  const stories = await createStories(items);
  return NextResponse.json(
    stories.length === 1 ? stories[0] : { stories },
    { status: 201 }
  );
}
