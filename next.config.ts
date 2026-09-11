import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "standalone",
  trailingSlash: false,
  async redirects() {
    return [
      { source: "/account", destination: "/tr", permanent: true },
      { source: "/tr/account", destination: "/tr", permanent: true },
      { source: "/en/account", destination: "/en", permanent: true },
      {
        source: "/apple-touch-icon-precomposed.png",
        destination: "/apple-touch-icon.png",
        permanent: true,
      },
      {
        source: "/category/:slug",
        destination: "/tr/kategori/:slug",
        permanent: true,
      },
      {
        source: "/:locale(tr|en)/category/:slug",
        destination: "/:locale/kategori/:slug",
        permanent: true,
      },
      {
        source: "/product/:slug",
        destination: "/tr/products/:slug",
        permanent: true,
      },
      {
        source: "/:locale(tr|en)/product/:slug",
        destination: "/:locale/products/:slug",
        permanent: true,
      },
    ];
  },
  // Phone / ngrok access in `next dev` — without this, assets/HMR are blocked.
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok-free.dev",
    "*.ngrok.dev",
  ],
  images: {
    remotePatterns: [],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy:
      "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    // Next.js App Router injects many inline <script> tags for RSC/hydration.
    // Blocking 'unsafe-inline' leaves a blank page in the browser.
    const csp = isProd
      ? [
          "default-src 'self'",
          "base-uri 'self'",
          "frame-ancestors 'self' https://*.google.com https://*.google.com.tr https://analytics.google.com https://tagassistant.google.com",
          "object-src 'none'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data: https:",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline' https://*.iyzipay.com https://*.iyzico.com https://www.googletagmanager.com https://www.google-analytics.com https://apis.google.com https://www.gstatic.com",
          "frame-src 'self' https://*.iyzipay.com https://*.iyzico.com https://www.google.com https://www.googletagmanager.com https://apis.google.com",
          "worker-src 'self'",
          "media-src 'self' data:",
          "connect-src 'self' https:",
          "form-action 'self' https://*.iyzipay.com https://*.iyzico.com",
          "upgrade-insecure-requests",
        ].join("; ")
      : [
          "default-src 'self'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data: https:",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          "worker-src 'self' blob:",
          "media-src 'self' data: blob:",
          "connect-src 'self' https: wss: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*",
          "form-action 'self'",
        ].join("; ");

    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: csp },
    ];

    if (isProd) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: csp.replace(
              /frame-ancestors [^;]+/,
              "frame-ancestors 'none'"
            ),
          },
        ],
      },
      {
        source: "/:path*",
        headers,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
