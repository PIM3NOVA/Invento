import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Panel administracyjny prezentuje zawsze aktualne dane – renderowanie dynamiczne.
  cacheComponents: false,
  // Wskaźnik trybu deweloperskiego koliduje z nawigacją mobilną
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
