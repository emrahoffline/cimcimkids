import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createStory, getStories } from "@/lib/db";
import {
  clampStoryDuration,
  isSafeStoryMedia,
} from "@/lib/media";

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
  const title = String(body.title || "").trim().slice(0, 60);
  if (!isSafeStoryMedia(body.mediaUrl)) {
    return NextResponse.json(
      { error: "Geçerli bir hikaye görseli veya videosu yükleyin" },
      { status: 400 }
    );
  }

  const story = await createStory({
    title,
    mediaUrl: body.mediaUrl,
    durationSec: clampStoryDuration(body.durationSec),
    active: body.active !== false,
  });
  return NextResponse.json(story, { status: 201 });
}
