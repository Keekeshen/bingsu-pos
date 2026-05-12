import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Images ──────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        // Supabase Storage CDN — covers all project subdomains
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Self-hosted Supabase on custom domain (add yours if applicable)
        protocol: "https",
        hostname: "*.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // ── Security headers ─────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Block framing (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // Stop MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Minimal referrer leakage
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // camera=self is required for the CustomerScanner QR component
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=()",
          },
          // CSP — tighten as needed when you know all third-party origins
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js inline scripts + next/font
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Tailwind inline styles
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Supabase API + Storage CDN
              "connect-src 'self' https://*.supabase.co https://*.supabase.in",
              "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
              // Camera access for QR scanner
              "media-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
