import { NextResponse } from "next/server";
import { getActiveStories } from "@/lib/db";

export async function GET() {
  const stories = await getActiveStories();
  return NextResponse.json(stories, {
    headers: { "Cache-Control": "no-store" },
  });
}
