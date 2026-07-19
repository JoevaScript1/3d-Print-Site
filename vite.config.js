import { defineConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  plugins: [
    ViteImageOptimizer({
      jpg: { quality: 75 },
      jpeg: { quality: 75 },
      png: { quality: 75 },
    }),
  ],
});
