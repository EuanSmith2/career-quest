import type { IncomingMessage } from "node:http";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Only the app's own tab on this machine may trigger a sync. This middleware runs before Vite's
 * own host check, so it does its own:
 * - Host must be a loopback name (stops DNS rebinding: a rebound page arrives with its own hostname)
 * - Origin must be this same server (stops any other website posting here from your browser)
 * - Content-Type must be JSON and X-CQ-Sync must be set, so a cross-site request needs a CORS
 *   preflight, which nothing here approves
 * The dev server also listens on localhost only, so other devices on the wifi can't reach it.
 */
export function isAllowedSyncRequest(req: IncomingMessage): boolean {
  const host = req.headers.host ?? "";
  const hostname = host.replace(/:\d+$/, "");
  if (!LOCAL_HOSTS.has(hostname)) return false;
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    if (new URL(origin).host !== host) return false;
  } catch {
    return false;
  }
  if (!(req.headers["content-type"] ?? "").startsWith("application/json")) return false;
  return req.headers["x-cq-sync"] === "1";
}
