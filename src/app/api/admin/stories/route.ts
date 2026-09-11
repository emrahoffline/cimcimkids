import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import {
  createStories,
  deleteStory,
  deleteStoryGroup,
  getStories,
  updateStory,
} from "@/lib/db";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const stories = await getStories();
  return NextResponse.json(stories);
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const data = body as {
    title?: unknown;
    mediaUrl?: unknown;
    mediaUrls?: unknown;
    durationSec?: unknown;
    linkUrl?: unknown;
    groupId?: unknown;
  };

  const mediaUrls = [
    ...(Array.isArray(data.mediaUrls) ? data.mediaUrls : []),
    ...(typeof data.mediaUrl === "string" ? [data.mediaUrl] : []),
  ].filter((url): url is string => typeof url === "string" && url.trim().length > 0);

  try {
    const created = await createStories({
      title: typeof data.title === "string" ? data.title : "",
      mediaUrls,
      durationSec:
        typeof data.durationSec === "number" ? data.durationSec : undefined,
      linkUrl: typeof data.linkUrl === "string" ? data.linkUrl : "",
      groupId: typeof data.groupId === "string" ? data.groupId : "",
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kayıt başarısız." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const { id, title, mediaUrl, durationSec, linkUrl, active, sortOrder } = body as {
    id?: unknown;
    title?: unknown;
    mediaUrl?: unknown;
    durationSec?: unknown;
    linkUrl?: unknown;
    active?: unknown;
    sortOrder?: unknown;
  };

  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const updated = await updateStory(id, {
    ...(typeof title === "string" ? { title } : {}),
    ...(typeof mediaUrl === "string" ? { mediaUrl } : {}),
    ...(typeof durationSec === "number" ? { durationSec } : {}),
    ...(typeof linkUrl === "string" ? { linkUrl } : {}),
    ...(typeof active === "boolean" ? { active } : {}),
    ...(typeof sortOrder === "number" && Number.isFinite(sortOrder)
      ? { sortOrder }
      : {}),
  });

  if (!updated) {
    return NextResponse.json({ error: "Hikaye bulunamadı." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const id =
    body && typeof body === "object" && typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id
      : "";
  const groupId =
    body &&
    typeof body === "object" &&
    typeof (body as { groupId?: unknown }).groupId === "string"
      ? (body as { groupId: string }).groupId
      : "";

  if (groupId) {
    const count = await deleteStoryGroup(groupId);
    return NextResponse.json({ ok: true, count });
  }

  if (!id) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const removed = await deleteStory(id);
  if (!removed) {
    return NextResponse.json({ error: "Hikaye bulunamadı." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
