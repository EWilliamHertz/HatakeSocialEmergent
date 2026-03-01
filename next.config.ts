import type { NextConfig } from "next";

// next-pwa is incompatible with Turbopack — turbopack must be disabled
// for the service worker to be generated correctly during build
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.pokemontcg\.io\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "pokemon-api-cache",
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
      },
    },
    {
      urlPattern: /^https:\/\/api\.scryfall\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "scryfall-api-cache",
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: { cacheName: "next-static" },
    },
    {
      urlPattern: /\/_next\/image\?.*/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "next-image" },
    },
    {
      // Cache all same-origin navigation requests for offline support
      urlPattern: /^https:\/\/hatake\.social\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "pages-cache",
        expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  // NOTE: Turbopack removed — it breaks next-pwa service worker generation
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "cards.scryfall.io" },
      { protocol: "https", hostname: "i.imgur.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  compress: true,
};

module.exports = withPWA(nextConfig);
