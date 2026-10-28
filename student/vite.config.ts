import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";

// The admin console uses localhost:5173. Student uses 127.0.0.1:5174 so
// browser cookies stay isolated and both roles can be logged in locally.
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5174,
  },
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
    VitePWA({
      // generateSW (the default strategy): Workbox auto-builds the
      // service worker and its precache list from vite's own build
      // output — no hand-written cache logic to get wrong. injectManifest
      // (writing a custom SW) is the other option, but isn't needed here.
      registerType: "autoUpdate",
      // The SW is disabled under `npm run dev` by default, which is
      // normal — it doesn't interact well with Vite's HMR. To actually
      // see install/offline behavior, test against a production build:
      // `npm run build && npm run preview`.
      includeAssets: ["images/logo/clinova-mark.svg"],
      manifest: {
        name: "Clinova",
        short_name: "Clinova",
        description: "Nursing & midwifery study companion",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0e7c6b",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
