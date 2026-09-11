import { NextResponse } from "next/server";
import { getActiveHeroSlides } from "@/lib/db";

export async function GET() {
  try {
    const slides = await getActiveHeroSlides();
    return NextResponse.json(slides, {
      headers: {
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json([]);
  }
}
