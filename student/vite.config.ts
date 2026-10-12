import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

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
  ],
});
