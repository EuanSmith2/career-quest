import type { IncomingMessage } from "node:http";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Only the app's own page may trigger a sync:
 * - Origin must be this same server (stops any other website posting here from a player's browser)
 * - Content-Type must be JSON and X-CQ-Sync must be set, so a cross-site request needs a CORS
 *   preflight, which nothing here approves
 * Used by both the Vite middleware and the Vercel function.
 */
export function isSameOriginSyncRequest(req: IncomingMessage): boolean {
  const host = req.headers.host ?? "";
  const origin = req.headers.origin;
  if (!host || !origin) return false;
  try {
    if (new URL(origin).host !== host) return false;
  } catch {
    return false;
  }
  if (!(req.headers["content-type"] ?? "").startsWith("application/json")) return false;
  return req.headers["x-cq-sync"] === "1";
}

/**
 * Local dev/preview only: also require a loopback Host. The Vite middleware runs before Vite's own
 * host check, and a DNS-rebinding page arrives with its own hostname, so this stops it.
 * The dev server also listens on localhost only, so other devices on the wifi can't reach it.
 */
export function isAllowedSyncRequest(req: IncomingMessage): boolean {
  const hostname = (req.headers.host ?? "").replace(/:\d+$/, "");
  return LOCAL_HOSTS.has(hostname) && isSameOriginSyncRequest(req);
}
