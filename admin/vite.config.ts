import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      onwarn(warning, warn) {
        const isJVectorEvalWarning =
          warning.code === "EVAL" &&
          typeof warning.id === "string" &&
          warning.id.includes("@react-jvectormap/core");

        if (isJVectorEvalWarning) {
          return;
        }

        warn(warning);
      },
    },
  },
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // This will transform your SVG to a React component
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
});
