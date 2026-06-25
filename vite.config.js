import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Verwende vite-plugin-pwa für automatische SW-Generierung
// npm install -D vite-plugin-pwa

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Eigenen SW nutzen statt auto-generieren
      strategies: "injectManifest",
      srcDir:     "public",
      filename:   "sw.js",
      registerType: "prompt", // User entscheidet über Updates

      // Assets die der SW precachen soll
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        globIgnores:  ["**/node_modules/**", "**/sw.js"],
      },

      manifest: false, // Wir nutzen unsere eigene manifest.json in /public
      
      devOptions: {
        enabled: true, // SW auch im Dev-Modus aktiv (zum Testen)
        type:    "module",
      },
    }),
  ],
  build: {
    outDir:    "dist",
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
    https: false, // In Produktion via nginx/SSL
  },
});
