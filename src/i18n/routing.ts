import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en"],
  defaultLocale: "tr",
  localePrefix: "always",
  // Googlebot must not be sent to /en vs /tr based on Accept-Language.
  localeDetection: false,
  localeCookie: false,
  // HTML metadata is the single hreflang/canonical source (avoids Link-header conflicts).
  alternateLinks: false,
});
