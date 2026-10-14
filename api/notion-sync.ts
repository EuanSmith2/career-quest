import type { IncomingMessage, ServerResponse } from "node:http";
import { parseSyncPayload, syncToNotion } from "../server/notionSync.js"; // .js: Node ESM on Vercel needs the extension
import { isSameOriginSyncRequest } from "../server/syncGuard.js";

const MAX_BODY = 16 * 1024;

/**
 * Vercel serverless function: POST /api/notion-sync (same handler as the Vite dev/preview middleware).
 * Set NOTION_TOKEN and NOTION_DATABASE_ID in the Vercel project's environment variables.
 *
 * This is public, so: same-origin + JSON + X-CQ-Sync header only (no other website can post from a
 * player's browser), a size cap, every field validated, and Notion's error details go to the
 * function logs, not to the caller. Player IDs are 64-bit random, so one player can't target
 * another's page. A script outside a browser can still create pages: add auth + rate limiting
 * before this holds anything that matters.
 */
export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");
  const send = (status: number, body: object) => {
    res.statusCode = status;
    res.end(JSON.stringify(body));
  };
  if (req.method !== "POST") return send(405, { ok: false, error: "Method not allowed" });
  if (!isSameOriginSyncRequest(req)) return send(403, { ok: false, error: "Forbidden" });

  let body: unknown = req.body;
  if (body === undefined || typeof body === "string") {
    let raw = typeof body === "string" ? body : "";
    if (body === undefined) {
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > MAX_BODY) return send(413, { ok: false, error: "Too large" });
      }
    }
    if (raw.length > MAX_BODY) return send(413, { ok: false, error: "Too large" });
    try {
      body = JSON.parse(raw);
    } catch {
      return send(400, { ok: false, error: "Bad request" });
    }
  } else if (JSON.stringify(body).length > MAX_BODY) {
    return send(413, { ok: false, error: "Too large" });
  }

  let payload;
  try {
    payload = parseSyncPayload(body);
  } catch {
    return send(400, { ok: false, error: "Bad request" });
  }
  const out = await syncToNotion(payload, process.env);
  if (!out.body.ok && out.status >= 500) {
    console.error("notion-sync failed:", out.status, out.body.error);
    return send(out.status, { ok: false, error: "Sync failed. Try again in a minute." });
  }
  send(out.status, out.body);
}
