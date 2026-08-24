import { NextResponse } from "next/server";
import { recordStoryView } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || typeof id !== "string" || id.length > 80) {
    return NextResponse.json({ error: "Invalid story" }, { status: 400 });
  }
  const ok = await recordStoryView(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
