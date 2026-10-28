import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  define: {
    "import.meta.env.VITE_HOSTED": JSON.stringify(
      process.env.VERCEL ? "true" : "false",
    ),
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 8767,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL || "http://127.0.0.1:3001",
        changeOrigin: false,
      },
    },
  },
  preview: {
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL || "http://127.0.0.1:3001",
        changeOrigin: false,
      },
    },
  },
});
