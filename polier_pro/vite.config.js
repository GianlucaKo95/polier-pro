import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // generateSW: Workbox generiert den SW automatisch — kein manueller sw.js nötig
      strategies: "generateSW",
      registerType: "prompt",

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // APIs nie cachen
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /\/supabase/, /\/functions/],
        runtimeCaching: [
          {
            // Open-Meteo Wetter: 10 Minuten Cache
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "wetter-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 600 },
            },
          },
        ],
      },

      // manifest.json aus public/ verwenden
      manifest: false,

      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});
