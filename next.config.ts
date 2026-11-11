import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;







// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   output: "standalone",
//   /* config options here */
//   /* Legacy media files (db/uploads) are read with a dynamic path at runtime,
//      so Next's file tracer can't see them. Force-include them in the
//      /api/media serverless bundle — required for Vercel. */
//   outputFileTracingIncludes: {
//     "/api/media/**": ["./db/uploads/**/*"],
//   },
//   images: {
//     /* Admin uploads may include SVGs (served from /api/media/... or Supabase
//        Storage). They are first-party files uploaded through the authenticated
//        portal. */
//     dangerouslyAllowSVG: true,
//     contentDispositionType: "attachment",
//     remotePatterns: [
//       /* Media library files served straight from Supabase Storage */
//       { protocol: "https", hostname: "fztseosuiapjwfulwdik.supabase.co" },
//     ],
//   },
//   typescript: {
//     ignoreBuildErrors: true,
//   },
//   reactStrictMode: false,
//   devIndicators: false,
// };

// export default nextConfig;
