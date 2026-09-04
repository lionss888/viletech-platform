import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = (process.env.VITE_RELEASE_GATE_API_PROXY ?? "http://127.0.0.1:8090").replace(/\/$/, "");

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5190,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
  preview: {
    port: 5190,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
});
