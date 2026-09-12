import { createFileRoute } from "@tanstack/react-router";

/**
 * Прокси к core API (vdp/core). Браузер обращается по относительному пути
 * `/api/v1/...`, сервер приложения пересылает запрос на upstream — так CORS
 * на стороне core не требуется, а адрес остаётся настраиваемым.
 */
function upstreamBase(): string {
  const raw =
    process.env["VDP_API_PROXY_TARGET"] ??
    process.env["VITE_API_BASE_URL"] ??
    "https://alpha.vedy.io";
  return raw.replace(/\/$/, "");
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "accept-encoding",
]);

async function forward({ request, params }: { request: Request; params: { _splat?: string } }) {
  const incoming = new URL(request.url);
  const path = params._splat ?? "";
  const target = `${upstreamBase()}/api/v1/${path}${incoming.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (hasBody) {
    init.body = await request.arrayBuffer();
  }

  try {
    const response = await fetch(target, init);
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const name = key.toLowerCase();
      // fetch() уже распаковал тело — заголовки сжатия пересылать нельзя.
      if (HOP_BY_HOP.has(name) || name === "content-encoding") return;
      responseHeaders.set(key, value);
    });
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch {
    return new Response(JSON.stringify({ code: "upstream_unavailable", message: "API недоступен" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: {
      GET: forward,
      POST: forward,
      PUT: forward,
      PATCH: forward,
      DELETE: forward,
      OPTIONS: forward,
    },
  },
});
