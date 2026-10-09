import type { IncomingMessage, ServerResponse } from "node:http";
import { syncToNotion, type NotionSyncPayload } from "../server/notionSync";

/**
 * Vercel serverless function: POST /api/notion-sync (same handler as the Vite dev/preview middleware).
 * Set NOTION_TOKEN and NOTION_DATABASE_ID in the Vercel project's environment variables.
 */
export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
  }
  let payload = req.body as NotionSyncPayload | undefined;
  if (!payload || typeof payload !== "object") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try {
      payload = JSON.parse(raw);
    } catch {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: "Bad request" }));
    }
  }
  const out = await syncToNotion(payload as NotionSyncPayload, process.env);
  res.statusCode = out.status;
  res.end(JSON.stringify(out.body));
}
