// @lovable.dev/vite-tanstack-config already includes TanStack plugins — do NOT duplicate them.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Node server for Docker/Go reverse-proxy (not Cloudflare workers).
  nitro: {
    preset: "node-server",
  },
  vite: {
    server: {
      port: 5174,
      host: "127.0.0.1",
      proxy: {
        "/api": { target: "http://127.0.0.1:8787", changeOrigin: true },
        "/health": { target: "http://127.0.0.1:8787", changeOrigin: true },
      },
    },
  },
});
