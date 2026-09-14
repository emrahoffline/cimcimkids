import { NextResponse } from "next/server";
import { getProducts } from "@/lib/db";
import { buildGoogleMerchantFeed } from "@/lib/google-merchant-feed";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await getProducts();
  const xml = buildGoogleMerchantFeed(products);
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
