import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Cart, checkout, favorites, account, and tracking are noindex in HTML.
        // Disallowing them hides that tag, so Search Console keeps them as
        // "Blocked by robots.txt" and the fix validation fails.
        disallow: ["/admin", "/admin/", "/api/", "/auth/"],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
