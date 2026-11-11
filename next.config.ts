import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* Preview panels (the in-chat preview iframe) load the dev server from a
     *.space-z.ai origin — allow them so /_next/* assets and HMR work. */
  allowedDevOrigins: ["*.space-z.ai"],
  /* config options here */
  /* Legacy media files (db/uploads) are read with a dynamic path at runtime,
     so Next's file tracer can't see them. Force-include them in the
     /api/media serverless bundle — required for Vercel. */
  outputFileTracingIncludes: {
    "/api/media/**": ["./db/uploads/**/*"],
  },
  images: {
    /* Admin uploads may include SVGs (served from /api/media/... or Supabase
       Storage). They are first-party files uploaded through the authenticated
       portal. */
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    /* Local images: the default rule (any path, no query string) plus an
       opt-in for the brand marks under /images/marks — they may carry a
       `?v=N` version tag. Bumping N in CompanyMark.tsx busts the
       /_next/image + browser caches when a mark file is corrected. */
    localPatterns: [
      { pathname: "/**", search: "" },
      { pathname: "/images/marks/**" },
    ],
    remotePatterns: [
      /* Media library files served straight from Supabase Storage */
      { protocol: "https", hostname: "fztseosuiapjwfulwdik.supabase.co" },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
};

export default nextConfig;
