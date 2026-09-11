import { NextResponse } from "next/server";
import { getActiveAnnouncements } from "@/lib/db";

export async function GET() {
  try {
    const announcements = await getActiveAnnouncements();
    return NextResponse.json(announcements, {
      headers: {
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json([]);
  }
}
