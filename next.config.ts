import type { NextConfig } from "next";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Lean production runtime for Docker: only traced files + a minimal
  // server.js, no full node_modules copy. See Dockerfile.
  output: "standalone",

  // Не сообщать наружу, что сайт работает на Next.js.
  poweredByHeader: false,

  // Защитные заголовки на всех ответах. Strict-Transport-Security ставит
  // edge-прокси (deploy/Caddyfile): он знает, что соединение действительно
  // HTTPS, а на `npm run dev` (http://localhost) HSTS только мешал бы.
  // CSP — без script-src: inline-скрипты Next.js и виджет telegram.org
  // потребовали бы nonce на каждый ответ; здесь — запрет встраивания сайта
  // в чужие фреймы (clickjacking на кнопках «Купить»/«Записаться»),
  // подмены <base> и плагинов.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },

  // Proxies browser requests for /api/* to the backend container on the
  // same origin as the site. This keeps one public origin (the frontend)
  // and avoids exposing the API container directly or configuring CORS —
  // the server-rendered pages already call the API directly server-side
  // (see src/lib/api.ts); this rewrite is for future client-side calls
  // (auth, booking) that run in the browser.
  //
  // The destination is evaluated at `next build` time (baked into
  // .next/routes-manifest.json), so API_BASE_URL must be set for the build —
  // see the Dockerfile ARG. The proxy forwards X-Forwarded-For unchanged and
  // does not add the client IP itself: the edge proxy in front of this
  // server must set it (backend docs/deployment.md).
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
