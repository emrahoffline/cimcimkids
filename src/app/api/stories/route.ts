import { NextResponse } from "next/server";
import { getActiveStoryGroups } from "@/lib/db";

export async function GET() {
  try {
    const groups = await getActiveStoryGroups();
    return NextResponse.json(groups, {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  } catch {
    return NextResponse.json([]);
  }
}
