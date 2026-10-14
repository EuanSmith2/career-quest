/// <reference types="vitest/config" />
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { parseSyncPayload, syncToNotion } from "./server/notionSync";
import { isAllowedSyncRequest } from "./server/syncGuard";

const MAX_BODY = 16 * 1024;

/**
 * POST /api/notion-sync during `npm run dev` and `npm run preview`.
 * NOTION_TOKEN / NOTION_DATABASE_ID come from .env.local and stay on the server
 * (no VITE_ prefix, so they're never bundled into the browser code).
 */
function notionSyncApi(): Plugin {
  let env: Record<string, string> = {};
  const send = (res: ServerResponse, status: number, body: object) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url?.split("?")[0] !== "/api/notion-sync") return next();
    if (req.method !== "POST") {
      res.statusCode = 405;
      return res.end();
    }
    if (!isAllowedSyncRequest(req)) return send(res, 403, { ok: false, error: "Forbidden" });
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > MAX_BODY) {
        req.destroy();
        return send(res, 413, { ok: false, error: "Too large" });
      }
    }
    let payload;
    try {
      payload = parseSyncPayload(JSON.parse(raw));
    } catch {
      return send(res, 400, { ok: false, error: "Bad request" });
    }
    const out = await syncToNotion(payload, env);
    send(res, out.status, out.body);
  };
  return {
    name: "notion-sync-api",
    configResolved(config) {
      env = loadEnv(config.mode, config.root, "NOTION_");
    },
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [react(), notionSyncApi()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // localhost only. For phone testing on the same wifi, run `npm run dev -- --host` on a network you trust.
  server: { host: "localhost", port: 8080 },
  test: { include: ["src/**/*.test.ts", "server/**/*.test.ts"] },
});
