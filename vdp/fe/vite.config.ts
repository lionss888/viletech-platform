// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const apiProxyTarget = (process.env.VDP_API_PROXY_TARGET ?? "http://localhost:8080").replace(
  /\/$/,
  "",
);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: process.env.NITRO_PRESET ?? "cloudflare",
    routeRules: {
      "/api/**": { proxy: `${apiProxyTarget}/api/**` },
    },
  },
  vite: {
    server: {
      // RD11: Playwright in Docker hits fe:5173 on compose network.
      allowedHosts: ["fe", "host.docker.internal", "localhost", "127.0.0.1"],
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  },
});
