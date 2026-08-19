import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/auth/",
          "/tr/cart",
          "/en/cart",
          "/tr/checkout",
          "/en/checkout",
          "/tr/favorites",
          "/en/favorites",
          "/tr/account",
          "/en/account",
          "/tr/tracking",
          "/en/tracking",
        ],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
