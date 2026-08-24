import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { deleteStory, updateStory } from "@/lib/db";
import {
  clampStoryDuration,
  isSafeStoryMedia,
} from "@/lib/media";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const body = await request.json();

  const data: {
    title?: string;
    mediaUrl?: string;
    durationSec?: number;
    sortOrder?: number;
    active?: boolean;
  } = {};

  if (body.title !== undefined) {
    data.title = String(body.title || "").trim().slice(0, 60);
  }
  if (body.mediaUrl !== undefined) {
    if (!isSafeStoryMedia(body.mediaUrl)) {
      return NextResponse.json(
        { error: "Geçerli bir hikaye görseli veya videosu yükleyin" },
        { status: 400 }
      );
    }
    data.mediaUrl = body.mediaUrl;
  }
  if (body.durationSec !== undefined) {
    data.durationSec = clampStoryDuration(body.durationSec);
  }
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.round(body.sortOrder);
  }
  if (typeof body.active === "boolean") {
    data.active = body.active;
  }

  const story = await updateStory(id, data);
  if (!story) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(story);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const ok = await deleteStory(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
