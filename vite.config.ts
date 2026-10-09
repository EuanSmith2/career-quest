/// <reference types="vitest/config" />
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { syncToNotion, type NotionSyncPayload } from "./server/notionSync";

/**
 * POST /api/notion-sync during `npm run dev` and `npm run preview`.
 * NOTION_TOKEN / NOTION_DATABASE_ID come from .env.local and stay on the server
 * (no VITE_ prefix, so they're never bundled into the browser code).
 */
function notionSyncApi(): Plugin {
  let env: Record<string, string> = {};
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url?.split("?")[0] !== "/api/notion-sync") return next();
    if (req.method !== "POST") {
      res.statusCode = 405;
      return res.end();
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let payload: NotionSyncPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: "Bad request" }));
    }
    const out = await syncToNotion(payload, env);
    res.statusCode = out.status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(out.body));
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
  server: { host: "::", port: 8080 },
  test: { include: ["src/**/*.test.ts"] },
});
